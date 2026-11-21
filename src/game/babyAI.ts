import type { BabyState } from './types';
import type { Vec3Like } from './devilGaze';

export interface BabyAIContext {
  babyPos: Vec3Like;
  playerPos: Vec3Like;
  playerSprinting: boolean;
  playerCrouching: boolean;
  playerHiding?: boolean;
  flashlightOn: boolean;
  inGameMinutes: number; // Minutes past midnight (0 = 00:00, 197 = 03:17, 720 = 12:00 PM)
  level: number;
  objectivesCompleted: number;
  totalObjectives: number;
  speedMultiplier: number;
  recentSoundEvent: boolean;
  playerLookingAtBaby: boolean;
  elapsedSeconds: number;
  lastRelocateTime: number;
}

export interface BabyAIDecision {
  nextState: BabyState;
  targetPos: Vec3Like;
  moveSpeed: number;
  shouldTeleportHidden: boolean;
  turnEyesRed: boolean;
  isNightActive: boolean;
  shouldFacePlayer: boolean;
  trigger317Event: boolean;
  directorCue: string | null;
}

export const HIDING_SPOTS: readonly Vec3Like[] = [
  { x: -6.5, y: 0, z: -7.5 }, // Nursery crib corner
  { x: 5.8, y: 0, z: -3.2 },  // Behind Christmas tree
  { x: -6.2, y: 0, z: 3.4 },  // Kitchen cupboard alcove
  { x: 1.5, y: 0, z: -8.0 },  // Hallway shadow nook
  { x: 6.4, y: 0, z: 5.5 },   // Parlor armchair shadow
];

export const MINUTE_317 = 3 * 60 + 17; // 197 minutes after midnight = 03:17 AM

export function is317Window(inGameMinutes: number): boolean {
  const m = ((Math.floor(inGameMinutes) % 1440) + 1440) % 1440;
  return m >= MINUTE_317 && m <= MINUTE_317 + 2;
}

/**
 * Returns true during nighttime / haunted hours (19:00..23:59 or 00:00..05:30).
 * During calm daytime intervals (06:00..18:59), Baby Nicholas acts like an ordinary infant.
 */
export function isNightTimeWindow(inGameMinutes: number): boolean {
  const m = ((Math.floor(inGameMinutes) % 1440) + 1440) % 1440;
  return m < 330 || m >= 1140;
}

