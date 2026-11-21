import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type {
  BabyState,
  CameraMode,
  HidingSpotInfo,
  HidingSpotType,
  LevelDefinition,
  NannyAppearance,
  WorldZoneId,
} from '../game/types';
import { evaluateDevilsGaze, type GazePhase } from '../game/devilGaze';
import { stepBabyAI, stepSantaEntityAI } from '../game/babyAI';
import {
  evaluateProximityHaunting,
  type ProximityCueKind,
  type ProximitySource,
} from '../game/ambientAudio';
import {
  EnvironmentalHorrorDirector,
  type ClueProximityObservation,
  type FearTier,
  type HorrorStingKind,
} from '../game/environmentalHorrorDirector';
import { HabbyAudioEngine } from './audioEngine';
import {
  applyNannyPose,
  createBabyNicholasModel,
  createBathroomSuiteModels,
  createChandelierModel,
  createChristmasTreeModel,
  createCribModel,
  createDeskWithNoteModel,
  createFireplaceHearthModel,
  createFirstPersonHandsRig,
  createFourPosterBedModel,
  createHidingWardrobeModel,
  createHingedDoorModel,
  createImpossibleGiftModel,
  createKitchenCounterModel,
  createMullionedWindowModel,
  createNannyModel,
  createPantryClosetModel,
  createParlorSofaModel,
  createSantaModel,
  createSecurityDeskModel,
  type BabyRig,
  type BathroomSuiteRig,
  type DoorRig,
  type FirstPersonHandsRig,
  type HidingWardrobeRig,
  type KitchenRig,
  type NannyRig,
  type PantryClosetRig,
  type SantaRig,
} from './models';
import { loadMansionTextures, type MansionTexturePack } from './textures';

export type CarriedItemType = 'none' | 'baby' | 'milk_bottle' | 'gift';

export interface InteractableInfo {
  id: string;
  label: string;
  position: THREE.Vector3;
  radius: number;
  kind?: 'mission' | 'container';
}

interface InternalHidingSpot extends HidingSpotInfo {
  hidePos: THREE.Vector3;
  exitPos: THREE.Vector3;
  hideYaw: number;
  triggerRadius: number;
}

export interface EngineHudSnapshot {
  babyState: BabyState;
  gazePhase: GazePhase;
  gazeProgress: number;
  inGameMinutes: number;
  is317Active: boolean;
  isNightActive: boolean;
  nearbyInteractable: { id: string; label: string } | null;
  nearbyHidingSpot: HidingSpotInfo | null;
  nearbyPickupLabel: string | null;
  isHiding: boolean;
  activeHidingSpot: HidingSpotInfo | null;
  isCrouching: boolean;
  cameraMode: CameraMode;
  cameraDistance: number;
  carriedItem: CarriedItemType;
  playerPos: { x: number; y: number; z: number; yaw: number };
  flashlightOn: boolean;
  directorCue: string | null;
  santaNearby: boolean;
  santaBehavior: 'patrol' | 'stalking' | 'searching' | 'caught';
  proximityCueKind: ProximityCueKind | null;
  proximityIntensity: number;
  fearLevel: number;
  fearTier: FearTier;
  clueLingerProgress: number;
  activeHorrorSting: HorrorStingKind | null;
  activeFlickerStrength: number;
}

export interface RemotePlayerInput {
  id: string;
  username: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  outfit: string;
  isHiding?: boolean;
  hidingSpotLabel?: string;
}

export interface HabbyWorldCallbacks {
  onHudUpdate: (snapshot: EngineHudSnapshot) => void;
  onInteract: (interactId: string) => void;
  onDevilsGazeTriggered: (details: {
    distance: number;
    cameraMode: CameraMode;
    babyState: BabyState;
    cause?: 'devils_gaze' | 'santa_caught';
  }) => void;
  onCameraModeChange?: (mode: CameraMode) => void;
}

const _vecA = new THREE.Vector3();
const _vecB = new THREE.Vector3();
const _vecC = new THREE.Vector3();
const _camTarget = new THREE.Vector3();
const _rayDir = new THREE.Vector3();

const MIN_CAM_ZOOM = 1.75;
const MAX_CAM_ZOOM = 5.2;

function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function lerpAngle(current: number, target: number, t: number): number {
  let diff = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * t;
}

