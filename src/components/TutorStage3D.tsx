import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { GestureDefinition, TutorMood, TutorProfile, VisemeFrame } from '../core/types';
import { resolveAssetUrl } from '../core/androidBridge';
import { TUTOR_PROFILES } from '../data/seedData';
import { sampleVisemeAt } from '../core/viseme';

// Pre-allocated scratch objects (Zero GC inside render loop)
const _vecA = new THREE.Vector3();
const _vecB = new THREE.Vector3();

export interface PlaybackTimeline {
  startedAtMs: number;
  frames: VisemeFrame[];
  active: boolean;
}

interface TutorStage3DProps {
  tutor: TutorProfile;
  mood: TutorMood;
  activeGestureDef: GestureDefinition;
  gestureNonce: number;
  isSpeaking: boolean;
  playbackRef: React.MutableRefObject<PlaybackTimeline>;
  fallback2D: boolean;
  onWebGlLost: () => void;
  cameraPreset: 'portrait' | 'desk' | 'side';
}

function createStudioDeskTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#4e3829';
    ctx.fillRect(0, 0, 512, 512);
    for (let y = 0; y < 512; y += 2) {
      const wave = Math.sin(y * 0.06) * 8 + Math.cos(y * 0.025) * 6;
      const shade = 65 + Math.round(wave);
      ctx.fillStyle = `rgba(${shade + 18}, ${shade - 4}, ${shade - 18}, 0.35)`;
      ctx.fillRect(0, y, 512, 2);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 1);
  return tex;
}

function createAcousticWallTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(256, 210, 30, 256, 256, 380);
    grad.addColorStop(0, '#131d2f');
    grad.addColorStop(0.65, '#0d1422');
    grad.addColorStop(1, '#080d17');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(128, 128, 12, 128, 128, 124);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
    grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.28)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Sculpts a subdivided portrait plane into a genuine 3D studio bust relief
 * (forehead, nose bridge, cheeks, jawline, neck, and shoulders project in Z)
 * so 3-point studio lighting and OrbitControls produce real 3D parallax.
 */
