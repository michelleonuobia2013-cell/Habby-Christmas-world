import type { BabyState } from './types';
import type { GazePhase } from './devilGaze';

export type HorrorStingKind =
  | 'door_slam'
  | 'light_flicker'
  | 'electrical_surge'
  | 'shadow_whisper';

export type FearTier = 'calm' | 'uneasy' | 'dread' | 'terror';

export interface ClueProximityObservation {
  id: string;
  x: number;
  y: number;
  z: number;
  distance: number;
  pan: number;
}

export interface HorrorStingEvent {
  id: number;
  kind: HorrorStingKind;
  clueId: string;
  targetDoor: 'nursery' | 'bathroom' | null;
  sourcePos: { x: number; y: number; z: number };
  pan: number;
  distanceScale: number;
  flickerDurationSec: number;
  subtitleCue: string;
}

export interface DirectorObservationInput {
  dt: number;
  elapsedSec: number;
  playerPos: { x: number; y: number; z: number };
  cameraYaw: number;
  isSprinting: boolean;
  isCrouching: boolean;
  isHiding: boolean;
  flashlightOn: boolean;
  carriedItem: 'none' | 'milk_bottle' | 'gift' | 'baby';
  babyState: BabyState;
  babyDistance: number;
  gazePhase: GazePhase;
  santaNearby: boolean;
  is317Active: boolean;
  isNightActive: boolean;
  nearClue: ClueProximityObservation | null;
  reducedFlicker?: boolean;
}

export interface HorrorDirectorOutput {
  fearLevel: number; // 0..100
  fearTier: FearTier;
  clueLingerSeconds: number;
  lingerClueId: string | null;
  lingerThresholdSec: number;
  lingerProgress: number; // 0..1
  activeFlickerStrength: number; // 0..1
  activeStingKind: HorrorStingKind | null;
  stingTriggered: HorrorStingEvent | null;
}

const NURSERY_DOOR_POS = { x: -2.0, y: 1.3, z: -2.5 };
const BATHROOM_DOOR_POS = { x: -6.2, y: 1.3, z: -0.6 };
const CHANDELIER_POS = { x: 0, y: 3.4, z: -0.8 };

const CLUE_LINGER_RADIUS = 3.9;
const STING_COOLDOWN_SEC = 10.5;

