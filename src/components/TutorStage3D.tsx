import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type {
  GestureDefinition,
  TutorExpressionPhoto,
  TutorMood,
  TutorProfile,
  VisemeFrame,
} from '../core/types';
import { resolveAssetUrl } from '../core/androidBridge';
import { TUTOR_PROFILES } from '../data/seedData';
import { sampleVisemePlaybackState, VISEME_ATLAS_COORDS } from '../core/viseme';
import { buildAlignedVisemeAtlas, type AlignedAtlasResult } from '../core/atlasAligner';

// Pre-allocated scratch objects (Zero GC inside render loop)
const _vecA = new THREE.Vector3();
const _vecB = new THREE.Vector3();

export interface PlaybackTimeline {
  startedAtMs: number;
  frames: VisemeFrame[];
  active: boolean;
  audioElement?: HTMLAudioElement | null;
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
  previewExpression?: TutorExpressionPhoto | null;
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
 * Sculpts a subdivided bust plane into a 3D studio relief so 3-point lighting & OrbitControls
 * produce natural depth & parallax while displaying real aligned Gemini Banana portrait frames.
 */
function createSculptedBustGeometry(size = 1.38, segments = 56): THREE.PlaneGeometry {
  const geo = new THREE.PlaneGeometry(size, size, segments, segments);
  const pos = geo.attributes.position as THREE.BufferAttribute;

  for (let i = 0; i < pos.count; i++) {
    const nx = pos.getX(i) / (size * 0.5);
    const ny = pos.getY(i) / (size * 0.5);

    const faceDx = nx / 0.28;
    const faceDy = (ny - 0.34) / 0.34;
    const faceDistSq = faceDx * faceDx + faceDy * faceDy;
    const faceRelief = 0.095 * Math.exp(-faceDistSq * 1.2);

    const noseDx = nx / 0.07;
    const noseDy = (ny - 0.32) / 0.095;
    const noseRelief = 0.022 * Math.exp(-(noseDx * noseDx + noseDy * noseDy) * 1.5);

    const neckDx = nx / 0.14;
    const neckDy = (ny - 0.02) / 0.18;
    const neckRelief = 0.055 * Math.exp(-(neckDx * neckDx + neckDy * neckDy) * 1.4);

    const torsoDx = nx / 0.56;
    const torsoDy = (ny + 0.45) / 0.44;
    const torsoRelief = 0.11 * Math.exp(-(torsoDx * torsoDx + torsoDy * torsoDy) * 1.05);

    pos.setZ(i, faceRelief + noseRelief + neckRelief + torsoRelief);
  }

  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

interface FacialRigUniforms {
  uLeftEyeUV: { value: THREE.Vector2 };
  uRightEyeUV: { value: THREE.Vector2 };
  uTileA: { value: THREE.Vector2 };
  uTileB: { value: THREE.Vector2 };
  uTileMix: { value: number };
  uBlink: { value: number };
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
  previewExpression = null,
}: TutorStage3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const tutorRef = useRef(tutor);
  const moodRef = useRef(mood);
  const gestureDefRef = useRef(activeGestureDef);
  const gestureTimeRef = useRef(performance.now());
  const isSpeakingRef = useRef(isSpeaking);
  const cameraPresetRef = useRef(cameraPreset);
  const previewExpRef = useRef(previewExpression);
  const onWebGlLostRef = useRef(onWebGlLost);

  tutorRef.current = tutor;
  moodRef.current = mood;
  gestureDefRef.current = activeGestureDef;
  isSpeakingRef.current = isSpeaking;
  cameraPresetRef.current = cameraPreset;
  previewExpRef.current = previewExpression;
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
    renderer.toneMappingExposure = 1.05;
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

    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 0.95);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff4e6, 1.4);
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

    const rimLight = new THREE.DirectionalLight(0x7dd3fc, 1.05);
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

    const mugGeo = new THREE.LatheGeometry(
      [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(0.036, 0),
        new THREE.Vector2(0.04, 0.085),
        new THREE.Vector2(0.034, 0.085),
        new THREE.Vector2(0.031, 0.01),
        new THREE.Vector2(0, 0.01),
      ],
      20,
    );
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
    // PHOTOREALISTIC GEMINI BANANA 4x4 VISEME & EXPRESSION ATLAS BUST
    // Zero UV mouth warping, zero flat overlays — pure aligned frame blending!
    // =========================================================================
    const tutorAtlasTextures = new Map<string, THREE.Texture>();

    // Placeholder 1x1 dark studio canvas while atlas finishes loading
    const placeholderCanvas = document.createElement('canvas');
    placeholderCanvas.width = 4;
    placeholderCanvas.height = 4;
    const pCtx = placeholderCanvas.getContext('2d');
    if (pCtx) {
      pCtx.fillStyle = '#0c111d';
      pCtx.fillRect(0, 0, 4, 4);
    }
    const placeholderTex = new THREE.CanvasTexture(placeholderCanvas);
    placeholderTex.colorSpace = THREE.SRGBColorSpace;
    disposables.push(placeholderTex);

    const loadTutorAtlasTexture = (profile: TutorProfile): THREE.Texture => {
      const existing = tutorAtlasTextures.get(profile.id);
      if (existing) return existing;

      // Return placeholder immediately until aligned atlas texture is allocated at full dimensions
      if (!tutorAtlasTextures.has(`__loading_${profile.id}`)) {
        tutorAtlasTextures.set(`__loading_${profile.id}`, placeholderTex);
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          if (disposed) return;
          const aligned = buildAlignedVisemeAtlas(img);
          const alignedTex = new THREE.CanvasTexture(aligned.canvas);
          alignedTex.colorSpace = THREE.SRGBColorSpace;
          alignedTex.anisotropy = isSoftwareGl ? 1 : maxAniso;
          alignedTex.generateMipmaps = false;
          alignedTex.minFilter = THREE.LinearFilter;
          alignedTex.magFilter = THREE.LinearFilter;
          alignedTex.wrapS = THREE.ClampToEdgeWrapping;
          alignedTex.wrapT = THREE.ClampToEdgeWrapping;
          alignedTex.needsUpdate = true;

          tutorAtlasTextures.set(profile.id, alignedTex);
          disposables.push(alignedTex);

          if (tutorRef.current.id === profile.id) {
            bustMat.map = alignedTex;
            bustMat.needsUpdate = true;
            if (container) {
              container.dataset.textureReady = 'true';
            }
            renderer.render(scene, camera);
          }
        };
        img.src = resolveAssetUrl(profile.visemeAtlasUrl);
      }

      return placeholderTex;
    };

    const initialTex = loadTutorAtlasTexture(tutorRef.current);
    const preloadTimer = window.setTimeout(() => {
      if (disposed) return;
      for (const profile of TUTOR_PROFILES) {
        if (profile.id !== tutorRef.current.id) {
          loadTutorAtlasTexture(profile);
        }
      }
    }, 350);

    const rigUniforms: FacialRigUniforms = {
      uLeftEyeUV: { value: new THREE.Vector2(...tutorRef.current.facialAnchors.leftEyeUV) },
      uRightEyeUV: { value: new THREE.Vector2(...tutorRef.current.facialAnchors.rightEyeUV) },
      uTileA: { value: new THREE.Vector2(0, 0) },
      uTileB: { value: new THREE.Vector2(3, 3) },
      uTileMix: { value: 0.35 },
      uBlink: { value: 0 },
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
    bustMat.customProgramCacheKey = () => 'gemini-banana-viseme-atlas-rig-v2';

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
          uniform vec2 uLeftEyeUV;
          uniform vec2 uRightEyeUV;
          uniform vec2 uTileA;
          uniform vec2 uTileB;
          uniform float uTileMix;
          uniform float uBlink;

          vec2 atlasCoord(vec2 localUv, vec2 tile) {
            // Clamp 1.6% inset inside each 4x4 cell to avoid bleeding across cell boundaries
            vec2 safeLocal = clamp(localUv, vec2(0.016), vec2(0.984));
            return vec2(tile.x * 0.25, (3.0 - tile.y) * 0.25) + safeLocal * 0.25;
          }`,
        )
        .replace(
          '#include <map_fragment>',
          `#ifdef USE_MAP
            vec2 localUv = vMapUv;

            // Gentle natural eye-lid closure ONLY around eyes (zero mouth UV distortion!)
            vec2 lDelta = localUv - uLeftEyeUV;
            vec2 rDelta = localUv - uRightEyeUV;
            float lEyeMask = exp(-((lDelta.x * lDelta.x) / 0.0007 + (lDelta.y * lDelta.y) / 0.00022));
            float rEyeMask = exp(-((rDelta.x * rDelta.x) / 0.0007 + (rDelta.y * rDelta.y) / 0.00022));
            float lLidFactor = smoothstep(-0.004, 0.008, lDelta.y) * lEyeMask;
            float rLidFactor = smoothstep(-0.004, 0.008, rDelta.y) * rEyeMask;
            localUv.y += (lLidFactor + rLidFactor) * uBlink * 0.009;

            vec4 texA = texture2D(map, atlasCoord(localUv, uTileA));
            vec4 texB = texture2D(map, atlasCoord(localUv, uTileB));

            // Keep lower shoulders anchored to Tile A and crossfade face + jaw expression cleanly
            float faceBlendRegion = smoothstep(0.16, 0.36, vMapUv.y);
            float effectiveMix = clamp(uTileMix, 0.0, 1.0) * faceBlendRegion;
            vec4 sampledDiffuseColor = mix(texA, texB, effectiveMix);

            // Subtle natural lash line at full blink peak
            float blinkLine = (lEyeMask + rEyeMask) * smoothstep(0.55, 0.96, uBlink);
            sampledDiffuseColor.rgb = mix(sampledDiffuseColor.rgb, sampledDiffuseColor.rgb * 0.62, blinkLine * 0.45);

            diffuseColor *= sampledDiffuseColor;

            // Feathered vignette so studio portrait melts smoothly into the 3D scene
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

    let curPitch = 0;
    let curYaw = 0;
    let curRoll = 0;
    let curLeanZ = 0;
    let curBounceY = 0;
    let curSwayX = 0;
    let curZoomDelta = 0;
    let curHappyBlend = 0.25;
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

      if (activeTutor.id !== lastTutorId) {
        lastTutorId = activeTutor.id;
        const nextTex = loadTutorAtlasTexture(activeTutor);
        bustMat.map = nextTex;
        bustMat.needsUpdate = true;
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

      const activelyTalking = isSpeakingRef.current || playbackRef.current.active;
      let targetPitch = Math.sin(elapsed * 1.1) * 0.036 + (activelyTalking ? Math.sin(elapsed * 5.2) * 0.036 : 0);
      let targetYaw = Math.sin(elapsed * 0.68) * 0.048 + (activelyTalking ? Math.sin(elapsed * 2.7) * 0.038 : 0);
      let targetRoll = Math.sin(elapsed * 0.52) * 0.024 + (activelyTalking ? Math.cos(elapsed * 3.1) * 0.022 : 0);
      let targetLeanZ = activelyTalking ? 0.018 : 0;
      let targetBounceY = Math.sin(elapsed * 1.85) * 0.008;
      let targetSwayX = 0;
      let targetZoomDelta = 0;
      let gestureSmileBoost = 0;

      if (gElapsed < durSec) {
        const phase = gElapsed / durSec;
        const env = Math.sin(phase * Math.PI);
        const osc = Math.sin(gElapsed * k.freqHz * Math.PI * 2);

        targetPitch += (k.headPitch * 0.75 + k.headPitch * 0.65 * osc) * env;
        targetYaw += k.headYaw * 1.25 * (Math.abs(osc) > 0 ? osc : 1) * env;
        targetRoll += k.headRoll * 1.2 * env;
        targetLeanZ += k.leanZ * 1.25 * env;
        targetBounceY += k.bounceY * 1.3 * Math.abs(osc) * env;
        targetSwayX += k.swayX * 1.25 * osc * env;
        targetZoomDelta += k.zoomDelta * env;
        gestureSmileBoost = k.smileBoost * env;
      }

      const kinDamp = 1 - Math.exp(-8.5 * dt);
      curPitch = THREE.MathUtils.lerp(curPitch, targetPitch, kinDamp);
      curYaw = THREE.MathUtils.lerp(curYaw, targetYaw, kinDamp);
      curRoll = THREE.MathUtils.lerp(curRoll, targetRoll, kinDamp);
      curLeanZ = THREE.MathUtils.lerp(curLeanZ, targetLeanZ, kinDamp);
      curBounceY = THREE.MathUtils.lerp(curBounceY, targetBounceY, kinDamp);
      curSwayX = THREE.MathUtils.lerp(curSwayX, targetSwayX, kinDamp);
      curZoomDelta = THREE.MathUtils.lerp(curZoomDelta, targetZoomDelta, kinDamp);

      bustPivot.position.set(curSwayX, 1.18 + curBounceY, -0.14 + curLeanZ);
      bustPivot.rotation.set(curPitch * 0.22, curYaw * 0.25, curRoll * 0.2);
      rigUniforms.uHeadPitch.value = curPitch * 0.72;
      rigUniforms.uHeadYaw.value = curYaw * 0.68;
      rigUniforms.uHeadRoll.value = curRoll * 0.74;

      const isNarrow = camera.aspect < 0.85;
      const mobileZ = isNarrow ? 0.52 : 0;
      const mobileTargetY = isNarrow ? -0.16 : 0;
      if (cameraPresetRef.current !== lastPreset) {
        lastPreset = cameraPresetRef.current;
        userInteracting = false;
      }
      if (!userInteracting) {
        if (cameraPresetRef.current === 'portrait') {
          _vecA.set(0, 1.4, 1.48 + mobileZ + curZoomDelta);
          _vecB.set(0, 1.28 + mobileTargetY, -0.05);
        } else if (cameraPresetRef.current === 'desk') {
          _vecA.set(0.32, 1.5, 2.24 + mobileZ * 0.6 + curZoomDelta);
          _vecB.set(0, 1.16 + mobileTargetY, 0.08);
        } else {
          _vecA.set(-0.56, 1.4, 1.62 + mobileZ + curZoomDelta);
          _vecB.set(0, 1.27 + mobileTargetY, -0.05);
        }
        const dampAlpha = 1 - Math.exp(-5 * dt);
        camera.position.lerp(_vecA, dampAlpha);
        controls.target.lerp(_vecB, dampAlpha);
      }
      controls.update();

      // Mood & real Gemini Banana tile selection
      const activeMood = moodRef.current;
      let idleHappyTarget = 0.28;
      if (activeMood === 'happy') idleHappyTarget = 0.88;
      else if (activeMood === 'encouraging') idleHappyTarget = 0.56;
      else if (activeMood === 'thinking') idleHappyTarget = 0.0;
      else if (activeMood === 'surprised') idleHappyTarget = 0.45;
      idleHappyTarget = Math.min(1, Math.max(0, idleHappyTarget + gestureSmileBoost * 0.35));
      curHappyBlend = THREE.MathUtils.lerp(curHappyBlend, idleHappyTarget, 1 - Math.exp(-6 * dt));

      const timeline = playbackRef.current;
      const preview = previewExpRef.current;
      let activeVisemeLabel = 'sil';
      let activeExpCode = 'M50';

      if (timeline.active && timeline.frames.length > 0) {
        const audioEl = timeline.audioElement;
        const elapsedAudioMs =
          audioEl && !audioEl.paused && audioEl.currentTime > 0
            ? audioEl.currentTime * 1000
            : nowMs - timeline.startedAtMs;
        const last = timeline.frames[timeline.frames.length - 1];
        if (elapsedAudioMs <= last.t + last.d + 150) {
          const sample = sampleVisemePlaybackState(timeline.frames, elapsedAudioMs);
          const coordA = VISEME_ATLAS_COORDS[sample.primaryViseme] ?? VISEME_ATLAS_COORDS.sil;
          const coordB = VISEME_ATLAS_COORDS[sample.nextViseme] ?? coordA;
          rigUniforms.uTileA.value.set(coordA.col, coordA.row);
          rigUniforms.uTileB.value.set(coordB.col, coordB.row);
          rigUniforms.uTileMix.value = sample.blendT;
          activeVisemeLabel = sample.primaryViseme;
          activeExpCode = sample.expressionCode;
        } else {
          timeline.active = false;
        }
      } else if (preview) {
        rigUniforms.uTileA.value.set(preview.tileCol, preview.tileRow);
        rigUniforms.uTileB.value.set(preview.blendTileCol, preview.blendTileRow);
        rigUniforms.uTileMix.value = preview.blendRatio;
        activeVisemeLabel = preview.visemeId;
        activeExpCode = preview.photoCode;
      } else if (isSpeakingRef.current) {
        const cycle = ['aa', 'E', 'O', 'PP', 'I', 'TH', 'U'] as const;
        const idx = Math.floor(elapsed * 8) % cycle.length;
        const nextIdx = (idx + 1) % cycle.length;
        const coordA = VISEME_ATLAS_COORDS[cycle[idx]];
        const coordB = VISEME_ATLAS_COORDS[cycle[nextIdx]];
        rigUniforms.uTileA.value.set(coordA.col, coordA.row);
        rigUniforms.uTileB.value.set(coordB.col, coordB.row);
        rigUniforms.uTileMix.value = (elapsed * 8) % 1;
        activeVisemeLabel = cycle[idx];
      } else {
        // Idle breathing expression: crossfade cleanly between resting neutral (0,0) and happy/surprised tile
        const idleSecondary =
          activeMood === 'surprised' ? VISEME_ATLAS_COORDS.E : VISEME_ATLAS_COORDS.happy;
        rigUniforms.uTileA.value.set(0, 0);
        rigUniforms.uTileB.value.set(idleSecondary.col, idleSecondary.row);
        rigUniforms.uTileMix.value = curHappyBlend;
        activeVisemeLabel = 'sil';
        activeExpCode = activeMood === 'happy' ? 'E51' : activeMood === 'thinking' ? 'E52' : 'M50';
      }

      if (container) {
        if (container.dataset.viseme !== activeVisemeLabel) {
          container.dataset.viseme = activeVisemeLabel;
        }
        if (container.dataset.expression !== activeExpCode) {
          container.dataset.expression = activeExpCode;
        }
      }
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
        mood={mood}
        activeGestureDef={activeGestureDef}
        gestureNonce={gestureNonce}
        isSpeaking={isSpeaking}
        playbackRef={playbackRef}
        previewExpression={previewExpression}
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
  mood,
  activeGestureDef,
  gestureNonce,
  isSpeaking,
  playbackRef,
  previewExpression = null,
}: {
  tutor: TutorProfile;
  mood: TutorMood;
  activeGestureDef: GestureDefinition;
  gestureNonce: number;
  isSpeaking: boolean;
  playbackRef: React.MutableRefObject<PlaybackTimeline>;
  previewExpression?: TutorExpressionPhoto | null;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const alignedAtlasRef = useRef<AlignedAtlasResult | null>(null);
  const barsRef = useRef<HTMLSpanElement[]>([]);
  const gestureStartRef = useRef(performance.now());
  const gestureRef = useRef(activeGestureDef);
  const isSpeakingRef = useRef(isSpeaking);
  const moodRef = useRef(mood);
  const previewRef = useRef(previewExpression);

  gestureRef.current = activeGestureDef;
  isSpeakingRef.current = isSpeaking;
  moodRef.current = mood;
  previewRef.current = previewExpression;

  useEffect(() => {
    gestureStartRef.current = performance.now();
  }, [activeGestureDef.id, gestureNonce]);

  useEffect(() => {
    let cancelled = false;
    alignedAtlasRef.current = null;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (cancelled) return;
      alignedAtlasRef.current = buildAlignedVisemeAtlas(img);
    };
    img.src = resolveAssetUrl(tutor.visemeAtlasUrl);
    return () => {
      cancelled = true;
    };
  }, [tutor.visemeAtlasUrl]);

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

      let coordA = VISEME_ATLAS_COORDS.sil;
      let coordB = VISEME_ATLAS_COORDS.happy;
      let blendT = moodRef.current === 'happy' ? 0.85 : moodRef.current === 'encouraging' ? 0.5 : 0.15;
      let jawEnergy = 0;
      let activeVisemeLabel = 'sil';
      let activeExpCode = 'M50';

      const tl = playbackRef.current;
      const preview = previewRef.current;

      if (tl.active && tl.frames.length > 0) {
        const audioEl = tl.audioElement;
        const audioMs =
          audioEl && !audioEl.paused && audioEl.currentTime > 0
            ? audioEl.currentTime * 1000
            : nowMs - tl.startedAtMs;
        const last = tl.frames[tl.frames.length - 1];
        if (audioMs <= last.t + last.d + 150) {
          const sample = sampleVisemePlaybackState(tl.frames, audioMs);
          coordA = VISEME_ATLAS_COORDS[sample.primaryViseme] ?? VISEME_ATLAS_COORDS.sil;
          coordB = VISEME_ATLAS_COORDS[sample.nextViseme] ?? coordA;
          blendT = sample.blendT;
          jawEnergy = sample.weights.jawOpen;
          activeVisemeLabel = sample.primaryViseme;
          activeExpCode = sample.expressionCode;
        } else {
          tl.active = false;
        }
      } else if (preview) {
        coordA = { col: preview.tileCol, row: preview.tileRow };
        coordB = { col: preview.blendTileCol, row: preview.blendTileRow };
        blendT = preview.blendRatio;
        jawEnergy = preview.jawOpen;
        activeVisemeLabel = preview.visemeId;
        activeExpCode = preview.photoCode;
      } else if (isSpeakingRef.current) {
        const cycle = ['aa', 'E', 'O', 'PP', 'I', 'TH', 'U'] as const;
        const idx = Math.floor(elapsed * 8) % cycle.length;
        coordA = VISEME_ATLAS_COORDS[cycle[idx]];
        coordB = VISEME_ATLAS_COORDS[cycle[(idx + 1) % cycle.length]];
        blendT = (elapsed * 8) % 1;
        jawEnergy = 0.45;
        activeVisemeLabel = cycle[idx];
      }

      if (jawEnergy > 0.05) {
        ty += Math.sin(elapsed * 6.5) * jawEnergy * 2.2;
        rot += Math.cos(elapsed * 3.2) * jawEnergy * 1.1;
      }

      if (cardRef.current) {
        cardRef.current.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0) rotate(${rot.toFixed(2)}deg) scale(${scale.toFixed(4)})`;
      }

      const canvas = canvasRef.current;
      const atlas = alignedAtlasRef.current;
      if (canvas && atlas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.globalAlpha = 1;
          ctx.drawImage(
            atlas.canvas,
            coordA.col * atlas.tileW,
            coordA.row * atlas.tileH,
            atlas.tileW,
            atlas.tileH,
            0,
            0,
            canvas.width,
            canvas.height,
          );
          if (blendT > 0.01) {
            ctx.globalAlpha = Math.min(1, Math.max(0, blendT));
            ctx.drawImage(
              atlas.canvas,
              coordB.col * atlas.tileW,
              coordB.row * atlas.tileH,
              atlas.tileW,
              atlas.tileH,
              0,
              0,
              canvas.width,
              canvas.height,
            );
            ctx.globalAlpha = 1;
          }
        }
      }

      if (rootRef.current) {
        if (rootRef.current.dataset.viseme !== activeVisemeLabel) {
          rootRef.current.dataset.viseme = activeVisemeLabel;
        }
        if (rootRef.current.dataset.expression !== activeExpCode) {
          rootRef.current.dataset.expression = activeExpCode;
        }
      }

      const barHeights = [0.4, 0.75, 1.0, 0.65, 0.9, 0.5, 0.8, 0.45];
      barsRef.current.forEach((bar, idx) => {
        if (!bar) return;
        const activeScale =
          jawEnergy > 0.05 ? 0.28 + Math.abs(Math.sin(elapsed * 10 + idx * 0.8)) * barHeights[idx] : 0.16;
        bar.style.height = `${Math.round(activeScale * 28)}px`;
        bar.style.opacity = jawEnergy > 0.05 ? '0.95' : '0.35';
      });

      raf = requestAnimationFrame(animate);
    };

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [playbackRef]);

  return (
    <div
      ref={rootRef}
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
        <canvas
          ref={canvasRef}
          width={320}
          height={320}
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
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