export function stepBabyAI(ctx: BabyAIContext): BabyAIDecision {
  const dx = ctx.playerPos.x - ctx.babyPos.x;
  const dz = ctx.playerPos.z - ctx.babyPos.z;
  const dist = Math.hypot(dx, dz);

  const rule317Active = is317Window(ctx.inGameMinutes);
  const nightActive = isNightTimeWindow(ctx.inGameMinutes) || rule317Active;
  const progressRatio = ctx.totalObjectives > 0 ? ctx.objectivesCompleted / ctx.totalObjectives : 0;

  let nextState: BabyState = 'normal';
  if (!nightActive) {
    // Daytime behavior: calm infant resting or playfully crawling near crib
    nextState = ctx.elapsedSeconds % 24 > 12 ? 'playful' : 'normal';
  } else if (rule317Active || ctx.level >= 8 || progressRatio >= 0.67) {
    nextState = 'supernatural';
  } else if (ctx.playerHiding) {
    // Player is hidden; baby prowls suspiciously looking around the nursery/parlor
    nextState = 'silent';
  } else if (ctx.playerLookingAtBaby || ctx.recentSoundEvent) {
    nextState = 'suspicious';
  } else if (ctx.playerSprinting && dist < 6) {
    nextState = 'silent';
  } else if (ctx.objectivesCompleted === 0 && ctx.elapsedSeconds < 16) {
    nextState = ctx.elapsedSeconds > 8 ? 'playful' : 'normal';
  } else if (ctx.flashlightOn && dist < 3.2 && ctx.level <= 3) {
    nextState = 'frightened';
  } else {
    nextState = progressRatio > 0.3 ? 'suspicious' : 'playful';
  }

  let targetPos: Vec3Like = { ...ctx.babyPos };
  let moveSpeed = 0;
  let shouldTeleportHidden = false;
  let shouldFacePlayer = !ctx.playerHiding;
  let directorCue: string | null = null;

  const canRelocate = ctx.elapsedSeconds - ctx.lastRelocateTime > 12;

  if (!nightActive) {
    // Realistic calm infant roaming gently near nursery crib
    const spotIdx = Math.floor(ctx.elapsedSeconds / 14) % 2;
    targetPos = spotIdx === 0 ? { x: -5.4, y: 0, z: -7.2 } : { x: -3.8, y: 0, z: -5.5 };
    moveSpeed = 0.45;
    shouldFacePlayer = dist < 4;
  } else if (ctx.playerHiding) {
    // When nanny hides, Baby Nicholas crawls toward search spots instead of locking on
    const spotIdx = Math.floor(ctx.elapsedSeconds / 7) % HIDING_SPOTS.length;
    targetPos = { ...HIDING_SPOTS[spotIdx] };
    moveSpeed = 0.9 * ctx.speedMultiplier;
    shouldFacePlayer = false;
  } else if (nextState === 'frightened') {
    const spot = HIDING_SPOTS[Math.floor(ctx.elapsedSeconds) % HIDING_SPOTS.length];
    targetPos = { ...spot };
    moveSpeed = 1.45 * ctx.speedMultiplier;
    shouldFacePlayer = false;
  } else if (nextState === 'supernatural') {
    if (!ctx.playerLookingAtBaby && dist > 6.5 && canRelocate) {
      const angle = (ctx.elapsedSeconds * 1.7) % (Math.PI * 2);
      targetPos = {
        x: Math.max(-8.2, Math.min(8.2, ctx.playerPos.x + Math.cos(angle) * 4.2)),
        y: 0,
        z: Math.max(-8.2, Math.min(8.2, ctx.playerPos.z + Math.sin(angle) * 4.2)),
      };
      shouldTeleportHidden = true;
      directorCue = 'Tiny footsteps patter behind you—Baby Nicholas is no longer in his crib.';
    } else if (dist > 2.4) {
      targetPos = { ...ctx.playerPos };
      // Realistic crawling baby pace
      moveSpeed = (ctx.playerCrouching ? 0.95 : 1.38) * ctx.speedMultiplier;
    }
  } else if (nextState === 'suspicious' || nextState === 'silent') {
    if (ctx.playerLookingAtBaby) {
      moveSpeed = 0;
      shouldFacePlayer = true;
    } else if (dist > 3.0) {
      targetPos = { ...ctx.playerPos };
      moveSpeed = 1.0 * ctx.speedMultiplier;
    }
  } else if (nextState === 'playful') {
    const spotIdx = Math.floor(ctx.elapsedSeconds / 9) % HIDING_SPOTS.length;
    targetPos = { ...HIDING_SPOTS[spotIdx] };
    moveSpeed = 0.85 * ctx.speedMultiplier;
    if (canRelocate && !ctx.playerLookingAtBaby && dist > 8.5) {
      shouldTeleportHidden = true;
    }
  }

  if (rule317Active) {
    directorCue = '3:17 AM — Nicholas\'s eyes ignite red as the Living House awakens.';
  }

  const turnEyesRed =
    nightActive &&
    (nextState === 'supernatural' ||
      nextState === 'suspicious' ||
      nextState === 'silent' ||
      rule317Active);

  return {
    nextState,
    targetPos,
    moveSpeed,
    shouldTeleportHidden,
    turnEyesRed,
    isNightActive: nightActive,
    shouldFacePlayer,
    trigger317Event: rule317Active,
    directorCue,
  };
}

export interface SantaEntityContext {
  santaPos: Vec3Like;
  playerPos: Vec3Like;
  playerHiding: boolean;
  playerCrouching: boolean;
  lineOfSightBlocked: boolean;
  isNightActive: boolean;
  is317Active: boolean;
  level: number;
  elapsedSeconds: number;
  dt: number;
}