function computeFearTier(fear: number): FearTier {
  if (fear >= 75) return 'terror';
  if (fear >= 48) return 'dread';
  if (fear >= 22) return 'uneasy';
  return 'calm';
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function computeHorizontalPan(
  listenerPos: { x: number; z: number },
  cameraYaw: number,
  sourcePos: { x: number; z: number },
): number {
  const rightX = Math.cos(cameraYaw);
  const rightZ = -Math.sin(cameraYaw);
  const dx = sourcePos.x - listenerPos.x;
  const dz = sourcePos.z - listenerPos.z;
  const len = Math.hypot(dx, dz);
  if (len < 1e-4) return 0;
  return Number(clamp((dx / len) * rightX + (dz / len) * rightZ, -1, 1).toFixed(3));
}

/**
 * EnvironmentalHorrorDirector observes the Nanny's behavior (sprinting, crouching,
 * darkness exposure, hiding, carried props) alongside her dynamic Fear Level.
 * Lingering too long beside a clue builds dread and triggers a procedural 3D
 * horror sting (sudden door slam, light flicker, electrical surge, or shadow whisper).
 */
export class EnvironmentalHorrorDirector {
  private fearLevel = 12;
  private clueLingerSeconds = 0;
  private lingerClueId: string | null = null;
  private lastStingAt = -99;
  private stingCounter = 0;
  private flickerRemaining = 0;
  private flickerTotal = 0;
  private activeStingKind: HorrorStingKind | null = null;

  public reset(initialFear = 12) {
    this.fearLevel = clamp(initialFear, 0, 100);
    this.clueLingerSeconds = 0;
    this.lingerClueId = null;
    this.lastStingAt = -99;
    this.stingCounter = 0;
    this.flickerRemaining = 0;
    this.flickerTotal = 0;
    this.activeStingKind = null;
  }

  public observe(input: DirectorObservationInput): HorrorDirectorOutput {
    const dt = clamp(input.dt, 0, 0.25);

    // 1. Evaluate Fear Level delta from Nanny behavior + supernatural pressure
    let fearDelta = input.isNightActive ? 0.35 : -1.2;

    if (!input.flashlightOn && input.isNightActive && !input.isHiding) {
      fearDelta += 4.6;
    }
    if (input.isSprinting) {
      fearDelta += 2.2;
    }
    if (input.carriedItem === 'gift') {
      fearDelta += 1.6;
    } else if (input.carriedItem === 'milk_bottle' && !input.is317Active) {
      fearDelta -= 1.2;
    }

    if (input.babyState === 'supernatural') {
      fearDelta += input.babyDistance < 6.5 ? 5.2 : 2.8;
    } else if (input.babyState === 'suspicious') {
      fearDelta += 1.4;
    }

    if (input.santaNearby) {
      fearDelta += input.isHiding ? 1.2 : 5.5;
    }
    if (input.is317Active) {
      fearDelta += 4.4;
    }
    if (input.gazePhase === 'warning') {
      fearDelta += 24;
    }

    const nearActiveClue =
      input.nearClue && input.nearClue.distance <= CLUE_LINGER_RADIUS && !input.isHiding
        ? input.nearClue
        : null;

    if (nearActiveClue) {
      fearDelta += nearActiveClue.distance <= 2.3 ? 3.8 : 2.2;
    }

    // Calming behavior: hiding in shelter or sneaking calmly away from threats
    if (input.isHiding && input.gazePhase === 'safe') {
      const calmTarget = input.is317Active || input.santaNearby ? 28 : 10;
      if (this.fearLevel > calmTarget) {
        fearDelta -= 5.2;
      }
    } else if (
      input.isCrouching &&
      input.flashlightOn &&
      !nearActiveClue &&
      !input.santaNearby &&
      input.babyState !== 'supernatural'
    ) {
      fearDelta -= 2.8;
    } else if (!nearActiveClue && !input.is317Active && !input.santaNearby && input.flashlightOn) {
      const restFloor = input.isNightActive ? 14 : 4;
      if (this.fearLevel > restFloor) {
        fearDelta -= 1.6;
      }
    }

    const minFearFloor = input.is317Active ? 38 : input.isNightActive ? 8 : 0;
    this.fearLevel = clamp(this.fearLevel + fearDelta * dt, minFearFloor, 100);

    // 2. Track lingering duration near a clue
    if (nearActiveClue) {
      if (this.lingerClueId !== nearActiveClue.id) {
        this.lingerClueId = nearActiveClue.id;
        this.clueLingerSeconds = dt;
      } else {
        this.clueLingerSeconds += dt;
      }
    } else {
      this.clueLingerSeconds = Math.max(0, this.clueLingerSeconds - dt * 1.4);
      if (this.clueLingerSeconds <= 0.01) {
        this.lingerClueId = null;
      }
    }

    const baseThreshold = 6.5 - (this.fearLevel / 100) * 2.2 - (input.is317Active ? 0.8 : 0);
    const lingerThresholdSec = Number(clamp(baseThreshold, 3.4, 6.5).toFixed(2));
    const lingerProgress = clamp(this.clueLingerSeconds / lingerThresholdSec, 0, 1);

    // 3. Procedural Horror Sting when lingering near a clue too long
    let stingTriggered: HorrorStingEvent | null = null;
    const cooldownElapsed = input.elapsedSec - this.lastStingAt >= STING_COOLDOWN_SEC;

    if (nearActiveClue && this.clueLingerSeconds >= lingerThresholdSec && cooldownElapsed) {
      this.stingCounter++;
      this.lastStingAt = input.elapsedSec;
      this.clueLingerSeconds = 0;

      const kind = this.selectStingKind(nearActiveClue.id, this.fearLevel, this.stingCounter);
      const targetDoor = this.resolveTargetDoor(kind, input.playerPos, nearActiveClue.id);

      let sourcePos = { x: nearActiveClue.x, y: nearActiveClue.y, z: nearActiveClue.z };
      let flickerDurationSec = 0.6;
      let subtitleCue = 'Something shifts behind the wallpaper as you linger...';

      if (kind === 'door_slam') {
        sourcePos = targetDoor === 'bathroom' ? { ...BATHROOM_DOOR_POS } : { ...NURSERY_DOOR_POS };
        flickerDurationSec = 0.55;
        subtitleCue =
          targetDoor === 'bathroom'
            ? 'A sudden slam echoes from the ensuite bathroom door!'
            : 'The nursery oak door slams shut behind you!';
      } else if (kind === 'light_flicker') {
        sourcePos = { ...CHANDELIER_POS };
        flickerDurationSec = 1.85;
        subtitleCue = 'The chandelier bulbs sputter violently overhead!';
      } else if (kind === 'electrical_surge') {
        sourcePos = {
          x: nearActiveClue.x,
          y: Math.max(1.2, nearActiveClue.y + 0.8),
          z: nearActiveClue.z,
        };
        flickerDurationSec = 1.55;
        subtitleCue = 'A cold electrical surge dims your brass flashlight!';
      } else {
        // shadow_whisper — cast just behind/opposite shoulder
        sourcePos = {
          x: input.playerPos.x + Math.cos(input.cameraYaw) * (this.stingCounter % 2 === 0 ? 1.8 : -1.8),
          y: 1.55,
          z: input.playerPos.z - Math.sin(input.cameraYaw) * (this.stingCounter % 2 === 0 ? 1.8 : -1.8),
        };
        flickerDurationSec = 0.85;
        subtitleCue = 'A freezing whisper brushes past your ear as you linger by the clue...';
      }

      const pan = computeHorizontalPan(input.playerPos, input.cameraYaw, sourcePos);
      const distToSource = Math.hypot(sourcePos.x - input.playerPos.x, sourcePos.z - input.playerPos.z);
      const distanceScale = Number(clamp(1 - distToSource / 18, 0.35, 1).toFixed(2));

      this.fearLevel = clamp(this.fearLevel + 14, 0, 100);
      this.flickerRemaining = flickerDurationSec;
      this.flickerTotal = flickerDurationSec;
      this.activeStingKind = kind;

      stingTriggered = {
        id: this.stingCounter,
        kind,
        clueId: nearActiveClue.id,
        targetDoor,
        sourcePos,
        pan,
        distanceScale,
        flickerDurationSec,
        subtitleCue,
      };
    }

    // 4. Decay active light flicker envelope
    let activeFlickerStrength = 0;
    if (this.flickerRemaining > 0) {
      this.flickerRemaining = Math.max(0, this.flickerRemaining - dt);
      const norm = this.flickerTotal > 0 ? this.flickerRemaining / this.flickerTotal : 0;
      if (input.reducedFlicker) {
        // Smooth gentle dim instead of high-frequency strobe for accessibility
        activeFlickerStrength = Number((norm * 0.45).toFixed(3));
      } else {
        const pulse = 0.55 + 0.45 * Math.abs(Math.sin(input.elapsedSec * 28));
        activeFlickerStrength = Number(clamp(norm * pulse, 0, 1).toFixed(3));
      }
      if (this.flickerRemaining <= 0.001) {
        this.activeStingKind = null;
      }
    }

    const roundedFear = Math.round(this.fearLevel);
    return {
      fearLevel: roundedFear,
      fearTier: computeFearTier(roundedFear),
      clueLingerSeconds: Number(this.clueLingerSeconds.toFixed(2)),
      lingerClueId: this.lingerClueId,
      lingerThresholdSec,
      lingerProgress: Number(lingerProgress.toFixed(3)),
      activeFlickerStrength,
      activeStingKind: this.flickerRemaining > 0 ? this.activeStingKind : null,
      stingTriggered,
    };
  }

  private selectStingKind(
    clueId: string,
    fearLevel: number,
    stingIndex: number,
  ): HorrorStingKind {
    // Alternate procedurally between door slams, light flickers, surges & whispers
    const rotation: HorrorStingKind[] =
      fearLevel >= 55
        ? ['door_slam', 'light_flicker', 'electrical_surge', 'shadow_whisper']
        : ['light_flicker', 'door_slam', 'shadow_whisper', 'electrical_surge'];

    if (clueId === 'clue_mirror' && stingIndex % 2 === 1) {
      return 'door_slam';
    }
    if (clueId === 'clue_tree' && stingIndex % 2 === 1) {
      return 'light_flicker';
    }
    return rotation[(stingIndex - 1) % rotation.length];
  }

  private resolveTargetDoor(
    kind: HorrorStingKind,
    playerPos: { x: number; z: number },
    clueId: string,
  ): 'nursery' | 'bathroom' | null {
    if (kind !== 'door_slam') return null;
    if (clueId === 'clue_mirror' || clueId === 'clue_kitchen_drawer') {
      return 'bathroom';
    }
    const dNursery = Math.hypot(playerPos.x - NURSERY_DOOR_POS.x, playerPos.z - NURSERY_DOOR_POS.z);
    const dBath = Math.hypot(playerPos.x - BATHROOM_DOOR_POS.x, playerPos.z - BATHROOM_DOOR_POS.z);
    return dBath < dNursery ? 'bathroom' : 'nursery';
  }
}
