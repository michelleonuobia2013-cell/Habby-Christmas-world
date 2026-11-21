import type { BabyState, CameraMode } from './types';

export interface Vec3Like {
  x: number;
  y: number;
  z: number;
}

export interface GazeCheckInput {
  cameraMode: CameraMode;
  cameraPos: Vec3Like;
  cameraForward: Vec3Like; // Normalized forward vector of active third-person camera
  playerEyePos: Vec3Like;
  babyEyePos: Vec3Like;
  babyForward: Vec3Like; // Normalized forward vector of Baby Nicholas's infant head
  babyState: BabyState;
  lineOfSightBlocked: boolean; // True if raycast between camera/eye and baby eyes hits wall/furniture
  dt: number; // Clamped delta time in seconds
  currentExposureSec: number;
  thresholdSec: number; // e.g., 1.45s
  isPausedOrCutscene?: boolean;
  isHiding?: boolean; // Hiding inside wardrobe, under bed, or behind sofa shields direct gaze
  isNightActive?: boolean; // Crimson eyes ignite at night / supernatural states
}

export type GazePhase = 'safe' | 'warning' | 'triggered';

export interface GazeCheckResult {
  isDirectEyeContact: boolean;
  exposureSec: number;
  progress: number; // 0..1
  phase: GazePhase;
  eyeGlowIntensity: number; // 0 (natural calm infant eyes) -> 1+ (crimson glow) -> 3.0 (triggered)
  distance: number;
  cameraAlignment: number;
  babyAlignment: number;
}

function normalize(v: Vec3Like): Vec3Like {
  const len = Math.hypot(v.x, v.y, v.z);
  if (len < 1e-6) return { x: 0, y: 0, z: 1 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function dot(a: Vec3Like, b: Vec3Like): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

/**
 * Evaluates THE DEVIL'S GAZE in both First-Person and Third-Person camera modes.
 * Requires:
 *  1) Camera aimed cleanly toward Baby Nicholas's eyes (~23° cone)
 *  2) Baby Nicholas's infant head turned toward the Nanny / observer
 *  3) Unobstructed line of sight (not blocked by walls, closed doors, or hiding furniture)
 *  4) Player is NOT currently concealed in a hiding spot
 *  5) Baby Nicholas's supernatural nighttime crimson eyes are active
 */
export function evaluateDevilsGaze(input: GazeCheckInput): GazeCheckResult {
  const nightActive = input.isNightActive ?? true;

  if (input.isPausedOrCutscene || input.isHiding) {
    return {
      isDirectEyeContact: false,
      exposureSec: Math.max(0, input.currentExposureSec - input.dt * 2.5),
      progress: 0,
      phase: 'safe',
      eyeGlowIntensity: nightActive && input.babyState === 'supernatural' ? 0.85 : 0.04,
      distance: 99,
      cameraAlignment: 0,
      babyAlignment: 0,
    };
  }

  const origin = input.cameraMode === 'first-person' ? input.cameraPos : input.playerEyePos;
  const dx = input.babyEyePos.x - origin.x;
  const dy = input.babyEyePos.y - origin.y;
  const dz = input.babyEyePos.z - origin.z;
  const distance = Math.hypot(dx, dy, dz);

  const camDx = input.babyEyePos.x - input.cameraPos.x;
  const camDy = input.babyEyePos.y - input.cameraPos.y;
  const camDz = input.babyEyePos.z - input.cameraPos.z;
  const camDist = Math.hypot(camDx, camDy, camDz);

  const dirFromOrigin = normalize({ x: dx, y: dy, z: dz });
  const dirFromCam = normalize({ x: camDx, y: camDy, z: camDz });
  const camFwd = normalize(input.cameraForward);
  const babyFwd = normalize(input.babyForward);

  const cameraAlignment = dot(camFwd, dirFromCam);
  const dirBabyToObserver = {
    x: -dirFromOrigin.x,
    y: -dirFromOrigin.y,
    z: -dirFromOrigin.z,
  };
  const babyAlignment = dot(babyFwd, dirBabyToObserver);

  // Mutual camera alignment (~23° cone) + infant facing observer
  const minCamDot = input.cameraMode === 'first-person' ? 0.91 : 0.918;
  const minBabyFacingDot = 0.55;
  const maxRange = 16.0;

  const isRedEyeState =
    nightActive &&
    (input.babyState === 'supernatural' ||
      input.babyState === 'suspicious' ||
      input.babyState === 'silent');

  const isDirectEyeContact =
    !input.lineOfSightBlocked &&
    isRedEyeState &&
    distance <= maxRange &&
    camDist <= maxRange + 5.5 &&
    cameraAlignment >= minCamDot &&
    babyAlignment >= minBabyFacingDot;

  const safeThreshold = Math.max(0.65, input.thresholdSec);
  let nextExposure = input.currentExposureSec;

  if (isDirectEyeContact) {
    const proximityBoost = distance < 4.5 ? 1.25 : 1.0;
    nextExposure = Math.min(safeThreshold, nextExposure + input.dt * proximityBoost);
  } else {
    nextExposure = Math.max(0, nextExposure - input.dt * 1.9);
  }

  const progress = Math.min(1, nextExposure / safeThreshold);

  let phase: GazePhase = 'safe';
  if (progress >= 1.0) {
    phase = 'triggered';
  } else if (progress >= 0.2) {
    phase = 'warning';
  }

  let eyeGlowIntensity = 0.0;
  if (nightActive) {
    if (input.babyState === 'supernatural') eyeGlowIntensity = 0.9;
    else if (input.babyState === 'suspicious' || input.babyState === 'silent') eyeGlowIntensity = 0.48;
    else eyeGlowIntensity = 0.05;
  }

  if (phase === 'warning') {
    eyeGlowIntensity = 1.05 + progress * 1.5;
  } else if (phase === 'triggered') {
    eyeGlowIntensity = 3.2;
  }

  return {
    isDirectEyeContact,
    exposureSec: nextExposure,
    progress,
    phase,
    eyeGlowIntensity,
    distance,
    cameraAlignment,
    babyAlignment,
  };
}
