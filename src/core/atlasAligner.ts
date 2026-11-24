export interface AlignedAtlasResult {
  canvas: HTMLCanvasElement;
  tileW: number;
  tileH: number;
}

/**
 * Normalizes and eye-bridge aligns all 16 panels of a 4x4 Gemini Banana viseme atlas
 * against tile (0, 0) so switching/crossfading between phonemes never causes head jitter
 * or UV-warp distortion.
 */
export function buildAlignedVisemeAtlas(img: HTMLImageElement): AlignedAtlasResult {
  const srcW = img.naturalWidth || img.width || 1024;
  const srcH = img.naturalHeight || img.height || 1024;
  const tileW = Math.floor(srcW / 4);
  const tileH = Math.floor(srcH / 4);

  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = tileW * 4;
  srcCanvas.height = tileH * 4;
  const srcCtx = srcCanvas.getContext('2d', { willReadFrequently: true });

  const outCanvas = document.createElement('canvas');
  outCanvas.width = tileW * 4;
  outCanvas.height = tileH * 4;
  const outCtx = outCanvas.getContext('2d');

  if (!srcCtx || !outCtx) {
    if (outCtx) outCtx.drawImage(img, 0, 0, outCanvas.width, outCanvas.height);
    return { canvas: outCanvas, tileW, tileH };
  }

  srcCtx.drawImage(img, 0, 0, srcCanvas.width, srcCanvas.height);

  // Fast upper-face (eyes & nose bridge) correlation patch relative to each tile
  const patchX = Math.floor(tileW * 0.34);
  const patchY = Math.floor(tileH * 0.27);
  const patchW = Math.max(16, Math.floor(tileW * 0.32));
  const patchH = Math.max(12, Math.floor(tileH * 0.16));

  let refData: ImageData | null = null;
  try {
    refData = srcCtx.getImageData(patchX, patchY, patchW, patchH);
  } catch {
    outCtx.drawImage(img, 0, 0, outCanvas.width, outCanvas.height);
    return { canvas: outCanvas, tileW, tileH };
  }

  const maxShift = Math.min(10, Math.max(4, Math.floor(tileW * 0.035)));
  const tileScratch = document.createElement('canvas');
  tileScratch.width = tileW;
  tileScratch.height = tileH;
  const scratchCtx = tileScratch.getContext('2d', { willReadFrequently: true });

  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const sx = col * tileW;
      const sy = row * tileH;

      if ((col === 0 && row === 0) || !scratchCtx) {
        outCtx.drawImage(srcCanvas, sx, sy, tileW, tileH, sx, sy, tileW, tileH);
        continue;
      }

      let bestDx = 0;
      let bestDy = 0;
      let bestScore = Number.POSITIVE_INFINITY;

      try {
        const searchPad = maxShift;
        const cand = srcCtx.getImageData(
          sx + patchX - searchPad,
          sy + patchY - searchPad,
          patchW + searchPad * 2,
          patchH + searchPad * 2,
        );
        const candW = cand.width;

        for (let dy = -maxShift; dy <= maxShift; dy++) {
          for (let dx = -maxShift; dx <= maxShift; dx++) {
            let sad = 0;
            for (let y = 0; y < patchH; y += 2) {
              for (let x = 0; x < patchW; x += 2) {
                const ri = (y * patchW + x) * 4;
                const cx = x + searchPad + dx;
                const cy = y + searchPad + dy;
                const ci = (cy * candW + cx) * 4;
                const rl = refData.data[ri] * 0.3 + refData.data[ri + 1] * 0.59 + refData.data[ri + 2] * 0.11;
                const cl = cand.data[ci] * 0.3 + cand.data[ci + 1] * 0.59 + cand.data[ci + 2] * 0.11;
                sad += Math.abs(rl - cl);
              }
            }
            if (sad < bestScore) {
              bestScore = sad;
              bestDx = dx;
              bestDy = dy;
            }
          }
        }
      } catch {
        bestDx = 0;
        bestDy = 0;
      }

      // Draw edge-padded backdrop of same tile first so shifting leaves zero border seams
      scratchCtx.fillStyle = '#0c111d';
      scratchCtx.fillRect(0, 0, tileW, tileH);
      scratchCtx.drawImage(srcCanvas, sx, sy, tileW, tileH, 0, 0, tileW, tileH);
      scratchCtx.drawImage(srcCanvas, sx, sy, tileW, tileH, -bestDx, -bestDy, tileW, tileH);

      outCtx.drawImage(tileScratch, 0, 0, tileW, tileH, sx, sy, tileW, tileH);
    }
  }

  return { canvas: outCanvas, tileW, tileH };
}