export class HabbyWorldEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private isSoftwareGl: boolean;
  private textures: MansionTexturePack;
  public audio: HabbyAudioEngine;

  private callbacks: HabbyWorldCallbacks;
  private frameId = 0;
  private disposed = false;
  private clock = new THREE.Clock();

  private mode: 'tour' | 'playing' | 'paused' | 'gameover' = 'tour';
  private cameraMode: CameraMode = 'first-person';

  private nannyRig: NannyRig;
  private fpHandsRig: FirstPersonHandsRig;
  private babyRig: BabyRig;
  private santaRig: SantaRig;
  private wardrobeRig!: HidingWardrobeRig;
  private pantryRig!: PantryClosetRig;
  private kitchenRig!: KitchenRig;
  private bathroomRig!: BathroomSuiteRig;
  private nurseryDoorRig!: DoorRig;
  private bathroomDoorRig!: DoorRig;
  private giftMesh!: THREE.Group;
  private hearthLight!: THREE.PointLight;
  private snowParticles: THREE.Points;
  private keyLight: THREE.DirectionalLight;
  private interiorWarmLight: THREE.PointLight;
  private crimsonRuleLight: THREE.PointLight;

  private wallColliders: THREE.Box3[] = [];
  private wallMeshes: THREE.Object3D[] = [];
  private interactables: InteractableInfo[] = [];
  private hidingSpots: InternalHidingSpot[] = [];
  private proximitySources: ProximitySource[] = [];

  // Interactive doors & cabinet/drawer toggles
  private nurseryDoorOpen = true;
  private bathroomDoorOpen = true;
  private kitchenCupboardOpen = false;
  private bathroomVanityOpen = false;
  private localCueOverride: string | null = null;
  private localCueTimer = 0;

  // Character kinematics, jump physics & switchable camera
  private playerPos = new THREE.Vector3(0, 0, 5.4);
  private playerYaw = 0; // Character facing (0 = -Z)
  private velocityY = 0;
  private isGrounded = true;
  private camYaw = 0;
  private camPitch = -0.06;
  private camZoom = 3.1;
  private crouchToggle = false;
  private crouchAmount = 0;
  private walkCycle = 0;
  private santaWalkCycle = 0;
  private footstepAccum = 0;
  private flashlightOn = true;

  // Hiding & Pick-up / Carry state
  private activeHidingSpot: InternalHidingSpot | null = null;
  private carriedItem: CarriedItemType = 'none';
  private carryTimer317 = 0;
  private giftWorldPos = new THREE.Vector3(4.1, 0.03, -3.5);

  private babyPos = new THREE.Vector3(-4.4, 0, -5.8);
  private babyYaw = 0.25;
  private babyState: BabyState = 'normal';
  private lastRelocateTime = 0;
  private elapsedSimSec = 0;
  private inGameMinutes = 165;
  private gazeExposureSec = 0;
  private gazeThresholdSec = 1.45;
  private gazeCooldownUntil = 0;
  private currentLevel: LevelDefinition | null = null;
  private completedObjectiveCount = 0;
  private totalObjectiveCount = 3;
  private babySpeedMultiplier = 1.0;
  private currentDistrict: WorldZoneId = 'christmas_estate';
  private recentSoundEvent = false;
  private soundDecayTimer = 0;
  private lastDirectorCue: string | null = null;
  private santaBehavior: 'patrol' | 'stalking' | 'searching' | 'caught' = 'patrol';
  private horrorDirector = new EnvironmentalHorrorDirector();
  private reducedFlicker = false;
  private lastGazePhase: GazePhase = 'safe';

  private keys = new Set<string>();
  private virtualMove = { x: 0, y: 0 };
  private virtualSprint = false;
  private isDraggingLook = false;
  private lastPointer = { x: 0, y: 0 };
  private mouseSensitivity = 1.0;
  private lastHudPush = 0;
  private prevGamepadButtons: boolean[] = [];

  private remotePlayers = new Map<string, NannyRig>();
  private raycaster = new THREE.Raycaster();
  private gazeRaycaster = new THREE.Raycaster();
  private resizeObserver: ResizeObserver;

  private onKeyDownBound: (e: KeyboardEvent) => void;
  private onKeyUpBound: (e: KeyboardEvent) => void;
  private onBlurBound: () => void;
  private onPointerDownBound: (e: PointerEvent) => void;
  private onPointerMoveBound: (e: PointerEvent) => void;
  private onPointerUpBound: () => void;
  private onWheelBound: (e: WheelEvent) => void;

  constructor(
    container: HTMLElement,
    appearance: NannyAppearance,
    callbacks: HabbyWorldCallbacks,
  ) {
    this.container = container;
    this.callbacks = callbacks;
    this.isSoftwareGl = detectSoftwareWebGL();
    this.audio = new HabbyAudioEngine();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x07080c);
    this.scene.fog = new THREE.FogExp2(0x07080c, 0.028);

    this.camera = new THREE.PerspectiveCamera(62, w / h, 0.08, 150);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.textures = loadMansionTextures(this.renderer);

    // Cinematic warm/cool lighting contrast
    const hemi = new THREE.HemisphereLight(0x7c8ea6, 0x1c1411, 0.92);
    this.scene.add(hemi);

    this.keyLight = new THREE.DirectionalLight(0xffdcb8, 1.38);
    this.keyLight.position.set(12, 18, 14);
    if (!this.isSoftwareGl) {
      this.keyLight.castShadow = true;
      this.keyLight.shadow.mapSize.set(1024, 1024);
      this.keyLight.shadow.camera.left = -18;
      this.keyLight.shadow.camera.right = 18;
      this.keyLight.shadow.camera.top = 18;
      this.keyLight.shadow.camera.bottom = -18;
      this.keyLight.shadow.bias = -0.0005;
      this.keyLight.shadow.normalBias = 0.02;
    }
    this.scene.add(this.keyLight);

    this.interiorWarmLight = new THREE.PointLight(0xe69f5c, 2.2, 22, 1.35);
    this.interiorWarmLight.position.set(0, 3.65, -0.8);
    this.scene.add(this.interiorWarmLight);

    this.crimsonRuleLight = new THREE.PointLight(0xdc2626, 0.2, 22, 1.5);
    this.crimsonRuleLight.position.set(-4.5, 2.8, -5.5);
    this.scene.add(this.crimsonRuleLight);

    this.buildWorldGeometry();

    // Realistic Human Nanny (visible in Third-Person & Tour) + First-Person Viewmodel Hands
    this.nannyRig = createNannyModel(appearance, this.textures.contactShadowTex, this.textures);
    this.nannyRig.group.position.copy(this.playerPos);
    this.nannyRig.group.visible = true;
    this.scene.add(this.nannyRig.group);

    this.fpHandsRig = createFirstPersonHandsRig(appearance, this.textures);
    this.fpHandsRig.group.visible = false;
    this.scene.add(this.fpHandsRig.group);

    // Realistic Tiny ~4-month-old Infant Baby Nicholas
    this.babyRig = createBabyNicholasModel(this.textures.contactShadowTex, this.textures);
    this.babyRig.group.position.copy(this.babyPos);
    this.scene.add(this.babyRig.group);

    // Realistic Gaunt Evil Santa Entity
    this.santaRig = createSantaModel(this.textures.contactShadowTex, this.textures);
    this.santaRig.group.position.set(7.2, 0, 14.5);
    this.scene.add(this.santaRig.group);

    this.snowParticles = this.createSnowField();
    this.scene.add(this.snowParticles);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.onKeyDownBound = this.handleKeyDown.bind(this);
    this.onKeyUpBound = this.handleKeyUp.bind(this);
    this.onBlurBound = () => {
      this.keys.clear();
      this.isDraggingLook = false;
    };
    this.onPointerDownBound = this.handlePointerDown.bind(this);
    this.onPointerMoveBound = this.handlePointerMove.bind(this);
    this.onPointerUpBound = () => {
      this.isDraggingLook = false;
    };
    this.onWheelBound = this.handleWheel.bind(this);

    window.addEventListener('keydown', this.onKeyDownBound);
    window.addEventListener('keyup', this.onKeyUpBound);
    window.addEventListener('blur', this.onBlurBound);
    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDownBound);
    this.renderer.domElement.addEventListener('wheel', this.onWheelBound, { passive: true });
    window.addEventListener('pointermove', this.onPointerMoveBound);
    window.addEventListener('pointerup', this.onPointerUpBound);

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.container);

    this.clock.start();
    this.tick();
  }

  private buildWorldGeometry() {
    // 1. Exterior moonlit snowy terrain (natural cool night snow tone, never blown-out flat white)
    const snowGeo = new THREE.PlaneGeometry(140, 140);
    const snowMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.94,
      bumpMap: this.textures.snowBump,
      bumpScale: 0.08,
    });
    const snowGround = new THREE.Mesh(snowGeo, snowMat);
    snowGround.rotation.x = -Math.PI / 2;
    snowGround.position.y = -0.02;
    snowGround.receiveShadow = true;
    this.scene.add(snowGround);

    // 2. Mansion Hardwood Floor + Ornate Persian Rug
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: this.textures.woodColor,
      bumpMap: this.textures.woodBump,
      bumpScale: 0.04,
      roughness: 0.56,
      metalness: 0.06,
    });
    const mansionFloor = new THREE.Mesh(new THREE.BoxGeometry(19, 0.08, 19), floorMat);
    mansionFloor.position.set(0, -0.02, -1);
    mansionFloor.receiveShadow = true;
    this.scene.add(mansionFloor);

    const rug = new THREE.Mesh(
      new THREE.BoxGeometry(5.6, 0.02, 4.2),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: this.textures.rugColor,
        bumpMap: this.textures.fabricBump,
        bumpScale: 0.015,
        roughness: 0.92,
      }),
    );
    rug.position.set(4.1, 0.024, -1.6);
    rug.receiveShadow = true;
    this.scene.add(rug);

    // Ceiling + Overhead Iron Chandelier
    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(19.2, 19.2),
      new THREE.MeshStandardMaterial({ color: 0x171412, roughness: 0.9 }),
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, 4.2, -1);
    this.scene.add(ceiling);

    const chandelier = createChandelierModel();
    chandelier.position.set(0.2, 3.35, -0.5);
    this.scene.add(chandelier);

    // Exterior Pitched Manor Roof & Brick Chimney
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x1a1517, roughness: 0.85, metalness: 0.1 });
    const roof = new THREE.Mesh(new THREE.ConeGeometry(14.5, 4.2, 4), roofMat);
    roof.position.set(0, 6.25, -1);
    roof.rotation.y = Math.PI / 4;
    this.scene.add(roof);

    const chimney = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 3.6, 1.4),
      new THREE.MeshStandardMaterial({ color: 0x3b1d1d, roughness: 0.9 }),
    );
    chimney.position.set(8.6, 6.6, -1.6);
    this.scene.add(chimney);

    // 3. Mansion Wallpaper Walls + Architectural Wainscoting Baseboards
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: this.textures.wallpaperColor,
      bumpMap: this.textures.wallpaperBump,
      bumpScale: 0.025,
      roughness: 0.78,
      metalness: 0.04,
    });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x261711, roughness: 0.6 });

    const addWall = (x: number, y: number, z: number, w: number, h: number, d: number) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      this.wallMeshes.push(mesh);
      this.wallColliders.push(new THREE.Box3().setFromObject(mesh));

      // Wood baseboard molding along bottom
      const base = new THREE.Mesh(new THREE.BoxGeometry(w + 0.03, 0.18, d + 0.03), trimMat);
      base.position.set(x, 0.11, z);
      this.scene.add(base);
    };

    // North wall
    addWall(0, 2.1, -10.5, 19, 4.2, 0.4);
    // West wall
    addWall(-9.5, 2.1, -1, 0.4, 4.2, 19);
    // East wall
    addWall(9.5, 2.1, -1, 0.4, 4.2, 19);
    // South wall (wide 3.2m front door opening at x = 0)
    addWall(-5.55, 2.1, 8.5, 7.9, 4.2, 0.4);
    addWall(5.55, 2.1, 8.5, 7.9, 4.2, 0.4);
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.1, 0.45), wallMat);
    lintel.position.set(0, 3.65, 8.5);
    this.scene.add(lintel);

    // Carved Oak Front Door Jambs, Porch Step & Ajar Victorian Door
    const jambL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 3.1, 0.52), trimMat);
    jambL.position.set(-1.55, 1.55, 8.5);
    const jambR = jambL.clone();
    jambR.position.x = 1.55;
    const porchStep = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 0.16, 1.8),
      new THREE.MeshStandardMaterial({ color: 0x292524, roughness: 0.92 }),
    );
    porchStep.position.set(0, 0.02, 9.4);
    const ajarDoor = new THREE.Mesh(new THREE.BoxGeometry(1.4, 3.0, 0.08), trimMat);
    ajarDoor.position.set(-1.1, 1.5, 9.15);
    ajarDoor.rotation.y = 0.85;
    this.scene.add(jambL, jambR, porchStep, ajarDoor);

    // Nursery divider walls + Interactive Hinged Nursery Oak Door at x = -2.3, z = -2.5
    addWall(-6.2, 2.1, -2.5, 6.2, 4.2, 0.35);
    addWall(-1.0, 2.1, -2.5, 1.0, 4.2, 0.35);
    addWall(-0.5, 2.1, -6.5, 0.35, 4.2, 8.0);

    this.nurseryDoorRig = createHingedDoorModel(this.textures.woodColor);
    this.nurseryDoorRig.group.position.set(-2.3, 0.02, -2.5);
    this.nurseryDoorRig.doorPivot.rotation.y = 1.25;
    this.scene.add(this.nurseryDoorRig.group);
    this.interactables.push({
      id: 'door_nursery',
      label: 'Open / Close Nursery Door',
      position: new THREE.Vector3(-2.3, 1.2, -2.5),
      radius: 2.0,
      kind: 'container',
    });

    // Ensuite Mansion Bathroom (Mid-West Wing: x = -9.3..-5.4, z = -2.2..1.5) + Hinged Bathroom Door
    addWall(-7.35, 2.1, 1.45, 3.9, 4.2, 0.32);
    addWall(-5.4, 2.1, -1.75, 0.32, 4.2, 1.2);
    addWall(-5.4, 2.1, 0.9, 0.32, 4.2, 1.15);

    this.bathroomDoorRig = createHingedDoorModel(this.textures.woodColor);
    this.bathroomDoorRig.group.rotation.y = Math.PI / 2;
    this.bathroomDoorRig.group.position.set(-5.4, 0.02, -0.45);
    this.bathroomDoorRig.doorPivot.rotation.y = 1.2;
    this.scene.add(this.bathroomDoorRig.group);
    this.interactables.push({
      id: 'door_bathroom',
      label: 'Open / Close Bathroom Door',
      position: new THREE.Vector3(-5.4, 1.2, -0.45),
      radius: 2.0,
      kind: 'container',
    });

    this.bathroomRig = createBathroomSuiteModels(this.textures.woodColor);
    this.bathroomRig.group.position.set(-8.3, 0.02, -0.4);
    this.scene.add(this.bathroomRig.group);
    this.interactables.push({
      id: 'bathroom_vanity',
      label: 'Inspect Bathroom Vanity & Silver Mirror',
      position: new THREE.Vector3(-8.2, 1.0, 0.75),
      radius: 2.3,
      kind: 'container',
    });

    // Mullioned moonlit windows on North & East parlor walls
    const winN = createMullionedWindowModel(this.textures.moonWindowTex);
    winN.position.set(3.2, 2.2, -10.27);
    const winW = createMullionedWindowModel(this.textures.moonWindowTex);
    winW.rotation.y = Math.PI / 2;
    winW.position.set(-9.27, 2.2, -6.2);
    this.scene.add(winN, winW);

    // Stone Fireplace Hearth on East parlor wall
    const hearth = createFireplaceHearthModel();
    hearth.group.rotation.y = -Math.PI / 2;
    hearth.group.position.set(8.85, 0.02, -1.6);
    this.hearthLight = hearth.hearthLight;
    this.scene.add(hearth.group);

    // 4. Interactive Hiding Locations (Wardrobe, Under Bed, Parlor Sofa, Pantry Closet)
    this.wardrobeRig = createHidingWardrobeModel(this.textures.woodColor);
    this.wardrobeRig.group.position.set(-2.1, 0.02, -9.85);
    this.scene.add(this.wardrobeRig.group);
    this.hidingSpots.push({
      id: 'hide_wardrobe',
      type: 'wardrobe',
      label: 'Hide Inside Carved Wardrobe',
      room: 'Nursery Hallway',
      hidePos: new THREE.Vector3(-2.1, 0, -9.82),
      exitPos: new THREE.Vector3(-2.1, 0, -8.55),
      hideYaw: 0,
      triggerRadius: 2.1,
    });

    const bed = createFourPosterBedModel(this.textures.woodColor);
    bed.position.set(6.8, 0.02, -8.8);
    this.scene.add(bed);
    this.hidingSpots.push({
      id: 'hide_bed',
      type: 'under_bed',
      label: 'Hide Under Four-Poster Bed',
      room: 'Guest Bedroom',
      hidePos: new THREE.Vector3(6.8, 0, -8.8),
      exitPos: new THREE.Vector3(5.1, 0, -8.8),
      hideYaw: -Math.PI / 2,
      triggerRadius: 2.3,
    });

    const sofa = createParlorSofaModel(this.textures);
    sofa.position.set(4.1, 0.02, 1.25);
    sofa.rotation.y = Math.PI;
    this.scene.add(sofa);
    this.hidingSpots.push({
      id: 'hide_sofa',
      type: 'parlor_sofa',
      label: 'Duck Behind Parlor Sofa',
      room: 'Grand Parlor',
      hidePos: new THREE.Vector3(4.1, 0, 2.05),
      exitPos: new THREE.Vector3(4.1, 0, 2.65),
      hideYaw: Math.PI,
      triggerRadius: 2.2,
    });

    this.pantryRig = createPantryClosetModel(this.textures.woodColor);
    this.pantryRig.group.position.set(-8.85, 0.02, 4.4);
    this.pantryRig.group.rotation.y = Math.PI / 2;
    this.scene.add(this.pantryRig.group);
    this.hidingSpots.push({
      id: 'hide_pantry',
      type: 'pantry_closet',
      label: 'Hide Inside Pantry Closet',
      room: 'Kitchen',
      hidePos: new THREE.Vector3(-8.8, 0, 4.4),
      exitPos: new THREE.Vector3(-7.65, 0, 4.4),
      hideYaw: Math.PI / 2,
      triggerRadius: 2.1,
    });

    // 5. Mission Props, Opening Kitchen Cupboards & Secret Clue Binaural Audio Sources
    const tree = createChristmasTreeModel(this.textures.contactShadowTex);
    tree.position.set(5.4, 0.02, -4.6);
    this.scene.add(tree);
    this.interactables.push({
      id: 'christmas_tree',
      label: 'Inspect Haunted Christmas Tree',
      position: new THREE.Vector3(5.4, 1.2, -4.6),
      radius: 2.8,
      kind: 'mission',
    });

    this.giftMesh = createImpossibleGiftModel();
    this.giftMesh.position.copy(this.giftWorldPos);
    this.scene.add(this.giftMesh);
    this.interactables.push({
      id: 'impossible_gift',
      label: 'Open The Impossible Gift',
      position: new THREE.Vector3(4.1, 0.4, -3.5),
      radius: 2.3,
      kind: 'mission',
    });

    const desk = createDeskWithNoteModel();
    desk.position.set(-1.8, 0.02, 2.0);
    desk.rotation.y = 0.25;
    this.scene.add(desk);
    this.interactables.push({
      id: 'note_desk',
      label: 'Read Parents’ Babysitting Note',
      position: new THREE.Vector3(-1.8, 0.9, 2.0),
      radius: 2.4,
      kind: 'mission',
    });

    this.kitchenRig = createKitchenCounterModel(this.textures.woodColor);
    this.kitchenRig.group.position.set(-6.5, 0.02, 4.4);
    this.kitchenRig.group.rotation.y = Math.PI / 2;
    this.scene.add(this.kitchenRig.group);
    this.interactables.push({
      id: 'kitchen_bottle',
      label: 'Prepare Warm Milk Bottle',
      position: new THREE.Vector3(-6.5, 1.0, 4.85),
      radius: 2.5,
      kind: 'mission',
    });
    this.interactables.push({
      id: 'kitchen_cupboard',
      label: 'Open / Close Kitchen Cupboards & Drawer',
      position: new THREE.Vector3(-6.5, 0.7, 3.65),
      radius: 1.9,
      kind: 'container',
    });

    const crib = createCribModel();
    crib.position.set(-5.8, 0.02, -7.8);
    this.scene.add(crib);
    this.interactables.push({
      id: 'baby_crib',
      label: 'Check Nursery Crib & Baby Nicholas',
      position: new THREE.Vector3(-5.8, 0.7, -7.8),
      radius: 2.7,
      kind: 'mission',
    });

    const secDesk = createSecurityDeskModel();
    secDesk.position.set(6.5, 0.02, 4.6);
    secDesk.rotation.y = -Math.PI / 2;
    this.scene.add(secDesk);
    this.interactables.push({
      id: 'security_monitor',
      label: 'Inspect CCTV Security Terminal',
      position: new THREE.Vector3(6.5, 1.0, 4.6),
      radius: 2.5,
      kind: 'mission',
    });

    this.interactables.push({
      id: 'front_door',
      label: 'Inspect Front Estate Door & Footprints',
      position: new THREE.Vector3(0, 1.2, 8.6),
      radius: 2.5,
      kind: 'mission',
    });

    // Dynamic Binaural Haunting Sound Sources: Secret Clues & Hiding Spots
    this.proximitySources = [
      { id: 'clue_note', kind: 'clue', x: -1.8, y: 0.9, z: 2.0, radius: 5.2 },
      { id: 'clue_gift', kind: 'clue', x: 4.1, y: 0.4, z: -3.5, radius: 5.5 },
      { id: 'clue_tree', kind: 'clue', x: 5.4, y: 1.2, z: -4.6, radius: 5.4 },
      { id: 'clue_mirror', kind: 'clue', x: -8.2, y: 1.1, z: 0.75, radius: 5.0 },
      { id: 'clue_kitchen_drawer', kind: 'clue', x: -6.5, y: 0.8, z: 3.8, radius: 4.8 },
      { id: 'hide_wardrobe', kind: 'hiding_spot', x: -2.1, y: 0.8, z: -9.82, radius: 4.8 },
      { id: 'hide_bed', kind: 'hiding_spot', x: 6.8, y: 0.5, z: -8.8, radius: 4.8 },
      { id: 'hide_sofa', kind: 'hiding_spot', x: 4.1, y: 0.6, z: 2.05, radius: 4.6 },
      { id: 'hide_pantry', kind: 'hiding_spot', x: -8.8, y: 0.8, z: 4.4, radius: 4.6 },
    ];

    // 6. Outdoor Lamp Post & Snow-covered Pine Grove
    const lampPost = new THREE.Group();
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.12, 3.8, 10),
      new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.7, roughness: 0.4 }),
    );
    pole.position.y = 1.9;
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0xfef3c7 }),
    );
    bulb.position.y = 3.9;
    const streetLight = new THREE.PointLight(0xf59e0b, 2.2, 18, 1.5);
    streetLight.position.y = 3.8;
    lampPost.add(pole, bulb, streetLight);
    lampPost.position.set(-3.2, 0, 13.5);
    this.scene.add(lampPost);

    const trunkGeo = new THREE.CylinderGeometry(0.22, 0.34, 2.2, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x291c14, roughness: 0.92 });
    const tierLowGeo = new THREE.ConeGeometry(1.85, 2.5, 10);
    const tierMidGeo = new THREE.ConeGeometry(1.42, 2.3, 10);
    const tierTopGeo = new THREE.ConeGeometry(0.92, 2.0, 10);
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x162920, roughness: 0.88 });

    const treeCount = 44;
    const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
    const foliageLowInst = new THREE.InstancedMesh(tierLowGeo, foliageMat, treeCount);
    const foliageMidInst = new THREE.InstancedMesh(tierMidGeo, foliageMat, treeCount);
    const foliageTopInst = new THREE.InstancedMesh(tierTopGeo, foliageMat, treeCount);
    const dummy = new THREE.Object3D();
    const tint = new THREE.Color();

    for (let i = 0; i < treeCount; i++) {
      const angle = (i / treeCount) * Math.PI * 2;
      const radius = 21 + (i % 5) * 4.5;
      const tx = Math.cos(angle) * radius;
      const tz = Math.sin(angle) * radius + 2;
      const sc = 0.85 + (i % 4) * 0.15;

      dummy.position.set(tx, 1.1 * sc, tz);
      dummy.scale.set(sc, sc, sc);
      dummy.rotation.y = angle;
      dummy.updateMatrix();
      trunkInst.setMatrixAt(i, dummy.matrix);

      dummy.position.set(tx, 2.6 * sc, tz);
      dummy.updateMatrix();
      foliageLowInst.setMatrixAt(i, dummy.matrix);

      dummy.position.set(tx, 4.0 * sc, tz);
      dummy.updateMatrix();
      foliageMidInst.setMatrixAt(i, dummy.matrix);

      dummy.position.set(tx, 5.2 * sc, tz);
      dummy.updateMatrix();
      foliageTopInst.setMatrixAt(i, dummy.matrix);

      tint.setHSL(0.38, 0.28, 0.12 + (i % 3) * 0.03);
      foliageLowInst.setColorAt(i, tint);
      foliageMidInst.setColorAt(i, tint);
      foliageTopInst.setColorAt(i, tint);
    }
    trunkInst.computeBoundingSphere();
    foliageLowInst.computeBoundingSphere();
    foliageMidInst.computeBoundingSphere();
    foliageTopInst.computeBoundingSphere();
    this.scene.add(trunkInst, foliageLowInst, foliageMidInst, foliageTopInst);
  }

  private createSnowField(): THREE.Points {
    const count = 650;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      let sx = (Math.random() - 0.5) * 56;
      let sz = (Math.random() - 0.5) * 56;
      if (Math.abs(sx) < 10.2 && sz > -11.0 && sz < 9.0) {
        sx = sx >= 0 ? 11 + Math.random() * 16 : -11 - Math.random() * 16;
      }
      positions[i * 3] = sx;
      positions[i * 3 + 1] = Math.random() * 14;
      positions[i * 3 + 2] = sz;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xe7e5e4,
      size: 0.14,
      transparent: true,
      opacity: 0.72,
    });
    return new THREE.Points(geo, mat);
  }

  public setMode(nextMode: 'tour' | 'playing' | 'paused' | 'gameover') {
    this.mode = nextMode;
    if (nextMode === 'playing') {
      this.applyCameraVisibility();
      this.audio.unlock();
      this.audio.startAmbience();
    } else if (nextMode === 'tour') {
      this.nannyRig.group.visible = true;
      this.fpHandsRig.group.visible = false;
      this.audio.stopAmbience();
    } else if (nextMode === 'paused' || nextMode === 'gameover') {
      this.keys.clear();
      this.isDraggingLook = false;
      this.audio.updateGazeWarningHum(0);
      if (nextMode === 'paused') this.audio.stopAmbience();
    }
  }

  private applyCameraVisibility() {
    const isFp = this.cameraMode === 'first-person';
    this.nannyRig.group.visible = !isFp;
    this.fpHandsRig.group.visible = isFp;
    this.nannyRig.flashlightCone.intensity = !isFp && this.flashlightOn ? 3.4 : 0;
    this.fpHandsRig.fpFlashlight.intensity = isFp && this.flashlightOn ? 3.8 : 0;
  }

  /**
   * Switchable First-Person (default immersive horror) and Third-Person cameras ([V]).
   */
  public setCameraMode(mode: CameraMode) {
    this.cameraMode = mode;
    if (this.mode === 'playing') {
      this.applyCameraVisibility();
    }
    this.callbacks.onCameraModeChange?.(mode);
  }

  public toggleCameraMode() {
    const next: CameraMode = this.cameraMode === 'first-person' ? 'third-person' : 'first-person';
    this.setCameraMode(next);
    this.audio.playPositionalEvent('interact', 0, 0.5);
  }

  public getCameraMode(): CameraMode {
    return this.cameraMode;
  }

  public setCameraDistance(dist: number) {
    this.camZoom = THREE.MathUtils.clamp(dist, MIN_CAM_ZOOM, MAX_CAM_ZOOM);
  }

  public adjustCameraZoom(delta: number) {
    this.setCameraDistance(this.camZoom + delta);
  }

  public resetCameraBehindNanny() {
    this.camYaw = this.playerYaw;
    this.camPitch = this.cameraMode === 'first-person' ? -0.05 : -0.18;
  }

  public setDistrict(zoneId: WorldZoneId) {
    this.currentDistrict = zoneId;
    const fogColors: Record<WorldZoneId, number> = {
      christmas_estate: 0x07080c,
      christmas_city: 0x0b0c10,
      silent_town: 0x0c080a,
      frozen_woods: 0x0a0e12,
      old_market: 0x100906,
      abandoned_hospital: 0x080b0b,
      santas_territory: 0x140606,
      underground: 0x050506,
    };
    const col = fogColors[zoneId] ?? 0x07080c;
    this.scene.background = new THREE.Color(col);
    (this.scene.fog as THREE.FogExp2).color.setHex(col);
  }

  public startLevel(level: LevelDefinition, babySpeedMult: number, gazeGraceMult: number) {
    this.currentLevel = level;
    this.babySpeedMultiplier = babySpeedMult;
    this.gazeThresholdSec = level.eyeGazeThresholdSec * gazeGraceMult;
    this.completedObjectiveCount = 0;
    this.totalObjectiveCount = level.objectives.length;
    this.gazeExposureSec = 0;
    this.gazeCooldownUntil = 0;
    this.elapsedSimSec = 0;
    this.inGameMinutes = 172; // 02:52 AM — transitions organically to 03:17 AM!
    this.playerPos.set(0, 0, 5.4);
    this.velocityY = 0;
    this.isGrounded = true;
    this.playerYaw = 0;
    this.camYaw = 0;
    this.camPitch = this.cameraMode === 'first-person' ? -0.05 : -0.18;
    this.crouchToggle = false;
    this.activeHidingSpot = null;
    this.carriedItem = 'none';
    this.carryTimer317 = 0;
    this.giftWorldPos.set(4.1, 0.03, -3.5);
    this.giftMesh.position.copy(this.giftWorldPos);
    this.giftMesh.visible = true;
    this.kitchenRig.bottleGroup.visible = true;
    this.babyRig.group.visible = true;
    this.updateHeldViewmodelProps();
    this.nurseryDoorOpen = true;
    this.bathroomDoorOpen = true;
    this.kitchenCupboardOpen = false;
    this.bathroomVanityOpen = false;
    this.babyPos.set(-4.6, 0, -6.2);
    this.babyState = level.level >= 5 ? 'suspicious' : 'normal';
    this.santaRig.group.position.set(7.2, 0, 14.5);
    this.lastGazePhase = 'safe';
    this.horrorDirector.reset(level.level >= 5 ? 20 : 12);
    this.setDistrict(level.district);
    this.setMode('playing');
  }

  public setReducedFlicker(reduced: boolean) {
    this.reducedFlicker = reduced;
  }

  public setObjectiveProgress(completed: number, total: number) {
    this.completedObjectiveCount = completed;
    this.totalObjectiveCount = total;
  }

  public updateAppearance(appearance: NannyAppearance) {
    const pos = this.nannyRig.group.position.clone();
    this.scene.remove(this.nannyRig.group);
    this.nannyRig = createNannyModel(appearance, this.textures.contactShadowTex, this.textures);
    this.nannyRig.group.position.copy(pos);
    this.scene.add(this.nannyRig.group);

    this.scene.remove(this.fpHandsRig.group);
    this.fpHandsRig = createFirstPersonHandsRig(appearance, this.textures);
    this.scene.add(this.fpHandsRig.group);
    this.updateHeldViewmodelProps();
    if (this.mode === 'playing') {
      this.applyCameraVisibility();
    }
  }

  private updateHeldViewmodelProps() {
    this.fpHandsRig.bottleProp.visible = this.carriedItem === 'milk_bottle';
    this.fpHandsRig.giftProp.visible = this.carriedItem === 'gift';
    this.fpHandsRig.babyProp.visible = this.carriedItem === 'baby';
  }

  public setSensitivity(mouseSens: number) {
    this.mouseSensitivity = mouseSens;
  }

  public setVirtualMove(x: number, y: number) {
    this.virtualMove.x = THREE.MathUtils.clamp(x, -1, 1);
    this.virtualMove.y = THREE.MathUtils.clamp(y, -1, 1);
  }

  public setVirtualSprint(active: boolean) {
    this.virtualSprint = active;
  }

  public toggleCrouch() {
    if (this.activeHidingSpot) return;
    this.crouchToggle = !this.crouchToggle;
  }

  public triggerJump() {
    if (this.mode !== 'playing' || this.activeHidingSpot || !this.isGrounded) return;
    this.crouchToggle = false;
    this.velocityY = 4.65;
    this.isGrounded = false;
    this.audio.playJump();
  }

  public applyLookDelta(dx: number, dy: number) {
    this.camYaw -= dx * 0.0046 * this.mouseSensitivity;
    this.camPitch = THREE.MathUtils.clamp(
      this.camPitch - dy * 0.0036 * this.mouseSensitivity,
      -0.88,
      0.92,
    );
  }

  public toggleFlashlight() {
    this.flashlightOn = !this.flashlightOn;
    this.applyCameraVisibility();
    this.audio.playPositionalEvent('interact', 0, 0.5);
  }

  public toggleHide() {
    if (this.mode !== 'playing') return;
    if (this.activeHidingSpot) {
      this.playerPos.copy(this.activeHidingSpot.exitPos);
      this.activeHidingSpot = null;
      this.audio.playPositionalEvent('interact', 0, 0.6);
      return;
    }

    const spot = this.findNearestHidingSpot();
    if (spot) {
      this.activeHidingSpot = spot;
      this.playerPos.copy(spot.hidePos);
      this.playerYaw = spot.hideYaw;
      this.camYaw = spot.hideYaw;
      this.crouchToggle = false;
      this.audio.playPositionalEvent('interact', 0, 0.65);
    }
  }

  private setTemporaryCue(text: string, sec = 2.8) {
    this.localCueOverride = text;
    this.localCueTimer = sec;
  }

  private getNearestPickupCandidate(): { kind: Exclude<CarriedItemType, 'none'>; label: string } | null {
    if (this.carriedItem !== 'none') return null;

    const dBaby = Math.hypot(this.playerPos.x - this.babyPos.x, this.playerPos.z - this.babyPos.z);
    if (dBaby <= 2.35) {
      return { kind: 'baby', label: 'Pick Up Baby Nicholas [G]' };
    }

    const dBottle = Math.hypot(this.playerPos.x - (-6.5), this.playerPos.z - 4.7);
    if (this.kitchenRig.bottleGroup.visible && dBottle <= 2.4) {
      return { kind: 'milk_bottle', label: 'Pick Up Warm Milk Bottle [G]' };
    }

    const dGift = Math.hypot(this.playerPos.x - this.giftWorldPos.x, this.playerPos.z - this.giftWorldPos.z);
    if (this.giftMesh.visible && dGift <= 2.35) {
      return { kind: 'gift', label: 'Pick Up The Impossible Gift [G]' };
    }

    return null;
  }

  public triggerPickupDrop() {
    if (this.mode !== 'playing' || this.activeHidingSpot) return;

    if (this.carriedItem !== 'none') {
      const dropX = THREE.MathUtils.clamp(this.playerPos.x - Math.sin(this.camYaw) * 0.95, -9.0, 9.0);
      const dropZ = THREE.MathUtils.clamp(this.playerPos.z - Math.cos(this.camYaw) * 0.95, -10.0, 12.0);

      if (this.carriedItem === 'baby') {
        const distToCrib = Math.hypot(this.playerPos.x - (-5.8), this.playerPos.z - (-7.8));
        if (distToCrib <= 2.75) {
          this.babyPos.set(-5.8, 0, -7.0);
          this.callbacks.onInteract('baby_crib');
          this.setTemporaryCue('Returned Baby Nicholas gently to the nursery crib.');
        } else {
          this.babyPos.set(dropX, 0, dropZ);
          this.setTemporaryCue('Set Baby Nicholas down.');
        }
        this.babyRig.group.visible = true;
        this.gazeCooldownUntil = this.elapsedSimSec + 1.2;
      } else if (this.carriedItem === 'milk_bottle') {
        const distToBaby = Math.hypot(this.playerPos.x - this.babyPos.x, this.playerPos.z - this.babyPos.z);
        if (distToBaby <= 2.6) {
          this.kitchenRig.bottleGroup.visible = true;
          this.callbacks.onInteract('kitchen_bottle');
          this.callbacks.onInteract('baby_crib');
          this.setTemporaryCue('Fed Baby Nicholas the warm milk bottle.');
        } else {
          this.kitchenRig.bottleGroup.visible = true;
          this.setTemporaryCue('Returned the warm milk bottle to the kitchen.');
        }
      } else if (this.carriedItem === 'gift') {
        this.giftWorldPos.set(dropX, 0.03, dropZ);
        this.giftMesh.position.copy(this.giftWorldPos);
        this.giftMesh.visible = true;
        this.setTemporaryCue('Set down The Impossible Gift.');
      }

      this.carriedItem = 'none';
      this.updateHeldViewmodelProps();
      this.audio.playPositionalEvent('interact', 0, 0.65);
      return;
    }

    const cand = this.getNearestPickupCandidate();
    if (!cand) return;

    this.carriedItem = cand.kind;
    this.carryTimer317 = 0;
    if (cand.kind === 'baby') {
      this.babyRig.group.visible = false;
      this.setTemporaryCue('Carrying Baby Nicholas — bring him to the crib or press [G] to set down.');
    } else if (cand.kind === 'milk_bottle') {
      this.kitchenRig.bottleGroup.visible = false;
      this.callbacks.onInteract('kitchen_bottle');
      this.setTemporaryCue('Picked up Warm Milk Bottle — bring it to Baby Nicholas.');
    } else if (cand.kind === 'gift') {
      this.giftMesh.visible = false;
      this.callbacks.onInteract('impossible_gift');
      this.setTemporaryCue('Picked up The Impossible Gift.');
    }
    this.updateHeldViewmodelProps();
    this.audio.playPositionalEvent('interact', 0, 0.85);
  }

  public triggerInteract() {
    const near = this.findNearestInteractable();
    if (!near) return;

    if (near.id === 'door_nursery') {
      this.nurseryDoorOpen = !this.nurseryDoorOpen;
      this.audio.playDoorCreak(this.nurseryDoorOpen, 0);
      this.setTemporaryCue(this.nurseryDoorOpen ? 'Opened Nursery Door.' : 'Shut Nursery Door.');
      return;
    }
    if (near.id === 'door_bathroom') {
      this.bathroomDoorOpen = !this.bathroomDoorOpen;
      this.audio.playDoorCreak(this.bathroomDoorOpen, 0);
      this.setTemporaryCue(this.bathroomDoorOpen ? 'Opened Ensuite Bathroom Door.' : 'Shut Bathroom Door.');
      return;
    }
    if (near.id === 'kitchen_cupboard') {
      this.kitchenCupboardOpen = !this.kitchenCupboardOpen;
      this.audio.playDoorCreak(this.kitchenCupboardOpen, -0.2);
      this.setTemporaryCue(
        this.kitchenCupboardOpen
          ? 'Opened Kitchen Cupboard & Recipe Drawer — old Blackwood formula note inside.'
          : 'Closed Kitchen Cupboards.',
      );
      return;
    }
    if (near.id === 'bathroom_vanity') {
      this.bathroomVanityOpen = !this.bathroomVanityOpen;
      this.audio.playDoorCreak(this.bathroomVanityOpen, 0.2);
      this.setTemporaryCue(
        this.bathroomVanityOpen
          ? 'Opened Vanity Cabinet — breath misted across the silver mirror.'
          : 'Closed Bathroom Vanity.',
      );
      return;
    }

    this.audio.playPositionalEvent('interact', 0, 1);
    this.callbacks.onInteract(near.id);
  }

  public syncRemotePlayers(players: RemotePlayerInput[], selfUsername: string) {
    const activeIds = new Set<string>();
    for (const rp of players) {
      if (rp.username === selfUsername) continue;
      activeIds.add(rp.id);
      let rig = this.remotePlayers.get(rp.id);
      if (!rig) {
        rig = createNannyModel(
          {
            name: rp.username,
            skinTone: '#d6a584',
            hairStyle: 'waves',
            hairColor: '#3b2416',
            outfit: (rp.outfit as NannyAppearance['outfit']) || 'crimson_coat',
            accessory: 'gold_locket',
            voiceTone: 'steady',
          },
          this.textures.contactShadowTex,
          this.textures,
        );
        this.scene.add(rig.group);
        this.remotePlayers.set(rp.id, rig);
      }
      rig.group.position.lerp(_vecA.set(rp.x, rp.y, rp.z), 0.35);
      rig.group.rotation.y = rp.yaw + Math.PI;
      applyNannyPose(rig, {
        walkCycle: this.elapsedSimSec * 4,
        moving: false,
        crouchAmount: rp.isHiding ? 1 : 0,
        isHiding: Boolean(rp.isHiding),
        hidingType: rp.isHiding ? 'wardrobe' : null,
        lookPitch: 0,
        nowSec: this.elapsedSimSec,
      });
    }

    for (const [id, rig] of this.remotePlayers.entries()) {
      if (!activeIds.has(id)) {
        this.scene.remove(rig.group);
        this.remotePlayers.delete(id);
      }
    }
  }

  private findNearestInteractable(): InteractableInfo | null {
    let bestMission: InteractableInfo | null = null;
    let bestMissionDist = Infinity;
    let bestOther: InteractableInfo | null = null;
    let bestOtherDist = Infinity;

    for (const item of this.interactables) {
      const d = Math.hypot(
        this.playerPos.x - item.position.x,
        this.playerPos.z - item.position.z,
      );
      if (d <= item.radius) {
        if (item.kind === 'mission') {
          if (d < bestMissionDist) {
            bestMission = item;
            bestMissionDist = d;
          }
        } else if (d < bestOtherDist) {
          bestOther = item;
          bestOtherDist = d;
        }
      }
    }
    if (bestMission && bestOther) {
      return bestOtherDist + 0.45 < bestMissionDist ? bestOther : bestMission;
    }
    return bestMission || bestOther;
  }

  private findNearestHidingSpot(): InternalHidingSpot | null {
    let best: InternalHidingSpot | null = null;
    let bestDist = Infinity;
    for (const spot of this.hidingSpots) {
      const d = Math.hypot(
        this.playerPos.x - spot.exitPos.x,
        this.playerPos.z - spot.exitPos.z,
      );
      const d2 = Math.hypot(
        this.playerPos.x - spot.hidePos.x,
        this.playerPos.z - spot.hidePos.z,
      );
      const minD = Math.min(d, d2);
      if (minD <= spot.triggerRadius && minD < bestDist) {
        best = spot;
        bestDist = minD;
      }
    }
    return best;
  }

  private handleKeyDown(e: KeyboardEvent) {
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    this.keys.add(e.code);
    if (this.mode !== 'playing') return;

    if (e.code === 'KeyE') {
      this.triggerInteract();
    } else if (e.code === 'KeyG') {
      this.triggerPickupDrop();
    } else if (e.code === 'KeyH') {
      this.toggleHide();
    } else if (e.code === 'KeyF') {
      this.toggleFlashlight();
    } else if (e.code === 'KeyC') {
      this.toggleCrouch();
    } else if (e.code === 'KeyV') {
      this.toggleCameraMode();
    } else if (e.code === 'Space') {
      e.preventDefault();
      this.triggerJump();
    } else if (e.code === 'Equal' || e.code === 'NumpadAdd') {
      this.adjustCameraZoom(-0.35);
    } else if (e.code === 'Minus' || e.code === 'NumpadSubtract') {
      this.adjustCameraZoom(0.35);
    }
  }

  private handleKeyUp(e: KeyboardEvent) {
    this.keys.delete(e.code);
  }

  private handlePointerDown(e: PointerEvent) {
    if (this.mode !== 'playing') return;
    this.audio.unlock();
    this.isDraggingLook = true;
    this.lastPointer.x = e.clientX;
    this.lastPointer.y = e.clientY;
  }

  private handlePointerMove(e: PointerEvent) {
    if (!this.isDraggingLook || this.mode !== 'playing') return;
    const dx = e.clientX - this.lastPointer.x;
    const dy = e.clientY - this.lastPointer.y;
    this.lastPointer.x = e.clientX;
    this.lastPointer.y = e.clientY;
    this.applyLookDelta(dx, dy);
  }

  private handleWheel(e: WheelEvent) {
    if (this.mode !== 'playing') return;
    this.adjustCameraZoom(e.deltaY * 0.0025);
  }

  private handleResize() {
    if (this.disposed) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private checkWallCollision(nx: number, nz: number): boolean {
    const playerRadius = 0.40;
    for (const box of this.wallColliders) {
      if (
        nx + playerRadius > box.min.x &&
        nx - playerRadius < box.max.x &&
        nz + playerRadius > box.min.z &&
        nz - playerRadius < box.max.z
      ) {
        return true;
      }
    }
    // Closed hinged interior doors also block movement until opened with [E]
    if (!this.nurseryDoorOpen && nx > -3.2 && nx < -1.4 && nz > -2.85 && nz < -2.15) {
      return true;
    }
    if (!this.bathroomDoorOpen && nx > -5.75 && nx < -5.05 && nz > -1.2 && nz < 0.3) {
      return true;
    }
    return false;
  }

  private pollGamepad(dt: number): { moveX: number; moveZ: number; sprint: boolean } {
    let moveX = 0;
    let moveZ = 0;
    let sprint = false;
    if (typeof navigator === 'undefined' || !navigator.getGamepads) {
      return { moveX, moveZ, sprint };
    }
    const pads = navigator.getGamepads();
    const gp = pads?.[0];
    if (!gp) return { moveX, moveZ, sprint };

    const deadzone = 0.16;
    const lx = Math.abs(gp.axes[0] || 0) > deadzone ? gp.axes[0] : 0;
    const ly = Math.abs(gp.axes[1] || 0) > deadzone ? gp.axes[1] : 0;
    const rx = Math.abs(gp.axes[2] || 0) > deadzone ? gp.axes[2] : 0;
    const ry = Math.abs(gp.axes[3] || 0) > deadzone ? gp.axes[3] : 0;

    moveX = lx;
    moveZ = -ly; // Up stick is negative axis -> forward +1

    if (rx !== 0 || ry !== 0) {
      this.camYaw -= rx * 2.4 * dt * this.mouseSensitivity;
      this.camPitch = THREE.MathUtils.clamp(
        this.camPitch - ry * 1.6 * dt * this.mouseSensitivity,
        -0.58,
        0.82,
      );
    }

    sprint = Boolean(gp.buttons[6]?.pressed || gp.buttons[5]?.pressed);

    const b0 = Boolean(gp.buttons[0]?.pressed); // A/Cross -> Interact
    const b1 = Boolean(gp.buttons[1]?.pressed); // B/Circle -> Hide
    const b2 = Boolean(gp.buttons[2]?.pressed); // X/Square -> Flashlight
    const b3 = Boolean(gp.buttons[3]?.pressed); // Y/Triangle -> Crouch

    if (b0 && !this.prevGamepadButtons[0]) this.triggerInteract();
    if (b1 && !this.prevGamepadButtons[1]) this.toggleHide();
    if (b2 && !this.prevGamepadButtons[2]) this.toggleFlashlight();
    if (b3 && !this.prevGamepadButtons[3]) this.toggleCrouch();

    this.prevGamepadButtons = [b0, b1, b2, b3];
    return { moveX, moveZ, sprint };
  }

  private tick = () => {
    if (this.disposed) return;
    const rawDt = this.clock.getDelta();
    const dt = Math.min(rawDt, 0.12);
    const nowSec = this.clock.elapsedTime;

    // Flickering fireplace hearth warmth
    if (this.hearthLight) {
      this.hearthLight.intensity = 2.0 + Math.sin(nowSec * 9.5) * 0.25 + Math.cos(nowSec * 15) * 0.15;
    }

    // Snowfall animation
    const snowAttr = this.snowParticles.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < snowAttr.count; i++) {
      let sy = snowAttr.getY(i) - dt * 1.4;
      if (sy < 0) sy = 14;
      snowAttr.setY(i, sy);
    }
    snowAttr.needsUpdate = true;

    if (this.mode === 'tour') {
      // Live Title/Cover Camera Tour showing the mansion & Nanny character outside/porch
      const angle = nowSec * 0.14;
      this.camera.position.set(
        Math.sin(angle) * 14,
        4.4 + Math.sin(nowSec * 0.3) * 0.5,
        16 + Math.cos(angle) * 5,
      );
      this.camera.lookAt(0, 1.8, 0);
      this.nannyRig.group.visible = true;
      this.nannyRig.group.position.set(0.6, 0, 9.6);
      this.nannyRig.group.rotation.y = Math.PI * 0.92;
      applyNannyPose(this.nannyRig, {
        walkCycle: 0,
        moving: false,
        crouchAmount: 0,
        isHiding: false,
        hidingType: null,
        lookPitch: 0,
        nowSec,
      });
      this.babyRig.group.position.set(4.1, 0, -2.1);
      this.babyRig.group.rotation.y = Math.sin(nowSec) * 0.5;
    } else if (this.mode === 'playing') {
      this.elapsedSimSec += dt;
      this.inGameMinutes += dt * 1.15;

      if (this.localCueTimer > 0) {
        this.localCueTimer -= dt;
        if (this.localCueTimer <= 0) this.localCueOverride = null;
      }

      if (this.soundDecayTimer > 0) {
        this.soundDecayTimer -= dt;
        if (this.soundDecayTimer <= 0) this.recentSoundEvent = false;
      }

      const gp = this.pollGamepad(dt);

      // Independent Camera Orbit keyboard backup
      if (this.keys.has('KeyQ')) this.camYaw += dt * 1.85;
      if (this.keys.has('KeyR')) this.camYaw -= dt * 1.85;

      const isHiding = Boolean(this.activeHidingSpot);
      const sprinting =
        !isHiding &&
        (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || this.virtualSprint || gp.sprint);
      const crouching =
        !isHiding && (this.keys.has('ControlLeft') || this.crouchToggle);
      this.crouchAmount = THREE.MathUtils.damp(this.crouchAmount, crouching ? 1 : 0, 10, dt);

      // Vertical Jump & Gravity Kinematics
      if (!this.isGrounded || this.playerPos.y > 0) {
        this.velocityY -= 13.5 * dt;
        this.playerPos.y += this.velocityY * dt;
        if (this.playerPos.y <= 0) {
          this.playerPos.y = 0;
          this.velocityY = 0;
          this.isGrounded = true;
          this.audio.playFootstep(this.playerPos.z > 8.6 || Math.abs(this.playerPos.x) > 9.5, 0);
        }
      }

      let moveZ =
        (this.keys.has('KeyW') || this.keys.has('ArrowUp') ? 1 : 0) -
        (this.keys.has('KeyS') || this.keys.has('ArrowDown') ? 1 : 0) +
        this.virtualMove.y +
        gp.moveZ;
      let moveX =
        (this.keys.has('KeyD') || this.keys.has('ArrowRight') ? 1 : 0) -
        (this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? 1 : 0) +
        this.virtualMove.x +
        gp.moveX;

      const moveLen = isHiding ? 0 : Math.hypot(moveX, moveZ);
      const speed = sprinting && !crouching ? 5.1 : crouching ? 2.05 : 3.35;

      if (moveLen > 0.05) {
        moveX /= Math.max(1, moveLen);
        moveZ /= Math.max(1, moveLen);
        const sinC = Math.sin(this.camYaw);
        const cosC = Math.cos(this.camYaw);
        const worldDirX = -sinC * moveZ + cosC * moveX;
        const worldDirZ = -cosC * moveZ - sinC * moveX;

        const nextX = THREE.MathUtils.clamp(this.playerPos.x + worldDirX * speed * dt, -24, 24);
        const nextZ = THREE.MathUtils.clamp(this.playerPos.z + worldDirZ * speed * dt, -24, 24);

        if (!this.checkWallCollision(nextX, this.playerPos.z)) this.playerPos.x = nextX;
        if (!this.checkWallCollision(this.playerPos.x, nextZ)) this.playerPos.z = nextZ;

        if (this.cameraMode === 'first-person') {
          this.playerYaw = this.camYaw;
        } else {
          const targetYaw = Math.atan2(-worldDirX, -worldDirZ);
          this.playerYaw = lerpAngle(this.playerYaw, targetYaw, 1 - Math.exp(-12 * dt));
        }

        this.walkCycle += dt * speed * 2.85;
        this.footstepAccum += dt * speed;
        if (this.footstepAccum > 1.75 && this.isGrounded) {
          this.footstepAccum = 0;
          const isSnow = this.playerPos.z > 8.6 || Math.abs(this.playerPos.x) > 9.5;
          this.audio.playFootstep(isSnow, 0);
          if (sprinting) {
            this.recentSoundEvent = true;
            this.soundDecayTimer = 2.0;
          }
        }
      } else if (this.cameraMode === 'first-person') {
        this.playerYaw = this.camYaw;
      }

      // Animate Wardrobe, Pantry, Hinged Doors, Kitchen Cupboards/Drawer & Bathroom Vanity
      const wardrobeClosed = this.activeHidingSpot?.type === 'wardrobe';
      this.wardrobeRig.leftDoor.rotation.y = THREE.MathUtils.damp(
        this.wardrobeRig.leftDoor.rotation.y,
        wardrobeClosed ? 0.0 : 0.38,
        9,
        dt,
      );
      this.wardrobeRig.rightDoor.rotation.y = THREE.MathUtils.damp(
        this.wardrobeRig.rightDoor.rotation.y,
        wardrobeClosed ? 0.0 : -0.24,
        9,
        dt,
      );

      const pantryClosed = this.activeHidingSpot?.type === 'pantry_closet';
      this.pantryRig.door.rotation.y = THREE.MathUtils.damp(
        this.pantryRig.door.rotation.y,
        pantryClosed ? 0.0 : 0.34,
        9,
        dt,
      );

      this.nurseryDoorRig.doorPivot.rotation.y = THREE.MathUtils.damp(
        this.nurseryDoorRig.doorPivot.rotation.y,
        this.nurseryDoorOpen ? 1.25 : 0.0,
        10,
        dt,
      );
      this.bathroomDoorRig.doorPivot.rotation.y = THREE.MathUtils.damp(
        this.bathroomDoorRig.doorPivot.rotation.y,
        this.bathroomDoorOpen ? 1.2 : 0.0,
        10,
        dt,
      );
      this.kitchenRig.leftCupboardDoor.rotation.y = THREE.MathUtils.damp(
        this.kitchenRig.leftCupboardDoor.rotation.y,
        this.kitchenCupboardOpen ? -1.45 : 0.0,
        10,
        dt,
      );
      this.kitchenRig.rightCupboardDoor.rotation.y = THREE.MathUtils.damp(
        this.kitchenRig.rightCupboardDoor.rotation.y,
        this.kitchenCupboardOpen ? 1.45 : 0.0,
        10,
        dt,
      );
      this.kitchenRig.drawerGroup.position.z = THREE.MathUtils.damp(
        this.kitchenRig.drawerGroup.position.z,
        this.kitchenCupboardOpen ? 0.42 : 0.06,
        10,
        dt,
      );
      this.bathroomRig.vanityLeftDoor.rotation.y = THREE.MathUtils.damp(
        this.bathroomRig.vanityLeftDoor.rotation.y,
        this.bathroomVanityOpen ? -1.4 : 0.0,
        10,
        dt,
      );
      this.bathroomRig.vanityRightDoor.rotation.y = THREE.MathUtils.damp(
        this.bathroomRig.vanityRightDoor.rotation.y,
        this.bathroomVanityOpen ? 1.4 : 0.0,
        10,
        dt,
      );

      // Update Nanny Rig (Third-Person visible) + First-Person Viewmodel Hands
      this.applyCameraVisibility();
      this.nannyRig.group.position.copy(this.playerPos);
      this.nannyRig.group.rotation.y = this.playerYaw + Math.PI;
      applyNannyPose(this.nannyRig, {
        walkCycle: this.walkCycle,
        moving: moveLen > 0.05,
        crouchAmount: this.crouchAmount,
        isHiding,
        hidingType: this.activeHidingSpot?.type ?? null,
        lookPitch: this.camPitch,
        nowSec,
      });
      this.nannyRig.flashlightTarget.position.set(0, 1.25 + Math.sin(this.camPitch) * 2.5, 6);

      const camFwdX = -Math.sin(this.camYaw) * Math.cos(this.camPitch);
      const camFwdY = Math.sin(this.camPitch);
      const camFwdZ = -Math.cos(this.camYaw) * Math.cos(this.camPitch);

      const headHeight = isHiding
        ? 0.72
        : (this.cameraMode === 'first-person' ? 1.56 : 1.48) - this.crouchAmount * 0.44;
      const focusPoint = _vecA.set(this.playerPos.x, this.playerPos.y + headHeight, this.playerPos.z);

      if (this.cameraMode === 'first-person') {
        const walkBob = moveLen > 0.05 && this.isGrounded ? Math.sin(this.walkCycle) * 0.024 : 0;
        const peekForward = isHiding ? 0.24 : 0.0;
        this.camera.position.set(
          focusPoint.x - Math.sin(this.camYaw) * peekForward,
          focusPoint.y + walkBob,
          focusPoint.z - Math.cos(this.camYaw) * peekForward,
        );
        _camTarget.set(
          this.camera.position.x + camFwdX * 4.0,
          this.camera.position.y + camFwdY * 4.0,
          this.camera.position.z + camFwdZ * 4.0,
        );
        this.camera.lookAt(_camTarget);

        // Attach First-Person Nanny Sleeves, Flashlight & Held Prop cleanly to camera
        this.fpHandsRig.group.position.copy(this.camera.position);
        this.fpHandsRig.group.quaternion.copy(this.camera.quaternion);
        const halfFovRad = THREE.MathUtils.degToRad(this.camera.fov * 0.5);
        const horizRatio = Math.tan(halfFovRad) * this.camera.aspect;
        const armWidthScale = THREE.MathUtils.clamp(horizRatio / 0.68, 0.38, 1.0);
        const armForwardZ = -0.34 - (1 - armWidthScale) * 0.12;
        const swayX = (moveLen > 0.05 ? Math.cos(this.walkCycle * 0.5) * 0.012 : Math.sin(nowSec * 1.4) * 0.004) * armWidthScale;
        const swayY = moveLen > 0.05 ? Math.abs(Math.sin(this.walkCycle)) * 0.014 : Math.cos(nowSec * 1.8) * 0.004;
        this.fpHandsRig.rightArm.position.set(0.24 * armWidthScale + swayX, -0.22 - swayY, armForwardZ);
        this.fpHandsRig.leftArm.position.set(
          -0.22 * armWidthScale - swayX,
          (this.carriedItem !== 'none' ? -0.18 : -0.25) - swayY,
          armForwardZ - 0.02,
        );
      } else {
        // Third-Person Orbit Camera + Wall Pull-in
        const activeDist = isHiding ? 2.15 : this.camZoom;
        const shoulderOffset = isHiding ? 0.0 : 0.38;
        const desiredCam = _vecB.set(
          focusPoint.x - camFwdX * activeDist + Math.cos(this.camYaw) * shoulderOffset,
          Math.max(0.28, focusPoint.y + 0.25 - camFwdY * activeDist),
          focusPoint.z - camFwdZ * activeDist - Math.sin(this.camYaw) * shoulderOffset,
        );

        _rayDir.subVectors(desiredCam, focusPoint);
        const targetDist = _rayDir.length();
        if (targetDist > 0.05) {
          _rayDir.divideScalar(targetDist);
          this.raycaster.set(focusPoint, _rayDir);
          this.raycaster.far = targetDist;
          const hits = this.raycaster.intersectObjects(this.wallMeshes, false);
          if (hits.length > 0 && hits[0].distance < targetDist) {
            desiredCam.copy(focusPoint).addScaledVector(_rayDir, Math.max(0.75, hits[0].distance - 0.22));
          }
        }

        const alpha = 1 - Math.exp(-12 * dt);
        this.camera.position.lerp(desiredCam, alpha);
        _camTarget.set(
          focusPoint.x + camFwdX * 3.2,
          focusPoint.y + camFwdY * 2.4,
          focusPoint.z + camFwdZ * 3.2,
        );
        this.camera.lookAt(_camTarget);
      }

      // Dynamic Binaural Haunting Sound Manager near Secret Clues & Hiding Spots
      const proxAudio = evaluateProximityHaunting({
        listenerPos: {
          x: this.camera.position.x,
          y: this.camera.position.y,
          z: this.camera.position.z,
        },
        cameraYaw: this.camYaw,
        sources: this.proximitySources,
        isHiding,
      });
      this.audio.setListenerTransform(this.camera.position, {
        x: camFwdX,
        y: camFwdY,
        z: camFwdZ,
      });
      this.audio.updateProximityHaunting(proxAudio, this.elapsedSimSec);

      // Compute nearest clue coordinates for EnvironmentalHorrorDirector linger checks
      let nearClueObs: ClueProximityObservation | null = null;
      let bestClueDist = 4.2;
      const rightVecX = Math.cos(this.camYaw);
      const rightVecZ = -Math.sin(this.camYaw);
      for (const src of this.proximitySources) {
        if (src.kind !== 'clue') continue;
        const dx = src.x - this.playerPos.x;
        const dz = src.z - this.playerPos.z;
        const dist = Math.hypot(dx, dz);
        if (dist < bestClueDist) {
          bestClueDist = dist;
          const inv = dist > 1e-4 ? 1 / dist : 0;
          nearClueObs = {
            id: src.id,
            x: src.x,
            y: src.y,
            z: src.z,
            distance: dist,
            pan: THREE.MathUtils.clamp((dx * inv) * rightVecX + (dz * inv) * rightVecZ, -1, 1),
          };
        }
      }

      // Step Tiny Infant Baby Nicholas AI (follows gently or breaks free if carried during 3:17 surge)
      if (this.carriedItem === 'baby') {
        this.babyPos.copy(this.playerPos);
        if (this.inGameMinutes >= 197) {
          this.carryTimer317 += dt;
          if (this.carryTimer317 > 5.5) {
            this.carriedItem = 'none';
            this.babyRig.group.visible = true;
            this.babyPos.set(
              this.playerPos.x - Math.sin(this.camYaw) * 1.4,
              0,
              this.playerPos.z - Math.cos(this.camYaw) * 1.4,
            );
            this.updateHeldViewmodelProps();
            this.setTemporaryCue('Baby Nicholas wriggled free in the 3:17 darkness!');
          }
        }
      }

      const playerLookAtBabyDot = (() => {
        _vecC.set(
          this.babyPos.x - this.camera.position.x,
          this.babyPos.y + 0.26 - this.camera.position.y,
          this.babyPos.z - this.camera.position.z,
        ).normalize();
        return camFwdX * _vecC.x + camFwdY * _vecC.y + camFwdZ * _vecC.z;
      })();

      const ai = stepBabyAI({
        babyPos: { x: this.babyPos.x, y: this.babyPos.y, z: this.babyPos.z },
        playerPos: { x: this.playerPos.x, y: this.playerPos.y, z: this.playerPos.z },
        playerSprinting: sprinting,
        playerCrouching: crouching,
        playerHiding: isHiding,
        flashlightOn: this.flashlightOn,
        inGameMinutes: this.inGameMinutes,
        level: this.currentLevel?.level ?? 1,
        objectivesCompleted: this.completedObjectiveCount,
        totalObjectives: this.totalObjectiveCount,
        speedMultiplier: this.babySpeedMultiplier,
        recentSoundEvent: this.recentSoundEvent,
        playerLookingAtBaby: !isHiding && this.carriedItem !== 'baby' && playerLookAtBabyDot > 0.85,
        elapsedSeconds: this.elapsedSimSec,
        lastRelocateTime: this.lastRelocateTime,
      });

      this.babyState = ai.nextState;
      if (ai.directorCue && ai.directorCue !== this.lastDirectorCue) {
        this.lastDirectorCue = ai.directorCue;
        this.audio.playPositionalEvent(ai.trigger317Event ? 'bells' : 'whisper', 0.4, 0.8);
      }

      let babyMoving = false;
      if (this.carriedItem !== 'baby') {
        if (ai.shouldTeleportHidden) {
          this.babyPos.set(ai.targetPos.x, 0, ai.targetPos.z);
          this.lastRelocateTime = this.elapsedSimSec;
        } else if (ai.moveSpeed > 0.01) {
          const dx = ai.targetPos.x - this.babyPos.x;
          const dz = ai.targetPos.z - this.babyPos.z;
          const d = Math.hypot(dx, dz);
          if (d > 0.2) {
            babyMoving = true;
            const step = Math.min(d, ai.moveSpeed * dt);
            this.babyPos.x += (dx / d) * step;
            this.babyPos.z += (dz / d) * step;
            if (!ai.shouldFacePlayer) {
              this.babyYaw = lerpAngle(this.babyYaw, Math.atan2(dx, dz), 1 - Math.exp(-8 * dt));
              this.babyRig.group.rotation.y = this.babyYaw;
            }
          }
        }
      }

      this.babyRig.group.position.copy(this.babyPos);
      if (ai.shouldFacePlayer && this.carriedItem !== 'baby') {
        const targetYaw = Math.atan2(this.playerPos.x - this.babyPos.x, this.playerPos.z - this.babyPos.z);
        this.babyYaw = lerpAngle(this.babyYaw, targetYaw, 1 - Math.exp(-7 * dt));
        this.babyRig.group.rotation.y = this.babyYaw;
      }

      // Infant crawling limb animation
      const crawlPhase = babyMoving ? nowSec * 9.5 : nowSec * 1.8;
      const crawlAmp = babyMoving ? 0.55 : 0.08;
      this.babyRig.leftArm.rotation.x = Math.sin(crawlPhase) * crawlAmp;
      this.babyRig.rightArm.rotation.x = -Math.sin(crawlPhase) * crawlAmp;
      this.babyRig.leftLeg.rotation.x = -Math.sin(crawlPhase) * crawlAmp * 0.85;
      this.babyRig.rightLeg.rotation.x = Math.sin(crawlPhase) * crawlAmp * 0.85;
      this.babyRig.head.rotation.z = Math.sin(nowSec * 2.1) * 0.06;
      this.babyRig.head.rotation.x = ai.shouldFacePlayer ? -0.18 : 0.05;

      this.crimsonRuleLight.intensity = ai.trigger317Event ? 2.4 + Math.sin(nowSec * 9) * 0.8 : 0.2;
      this.interiorWarmLight.intensity = ai.trigger317Event ? 0.55 : 2.2;

      // Step Evil Santa Entity Patrol & Hiding Concealment Check
      const santaLosDir = new THREE.Vector3(
        this.playerPos.x - this.santaRig.group.position.x,
        1.1,
        this.playerPos.z - this.santaRig.group.position.z,
      );
      const santaLosDist = santaLosDir.length();
      let santaLosBlocked = false;
      if (santaLosDist > 0.2) {
        this.gazeRaycaster.set(
          _vecC.set(this.santaRig.group.position.x, 1.5, this.santaRig.group.position.z),
          santaLosDir.normalize(),
        );
        this.gazeRaycaster.far = santaLosDist - 0.2;
        santaLosBlocked = this.gazeRaycaster.intersectObjects(this.wallMeshes, false).length > 0;
      }

      const santaRes = stepSantaEntityAI({
        santaPos: {
          x: this.santaRig.group.position.x,
          y: 0,
          z: this.santaRig.group.position.z,
        },
        playerPos: { x: this.playerPos.x, y: 0, z: this.playerPos.z },
        playerHiding: isHiding,
        playerCrouching: crouching,
        lineOfSightBlocked: santaLosBlocked,
        isNightActive: ai.isNightActive,
        is317Active: ai.trigger317Event,
        level: this.currentLevel?.level ?? 1,
        elapsedSeconds: this.elapsedSimSec,
        dt,
      });

      this.santaBehavior = santaRes.behavior;
      this.santaRig.group.position.set(santaRes.nextPos.x, 0, santaRes.nextPos.z);
      this.santaRig.group.rotation.y = lerpAngle(
        this.santaRig.group.rotation.y,
        santaRes.yaw,
        1 - Math.exp(-7 * dt),
      );
      this.santaWalkCycle += dt * (santaRes.behavior === 'stalking' ? 6.5 : 3.5);
      const sSwing = Math.sin(this.santaWalkCycle) * 0.38;
      this.santaRig.leftLeg.rotation.x = sSwing;
      this.santaRig.rightLeg.rotation.x = -sSwing;
      this.santaRig.leftArm.rotation.x = -sSwing * 0.45;
      this.santaRig.rightArm.rotation.x = sSwing * 0.45;

      if (santaRes.behavior === 'caught') {
        this.mode = 'gameover';
        this.audio.playDevilsGazeLoseSequence();
        this.callbacks.onDevilsGazeTriggered({
          distance: Number(santaRes.distanceToPlayer.toFixed(1)),
          cameraMode: this.cameraMode,
          babyState: this.babyState,
          cause: 'santa_caught',
        });
      }

      // Evaluate THE DEVIL'S GAZE (Both First-Person and Third-Person, shielded when hiding or cradling Nicholas)
      this.babyRig.eyeAnchor.getWorldPosition(_vecB);
      const babyFwd = _vecC.set(Math.sin(this.babyYaw), 0, Math.cos(this.babyYaw)).normalize();

      const losDir = new THREE.Vector3().subVectors(_vecB, this.camera.position);
      const losDist = losDir.length();
      let blocked = false;
      if (losDist > 0.05) {
        this.gazeRaycaster.set(this.camera.position, losDir.divideScalar(losDist));
        this.gazeRaycaster.far = losDist - 0.15;
        blocked = this.gazeRaycaster.intersectObjects(this.wallMeshes, false).length > 0;
      }

      const gaze = evaluateDevilsGaze({
        cameraMode: this.cameraMode,
        cameraPos: { x: this.camera.position.x, y: this.camera.position.y, z: this.camera.position.z },
        cameraForward: { x: camFwdX, y: camFwdY, z: camFwdZ },
        playerEyePos: { x: focusPoint.x, y: focusPoint.y, z: focusPoint.z },
        babyEyePos: { x: _vecB.x, y: _vecB.y, z: _vecB.z },
        babyForward: { x: babyFwd.x, y: babyFwd.y, z: babyFwd.z },
        babyState: this.babyState,
        lineOfSightBlocked: blocked || this.carriedItem === 'baby',
        dt,
        currentExposureSec: this.elapsedSimSec < this.gazeCooldownUntil ? 0 : this.gazeExposureSec,
        thresholdSec: this.gazeThresholdSec,
        isHiding,
        isNightActive: ai.isNightActive,
      });

      this.gazeExposureSec = gaze.exposureSec;
      this.lastGazePhase = gaze.phase;
      const eyeMat = this.babyRig.leftEyeGlow.material as THREE.MeshStandardMaterial;
      eyeMat.emissiveIntensity = gaze.eyeGlowIntensity;
      eyeMat.opacity = ai.turnEyesRed || gaze.eyeGlowIntensity > 0.25 ? Math.min(1, gaze.eyeGlowIntensity) : 0.0;
      this.babyRig.eyeLight.intensity = ai.turnEyesRed ? gaze.eyeGlowIntensity * 1.45 : 0;
      this.audio.updateGazeWarningHum(gaze.phase === 'warning' ? gaze.progress : 0);

      // EnvironmentalHorrorDirector: observe Nanny's behavior & Fear Level, trigger 3D horror stings if lingering by clues
      const babyDist = this.babyPos.distanceTo(this.playerPos);
      const horrorOut = this.horrorDirector.observe({
        dt,
        elapsedSec: this.elapsedSimSec,
        playerPos: { x: this.playerPos.x, y: this.playerPos.y, z: this.playerPos.z },
        cameraYaw: this.camYaw,
        isSprinting: sprinting && moveLen > 0.1,
        isCrouching: crouching,
        isHiding,
        flashlightOn: this.flashlightOn,
        carriedItem: this.carriedItem,
        babyState: this.babyState,
        babyDistance: babyDist,
        gazePhase: this.lastGazePhase,
        santaNearby: santaRes.distanceToPlayer < 12,
        is317Active: ai.trigger317Event,
        isNightActive: ai.isNightActive,
        nearClue: nearClueObs,
        reducedFlicker: this.reducedFlicker,
      });

      if (horrorOut.stingTriggered) {
        const sting = horrorOut.stingTriggered;
        if (sting.targetDoor === 'nursery') {
          this.nurseryDoorOpen = false;
        } else if (sting.targetDoor === 'bathroom') {
          this.bathroomDoorOpen = false;
        }
        this.audio.playHorrorSting3D({
          kind: sting.kind,
          sourcePos: sting.sourcePos,
          pan: sting.pan,
          fearLevel: horrorOut.fearLevel,
        });
        this.setTemporaryCue(sting.subtitleCue, 3.2);
      }

      // Modulate estate lights & held brass flashlight during Horror Sting flicker
      if (horrorOut.activeFlickerStrength > 0.01) {
        const drop = 1 - horrorOut.activeFlickerStrength * 0.85;
        this.interiorWarmLight.intensity *= drop;
        if (this.hearthLight) {
          this.hearthLight.intensity *= Math.max(0.2, drop);
        }
        if (this.flashlightOn) {
          const isFp = this.cameraMode === 'first-person';
          const beamScale = horrorOut.activeStingKind === 'electrical_surge' ? Math.max(0.08, drop * 0.7) : Math.max(0.25, drop);
          this.fpHandsRig.fpFlashlight.intensity = isFp ? 3.8 * beamScale : 0;
          this.nannyRig.flashlightCone.intensity = !isFp ? 3.4 * beamScale : 0;
        }
      } else if (this.flashlightOn) {
        const isFp = this.cameraMode === 'first-person';
        this.fpHandsRig.fpFlashlight.intensity = isFp ? 3.8 : 0;
        this.nannyRig.flashlightCone.intensity = !isFp ? 3.4 : 0;
      }

      this.audio.updateFearHeartbeat(horrorOut.fearLevel, this.elapsedSimSec);

      if (gaze.phase === 'triggered' && this.mode === 'playing') {
        this.mode = 'gameover';
        this.audio.playDevilsGazeLoseSequence();
        this.callbacks.onDevilsGazeTriggered({
          distance: Number(gaze.distance.toFixed(1)),
          cameraMode: this.cameraMode,
          babyState: this.babyState,
          cause: 'devils_gaze',
        });
      }

      // Throttled HUD snapshot (~10Hz)
      if (nowSec - this.lastHudPush > 0.1) {
        this.lastHudPush = nowSec;
        const near = isHiding ? null : this.findNearestInteractable();
        const nearHide = isHiding ? null : this.findNearestHidingSpot();
        const nearPickup = isHiding ? null : this.getNearestPickupCandidate();
        const activeHideInfo: HidingSpotInfo | null = this.activeHidingSpot
          ? {
              id: this.activeHidingSpot.id,
              type: this.activeHidingSpot.type,
              label: this.activeHidingSpot.label,
              room: this.activeHidingSpot.room,
            }
          : null;
        const nearHideInfo: HidingSpotInfo | null = nearHide
          ? { id: nearHide.id, type: nearHide.type, label: nearHide.label, room: nearHide.room }
          : null;

        this.callbacks.onHudUpdate({
          babyState: this.babyState,
          gazePhase: gaze.phase,
          gazeProgress: gaze.progress,
          inGameMinutes: this.inGameMinutes,
          is317Active: ai.trigger317Event,
          isNightActive: ai.isNightActive,
          nearbyInteractable: near ? { id: near.id, label: near.label } : null,
          nearbyHidingSpot: nearHideInfo,
          nearbyPickupLabel:
            this.carriedItem !== 'none'
              ? `Drop ${this.carriedItem === 'baby' ? 'Baby Nicholas' : this.carriedItem === 'milk_bottle' ? 'Milk Bottle' : 'Impossible Gift'} [G]`
              : nearPickup?.label ?? null,
          isHiding,
          activeHidingSpot: activeHideInfo,
          isCrouching: crouching,
          cameraMode: this.cameraMode,
          cameraDistance: Number(this.camZoom.toFixed(1)),
          carriedItem: this.carriedItem,
          playerPos: {
            x: Number(this.playerPos.x.toFixed(2)),
            y: Number(this.playerPos.y.toFixed(2)),
            z: Number(this.playerPos.z.toFixed(2)),
            yaw: Number(this.playerYaw.toFixed(2)),
          },
          flashlightOn: this.flashlightOn,
          directorCue: this.localCueOverride || santaRes.warningCue || ai.directorCue,
          santaNearby: santaRes.distanceToPlayer < 12,
          santaBehavior: this.santaBehavior,
          proximityCueKind: proxAudio.active ? proxAudio.kind : null,
          proximityIntensity: proxAudio.intensity,
          fearLevel: horrorOut.fearLevel,
          fearTier: horrorOut.fearTier,
          clueLingerProgress: horrorOut.lingerProgress,
          activeHorrorSting: horrorOut.activeStingKind,
          activeFlickerStrength: horrorOut.activeFlickerStrength,
        });
      }
    }

    this.renderer.render(this.scene, this.camera);

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (gl && typeof gl.fenceSync === 'function') {
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (this.disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          this.frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          this.frameId = window.setTimeout(cb, 80);
        }
      };
      this.frameId = window.setTimeout(poll, 5);
    } else {
      this.frameId = window.setTimeout(cb, 80);
    }
  }

  public dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.audio.stopAmbience();
    this.resizeObserver.disconnect();
    window.removeEventListener('keydown', this.onKeyDownBound);
    window.removeEventListener('keyup', this.onKeyUpBound);
    window.removeEventListener('blur', this.onBlurBound);
    this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDownBound);
    this.renderer.domElement.removeEventListener('wheel', this.onWheelBound);
    window.removeEventListener('pointermove', this.onPointerMoveBound);
    window.removeEventListener('pointerup', this.onPointerUpBound);
    this.textures.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