export interface SantaEntityResult {
  nextPos: Vec3Like;
  yaw: number;
  behavior: 'patrol' | 'stalking' | 'searching' | 'caught';
  distanceToPlayer: number;
  warningCue: string | null;
}

const SANTA_WAYPOINTS: readonly Vec3Like[] = [
  { x: 6.2, y: 0, z: 14.5 },   // Front snow yard
  { x: 0.0, y: 0, z: 10.2 },   // Porch steps
  { x: 3.4, y: 0, z: 3.8 },    // Estate foyer
  { x: 6.4, y: 0, z: -1.5 },   // Living room tree perimeter
  { x: 1.5, y: 0, z: 5.5 },    // Hallway return
  { x: -3.5, y: 0, z: 12.8 },  // Streetlamp treeline
];

/**
 * Pure patrol & stealth-avoidance logic for the Evil Santa Entity.
 * Hiding inside a wardrobe, under a bed, or behind a sofa completely conceals the Nanny
 * from Santa's line of sight so stealth hiding is genuinely tactical and fair.
 */
export function stepSantaEntityAI(ctx: SantaEntityContext): SantaEntityResult {
  const dx = ctx.playerPos.x - ctx.santaPos.x;
  const dz = ctx.playerPos.z - ctx.santaPos.z;
  const distanceToPlayer = Math.hypot(dx, dz);

  // Detection range shrinks when player crouches; completely concealed when hiding
  const detectRange = ctx.playerCrouching ? 5.2 : 8.8;
  const canSeePlayer =
    ctx.isNightActive &&
    !ctx.playerHiding &&
    !ctx.lineOfSightBlocked &&
    distanceToPlayer <= detectRange &&
    (ctx.is317Active || ctx.level >= 2 || ctx.elapsedSeconds > 28);

  let behavior: SantaEntityResult['behavior'] = 'patrol';
  let target: Vec3Like;
  let speed = 1.35;
  let warningCue: string | null = null;

  if (canSeePlayer) {
    if (distanceToPlayer <= 1.25) {
      behavior = 'caught';
      target = { ...ctx.playerPos };
      speed = 0;
    } else {
      behavior = 'stalking';
      target = { ...ctx.playerPos };
      speed = ctx.is317Active ? 2.45 : 1.95;
      warningCue = 'Heavy snow-crusted boots stride behind you—HIDE in a wardrobe or under a bed!';
    }
  } else {
    if (ctx.playerHiding && distanceToPlayer < 7.5) {
      behavior = 'searching';
      warningCue = 'Heavy breathing passes right outside your hiding spot... stay hidden.';
    }
    // Enters mansion briefly during 3:17 AM or higher levels; otherwise patrols porch & parlor threshold
    const waypointCount = ctx.is317Active || ctx.level >= 3 ? SANTA_WAYPOINTS.length : 3;
    const wpIndex = Math.floor(ctx.elapsedSeconds / 8) % waypointCount;
    target = SANTA_WAYPOINTS[wpIndex];
    speed = ctx.is317Active ? 1.85 : 1.35;
  }

  const tdx = target.x - ctx.santaPos.x;
  const tdz = target.z - ctx.santaPos.z;
  const distToTarget = Math.hypot(tdx, tdz);

  let nextX = ctx.santaPos.x;
  let nextZ = ctx.santaPos.z;
  if (speed > 0 && distToTarget > 0.25) {
    const step = Math.min(distToTarget, speed * ctx.dt);
    nextX += (tdx / distToTarget) * step;
    nextZ += (tdz / distToTarget) * step;
  }

  const yaw = distToTarget > 0.1 ? Math.atan2(tdx, tdz) : Math.atan2(dx, dz);

  return {
    nextPos: { x: nextX, y: 0, z: nextZ },
    yaw,
    behavior,
    distanceToPlayer,
    warningCue,
  };
}