function createSculptedBustGeometry(size = 1.38, segments = 56): THREE.PlaneGeometry {
  const geo = new THREE.PlaneGeometry(size, size, segments, segments);
  const pos = geo.attributes.position as THREE.BufferAttribute;

  for (let i = 0; i < pos.count; i++) {
    const nx = pos.getX(i) / (size * 0.5); // -1..1
    const ny = pos.getY(i) / (size * 0.5); // -1..1

    // Head & face relief centered at (0, 0.34) matching chest-up idol framing
    const faceDx = nx / 0.28;
    const faceDy = (ny - 0.34) / 0.34;
    const faceDistSq = faceDx * faceDx + faceDy * faceDy;
    const faceRelief = 0.095 * Math.exp(-faceDistSq * 1.2);

    // Subtle nose projection
    const noseDx = nx / 0.07;
    const noseDy = (ny - 0.32) / 0.095;
    const noseRelief = 0.022 * Math.exp(-(noseDx * noseDx + noseDy * noseDy) * 1.5);

    // Neck bridge
    const neckDx = nx / 0.14;
    const neckDy = (ny - 0.02) / 0.18;
    const neckRelief = 0.055 * Math.exp(-(neckDx * neckDx + neckDy * neckDy) * 1.4);

    // Upper torso & tailored shoulders
    const torsoDx = nx / 0.56;
    const torsoDy = (ny + 0.45) / 0.44;
    const torsoRelief = 0.11 * Math.exp(-(torsoDx * torsoDx + torsoDy * torsoDy) * 1.05);

    const z = faceRelief + noseRelief + neckRelief + torsoRelief;
    pos.setZ(i, z);
  }

  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

interface FacialRigUniforms {
  uMouthUV: { value: THREE.Vector2 };
  uLeftEyeUV: { value: THREE.Vector2 };
  uRightEyeUV: { value: THREE.Vector2 };
  uJawOpen: { value: number };
  uLipWidth: { value: number };
  uLipRound: { value: number };
  uSmile: { value: number };
  uBlink: { value: number };
  uBrowLift: { value: number };
  uHeadPitch: { value: number };
  uHeadYaw: { value: number };
  uHeadRoll: { value: number };
}

export function TutorStage3D({
  tutor,
  mood,
  activeGestureDef,
  gestureNonce,
  isSpeaking,
  playbackRef,
  fallback2D,
  onWebGlLost,
  cameraPreset,
}: TutorStage3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const tutorRef = useRef(tutor);
  const moodRef = useRef(mood);
  const gestureDefRef = useRef(activeGestureDef);
  const gestureTimeRef = useRef(performance.now());
  const isSpeakingRef = useRef(isSpeaking);
  const cameraPresetRef = useRef(cameraPreset);
  const onWebGlLostRef = useRef(onWebGlLost);

  tutorRef.current = tutor;
  moodRef.current = mood;
  gestureDefRef.current = activeGestureDef;
  isSpeakingRef.current = isSpeaking;
  cameraPresetRef.current = cameraPreset;
  onWebGlLostRef.current = onWebGlLost;

  useEffect(() => {
    gestureTimeRef.current = performance.now();
  }, [activeGestureDef.id, gestureNonce]);

  useEffect(() => {
    if (fallback2D) return;
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      onWebGlLostRef.current();
      return;
    }
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      onWebGlLostRef.current();
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c111d);
    scene.fog = new THREE.FogExp2(0x0c111d, 0.085);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 40);
    camera.position.set(0, 1.44, 1.56);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.29, -0.05);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.minDistance = 1.25;
    controls.maxDistance = 3.2;
    controls.minPolarAngle = Math.PI * 0.3;
    controls.maxPolarAngle = Math.PI * 0.62;
    controls.minAzimuthAngle = -Math.PI * 0.24;
    controls.maxAzimuthAngle = Math.PI * 0.24;
    controls.enablePan = false;
    controls.update();

    let userInteracting = false;
    let lastPreset = cameraPresetRef.current;
    controls.addEventListener('start', () => {
      userInteracting = true;
    });

    // 3-Point Studio Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 0.95);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff4e6, 1.45);
    keyLight.position.set(1.8, 2.7, 2.5);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 10;
    keyLight.shadow.camera.left = -2.2;
    keyLight.shadow.camera.right = 2.2;
    keyLight.shadow.camera.top = 2.4;
    keyLight.shadow.camera.bottom = -1.2;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x7dd3fc, 1.1);
    rimLight.position.set(-2.0, 2.1, -1.8);
    scene.add(rimLight);

    const disposables: Array<{ dispose: () => void }> = [];
    const maxAniso = renderer.capabilities.getMaxAnisotropy();

    // Studio Environment: Floor + Acoustic Backdrop + Contact Shadow + Desk
    const floorGeo = new THREE.PlaneGeometry(18, 18);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.85,
      metalness: 0.05,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    disposables.push(floorGeo, floorMat);

    const wallTex = createAcousticWallTexture();
    wallTex.anisotropy = maxAniso;
    const wallGeo = new THREE.PlaneGeometry(8.5, 4.5);
    const wallMat = new THREE.MeshStandardMaterial({
      map: wallTex,
      color: 0xffffff,
      roughness: 0.92,
      metalness: 0.02,
    });
    const backWall = new THREE.Mesh(wallGeo, wallMat);
    backWall.position.set(0, 1.9, -1.65);
    backWall.receiveShadow = true;
    scene.add(backWall);
    disposables.push(wallTex, wallGeo, wallMat);

    // Desk assembly
    const deskGroup = new THREE.Group();
    deskGroup.position.set(0, 0, 0.36);

    const deskShape = new THREE.Shape();
    deskShape.moveTo(-1.05, -0.32);
    deskShape.lineTo(1.05, -0.32);
    deskShape.lineTo(1.05, 0.32);
    deskShape.lineTo(-1.05, 0.32);
    deskShape.closePath();
    const deskGeo = new THREE.ExtrudeGeometry(deskShape, {
      depth: 0.045,
      bevelEnabled: true,
      bevelThickness: 0.012,
      bevelSize: 0.012,
      bevelSegments: 2,
    });
    deskGeo.rotateX(-Math.PI / 2);
    const deskTex = createStudioDeskTexture();
    deskTex.anisotropy = maxAniso;
    const deskMat = new THREE.MeshStandardMaterial({
      map: deskTex,
      color: 0xffffff,
      roughness: 0.58,
      metalness: 0.04,
    });
    const deskTop = new THREE.Mesh(deskGeo, deskMat);
    deskTop.position.y = 0.76;
    deskTop.castShadow = true;
    deskTop.receiveShadow = true;
    deskGroup.add(deskTop);
    disposables.push(deskGeo, deskTex, deskMat);

    const legGeo = new THREE.CylinderGeometry(0.022, 0.016, 0.76, 14);
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xc5a268,
      roughness: 0.25,
      metalness: 0.85,
    });
    [
      [-0.92, 0.38, -0.22],
      [0.92, 0.38, -0.22],
      [-0.92, 0.38, 0.22],
      [0.92, 0.38, 0.22],
    ].forEach(([lx, ly, lz]) => {
      const leg = new THREE.Mesh(legGeo, brassMat);
      leg.position.set(lx, ly, lz);
      leg.castShadow = true;
      deskGroup.add(leg);
    });
    disposables.push(legGeo, brassMat);

    // Ceramic Mug on desk
    const mugProfile = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.036, 0),
      new THREE.Vector2(0.04, 0.085),
      new THREE.Vector2(0.034, 0.085),
      new THREE.Vector2(0.031, 0.01),
      new THREE.Vector2(0, 0.01),
    ];
    const mugGeo = new THREE.LatheGeometry(mugProfile, 20);
    const mugMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.16,
      metalness: 0.02,
    });
    const mug = new THREE.Mesh(mugGeo, mugMat);
    mug.position.set(0.56, 0.818, 0.05);
    mug.castShadow = true;
    deskGroup.add(mug);
    disposables.push(mugGeo, mugMat);

    // Notebook on desk
    const bookGeo = new THREE.BoxGeometry(0.22, 0.018, 0.28);
    const bookMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.78,
      metalness: 0.05,
    });
    const notebook = new THREE.Mesh(bookGeo, bookMat);
    notebook.position.set(-0.48, 0.827, 0.04);
    notebook.rotation.y = 0.18;
    notebook.castShadow = true;
    deskGroup.add(notebook);
    disposables.push(bookGeo, bookMat);

    // Studio Lamp
    const lampShadeGeo = new THREE.LatheGeometry(
      [
        new THREE.Vector2(0.02, 0),
        new THREE.Vector2(0.085, -0.09),
        new THREE.Vector2(0.08, -0.092),
        new THREE.Vector2(0.016, -0.005),
      ],
      20,
    );
    const lampMat = new THREE.MeshStandardMaterial({
      color: 0x263248,
      roughness: 0.35,
      metalness: 0.72,
    });
    const lampShade = new THREE.Mesh(lampShadeGeo, lampMat);
    lampShade.position.set(-0.74, 1.18, -0.1);
    lampShade.rotation.z = -0.35;
    deskGroup.add(lampShade);

    const lampStemGeo = new THREE.CylinderGeometry(0.01, 0.012, 0.38, 12);
    const lampStem = new THREE.Mesh(lampStemGeo, brassMat);
    lampStem.position.set(-0.79, 1.0, -0.12);
    deskGroup.add(lampStem);
    disposables.push(lampShadeGeo, lampMat, lampStemGeo);

    // Contact shadow plane on floor
    const shadowTex = createContactShadowTexture();
    const shadowPlaneGeo = new THREE.CircleGeometry(1.35, 32);
    const shadowPlaneMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });
    const contactShadow = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.set(0, 0.015, 0.15);
    scene.add(contactShadow);
    scene.add(deskGroup);
    disposables.push(shadowTex, shadowPlaneGeo, shadowPlaneMat);

    // =========================================================================
    // PHOTOREALISTIC 3D HUMAN STUDIO BUST + GLSL REAL-TIME FACIAL RIG
    // =========================================================================
    const textureLoader = new THREE.TextureLoader();
    textureLoader.setCrossOrigin('anonymous');
    const tutorTextures = new Map<string, THREE.Texture>();

    const configureAndLoadTexture = (profile: TutorProfile): THREE.Texture => {
      const existing = tutorTextures.get(profile.id);
      if (existing) return existing;
      const tex = textureLoader.load(resolveAssetUrl(profile.portraitUrl), () => {
        if (disposed) return;
        tex.needsUpdate = true;
        bustMat.needsUpdate = true;
        if (container) {
          container.dataset.textureReady = 'true';
        }
        renderer.render(scene, camera);
      });
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = isSoftwareGl ? 1 : maxAniso;
      tex.generateMipmaps = !isSoftwareGl;
      tex.minFilter = isSoftwareGl ? THREE.LinearFilter : THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tutorTextures.set(profile.id, tex);
      disposables.push(tex);
      return tex;
    };

    // Load active tutor texture immediately first; preload remaining 4 shortly after
    const initialTex = configureAndLoadTexture(tutorRef.current);
    const preloadTimer = window.setTimeout(() => {
      if (disposed) return;
      for (const profile of TUTOR_PROFILES) {
        if (profile.id !== tutorRef.current.id) {
          configureAndLoadTexture(profile);
        }
      }
    }, 350);

    const rigUniforms: FacialRigUniforms = {
      uMouthUV: { value: new THREE.Vector2(...tutorRef.current.facialAnchors.mouthUV) },
      uLeftEyeUV: { value: new THREE.Vector2(...tutorRef.current.facialAnchors.leftEyeUV) },
      uRightEyeUV: { value: new THREE.Vector2(...tutorRef.current.facialAnchors.rightEyeUV) },
      uJawOpen: { value: 0 },
      uLipWidth: { value: 0.3 },
      uLipRound: { value: 0 },
      uSmile: { value: 0.25 },
      uBlink: { value: 0 },
      uBrowLift: { value: 0 },
      uHeadPitch: { value: 0 },
      uHeadYaw: { value: 0 },
      uHeadRoll: { value: 0 },
    };

    const bustMat = new THREE.MeshStandardMaterial({
      map: initialTex,
      color: 0xffffff,
      roughness: 0.88,
      metalness: 0.0,
      transparent: true,
    });
    bustMat.customProgramCacheKey = () => 'photoreal-human-tutor-rig-v1';

    bustMat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, rigUniforms);

      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
          uniform float uHeadPitch;
          uniform float uHeadYaw;
          uniform float uHeadRoll;`,
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          // Articulate neck & head independently from grounded shoulders
          float headMask = smoothstep(-0.04, 0.24, transformed.y);
          vec3 pivot = vec3(0.0, 0.02, 0.02);
          vec3 rel = transformed - pivot;

          float p = uHeadPitch * headMask;
          float cp = cos(p), sp = sin(p);
          rel = vec3(rel.x, rel.y * cp - rel.z * sp, rel.y * sp + rel.z * cp);

          float yw = uHeadYaw * headMask;
          float cy = cos(yw), sy = sin(yw);
          rel = vec3(rel.x * cy + rel.z * sy, rel.y, -rel.x * sy + rel.z * cy);

          float rl = uHeadRoll * headMask;
          float cr = cos(rl), sr = sin(rl);
          rel = vec3(rel.x * cr - rel.y * sr, rel.x * sr + rel.y * cr, rel.z);

          transformed = pivot + rel;`,
        );

      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
          uniform vec2 uMouthUV;
          uniform vec2 uLeftEyeUV;
          uniform vec2 uRightEyeUV;
          uniform float uJawOpen;
          uniform float uLipWidth;
          uniform float uLipRound;
          uniform float uSmile;
          uniform float uBlink;
          uniform float uBrowLift;`,
        )
        .replace(
          '#include <map_fragment>',
          `#ifdef USE_MAP
            vec2 animUv = vMapUv;

            // 1. Expressive natural viseme lip-sync around uMouthUV
            vec2 mDelta = animUv - uMouthUV;
            float jawMask = exp(-((mDelta.x * mDelta.x) / 0.0020 + (mDelta.y * mDelta.y) / 0.0011));
            float lowerLipWeight = smoothstep(0.006, -0.020, mDelta.y) * jawMask;
            float upperLipWeight = smoothstep(-0.004, 0.015, mDelta.y) * jawMask;
            animUv.y += lowerLipWeight * (uJawOpen * 0.032);
            animUv.y -= upperLipWeight * (uJawOpen * 0.009);

            float lipRegion = exp(-((mDelta.x * mDelta.x) / 0.0016 + (mDelta.y * mDelta.y) / 0.00055));
            animUv.x -= mDelta.x * lipRegion * ((uLipRound * 0.18) - (uLipWidth * 0.08));

            // Subtle natural smile corner lift
            float cornerDist = smoothstep(0.01, 0.032, abs(mDelta.x)) * exp(-((mDelta.x * mDelta.x) / 0.0015 + (mDelta.y * mDelta.y) / 0.0005));
            animUv.y -= cornerDist * uSmile * 0.0065;

            // 2. Soft natural blinking around both eyes
            vec2 lDelta = animUv - uLeftEyeUV;
            vec2 rDelta = animUv - uRightEyeUV;
            float lEyeMask = exp(-((lDelta.x * lDelta.x) / 0.00058 + (lDelta.y * lDelta.y) / 0.00019));
            float rEyeMask = exp(-((rDelta.x * rDelta.x) / 0.00058 + (rDelta.y * rDelta.y) / 0.00019));
            float lLidFactor = smoothstep(-0.005, 0.009, lDelta.y) * lEyeMask;
            float rLidFactor = smoothstep(-0.005, 0.009, rDelta.y) * rEyeMask;
            animUv.y += (lLidFactor + rLidFactor) * uBlink * 0.011;

            // 3. Subtle eyebrow lift
            vec2 lbDelta = animUv - (uLeftEyeUV + vec2(0.0, 0.022));
            vec2 rbDelta = animUv - (uRightEyeUV + vec2(0.0, 0.022));
            float browMask = exp(-((lbDelta.x * lbDelta.x) / 0.0008 + (lbDelta.y * lbDelta.y) / 0.00024))
                           + exp(-((rbDelta.x * rbDelta.x) / 0.0008 + (rbDelta.y * rbDelta.y) / 0.00024));
            animUv.y -= browMask * uBrowLift * 0.0065;

            vec4 sampledDiffuseColor = texture2D( map, clamp(animUv, 0.002, 0.998) );

            // Natural oral-cavity depth + subtle teeth highlight when speaking
            float apertureY = max(0.0018, uJawOpen * 0.0165);
            float apertureX = mix(0.024, 0.016, uLipRound);
            float mouthSlit = (mDelta.x * mDelta.x) / (apertureX * apertureX)
                            + ((mDelta.y + uJawOpen * 0.005) * (mDelta.y + uJawOpen * 0.005)) / (apertureY * apertureY);
            float cavityMask = (1.0 - smoothstep(0.42, 1.0, mouthSlit)) * smoothstep(0.06, 0.30, uJawOpen);
            sampledDiffuseColor.rgb = mix(sampledDiffuseColor.rgb, vec3(0.15, 0.045, 0.05), cavityMask * 0.78);

            // Soft lash line during full blink
            float blinkLine = (lEyeMask + rEyeMask) * smoothstep(0.5, 0.96, uBlink);
            sampledDiffuseColor.rgb = mix(sampledDiffuseColor.rgb, sampledDiffuseColor.rgb * 0.58, blinkLine * 0.52);

            diffuseColor *= sampledDiffuseColor;

            // Seamless rectangular-feathered fade so the solid #0c111d studio portrait melts cleanly into the 3D studio
            vec2 edgeDist = abs(vMapUv - vec2(0.5, 0.5));
            float edgeX = 1.0 - smoothstep(0.38, 0.495, edgeDist.x);
            float edgeTop = 1.0 - smoothstep(0.38, 0.495, vMapUv.y - 0.5);
            float bottomFade = smoothstep(0.0, 0.12, vMapUv.y);
            diffuseColor.a *= edgeX * edgeTop * bottomFade;
          #endif`,
        );
    };

    const bustGeo = createSculptedBustGeometry(1.38, 56);
    const bustMesh = new THREE.Mesh(bustGeo, bustMat);
    bustMesh.castShadow = !isSoftwareGl;
    bustMesh.receiveShadow = true;

    const bustPivot = new THREE.Group();
    bustPivot.position.set(0, 1.18, -0.14);
    bustPivot.add(bustMesh);
    scene.add(bustPivot);
    disposables.push(bustGeo, bustMat);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Track current smoothly damped animation states
    let curJaw = 0;
    let curLipRound = 0;
    let curLipWidth = 0.25;
    let curSmile = 0.25;
    let curBrowLift = 0;
    let curPitch = 0;
    let curYaw = 0;
    let curRoll = 0;
    let curLeanZ = 0;
    let curBounceY = 0;
    let curSwayX = 0;
    let curZoomDelta = 0;
    let nextBlinkAt = performance.now() + 2400;
    let blinkProgress = 0;
    let lastTutorId = tutorRef.current.id;

    let frameId = 0;
    let disposed = false;
    const startMs = performance.now();
    let prevMs = startMs;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function updateScene(dt: number, elapsed: number, nowMs: number) {
      const activeTutor = tutorRef.current;

      // Instantaneous texture & facial anchor swap across the 5 tutors
      if (activeTutor.id !== lastTutorId) {
        lastTutorId = activeTutor.id;
        const nextTex = configureAndLoadTexture(activeTutor);
        if (nextTex) {
          bustMat.map = nextTex;
          bustMat.needsUpdate = true;
        }
        rigUniforms.uMouthUV.value.set(...activeTutor.facialAnchors.mouthUV);
        rigUniforms.uLeftEyeUV.value.set(...activeTutor.facialAnchors.leftEyeUV);
        rigUniforms.uRightEyeUV.value.set(...activeTutor.facialAnchors.rightEyeUV);
      }

      // Natural blinking
      if (nowMs >= nextBlinkAt) {
        blinkProgress += dt * 10.5;
        if (blinkProgress >= Math.PI) {
          blinkProgress = 0;
          nextBlinkAt = nowMs + 2400 + Math.random() * 2600;
        }
      }
      rigUniforms.uBlink.value = Math.sin(blinkProgress);

      // 50-Gesture Choreography Kinematics
      const gDef = gestureDefRef.current;
      const k = gDef.kinematics;
      const durSec = Math.max(0.8, k.durationMs / 1000);
      const gElapsed = (nowMs - gestureTimeRef.current) / 1000;

      // Living idle sway, breathing + active speaking head cadence
      const activelyTalking = isSpeakingRef.current || playbackRef.current.active;
      let targetPitch = Math.sin(elapsed * 1.1) * 0.036 + (activelyTalking ? Math.sin(elapsed * 5.2) * 0.038 : 0);
      let targetYaw = Math.sin(elapsed * 0.68) * 0.048 + (activelyTalking ? Math.sin(elapsed * 2.7) * 0.04 : 0);
      let targetRoll = Math.sin(elapsed * 0.52) * 0.024 + (activelyTalking ? Math.cos(elapsed * 3.1) * 0.025 : 0);
      let targetLeanZ = activelyTalking ? 0.018 : 0;
      let targetBounceY = Math.sin(elapsed * 1.85) * 0.008;
      let targetSwayX = 0;
      let targetZoomDelta = 0;
      let gestureSmileBoost = 0;
      let gestureBrowBoost = 0;
      let gestureJawPulse = 0;

      if (gElapsed < durSec) {
        const phase = gElapsed / durSec; // 0..1
        const env = Math.sin(phase * Math.PI); // Smooth bell envelope
        const osc = Math.sin(gElapsed * k.freqHz * Math.PI * 2);

        targetPitch += (k.headPitch * 0.75 + k.headPitch * 0.65 * osc) * env;
        targetYaw += (k.headYaw * 1.25 * (Math.abs(osc) > 0 ? osc : 1)) * env;
        targetRoll += k.headRoll * 1.2 * env;
        targetLeanZ += k.leanZ * 1.25 * env;
        targetBounceY += k.bounceY * 1.3 * Math.abs(osc) * env;
        targetSwayX += k.swayX * 1.25 * osc * env;
        targetZoomDelta += k.zoomDelta * env;
        gestureSmileBoost = k.smileBoost * env;
        gestureBrowBoost = k.browLift * env;
        gestureJawPulse = k.jawPulse * Math.max(0, osc) * env;
      }

      const kinDamp = 1 - Math.exp(-8.5 * dt);
      curPitch = THREE.MathUtils.lerp(curPitch, targetPitch, kinDamp);
      curYaw = THREE.MathUtils.lerp(curYaw, targetYaw, kinDamp);
      curRoll = THREE.MathUtils.lerp(curRoll, targetRoll, kinDamp);
      curLeanZ = THREE.MathUtils.lerp(curLeanZ, targetLeanZ, kinDamp);
      curBounceY = THREE.MathUtils.lerp(curBounceY, targetBounceY, kinDamp);
      curSwayX = THREE.MathUtils.lerp(curSwayX, targetSwayX, kinDamp);
      curZoomDelta = THREE.MathUtils.lerp(curZoomDelta, targetZoomDelta, kinDamp);

      // Apply torso kinematics to bustPivot & independent head kinematics to vertex shader
      bustPivot.position.set(curSwayX, 1.18 + curBounceY, -0.14 + curLeanZ);
      bustPivot.rotation.set(curPitch * 0.22, curYaw * 0.25, curRoll * 0.2);
      rigUniforms.uHeadPitch.value = curPitch * 0.72;
      rigUniforms.uHeadYaw.value = curYaw * 0.68;
      rigUniforms.uHeadRoll.value = curRoll * 0.74;

      // Camera preset + subtle gesture zoom breathing + mobile portrait framing
      const isNarrow = camera.aspect < 0.85;
      const mobileZ = isNarrow ? 0.52 : 0;
      const mobileTargetY = isNarrow ? -0.16 : 0;
      if (cameraPresetRef.current !== lastPreset) {
        lastPreset = cameraPresetRef.current;
        userInteracting = false;
      }
      if (!userInteracting) {
        if (cameraPresetRef.current === 'portrait') {
          _vecA.set(0, 1.40, 1.48 + mobileZ + curZoomDelta);
          _vecB.set(0, 1.28 + mobileTargetY, -0.05);
        } else if (cameraPresetRef.current === 'desk') {
          _vecA.set(0.32, 1.50, 2.24 + mobileZ * 0.6 + curZoomDelta);
          _vecB.set(0, 1.16 + mobileTargetY, 0.08);
        } else {
          _vecA.set(-0.56, 1.40, 1.62 + mobileZ + curZoomDelta);
          _vecB.set(0, 1.27 + mobileTargetY, -0.05);
        }
        const dampAlpha = 1 - Math.exp(-5 * dt);
        camera.position.lerp(_vecA, dampAlpha);
        controls.target.lerp(_vecB, dampAlpha);
      }
      controls.update();

      // Mood + gesture smile & brow targets
      let targetSmile = 0.2;
      let targetBrowLift = 0.05;
      const activeMood = moodRef.current;
      if (activeMood === 'happy') {
        targetSmile = 0.75;
        targetBrowLift = 0.25;
      } else if (activeMood === 'encouraging') {
        targetSmile = 0.55;
        targetBrowLift = 0.18;
      } else if (activeMood === 'thinking') {
        targetSmile = -0.05;
        targetBrowLift = 0.12;
      } else if (activeMood === 'surprised') {
        targetSmile = 0.35;
        targetBrowLift = 0.65;
      }

      const moodAlpha = 1 - Math.exp(-8 * dt);
      curSmile = THREE.MathUtils.lerp(curSmile, Math.min(1, targetSmile + gestureSmileBoost * 0.5), moodAlpha);
      curBrowLift = THREE.MathUtils.lerp(curBrowLift, Math.min(1, targetBrowLift + gestureBrowBoost * 0.6), moodAlpha);
      rigUniforms.uSmile.value = curSmile;
      rigUniforms.uBrowLift.value = curBrowLift;

      // Viseme Lip-Sync Sampling
      let targetJaw = gestureJawPulse;
      let targetRound = 0;
      let targetWidth = 0.25 + curSmile * 0.3;

      const timeline = playbackRef.current;
      if (timeline.active && timeline.frames.length > 0) {
        const elapsedAudioMs = nowMs - timeline.startedAtMs;
        const last = timeline.frames[timeline.frames.length - 1];
        if (elapsedAudioMs <= last.t + last.d + 150) {
          const w = sampleVisemeAt(timeline.frames, elapsedAudioMs);
          targetJaw = Math.max(targetJaw, w.jawOpen);
          targetRound = w.lipRound;
          targetWidth = Math.max(0.1, w.lipWidth);
        } else {
          timeline.active = false;
        }
      } else if (isSpeakingRef.current) {
        targetJaw = Math.max(targetJaw, 0.22 + Math.abs(Math.sin(elapsed * 14)) * 0.42);
        targetRound = (Math.cos(elapsed * 9) + 1) * 0.25;
        targetWidth = 0.45;
      }

      const visemeDamp = 1 - Math.exp(-26 * dt);
      curJaw = THREE.MathUtils.lerp(curJaw, targetJaw, visemeDamp);
      curLipRound = THREE.MathUtils.lerp(curLipRound, targetRound, visemeDamp);
      curLipWidth = THREE.MathUtils.lerp(curLipWidth, targetWidth, visemeDamp);

      rigUniforms.uJawOpen.value = curJaw;
      rigUniforms.uLipRound.value = curLipRound;
      rigUniforms.uLipWidth.value = curLipWidth;
    }

    function tick() {
      if (disposed) return;
      const nowMs = performance.now();
      const dt = Math.min((nowMs - prevMs) / 1000, 0.05);
      prevMs = nowMs;
      const elapsed = (nowMs - startMs) / 1000;
      updateScene(dt, elapsed, nowMs);
      renderer.render(scene, camera);
      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    const handleResize = () => {
      if (!container || disposed) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      if (w <= 0 || h <= 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);
    const resizeObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => handleResize()) : null;
    resizeObserver?.observe(container);

    return () => {
      disposed = true;
      window.clearTimeout(preloadTimer);
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      resizeObserver?.disconnect();
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      controls.dispose();
      disposables.forEach((d) => d.dispose());
      scene.environment?.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [fallback2D, playbackRef]);

  if (fallback2D) {
    return (
      <Animated2DFallbackStage
        tutor={tutor}
        activeGestureDef={activeGestureDef}
        gestureNonce={gestureNonce}
        isSpeaking={isSpeaking}
        playbackRef={playbackRef}
      />
    );
  }

  return (
    <div
      ref={mountRef}
      data-testid="tutor-3d-canvas"
      className="w-full h-full relative select-none"
    />
  );
}

