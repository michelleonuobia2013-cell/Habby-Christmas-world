import type {
  AdaptiveProfile,
  EndingDefinition,
  PerformanceMetrics,
  PlayerSaveData,
} from './types';
import { BRANCHING_ENDINGS } from './worldData';

export function computeAdaptiveDifficulty(
  metrics: PerformanceMetrics,
  isCoop: boolean,
  accessibilitySlowGaze: boolean,
): AdaptiveProfile {
  let tier: AdaptiveProfile['tier'] = 'Balanced';
  let gazeGraceMultiplier = 1.0;
  let babySpeedMultiplier = 1.0;
  let hintFrequency: AdaptiveProfile['hintFrequency'] = 'normal';
  let extraMysteriesUnlocked = false;
  let reason = 'Standard pacing based on balanced investigation telemetry.';

  if (metrics.gazeDeathsCount >= 3 || metrics.averageClearSeconds > 240) {
    tier = 'Story-Guided';
    gazeGraceMultiplier = 1.3;
    babySpeedMultiplier = 0.85;
    hintFrequency = 'generous';
    reason = 'Contextual survival support active after recent Devil\'s Gaze encounters.';
  } else if (metrics.averageClearSeconds > 0 && metrics.averageClearSeconds <= 75 && metrics.cluesFoundCount >= 4) {
    tier = 'Nightmare Director';
    gazeGraceMultiplier = 0.82;
    babySpeedMultiplier = 1.22;
    hintFrequency = 'minimal';
    extraMysteriesUnlocked = true;
    reason = 'Rapid clears & thorough clue discovery escalated Baby Nicholas and Santa activity.';
  } else if (metrics.roomsExploredCount >= 6 || metrics.cluesFoundCount >= 3) {
    tier = 'Relentless';
    gazeGraceMultiplier = 0.92;
    babySpeedMultiplier = 1.1;
    hintFrequency = 'normal';
    extraMysteriesUnlocked = true;
    reason = 'Thorough exploration unlocked hidden secrets and heightened supernatural patrols.';
  }

  if (isCoop) {
    babySpeedMultiplier *= 1.12;
    reason += ' Co-op team coordination scaling applied.';
  }

  if (accessibilitySlowGaze) {
    gazeGraceMultiplier *= 1.35;
  }

  return {
    tier,
    gazeGraceMultiplier: Number(gazeGraceMultiplier.toFixed(2)),
    babySpeedMultiplier: Number(babySpeedMultiplier.toFixed(2)),
    hintFrequency,
    extraMysteriesUnlocked,
    reason,
  };
}

export function evaluateUnlockedEndings(save: PlayerSaveData): EndingDefinition[] {
  const maxCompleted = save.completedLevels.length > 0 ? Math.max(...save.completedLevels) : 0;
  const clueCount = save.unlockedClues.length;

  return BRANCHING_ENDINGS.filter((ending) => {
    if (maxCompleted < ending.minLevel) return false;
    if (clueCount < ending.minClues) return false;
    if (ending.requiredDecision && !save.decisions[ending.requiredDecision]) return false;
    return true;
  });
}

export function isLevelUnlocked(levelNumber: number, save: PlayerSaveData): boolean {
  if (levelNumber <= 1) return true;
  return levelNumber <= save.highestLevelUnlocked;
}

export function createDefaultSaveData(username = 'Nanny Guest', isGuest = true): PlayerSaveData {
  return {
    username,
    isGuest,
    coins: 500,
    score: 0,
    highestLevelUnlocked: 1,
    completedLevels: [],
    unlockedClues: ['clue_001'],
    unlockedAchievements: [],
    unlockedOutfits: ['classic_nanny'],
    decisions: {},
    nanny: {
      name: username === 'Nanny Guest' ? 'Clara Vance' : username,
      skinTone: '#d6a584',
      hairStyle: 'bun',
      hairColor: '#2c1e16',
      outfit: 'classic_nanny',
      accessory: 'gold_locket',
      voiceTone: 'steady',
    },
    ownedProperties: [
      {
        propertyId: 'prop_studio_avenue',
        wallColor: '#1f1616',
        lightingMood: 'warm_candle',
        securityTier: 1,
        allowFriends: false,
        furniture: [
          {
            instanceId: 'init_lamp',
            itemId: 'furn_lamp',
            name: 'Brass Floor Lamp',
            room: 'Living Area',
            gridX: 2,
            gridY: 2,
            color: '#c99a3b',
          },
          {
            instanceId: 'init_desk',
            itemId: 'furn_desk',
            name: 'Mahogany Archive Desk',
            room: 'Living Area',
            gridX: 4,
            gridY: 1,
            color: '#3e2723',
          },
        ],
      },
    ],
    settings: {
      cameraDefault: 'first-person',
      cameraDistance: 3.1,
      mouseSensitivity: 1.0,
      touchSensitivity: 1.0,
      graphicsQuality: 'high',
      masterVolume: 0.75,
      subtitlesEnabled: true,
      showTouchControls: 'auto',
      accessibilitySlowGaze: false,
      reducedFlicker: false,
    },
    metrics: {
      averageClearSeconds: 0,
      cluesFoundCount: 1,
      gazeDeathsCount: 0,
      roomsExploredCount: 1,
      coopMissionsCleared: 0,
    },
    notifications: [
      {
        id: 'notif_welcome',
        title: 'Babysitting Assignment Confirmed',
        body: 'Report to Blackwood Christmas Estate before midnight. Read the desk note first—and never stare into Nicholas\'s eyes if they glow red.',
        kind: 'mission',
        timestamp: 'Just now',
        read: false,
      },
    ],
  };
}
