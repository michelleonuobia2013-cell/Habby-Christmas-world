export type GamePhase =
  | 'logo'
  | 'cover'
  | 'loading'
  | 'account'
  | 'character'
  | 'menu'
  | 'playing'
  | 'paused'
  | 'gameover_gaze'
  | 'level_complete';

export type CameraMode = 'first-person' | 'third-person';

export type HidingSpotType = 'wardrobe' | 'under_bed' | 'parlor_sofa' | 'pantry_closet';

export interface HidingSpotInfo {
  id: string;
  type: HidingSpotType;
  label: string;
  room: string;
}

export type BabyState =
  | 'normal'
  | 'playful'
  | 'suspicious'
  | 'frightened'
  | 'silent'
  | 'supernatural';

export type WorldZoneId =
  | 'christmas_estate'
  | 'silent_town'
  | 'frozen_woods'
  | 'old_market'
  | 'abandoned_hospital'
  | 'santas_territory'
  | 'underground'
  | 'christmas_city';

export type MenuTab =
  | 'home'
  | 'play'
  | 'map'
  | 'housing'
  | 'multiplayer'
  | 'archives'
  | 'profile'
  | 'achievements'
  | 'leaderboards'
  | 'notifications'
  | 'settings'
  | 'rules'
  | 'install';

export interface NannyAppearance {
  name: string;
  skinTone: string;
  hairStyle: 'bun' | 'bob' | 'braids' | 'waves';
  hairColor: string;
  outfit: 'classic_nanny' | 'crimson_coat' | 'winter_cloak' | 'keeper_attire';
  accessory: 'none' | 'gold_locket' | 'lantern_brooch' | 'silver_spectacles';
  voiceTone: 'warm' | 'steady' | 'whisper';
}

export interface LevelObjective {
  id: string;
  label: string;
  interactTarget: string;
  completed: boolean;
}

export interface LevelDefinition {
  level: number;
  chapter: number;
  chapterTitle: string;
  title: string;
  district: WorldZoneId;
  environmentVariant: string;
  summary: string;
  objectives: Array<{
    id: string;
    label: string;
    interactTarget: string;
  }>;
  supernaturalEvent: string;
  rule317Event: string;
  hiddenClueId: string;
  rewardCoins: number;
  rewardUnlock?: string;
  difficultyRating: number; // 1..100
  eyeGazeThresholdSec: number;
}

export interface WorldLocation {
  id: string;
  name: string;
  world: 'city' | 'town';
  district: WorldZoneId;
  description: string;
  coordinates: { x: number; y: number }; // 0..100 map %
  unlockedAtLevel: number;
  activities: string[];
  npcPresent?: string;
  secretCount: number;
}

export interface TransitRoute {
  id: string;
  name: string;
  mode: 'train' | 'bus' | 'car' | 'walk';
  from: string;
  to: string;
  durationLabel: string;
  unlockedAtLevel: number;
  transitEvent: string;
}

export interface PropertyListing {
  id: string;
  name: string;
  district: string;
  price: number;
  rooms: string[];
  description: string;
  securityLevel: number;
  unlockedAtLevel: number;
  hasSecretRoom: boolean;
}

export interface PlacedFurniture {
  instanceId: string;
  itemId: string;
  name: string;
  room: string;
  gridX: number;
  gridY: number;
  color: string;
}

export interface OwnedPropertyState {
  propertyId: string;
  wallColor: string;
  lightingMood: 'warm_candle' | 'amber_lamp' | 'crimson_vigil';
  securityTier: number;
  allowFriends: boolean;
  furniture: PlacedFurniture[];
}

export interface ArchiveClue {
  id: string;
  title: string;
  category: 'letter' | 'photograph' | 'recording' | 'newspaper' | 'gift';
  district: WorldZoneId;
  unlockedAtLevel: number;
  excerpt: string;
  connectedCharacter: string;
}

export interface EndingDefinition {
  id: string;
  title: string;
  category: string;
  description: string;
  requirementsSummary: string;
  minLevel: number;
  minClues: number;
  requiredDecision?: string;
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  rarity: 'Common' | 'Rare' | 'Supernatural' | 'Legendary';
  rewardText: string;
}

export interface GameSettings {
  cameraDefault: CameraMode;
  cameraDistance: number;
  mouseSensitivity: number;
  touchSensitivity: number;
  graphicsQuality: 'low' | 'medium' | 'high';
  masterVolume: number;
  subtitlesEnabled: boolean;
  showTouchControls: 'auto' | 'always' | 'off';
  accessibilitySlowGaze: boolean;
  reducedFlicker: boolean;
}

export interface PerformanceMetrics {
  averageClearSeconds: number;
  cluesFoundCount: number;
  gazeDeathsCount: number;
  roomsExploredCount: number;
  coopMissionsCleared: number;
}

export interface AdaptiveProfile {
  tier: 'Story-Guided' | 'Balanced' | 'Relentless' | 'Nightmare Director';
  gazeGraceMultiplier: number;
  babySpeedMultiplier: number;
  hintFrequency: 'generous' | 'normal' | 'minimal';
  extraMysteriesUnlocked: boolean;
  reason: string;
}

export interface GameNotification {
  id: string;
  title: string;
  body: string;
  kind: 'achievement' | 'mission' | 'multiplayer' | 'discovery' | 'system';
  timestamp: string;
  read: boolean;
}

export interface PlayerSaveData {
  username: string;
  isGuest: boolean;
  coins: number;
  score: number;
  highestLevelUnlocked: number;
  completedLevels: number[];
  unlockedClues: string[];
  unlockedAchievements: string[];
  unlockedOutfits: string[];
  decisions: Record<string, string>;
  nanny: NannyAppearance;
  ownedProperties: OwnedPropertyState[];
  settings: GameSettings;
  metrics: PerformanceMetrics;
  notifications: GameNotification[];
}