function Animated2DFallbackStage({
  tutor,
  activeGestureDef,
  gestureNonce,
  isSpeaking,
  playbackRef,
}: {
  tutor: TutorProfile;
  activeGestureDef: GestureDefinition;
  gestureNonce: number;
  isSpeaking: boolean;
  playbackRef: React.MutableRefObject<PlaybackTimeline>;
}) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const mouthRef = useRef<HTMLDivElement | null>(null);
  const barsRef = useRef<HTMLSpanElement[]>([]);
  const gestureStartRef = useRef(performance.now());
  const gestureRef = useRef(activeGestureDef);
  const isSpeakingRef = useRef(isSpeaking);

  gestureRef.current = activeGestureDef;
  isSpeakingRef.current = isSpeaking;

  useEffect(() => {
    gestureStartRef.current = performance.now();
  }, [activeGestureDef.id, gestureNonce]);

  useEffect(() => {
    let raf = 0;
    const startMs = performance.now();

    const animate = () => {
      const nowMs = performance.now();
      const elapsed = (nowMs - startMs) / 1000;
      const g = gestureRef.current.kinematics;
      const gElapsed = (nowMs - gestureStartRef.current) / 1000;
      const dur = Math.max(0.8, g.durationMs / 1000);

      let tx = Math.sin(elapsed * 0.7) * 2.2;
      let ty = Math.sin(elapsed * 1.6) * 3.0;
      let rot = Math.sin(elapsed * 0.55) * 1.4;
      let scale = 1.01 + Math.sin(elapsed * 1.4) * 0.008;

      if (gElapsed < dur) {
        const env = Math.sin((gElapsed / dur) * Math.PI);
        const osc = Math.sin(gElapsed * g.freqHz * Math.PI * 2);
        tx += g.swayX * 80 * osc * env;
        ty += (g.bounceY * 140 * Math.abs(osc) + g.headPitch * 22 * osc) * env;
        rot += (g.headRoll * 16 + g.headYaw * 8 * osc) * env;
        scale += g.leanZ * 0.35 * env;
      }

      let jaw = 0;
      const tl = playbackRef.current;
      if (tl.active && tl.frames.length > 0) {
        const audioMs = nowMs - tl.startedAtMs;
        const last = tl.frames[tl.frames.length - 1];
        if (audioMs <= last.t + last.d + 150) {
          const w = sampleVisemeAt(tl.frames, audioMs);
          jaw = w.jawOpen;
        } else {
          tl.active = false;
        }
      } else if (isSpeakingRef.current) {
        jaw = 0.25 + Math.abs(Math.sin(elapsed * 13)) * 0.55;
      }

      if (jaw > 0.05) {
        ty += Math.sin(elapsed * 6.5) * jaw * 2.5;
        rot += Math.cos(elapsed * 3.2) * jaw * 1.2;
      }

      if (cardRef.current) {
        cardRef.current.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0) rotate(${rot.toFixed(2)}deg) scale(${scale.toFixed(4)})`;
      }

      if (mouthRef.current) {
        const openPx = Math.max(0, jaw * 12);
        mouthRef.current.style.opacity = jaw > 0.08 ? String(Math.min(0.85, jaw * 0.95)) : '0';
        mouthRef.current.style.transform = `translate(-50%, -50%) scaleY(${(0.35 + jaw * 1.35).toFixed(2)}) scaleX(${(0.85 + jaw * 0.2).toFixed(2)})`;
        mouthRef.current.style.height = `${Math.max(4, openPx)}px`;
      }

      const barHeights = [0.4, 0.75, 1.0, 0.65, 0.9, 0.5, 0.8, 0.45];
      barsRef.current.forEach((bar, idx) => {
        if (!bar) return;
        const activeScale = jaw > 0.05 ? 0.28 + Math.abs(Math.sin(elapsed * 10 + idx * 0.8)) * barHeights[idx] : 0.16;
        bar.style.height = `${Math.round(activeScale * 28)}px`;
        bar.style.opacity = jaw > 0.05 ? '0.95' : '0.35';
      });

      raf = requestAnimationFrame(animate);
    };

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [playbackRef]);

  const mouthLeftPct = `${(tutor.facialAnchors.mouthUV[0] * 100).toFixed(1)}%`;
  const mouthTopPct = `${((1 - tutor.facialAnchors.mouthUV[1]) * 100).toFixed(1)}%`;

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center bg-[#0c111d] px-4 py-4 overflow-hidden"
      data-testid="tutor-2d-fallback"
    >
      <div
        ref={cardRef}
        className="relative w-44 h-44 sm:w-72 sm:h-72 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl will-change-transform"
      >
        <img
          src={resolveAssetUrl(tutor.portraitUrl)}
          alt={tutor.name}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
        />
        {/* Animated mouth aperture aligned to tutor facial anchor */}
        <div
          ref={mouthRef}
          aria-hidden="true"
          className="absolute w-7 rounded-full bg-[#240a0d] blur-[1px] pointer-events-none opacity-0"
          style={{ left: mouthLeftPct, top: mouthTopPct }}
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/95 via-slate-950/50 to-transparent p-4">
          <p className="font-display text-lg font-semibold text-white">{tutor.name}</p>
          <p className="text-xs text-slate-300">
            {tutor.role} · {activeGestureDef.name}
          </p>
        </div>
      </div>
      <div className="mt-5 flex items-center gap-1.5 h-8" aria-label="Voice activity waveform">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((idx) => (
          <span
            key={idx}
            ref={(el) => {
              if (el) barsRef.current[idx] = el;
            }}
            className="w-1.5 rounded-full bg-sky-400 transition-[height] duration-75"
            style={{ height: '5px', opacity: 0.35 }}
          />
        ))}
      </div>
    </div>
  );
}
