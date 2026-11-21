import * as THREE from 'three';

const WOOD_TEX_PATH = '/src/assets/images/tex_wood_plank_1795030402489.jpg';
const WALL_TEX_PATH = '/src/assets/images/tex_stone_wall_1795030402404.jpg';

export interface MansionTexturePack {
  woodColor: THREE.Texture;
  wallColor: THREE.Texture;
  wallpaperColor: THREE.CanvasTexture;
  wallpaperBump: THREE.CanvasTexture;
  rugColor: THREE.CanvasTexture;
  fabricBump: THREE.CanvasTexture;
  skinBump: THREE.CanvasTexture;
  snowBump: THREE.CanvasTexture;
  woodBump: THREE.CanvasTexture;
  contactShadowTex: THREE.CanvasTexture;
  moonWindowTex: THREE.CanvasTexture;
  dispose: () => void;
}

function createProceduralNoiseTexture(size: number, contrast: number, streakX: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const d = img.data;

  for (let y = 0; y < size; y++) {
    const rowWave = streakX ? Math.sin(y * 0.19) * 18 : 0;
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const grain = ((Math.sin(x * 0.14 + y * 0.07) + Math.cos(x * 0.05 - y * 0.12)) * 0.5 + 0.5) * contrast;
      const noise = (Math.random() - 0.5) * (contrast * 0.5);
      const val = Math.max(0, Math.min(255, 128 + grain - contrast * 0.5 + rowWave + noise));
      d[idx] = val;
      d[idx + 1] = val;
      d[idx + 2] = val;
      d[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

function createWallpaperTextures(): { color: THREE.CanvasTexture; bump: THREE.CanvasTexture } {
  const size = 256;
  const cCanvas = document.createElement('canvas');
  cCanvas.width = size;
  cCanvas.height = size;
  const cCtx = cCanvas.getContext('2d')!;

  const bCanvas = document.createElement('canvas');
  bCanvas.width = size;
  bCanvas.height = size;
  const bCtx = bCanvas.getContext('2d')!;

  cCtx.fillStyle = '#241819';
  cCtx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#7a7a7a';
  bCtx.fillRect(0, 0, size, size);

  // Subtle Victorian vertical damask stripe & linen weave
  for (let x = 0; x < size; x += 32) {
    cCtx.fillStyle = x % 64 === 0 ? '#2c1d1e' : '#1e1415';
    cCtx.fillRect(x, 0, 14, size);
    bCtx.fillStyle = x % 64 === 0 ? '#969696' : '#707070';
    bCtx.fillRect(x, 0, 14, size);

    for (let y = 16; y < size; y += 48) {
      cCtx.strokeStyle = 'rgba(180, 140, 100, 0.08)';
      cCtx.lineWidth = 1.5;
      cCtx.beginPath();
      cCtx.ellipse(x + 7, y, 5, 10, 0, 0, Math.PI * 2);
      cCtx.stroke();

      bCtx.strokeStyle = '#b4b4b4';
      bCtx.lineWidth = 1.5;
      bCtx.beginPath();
      bCtx.ellipse(x + 7, y, 5, 10, 0, 0, Math.PI * 2);
      bCtx.stroke();
    }
  }

  // Fine plaster grain
  cCtx.fillStyle = 'rgba(0,0,0,0.08)';
  for (let i = 0; i < 650; i++) {
    cCtx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
  }

  const color = new THREE.CanvasTexture(cCanvas);
  color.colorSpace = THREE.SRGBColorSpace;
  color.wrapS = THREE.RepeatWrapping;
  color.wrapT = THREE.RepeatWrapping;
  color.repeat.set(4, 2);

  const bump = new THREE.CanvasTexture(bCanvas);
  bump.colorSpace = THREE.NoColorSpace;
  bump.wrapS = THREE.RepeatWrapping;
  bump.wrapT = THREE.RepeatWrapping;
  bump.repeat.set(4, 2);

  return { color, bump };
}

function createRugTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#4c1013';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = '#926c2f';
  ctx.lineWidth = 8;
  ctx.strokeRect(12, 12, size - 24, size - 24);
  ctx.strokeStyle = '#29090b';
  ctx.lineWidth = 4;
  ctx.strokeRect(24, 24, size - 48, size - 48);

  // Center diamond medallion
  ctx.fillStyle = '#2d0b0d';
  ctx.beginPath();
  ctx.moveTo(size / 2, 46);
  ctx.lineTo(size - 46, size / 2);
  ctx.lineTo(size / 2, size - 46);
  ctx.lineTo(46, size / 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#a17735';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createFabricWeaveBump(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const d = img.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const weave = ((x + y) % 4 < 2 ? 18 : -18) + (Math.sin(x * 0.7) * Math.cos(y * 0.7) * 14);
      const val = Math.max(0, Math.min(255, 128 + weave + (Math.random() - 0.5) * 10));
      d[idx] = val;
      d[idx + 1] = val;
      d[idx + 2] = val;
      d[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

function createMoonWindowTexture(): THREE.CanvasTexture {
  const w = 128;
  const h = 192;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#1e293b');
  grad.addColorStop(0.55, '#334155');
  grad.addColorStop(1, '#0f172a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Subtle moonlight halo
  const moonGrad = ctx.createRadialGradient(w * 0.65, h * 0.28, 4, w * 0.65, h * 0.28, 48);
  moonGrad.addColorStop(0, 'rgba(226, 232, 240, 0.65)');
  moonGrad.addColorStop(1, 'rgba(148, 163, 184, 0)');
  ctx.fillStyle = moonGrad;
  ctx.fillRect(0, 0, w, h);

  // Mullion grid
  ctx.fillStyle = '#18110e';
  ctx.fillRect(w / 2 - 4, 0, 8, h);
  ctx.fillRect(0, h * 0.33 - 3, w, 6);
  ctx.fillRect(0, h * 0.66 - 3, w, 6);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(0,0,0,0.68)');
  grad.addColorStop(0.55, 'rgba(0,0,0,0.32)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function loadMansionTextures(renderer: THREE.WebGLRenderer): MansionTexturePack {
  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const loader = new THREE.TextureLoader();

  const woodColor = loader.load(WOOD_TEX_PATH);
  woodColor.colorSpace = THREE.SRGBColorSpace;
  woodColor.wrapS = THREE.RepeatWrapping;
  woodColor.wrapT = THREE.RepeatWrapping;
  woodColor.repeat.set(6, 6);
  woodColor.anisotropy = maxAniso;

  const wallColor = loader.load(WALL_TEX_PATH);
  wallColor.colorSpace = THREE.SRGBColorSpace;
  wallColor.wrapS = THREE.RepeatWrapping;
  wallColor.wrapT = THREE.RepeatWrapping;
  wallColor.repeat.set(3, 1);
  wallColor.anisotropy = maxAniso;

  const wallpaper = createWallpaperTextures();
  wallpaper.color.anisotropy = maxAniso;

  const rugColor = createRugTexture();
  rugColor.anisotropy = maxAniso;

  const fabricBump = createFabricWeaveBump();
  const skinBump = createProceduralNoiseTexture(128, 12, false);

  const woodBump = createProceduralNoiseTexture(256, 48, true);
  woodBump.repeat.set(6, 6);
  woodBump.anisotropy = maxAniso;

  const snowBump = createProceduralNoiseTexture(256, 36, false);
  snowBump.repeat.set(16, 16);

  const contactShadowTex = createContactShadowTexture();
  const moonWindowTex = createMoonWindowTexture();

  return {
    woodColor,
    wallColor,
    wallpaperColor: wallpaper.color,
    wallpaperBump: wallpaper.bump,
    rugColor,
    fabricBump,
    skinBump,
    snowBump,
    woodBump,
    contactShadowTex,
    moonWindowTex,
    dispose: () => {
      woodColor.dispose();
      wallColor.dispose();
      wallpaper.color.dispose();
      wallpaper.bump.dispose();
      rugColor.dispose();
      fabricBump.dispose();
      skinBump.dispose();
      woodBump.dispose();
      snowBump.dispose();
      contactShadowTex.dispose();
      moonWindowTex.dispose();
    },
  };
}
