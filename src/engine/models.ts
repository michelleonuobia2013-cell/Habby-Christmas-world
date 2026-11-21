import * as THREE from 'three';
import type { HidingSpotType, NannyAppearance } from '../game/types';
import type { MansionTexturePack } from './textures';

export interface NannyRig {
  group: THREE.Group;
  bodyRoot: THREE.Group;
  torso: THREE.Group;
  headGroup: THREE.Group;
  leftArm: THREE.Group;
  leftForearm: THREE.Group;
  rightArm: THREE.Group;
  rightForearm: THREE.Group;
  leftLeg: THREE.Group;
  leftKnee: THREE.Group;
  rightLeg: THREE.Group;
  rightKnee: THREE.Group;
  flashlightCone: THREE.SpotLight;
  flashlightTarget: THREE.Object3D;
}

export interface BabyRig {
  group: THREE.Group;
  crawlerBody: THREE.Group;
  head: THREE.Group;
  leftEyeGlow: THREE.Mesh;
  rightEyeGlow: THREE.Mesh;
  leftNaturalIris: THREE.Mesh;
  rightNaturalIris: THREE.Mesh;
  eyeLight: THREE.PointLight;
  eyeAnchor: THREE.Object3D;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
}

export interface SantaRig {
  group: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftEye: THREE.Mesh;
  rightEye: THREE.Mesh;
}

export interface HidingWardrobeRig {
  group: THREE.Group;
  leftDoor: THREE.Group;
  rightDoor: THREE.Group;
}

export interface PantryClosetRig {
  group: THREE.Group;
  door: THREE.Group;
}

export interface DoorRig {
  group: THREE.Group;
  doorPivot: THREE.Group;
}

export interface KitchenRig {
  group: THREE.Group;
  leftCupboardDoor: THREE.Group;
  rightCupboardDoor: THREE.Group;
  drawerGroup: THREE.Group;
  bottleGroup: THREE.Group;
}

export interface BathroomSuiteRig {
  group: THREE.Group;
  vanityLeftDoor: THREE.Group;
  vanityRightDoor: THREE.Group;
  mirrorLight: THREE.PointLight;
}

export interface FirstPersonHandsRig {
  group: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  flashlightObj: THREE.Group;
  bottleProp: THREE.Group;
  giftProp: THREE.Group;
  babyProp: THREE.Group;
  fpFlashlight: THREE.SpotLight;
  fpFlashlightTarget: THREE.Object3D;
}

export function createContactShadow(shadowTex: THREE.Texture, radius = 0.55): THREE.Mesh {
  const mat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(radius, 20), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.015;
  return mesh;
}

/**
 * Anatomically proportioned, articulated realistic human Nanny (~1.68m tall).
 * Uses sculpted LatheGeometry coat silhouettes, multi-joint limbs, facial anatomy
 * (cranium, jaw, nose bridge, brow, eyelids, irises, lips), and handheld lantern.
 */
export function createNannyModel(
  appearance: NannyAppearance,
  shadowTex: THREE.Texture,
  textures?: MansionTexturePack,
): NannyRig {
  const group = new THREE.Group();
  group.add(createContactShadow(shadowTex, 0.46));

  const bodyRoot = new THREE.Group();
  group.add(bodyRoot);

  const outfitColors: Record<NannyAppearance['outfit'], number> = {
    classic_nanny: 0x262930,
    crimson_coat: 0x5c181b,
    winter_cloak: 0x22303c,
    keeper_attire: 0x3b3126,
  };
  const coatColor = outfitColors[appearance.outfit] ?? 0x262930;

  const skinMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(appearance.skinTone || '#d6a584'),
    roughness: 0.58,
    metalness: 0.02,
    bumpMap: textures?.skinBump ?? null,
    bumpScale: 0.004,
  });

  const coatMat = new THREE.MeshStandardMaterial({
    color: coatColor,
    roughness: 0.84,
    metalness: 0.04,
    bumpMap: textures?.fabricBump ?? null,
    bumpScale: 0.014,
  });

  const trimMat = new THREE.MeshStandardMaterial({
    color: 0xd6d3d1,
    roughness: 0.72,
    metalness: 0.02,
  });

  const leatherMat = new THREE.MeshStandardMaterial({
    color: 0x1a1412,
    roughness: 0.42,
    metalness: 0.08,
  });

  const hairMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(appearance.hairColor || '#2c1e16'),
    roughness: 0.65,
    metalness: 0.05,
  });

  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xc99a3b,
    roughness: 0.28,
    metalness: 0.78,
  });

  // 1. Articulated Legs (pelvis -> thigh -> knee -> calf -> leather winter boot)
  const makeLeg = (xOffset: number): { hip: THREE.Group; knee: THREE.Group } => {
    const hip = new THREE.Group();
    hip.position.set(xOffset, 0.84, 0);

    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.068, 0.30, 8, 12), leatherMat);
    thigh.position.y = -0.19;
    thigh.castShadow = true;
    hip.add(thigh);

    const knee = new THREE.Group();
    knee.position.set(0, -0.39, 0);
    hip.add(knee);

    const calf = new THREE.Mesh(new THREE.CapsuleGeometry(0.052, 0.30, 8, 12), leatherMat);
    calf.position.y = -0.19;
    calf.castShadow = true;
    knee.add(calf);

    // Sculpted boot shaft + foot + slight heel
    const bootFoot = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.068, 0.21), leatherMat);
    bootFoot.position.set(0, -0.415, 0.035);
    bootFoot.castShadow = true;
    const bootToe = new THREE.Mesh(new THREE.SphereGeometry(0.047, 10, 8), leatherMat);
    bootToe.scale.set(1, 0.72, 1.3);
    bootToe.position.set(0, -0.42, 0.125);
    knee.add(bootFoot, bootToe);

    bodyRoot.add(hip);
    return { hip, knee };
  };

  const leftLegRig = makeLeg(-0.105);
  const rightLegRig = makeLeg(0.105);

  // 2. Sculpted Contoured Torso & Victorian Winter Coat (LatheGeometry hourglass/skirt flare)
  const torso = new THREE.Group();
  torso.position.set(0, 0.82, 0);
  bodyRoot.add(torso);

  const coatProfile = [
    new THREE.Vector2(0.01, -0.36),
    new THREE.Vector2(0.25, -0.35), // Coat hem flare
    new THREE.Vector2(0.22, -0.15),
    new THREE.Vector2(0.165, 0.06), // Hips
    new THREE.Vector2(0.132, 0.21), // Tailored waist
    new THREE.Vector2(0.168, 0.42), // Bust / Ribcage
    new THREE.Vector2(0.155, 0.56), // Upper chest / shoulders
    new THREE.Vector2(0.078, 0.61), // Collar base
  ];
  const coatGeo = new THREE.LatheGeometry(coatProfile, 20);
  const coatMesh = new THREE.Mesh(coatGeo, coatMat);
  coatMesh.scale.set(1.04, 1.0, 0.76);
  coatMesh.castShadow = true;
  torso.add(coatMesh);

  // Waist leather belt & brass buckle
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.138, 0.016, 8, 20), leatherMat);
  belt.rotation.x = Math.PI / 2;
  belt.scale.set(1.02, 0.78, 1);
  belt.position.y = 0.21;
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.036, 0.018), brassMat);
  buckle.position.set(0, 0.21, 0.108);
  torso.add(belt, buckle);

  // Folded cream collar & coat lapels + double-breasted brass buttons
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.088, 0.022, 8, 18), trimMat);
  collar.rotation.x = Math.PI / 2 + 0.18;
  collar.position.set(0, 0.59, 0.008);
  torso.add(collar);

  for (let b = 0; b < 3; b++) {
    for (const side of [-0.038, 0.038]) {
      const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.012, 10), brassMat);
      btn.rotation.x = Math.PI / 2;
      btn.position.set(side, 0.30 + b * 0.095, 0.125);
      torso.add(btn);
    }
  }

  // Accessory
  if (appearance.accessory === 'gold_locket' || appearance.accessory === 'lantern_brooch') {
    const charm = new THREE.Mesh(new THREE.OctahedronGeometry(0.022, 1), brassMat);
    charm.position.set(0, 0.50, 0.13);
    torso.add(charm);
  }

  // 3. Sculpted Human Neck, Head, Facial Features & Hair
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.585, 0);
  torso.add(headGroup);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.054, 0.085, 14), skinMat);
  neck.position.y = 0.035;
  headGroup.add(neck);

  // Cranium & slightly tapered jaw
  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.10, 20, 18), skinMat);
  cranium.scale.set(0.92, 1.10, 0.98);
  cranium.position.y = 0.155;
  cranium.castShadow = true;
  headGroup.add(cranium);

  const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.070, 16, 14), skinMat);
  jaw.scale.set(0.86, 0.84, 0.95);
  jaw.position.set(0, 0.102, 0.024);
  headGroup.add(jaw);

  // Nose bridge + subtle lips
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.038, 8), skinMat);
  nose.rotation.x = Math.PI * 0.42;
  nose.position.set(0, 0.148, 0.102);
  headGroup.add(nose);

  const lipMat = new THREE.MeshStandardMaterial({ color: 0x9f5959, roughness: 0.45 });
  const lips = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.01, 0.014), lipMat);
  lips.position.set(0, 0.11, 0.09);
  headGroup.add(lips);

  // Eyes (natural sclera + dark iris + clear brow above forehead)
  const scleraMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f4, roughness: 0.2 });
  const irisMat = new THREE.MeshStandardMaterial({ color: 0x262626, roughness: 0.15 });
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.013, 10, 10), scleraMat);
    eye.position.set(side * 0.033, 0.168, 0.086);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 8), irisMat);
    iris.position.set(side * 0.033, 0.168, 0.095);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.0055, 0.008), hairMat);
    brow.position.set(side * 0.033, 0.186, 0.091);
    brow.rotation.z = side * -0.06;
    headGroup.add(eye, iris, brow);
  }

  if (appearance.accessory === 'silver_spectacles') {
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.85, roughness: 0.2 });
    const leftLens = new THREE.Mesh(new THREE.TorusGeometry(0.021, 0.003, 6, 16), rimMat);
    leftLens.position.set(-0.034, 0.168, 0.102);
    const rightLens = leftLens.clone();
    rightLens.position.x = 0.034;
    headGroup.add(leftLens, rightLens);
  }

  // Sculpted Hair Crown positioned neatly above forehead & brows (no visor clipping)
  const hairCrown = new THREE.Mesh(
    new THREE.SphereGeometry(0.104, 18, 16, 0, Math.PI * 2, 0, Math.PI * 0.56),
    hairMat,
  );
  hairCrown.scale.set(0.95, 1.08, 1.02);
  hairCrown.position.set(0, 0.168, -0.018);
  hairCrown.rotation.x = -0.36;
  headGroup.add(hairCrown);

  if (appearance.hairStyle === 'bun') {
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.054, 14, 12), hairMat);
    bun.position.set(0, 0.188, -0.112);
    headGroup.add(bun);
  } else if (appearance.hairStyle === 'bob') {
    const backHair = new THREE.Mesh(new THREE.CylinderGeometry(0.092, 0.102, 0.15, 14, 1, false, Math.PI * 0.55, Math.PI * 0.9), hairMat);
    backHair.position.set(0, 0.11, -0.025);
    headGroup.add(backHair);
  } else if (appearance.hairStyle === 'braids') {
    for (const side of [-0.072, 0.072]) {
      const braid = new THREE.Mesh(new THREE.CapsuleGeometry(0.021, 0.23, 6, 10), hairMat);
      braid.position.set(side, 0.04, -0.05);
      headGroup.add(braid);
    }
  } else {
    const waves = new THREE.Mesh(new THREE.CapsuleGeometry(0.072, 0.18, 8, 12), hairMat);
    waves.scale.set(1.25, 1, 0.65);
    waves.position.set(0, 0.075, -0.068);
    headGroup.add(waves);
  }

  // 4. Articulated Arms + Seamless Tailored Shoulder Caps + Handheld Brass Flashlight
  const makeArm = (xOffset: number, withFlashlight: boolean) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(xOffset, 0.535, 0);

    const shoulderCap = new THREE.Mesh(new THREE.SphereGeometry(0.053, 12, 10), coatMat);
    shoulderCap.castShadow = true;
    shoulder.add(shoulderCap);

    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.046, 0.21, 6, 10), coatMat);
    upper.position.y = -0.125;
    upper.castShadow = true;
    shoulder.add(upper);

    const forearmGroup = new THREE.Group();
    forearmGroup.position.set(0, -0.27, 0);
    shoulder.add(forearmGroup);

    const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.036, 0.20, 6, 10), coatMat);
    forearm.position.y = -0.12;
    forearmGroup.add(forearm);

    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.032, 10), trimMat);
    cuff.position.y = -0.21;
    forearmGroup.add(cuff);

    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.033, 10, 10), skinMat);
    hand.scale.set(0.85, 1.15, 0.72);
    hand.position.y = -0.255;
    forearmGroup.add(hand);

    if (withFlashlight) {
      const torchBody = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.018, 0.17, 10), brassMat);
      torchBody.rotation.x = Math.PI / 2;
      torchBody.position.set(0, -0.26, 0.055);
      const lens = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, 0.015, 10),
        new THREE.MeshBasicMaterial({ color: 0xfef3c7 }),
      );
      lens.rotation.x = Math.PI / 2;
      lens.position.set(0, -0.26, 0.142);
      forearmGroup.add(torchBody, lens);
    }

    torso.add(shoulder);
    return { shoulder, forearmGroup };
  };

  const leftArmRig = makeArm(-0.172, false);
  const rightArmRig = makeArm(0.172, true);

  // Flashlight SpotLight attached to torso/right hand height
  const flashlightTarget = new THREE.Object3D();
  flashlightTarget.position.set(0, 1.35, 6);
  group.add(flashlightTarget);

  const flashlightCone = new THREE.SpotLight(0xffe4b5, 3.4, 24, Math.PI / 5.2, 0.5, 1.35);
  flashlightCone.position.set(0.18, 1.32, 0.35);
  flashlightCone.target = flashlightTarget;
  group.add(flashlightCone);

  return {
    group,
    bodyRoot,
    torso,
    headGroup,
    leftArm: leftArmRig.shoulder,
    leftForearm: leftArmRig.forearmGroup,
    rightArm: rightArmRig.shoulder,
    rightForearm: rightArmRig.forearmGroup,
    leftLeg: leftLegRig.hip,
    leftKnee: leftLegRig.knee,
    rightLeg: rightLegRig.hip,
    rightKnee: rightLegRig.knee,
    flashlightCone,
    flashlightTarget,
  };
}

/**
 * Animates standing, walking, crouching, and realistic hiding postures (Wardrobe, Under Bed, Behind Sofa).
 */
export function applyNannyPose(
  rig: NannyRig,
  opts: {
    walkCycle: number;
    moving: boolean;
    crouchAmount: number;
    isHiding: boolean;
    hidingType: HidingSpotType | null;
    lookPitch: number;
    nowSec: number;
  },
) {
  if (opts.isHiding) {
    if (opts.hidingType === 'under_bed') {
      // Prone / tucked flat underneath the four-poster bed
      rig.bodyRoot.position.set(0, 0.18, 0);
      rig.bodyRoot.rotation.set(Math.PI * 0.48, 0, 0);
      rig.torso.rotation.x = 0.08;
      rig.headGroup.rotation.x = -0.45;
      rig.leftLeg.rotation.x = -0.15;
      rig.rightLeg.rotation.x = 0.1;
      rig.leftKnee.rotation.x = 0.3;
      rig.rightKnee.rotation.x = 0.25;
      rig.leftArm.rotation.x = -1.1;
      rig.rightArm.rotation.x = -1.1;
      rig.leftForearm.rotation.x = -0.8;
      rig.rightForearm.rotation.x = -0.8;
    } else {
      // Tucked deep crouch inside wardrobe / pantry / behind parlor sofa
      rig.bodyRoot.position.set(0, -0.34, 0);
      rig.bodyRoot.rotation.set(0, 0, 0);
      rig.torso.rotation.x = 0.24;
      rig.headGroup.rotation.x = -0.15;
      rig.leftLeg.rotation.x = -1.05;
      rig.rightLeg.rotation.x = -1.05;
      rig.leftKnee.rotation.x = 1.65;
      rig.rightKnee.rotation.x = 1.65;
      rig.leftArm.rotation.x = -0.75;
      rig.rightArm.rotation.x = -0.85;
      rig.leftForearm.rotation.x = -0.9;
      rig.rightForearm.rotation.x = -1.1;
    }
    return;
  }

  rig.bodyRoot.rotation.set(0, 0, 0);
  const crouchDrop = opts.crouchAmount * 0.34;
  const breath = Math.sin(opts.nowSec * 2.1) * 0.008;
  const stride = opts.moving ? Math.sin(opts.walkCycle) : 0;
  const bounce = opts.moving ? Math.abs(Math.cos(opts.walkCycle)) * 0.032 : 0;

  rig.bodyRoot.position.set(0, -crouchDrop + bounce + breath, 0);
  rig.torso.rotation.x = opts.crouchAmount * 0.25 + (opts.moving ? 0.05 : 0);
  rig.torso.rotation.y = stride * 0.04;
  rig.headGroup.rotation.x = THREE.MathUtils.clamp(-opts.lookPitch * 0.35 - opts.crouchAmount * 0.15, -0.4, 0.35);

  const legSwing = stride * (opts.crouchAmount > 0.3 ? 0.32 : 0.52);
  rig.leftLeg.rotation.x = legSwing - opts.crouchAmount * 0.65;
  rig.rightLeg.rotation.x = -legSwing - opts.crouchAmount * 0.65;
  rig.leftKnee.rotation.x = Math.max(0, -legSwing * 0.9) + opts.crouchAmount * 1.15;
  rig.rightKnee.rotation.x = Math.max(0, legSwing * 0.9) + opts.crouchAmount * 1.15;

  rig.leftArm.rotation.x = -legSwing * 0.65 + 0.06;
  rig.leftForearm.rotation.x = -0.25 - Math.abs(stride) * 0.15;

  // Right arm holds brass flashlight subtly forward
  rig.rightArm.rotation.x = legSwing * 0.25 - 0.52;
  rig.rightForearm.rotation.x = -0.62;
}

/**
 * Realistic TINY ~3–5 month old Infant Baby Nicholas (~0.52m total length).
 * Properly proportioned rounded infant cranium (~0.092m radius), soft infant limbs,
 * cozy knitted sleeper, and tiny natural eyes that flare crimson ONLY in nighttime/supernatural states.
 */
export function createBabyNicholasModel(
  shadowTex: THREE.Texture,
  textures?: MansionTexturePack,
): BabyRig {
  const group = new THREE.Group();
  group.add(createContactShadow(shadowTex, 0.26));

  const crawlerBody = new THREE.Group();
  // Crawling chest height ~0.16m off the floor (true infant size!)
  crawlerBody.position.set(0, 0.16, 0);
  group.add(crawlerBody);

  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xe6bfaa,
    roughness: 0.62,
    metalness: 0.01,
    bumpMap: textures?.skinBump ?? null,
    bumpScale: 0.003,
  });

  const onesieMat = new THREE.MeshStandardMaterial({
    color: 0xd9d2c5,
    roughness: 0.9,
    metalness: 0.01,
    bumpMap: textures?.fabricBump ?? null,
    bumpScale: 0.012,
  });

  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x7f1d1d,
    roughness: 0.85,
  });

  // Soft sculpted baby sleeper torso (oriented horizontally for natural hands-and-knees infant crawl)
  const torsoProfile = [
    new THREE.Vector2(0.01, -0.14),
    new THREE.Vector2(0.072, -0.10), // Diaper / hips
    new THREE.Vector2(0.078, 0.0),   // Soft baby belly
    new THREE.Vector2(0.068, 0.10),  // Chest / shoulders
    new THREE.Vector2(0.038, 0.14),  // Neckline
  ];
  const torsoGeo = new THREE.LatheGeometry(torsoProfile, 16);
  const torsoMesh = new THREE.Mesh(torsoGeo, onesieMat);
  torsoMesh.rotation.x = Math.PI / 2;
  torsoMesh.scale.set(1.0, 1.0, 0.88);
  torsoMesh.castShadow = true;
  crawlerBody.add(torsoMesh);

  // Festive knitted collar ruffle around neckline
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.046, 0.012, 8, 16), trimMat);
  collar.position.set(0, 0.01, 0.13);
  crawlerBody.add(collar);

  // Tiny articulated infant arms & curled hands
  const makeInfantArm = (x: number) => {
    const arm = new THREE.Group();
    arm.position.set(x, -0.02, 0.095);
    const sleeve = new THREE.Mesh(new THREE.CapsuleGeometry(0.024, 0.09, 6, 10), onesieMat);
    sleeve.position.y = -0.055;
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.023, 10, 8), skinMat);
    hand.position.y = -0.125;
    arm.add(sleeve, hand);
    crawlerBody.add(arm);
    return arm;
  };
  const leftArm = makeInfantArm(-0.072);
  const rightArm = makeInfantArm(0.072);

  // Tiny bent knees & wool baby booties
  const makeInfantLeg = (x: number) => {
    const leg = new THREE.Group();
    leg.position.set(x, -0.02, -0.095);
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.027, 0.08, 6, 10), onesieMat);
    thigh.position.y = -0.05;
    const bootie = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 8), trimMat);
    bootie.scale.set(0.9, 0.8, 1.25);
    bootie.position.set(0, -0.115, -0.02);
    leg.add(thigh, bootie);
    crawlerBody.add(leg);
    return leg;
  };
  const leftLeg = makeInfantLeg(-0.055);
  const rightLeg = makeInfantLeg(0.055);

  // Sculpted Realistic Infant Head (proportional ~0.092m radius, soft cheeks, tiny nose, fine hair wisps)
  const head = new THREE.Group();
  head.position.set(0, 0.055, 0.165);
  crawlerBody.add(head);

  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.092, 20, 18), skinMat);
  cranium.scale.set(0.96, 1.0, 1.02);
  cranium.position.y = 0.065;
  cranium.castShadow = true;
  head.add(cranium);

  // Soft chubby cheeks + button nose + parted infant mouth
  for (const side of [-1, 1]) {
    const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 10), skinMat);
    cheek.position.set(side * 0.042, 0.045, 0.072);
    head.add(cheek);
  }

  const tinyNose = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), skinMat);
  tinyNose.position.set(0, 0.062, 0.092);
  head.add(tinyNose);

  const mouth = new THREE.Mesh(
    new THREE.BoxGeometry(0.022, 0.007, 0.008),
    new THREE.MeshStandardMaterial({ color: 0xb06b65, roughness: 0.4 }),
  );
  mouth.position.set(0, 0.032, 0.088);
  head.add(mouth);

  // Fine dark infant hair tuft
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x261a14, roughness: 0.8 });
  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.094, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.42),
    hairMat,
  );
  hairCap.position.set(0, 0.07, -0.008);
  hairCap.rotation.x = -0.35;
  head.add(hairCap);

  // Realistic Sclera + Natural Baby Iris + Overlying Crimson Devil Glow
  const scleraMat = new THREE.MeshStandardMaterial({ color: 0xf4f4f5, roughness: 0.2 });
  const naturalIrisMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.15 });
  const redGlowMat = new THREE.MeshStandardMaterial({
    color: 0x1a0303,
    emissive: new THREE.Color(0xef4444),
    emissiveIntensity: 0.0,
    roughness: 0.12,
    transparent: true,
    opacity: 0.0,
  });

  const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 10), scleraMat);
  leftEye.position.set(-0.033, 0.078, 0.081);
  const rightEye = leftEye.clone();
  rightEye.position.x = 0.033;

  const leftNaturalIris = new THREE.Mesh(new THREE.SphereGeometry(0.009, 10, 10), naturalIrisMat);
  leftNaturalIris.position.set(-0.033, 0.078, 0.089);
  const rightNaturalIris = leftNaturalIris.clone();
  rightNaturalIris.position.x = 0.033;

  const leftEyeGlow = new THREE.Mesh(new THREE.SphereGeometry(0.011, 10, 10), redGlowMat);
  leftEyeGlow.position.set(-0.033, 0.078, 0.091);
  const rightEyeGlow = new THREE.Mesh(new THREE.SphereGeometry(0.011, 10, 10), redGlowMat);
  rightEyeGlow.position.set(0.033, 0.078, 0.091);

  const eyeLight = new THREE.PointLight(0xdc2626, 0.0, 4.5, 1.7);
  eyeLight.position.set(0, 0.08, 0.16);

  const eyeAnchor = new THREE.Object3D();
  eyeAnchor.position.set(0, 0.078, 0.095);

  head.add(
    leftEye,
    rightEye,
    leftNaturalIris,
    rightNaturalIris,
    leftEyeGlow,
    rightEyeGlow,
    eyeLight,
    eyeAnchor,
  );

  return {
    group,
    crawlerBody,
    head,
    leftEyeGlow,
    rightEyeGlow,
    leftNaturalIris,
    rightNaturalIris,
    eyeLight,
    eyeAnchor,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
  };
}

/**
 * Looming, realistic dark Evil Santa Entity (~2.08m tall) in tattered crimson velvet & weathered fur.
 */
export function createSantaModel(shadowTex: THREE.Texture, textures?: MansionTexturePack): SantaRig {
  const group = new THREE.Group();
  group.add(createContactShadow(shadowTex, 0.65));

  const velvetMat = new THREE.MeshStandardMaterial({
    color: 0x450b0d,
    roughness: 0.85,
    bumpMap: textures?.fabricBump ?? null,
    bumpScale: 0.018,
  });
  const furMat = new THREE.MeshStandardMaterial({ color: 0xb8b2a8, roughness: 0.94 });
  const bootMat = new THREE.MeshStandardMaterial({ color: 0x161210, roughness: 0.48, metalness: 0.1 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0x8f7c72, roughness: 0.72 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0x926b2a, roughness: 0.35, metalness: 0.75 });

  // Heavy winter boots & legs
  const makeLeg = (x: number) => {
    const leg = new THREE.Group();
    leg.position.set(x, 0.96, 0);
    const trouser = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.44, 6, 10), velvetMat);
    trouser.position.y = -0.28;
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.38, 0.26), bootMat);
    boot.position.set(0, -0.77, 0.03);
    boot.castShadow = true;
    leg.add(trouser, boot);
    group.add(leg);
    return leg;
  };
  const leftLeg = makeLeg(-0.16);
  const rightLeg = makeLeg(0.16);

  // Towering greatcoat torso
  const torso = new THREE.Group();
  torso.position.set(0, 0.94, 0);
  group.add(torso);

  const coatProfile = [
    new THREE.Vector2(0.02, -0.45),
    new THREE.Vector2(0.36, -0.42),
    new THREE.Vector2(0.28, 0.0),
    new THREE.Vector2(0.27, 0.36),
    new THREE.Vector2(0.30, 0.64),
    new THREE.Vector2(0.12, 0.74),
  ];
  const coat = new THREE.Mesh(new THREE.LatheGeometry(coatProfile, 18), velvetMat);
  coat.scale.set(1.05, 1, 0.82);
  coat.castShadow = true;
  torso.add(coat);

  // Shoulder fur mantle & belt
  const mantle = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.34, 0.24, 16), furMat);
  mantle.position.y = 0.63;
  torso.add(mantle);

  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.285, 0.285, 0.11, 18), bootMat);
  belt.scale.set(1.04, 1, 0.84);
  belt.position.y = 0.14;
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.12, 0.04), brassMat);
  buckle.position.set(0, 0.14, 0.235);
  torso.add(belt, buckle);

  // Gaunt shadowed head + weathered winter beard + fur hood
  const head = new THREE.Group();
  head.position.set(0, 0.78, 0.02);
  torso.add(head);

  const face = new THREE.Mesh(new THREE.SphereGeometry(0.145, 16, 14), skinMat);
  face.scale.set(0.92, 1.15, 0.98);
  face.position.y = 0.16;
  head.add(face);

  const beard = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.32, 10), furMat);
  beard.rotation.x = Math.PI;
  beard.position.set(0, -0.02, 0.095);
  head.add(beard);

  const hood = new THREE.Mesh(new THREE.ConeGeometry(0.175, 0.42, 14), velvetMat);
  hood.position.set(0, 0.32, -0.04);
  hood.rotation.x = -0.35;
  const hoodTrim = new THREE.Mesh(new THREE.TorusGeometry(0.148, 0.032, 8, 18), furMat);
  hoodTrim.rotation.x = Math.PI / 2 - 0.18;
  hoodTrim.position.set(0, 0.22, -0.01);
  head.add(hood, hoodTrim);

  // Faint crimson sunken eye glints under shadowed brow
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
  const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 8), eyeMat);
  leftEye.position.set(-0.048, 0.19, 0.128);
  const rightEye = leftEye.clone();
  rightEye.position.x = 0.048;
  head.add(leftEye, rightEye);

  // Arms + Iron-banded toy sack
  const makeArm = (x: number, hasSack: boolean) => {
    const arm = new THREE.Group();
    arm.position.set(x, 0.62, 0);
    const sleeve = new THREE.Mesh(new THREE.CapsuleGeometry(0.068, 0.46, 6, 10), velvetMat);
    sleeve.position.y = -0.26;
    const glove = new THREE.Mesh(new THREE.SphereGeometry(0.058, 10, 8), bootMat);
    glove.position.y = -0.55;
    arm.add(sleeve, glove);

    if (hasSack) {
      const sack = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.28, 1),
        new THREE.MeshStandardMaterial({ color: 0x3b2a1c, roughness: 0.94 }),
      );
      sack.scale.set(0.85, 1.25, 0.85);
      sack.position.set(-0.08, -0.35, -0.22);
      arm.add(sack);
    }
    torso.add(arm);
    return arm;
  };
  const leftArm = makeArm(-0.34, true);
  const rightArm = makeArm(0.34, false);

  return { group, torso, head, leftLeg, rightLeg, leftArm, rightArm, leftEye, rightEye };
}

/**
 * Interactive Oak Wardrobe where the Nanny can climb inside and shut the doors.
 */
export function createHidingWardrobeModel(woodTex?: THREE.Texture): HidingWardrobeRig {
  const group = new THREE.Group();
  const oakMat = new THREE.MeshStandardMaterial({
    color: woodTex ? 0x9c7b63 : 0x3a2419,
    map: woodTex ?? null,
    roughness: 0.68,
    metalness: 0.05,
  });
  const darkInnerMat = new THREE.MeshStandardMaterial({ color: 0x120c09, roughness: 0.95 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xca8a04, roughness: 0.3, metalness: 0.8 });

  // Back, sides, floor, crown top
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.36, 2.2, 0.08), oakMat);
  back.position.set(0, 1.1, -0.38);
  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.2, 0.8), oakMat);
  leftWall.position.set(-0.64, 1.1, 0);
  const rightWall = leftWall.clone();
  rightWall.position.x = 0.64;
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.14, 0.9), oakMat);
  top.position.set(0, 2.22, 0);
  const floor = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.1, 0.82), darkInnerMat);
  floor.position.set(0, 0.05, 0);
  group.add(back, leftWall, rightWall, top, floor);

  // Hinged left & right doors (pivot at outer jambs)
  const leftDoor = new THREE.Group();
  leftDoor.position.set(-0.6, 1.1, 0.38);
  const lPanel = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2.02, 0.05), oakMat);
  lPanel.position.set(0.3, 0, 0);
  const lKnob = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 8), brassMat);
  lKnob.position.set(0.54, 0, 0.04);
  leftDoor.add(lPanel, lKnob);

  const rightDoor = new THREE.Group();
  rightDoor.position.set(0.6, 1.1, 0.38);
  const rPanel = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2.02, 0.05), oakMat);
  rPanel.position.set(-0.3, 0, 0);
  const rKnob = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 8), brassMat);
  rKnob.position.set(-0.54, 0, 0.04);
  rightDoor.add(rPanel, rKnob);

  // Subtle slight ajar default angle so player spots it's enterable
  leftDoor.rotation.y = 0.35;
  rightDoor.rotation.y = -0.22;

  group.add(leftDoor, rightDoor);
  return { group, leftDoor, rightDoor };
}

/**
 * Interactive Four-Poster Bed with raised frame so the Nanny can crawl underneath to hide.
 */
export function createFourPosterBedModel(woodTex?: THREE.Texture): THREE.Group {
  const group = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({
    color: woodTex ? 0x8a6450 : 0x3b2218,
    map: woodTex ?? null,
    roughness: 0.65,
  });
  const quiltMat = new THREE.MeshStandardMaterial({ color: 0x5c191c, roughness: 0.88 });
  const linenMat = new THREE.MeshStandardMaterial({ color: 0xd6d3d1, roughness: 0.85 });

  // 4 tall posts (clear open space y = 0 .. 0.44 underneath!)
  for (const px of [-0.88, 0.88]) {
    for (const pz of [-1.1, 1.1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 2.05, 10), woodMat);
      post.position.set(px, 1.02, pz);
      group.add(post);
    }
  }

  // Headboard & Footboard
  const headboard = new THREE.Mesh(new THREE.BoxGeometry(1.84, 1.1, 0.08), woodMat);
  headboard.position.set(0, 1.02, -1.1);
  const footboard = new THREE.Mesh(new THREE.BoxGeometry(1.84, 0.48, 0.08), woodMat);
  footboard.position.set(0, 0.68, 1.1);
  group.add(headboard, footboard);

  // Raised frame & mattress (bottom at y = 0.46)
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.14, 2.2), woodMat);
  frame.position.set(0, 0.53, 0);
  const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.24, 2.08), linenMat);
  mattress.position.set(0, 0.72, 0);
  const blanket = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.26, 1.48), quiltMat);
  blanket.position.set(0, 0.72, 0.32);
  group.add(frame, mattress, blanket);

  for (const px of [-0.42, 0.42]) {
    const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.14, 0.38), linenMat);
    pillow.position.set(px, 0.90, -0.78);
    group.add(pillow);
  }

  return group;
}

/**
 * Interactive Velvet Parlor Sofa & Side Table (hide crouched behind).
 */
export function createParlorSofaModel(textures?: MansionTexturePack): THREE.Group {
  const group = new THREE.Group();
  const velvetMat = new THREE.MeshStandardMaterial({
    color: 0x4c1215,
    roughness: 0.88,
    bumpMap: textures?.fabricBump ?? null,
    bumpScale: 0.015,
  });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x2c1b12, roughness: 0.65 });

  const base = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.24, 0.95), woodMat);
  base.position.y = 0.18;
  const seat = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.22, 0.86), velvetMat);
  seat.position.set(0, 0.38, 0.04);
  const backrest = new THREE.Mesh(new THREE.BoxGeometry(2.22, 0.75, 0.24), velvetMat);
  backrest.position.set(0, 0.76, -0.34);
  group.add(base, seat, backrest);

  for (const ax of [-1.06, 1.06]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.56, 0.92), velvetMat);
    arm.position.set(ax, 0.56, 0);
    group.add(arm);
  }

  return group;
}

/**
 * Interactive Kitchen Pantry Closet.
 */
export function createPantryClosetModel(woodTex?: THREE.Texture): PantryClosetRig {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: woodTex ? 0x8d6e56 : 0x2e2018,
    map: woodTex ?? null,
    roughness: 0.75,
  });
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.15, 0.08), mat);
  back.position.set(0, 1.075, -0.35);
  const lSide = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.15, 0.74), mat);
  lSide.position.set(-0.52, 1.075, 0);
  const rSide = lSide.clone();
  rSide.position.x = 0.52;
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.1, 0.78), mat);
  top.position.set(0, 2.15, 0);

  const door = new THREE.Group();
  door.position.set(-0.48, 1.075, 0.36);
  const dPanel = new THREE.Mesh(new THREE.BoxGeometry(0.96, 2.02, 0.05), mat);
  dPanel.position.set(0.48, 0, 0);
  const handle = new THREE.Mesh(
    new THREE.SphereGeometry(0.025, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xca8a04, metalness: 0.8, roughness: 0.25 }),
  );
  handle.position.set(0.86, 0, 0.04);
  door.add(dPanel, handle);
  door.rotation.y = 0.3;

  group.add(back, lSide, rSide, top, door);
  return { group, door };
}

/**
 * Stone Fireplace Hearth with warm flickering ember light.
 */
export function createFireplaceHearthModel(): { group: THREE.Group; hearthLight: THREE.PointLight } {
  const group = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x2c2828, roughness: 0.92 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x26160e, roughness: 0.6 });
  const emberMat = new THREE.MeshStandardMaterial({
    color: 0x3b0d05,
    emissive: new THREE.Color(0xea580c),
    emissiveIntensity: 1.6,
  });

  const hearthBase = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.14, 0.9), stoneMat);
  hearthBase.position.set(0, 0.07, 0.15);
  const leftPillar = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.45, 0.65), stoneMat);
  leftPillar.position.set(-0.98, 0.8, 0);
  const rightPillar = leftPillar.clone();
  rightPillar.position.x = 0.98;
  const backBox = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.45, 0.22), new THREE.MeshStandardMaterial({ color: 0x0e0b0b, roughness: 0.98 }));
  backBox.position.set(0, 0.8, -0.22);
  const chimneyBreast = new THREE.Mesh(new THREE.BoxGeometry(2.1, 2.7, 0.62), stoneMat);
  chimneyBreast.position.set(0, 2.85, 0);
  const mantel = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.14, 0.78), woodMat);
  mantel.position.set(0, 1.54, 0.05);

  // Glowing logs & embers
  for (let i = 0; i < 3; i++) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.85, 8), emberMat);
    log.rotation.z = Math.PI / 2;
    log.rotation.y = (i - 1) * 0.28;
    log.position.set(0, 0.22 + i * 0.06, 0.0);
    group.add(log);
  }

  // Hanging stockings
  const sockMat = new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.88 });
  for (const sx of [-0.6, 0, 0.6]) {
    const sock = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.34, 0.05), sockMat);
    sock.position.set(sx, 1.28, 0.4);
    group.add(sock);
  }

  const hearthLight = new THREE.PointLight(0xf97316, 2.2, 11, 1.5);
  hearthLight.position.set(0, 0.65, 0.55);

  group.add(hearthBase, leftPillar, rightPillar, backBox, chimneyBreast, mantel, hearthLight);
  return { group, hearthLight };
}

export function createMullionedWindowModel(moonWindowTex: THREE.Texture): THREE.Group {
  const group = new THREE.Group();
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x1d130e, roughness: 0.7 });
  const glassMat = new THREE.MeshBasicMaterial({ map: moonWindowTex });

  const frameOuter = new THREE.Mesh(new THREE.BoxGeometry(1.68, 2.38, 0.06), frameMat);
  frameOuter.position.z = -0.02;

  const pane = new THREE.Mesh(new THREE.PlaneGeometry(1.46, 2.16), glassMat);
  pane.position.z = 0.018;

  // 3D wooden mullion crossbars
  const vMullion = new THREE.Mesh(new THREE.BoxGeometry(0.055, 2.2, 0.03), frameMat);
  vMullion.position.z = 0.026;
  const hMullionTop = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.055, 0.03), frameMat);
  hMullionTop.position.set(0, 0.36, 0.026);
  const hMullionBot = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.055, 0.03), frameMat);
  hMullionBot.position.set(0, -0.36, 0.026);

  group.add(frameOuter, pane, vMullion, hMullionTop, hMullionBot);
  return group;
}

export function createChandelierModel(): THREE.Group {
  const group = new THREE.Group();
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x27272a, metalness: 0.7, roughness: 0.35 });
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xfde68a });

  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.0, 8), ironMat);
  rod.position.y = 0.5;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.035, 8, 20), ironMat);
  ring.rotation.x = Math.PI / 2;
  group.add(rod, ring);

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.14, 8), new THREE.MeshStandardMaterial({ color: 0xf5f5f4 }));
    candle.position.set(Math.cos(a) * 0.68, 0.09, Math.sin(a) * 0.68);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.06, 6), flameMat);
    flame.position.set(Math.cos(a) * 0.68, 0.19, Math.sin(a) * 0.68);
    group.add(candle, flame);
  }
  return group;
}

export function createChristmasTreeModel(shadowTex: THREE.Texture): THREE.Group {
  const group = new THREE.Group();
  group.add(createContactShadow(shadowTex, 1.35));

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.25, 0.85, 10),
    new THREE.MeshStandardMaterial({ color: 0x2d1c13, roughness: 0.92 }),
  );
  trunk.position.y = 0.42;
  group.add(trunk);

  const pineMat = new THREE.MeshStandardMaterial({ color: 0x132b1c, roughness: 0.88 });
  const tiers = [
    { r: 1.25, h: 1.25, y: 1.25 },
    { r: 0.96, h: 1.12, y: 2.02 },
    { r: 0.66, h: 0.98, y: 2.70 },
    { r: 0.36, h: 0.72, y: 3.24 },
  ];
  tiers.forEach((t) => {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(t.r, t.h, 14), pineMat);
    cone.position.y = t.y;
    cone.castShadow = true;
    group.add(cone);
  });

  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xca8a04,
    emissive: 0x78350f,
    emissiveIntensity: 0.55,
    metalness: 0.6,
    roughness: 0.25,
  });
  const redBulbMat = new THREE.MeshStandardMaterial({
    color: 0xb91c1c,
    emissive: 0x991b1b,
    emissiveIntensity: 0.65,
    roughness: 0.2,
  });

  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 5;
    const h = 1.0 + (i / 16) * 2.1;
    const r = Math.max(0.2, 1.12 - (h - 1.0) * 0.42);
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 8, 8),
      i % 2 === 0 ? redBulbMat : goldMat,
    );
    bulb.position.set(Math.cos(angle) * r, h, Math.sin(angle) * r);
    group.add(bulb);
  }

  const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), goldMat);
  star.position.y = 3.68;
  group.add(star);

  return group;
}

export function createCribModel(): THREE.Group {
  const group = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x3b2317, roughness: 0.72 });
  const mattressMat = new THREE.MeshStandardMaterial({ color: 0xd6d3d1, roughness: 0.92 });
  const blanketMat = new THREE.MeshStandardMaterial({ color: 0x6b1d21, roughness: 0.88 });

  const base = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.14, 0.92), woodMat);
  base.position.y = 0.34;
  const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.16, 0.84), mattressMat);
  mattress.position.y = 0.48;
  const blanket = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.17, 0.84), blanketMat);
  blanket.position.set(-0.24, 0.485, 0);
  group.add(base, mattress, blanket);

  for (const [px, pz] of [
    [-0.72, -0.43],
    [0.72, -0.43],
    [-0.72, 0.43],
    [0.72, 0.43],
  ]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.042, 1.08, 8), woodMat);
    post.position.set(px, 0.54, pz);
    group.add(post);
  }

  const railTopL = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.06, 0.05), woodMat);
  railTopL.position.set(0, 1.04, 0.43);
  const railTopR = railTopL.clone();
  railTopR.position.z = -0.43;
  group.add(railTopL, railTopR);

  for (let i = -3; i <= 3; i++) {
    const slatF = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.64, 6), woodMat);
    slatF.position.set(i * 0.19, 0.71, 0.43);
    const slatB = slatF.clone();
    slatB.position.z = -0.43;
    group.add(slatF, slatB);
  }

  return group;
}

export function createDeskWithNoteModel(): THREE.Group {
  const group = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x3b2217, roughness: 0.64 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xc99a3b, metalness: 0.78, roughness: 0.25 });

  const top = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.08, 0.85), woodMat);
  top.position.y = 0.78;
  top.castShadow = true;
  group.add(top);

  for (const [lx, lz] of [
    [-0.74, -0.35],
    [0.74, -0.35],
    [-0.74, 0.35],
    [0.74, 0.35],
  ]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, 0.76, 8), woodMat);
    leg.position.set(lx, 0.38, lz);
    group.add(leg);
  }

  const note = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.012, 0.42),
    new THREE.MeshStandardMaterial({ color: 0xf5f0e6, roughness: 0.9 }),
  );
  note.position.set(-0.2, 0.828, 0.05);
  note.rotation.y = 0.16;
  group.add(note);

  const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.06, 12), brassMat);
  lampBase.position.set(0.52, 0.84, -0.15);
  const lampStem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.34, 8), brassMat);
  lampStem.position.set(0.52, 1.02, -0.15);
  const lampShade = new THREE.Mesh(
    new THREE.ConeGeometry(0.16, 0.16, 12),
    new THREE.MeshStandardMaterial({ color: 0xfef3c7, emissive: 0xd97706, emissiveIntensity: 0.75 }),
  );
  lampShade.position.set(0.52, 1.21, -0.15);
  group.add(lampBase, lampStem, lampShade);

  return group;
}

export function createKitchenCounterModel(woodTex?: THREE.Texture): KitchenRig {
  const group = new THREE.Group();
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x212426, roughness: 0.78 });
  const doorMat = new THREE.MeshStandardMaterial({
    color: woodTex ? 0x5c4738 : 0x2b2421,
    map: woodTex ?? null,
    roughness: 0.68,
  });
  const marbleMat = new THREE.MeshStandardMaterial({ color: 0xc8c4bd, roughness: 0.32, metalness: 0.05 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xc99a3b, metalness: 0.8, roughness: 0.25 });

  // Recessed interior cavity + outer counter frame
  const backPanel = new THREE.Mesh(new THREE.BoxGeometry(2.16, 0.86, 0.08), baseMat);
  backPanel.position.set(0, 0.43, -0.34);
  const leftSide = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.86, 0.76), baseMat);
  leftSide.position.set(-1.02, 0.43, 0);
  const rightSide = leftSide.clone();
  rightSide.position.x = 1.02;
  const centerStile = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.86, 0.76), baseMat);
  centerStile.position.set(0.32, 0.43, 0);
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.96, 0.04, 0.68), doorMat);
  shelf.position.set(0, 0.36, -0.02);

  const counterTop = new THREE.Mesh(new THREE.BoxGeometry(2.26, 0.07, 0.84), marbleMat);
  counterTop.position.y = 0.91;
  counterTop.castShadow = true;
  counterTop.receiveShadow = true;
  group.add(backPanel, leftSide, rightSide, centerStile, shelf, counterTop);

  // Two Hinged Cupboard Doors on Left/Center Bay
  const leftCupboardDoor = new THREE.Group();
  leftCupboardDoor.position.set(-0.94, 0.36, 0.37);
  const lDoorMesh = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.64, 0.04), doorMat);
  lDoorMesh.position.set(0.29, 0, 0);
  const lKnob = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), brassMat);
  lKnob.position.set(0.52, 0.1, 0.03);
  leftCupboardDoor.add(lDoorMesh, lKnob);

  const rightCupboardDoor = new THREE.Group();
  rightCupboardDoor.position.set(0.26, 0.36, 0.37);
  const rDoorMesh = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.64, 0.04), doorMat);
  rDoorMesh.position.set(-0.29, 0, 0);
  const rKnob = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), brassMat);
  rKnob.position.set(-0.52, 0.1, 0.03);
  rightCupboardDoor.add(rDoorMesh, rKnob);
  group.add(leftCupboardDoor, rightCupboardDoor);

  // Sliding Upper Drawer on Right Bay with secret note inside
  const drawerGroup = new THREE.Group();
  drawerGroup.position.set(0.67, 0.72, 0.06);
  const dBox = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.15, 0.62), doorMat);
  const dFront = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.18, 0.04), baseMat);
  dFront.position.z = 0.31;
  const dPull = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.03), brassMat);
  dPull.position.set(0, 0, 0.34);
  const drawerNote = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.01, 0.3),
    new THREE.MeshStandardMaterial({ color: 0xf3ead8, roughness: 0.9 }),
  );
  drawerNote.position.set(0, 0.02, 0.08);
  drawerGroup.add(dBox, dFront, dPull, drawerNote);
  group.add(drawerGroup);

  // Pick-up Warm Milk Bottle on Marble Counter
  const bottleGroup = new THREE.Group();
  bottleGroup.position.set(0.28, 0.95, 0.08);
  const bottle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.05, 0.20, 12),
    new THREE.MeshStandardMaterial({ color: 0xf5f5f4, roughness: 0.22 }),
  );
  bottle.position.y = 0.10;
  const nipple = new THREE.Mesh(
    new THREE.ConeGeometry(0.026, 0.05, 10),
    new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.45 }),
  );
  nipple.position.y = 0.225;
  bottleGroup.add(bottle, nipple);
  group.add(bottleGroup);

  return { group, leftCupboardDoor, rightCupboardDoor, drawerGroup, bottleGroup };
}

/**
 * Interactive Carved Oak Mansion Door with brass lever & raised panel detailing.
 */
export function createHingedDoorModel(woodTex?: THREE.Texture): DoorRig {
  const group = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({
    color: woodTex ? 0x6e4f3a : 0x2d1b12,
    map: woodTex ?? null,
    roughness: 0.62,
    metalness: 0.04,
  });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xc99a3b, metalness: 0.82, roughness: 0.24 });

  // Outer door frame jambs + header lintel (1.44m wide clear passage)
  const leftJamb = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.75, 0.42), woodMat);
  leftJamb.position.set(-0.76, 1.375, 0);
  const rightJamb = leftJamb.clone();
  rightJamb.position.x = 0.76;
  const topHeader = new THREE.Mesh(new THREE.BoxGeometry(1.64, 0.16, 0.44), woodMat);
  topHeader.position.set(0, 2.78, 0);
  group.add(leftJamb, rightJamb, topHeader);

  // Swinging door leaf pivoted at left jamb (-0.68)
  const doorPivot = new THREE.Group();
  doorPivot.position.set(-0.68, 0, 0);

  const leaf = new THREE.Mesh(new THREE.BoxGeometry(1.36, 2.66, 0.075), woodMat);
  leaf.position.set(0.68, 1.33, 0);
  leaf.castShadow = true;
  leaf.receiveShadow = true;

  // Recessed molded panel accents & double-sided brass doorknobs
  const upperPanel = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.96, 0.095), woodMat);
  upperPanel.position.set(0.68, 1.88, 0);
  const lowerPanel = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.82, 0.095), woodMat);
  lowerPanel.position.set(0.68, 0.74, 0);

  const knobFront = new THREE.Mesh(new THREE.SphereGeometry(0.036, 10, 10), brassMat);
  knobFront.position.set(1.22, 1.12, 0.068);
  const knobBack = knobFront.clone();
  knobBack.position.z = -0.068;

  doorPivot.add(leaf, upperPanel, lowerPanel, knobFront, knobBack);
  group.add(doorPivot);

  return { group, doorPivot };
}

/**
 * Realistic Ensuite Mansion Bathroom: Porcelain Clawfoot Bathtub, Vanity Sink with opening doors & Mirror.
 */
export function createBathroomSuiteModels(woodTex?: THREE.Texture): BathroomSuiteRig {
  const group = new THREE.Group();
  const porcelainMat = new THREE.MeshStandardMaterial({ color: 0xe7e5e4, roughness: 0.18, metalness: 0.06 });
  const darkTileMat = new THREE.MeshStandardMaterial({ color: 0x1c2124, roughness: 0.32, metalness: 0.08 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xc99a3b, metalness: 0.85, roughness: 0.22 });
  const mirrorMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.88, roughness: 0.12 });
  const woodMat = new THREE.MeshStandardMaterial({
    color: woodTex ? 0x6b4e3c : 0x2e1e15,
    map: woodTex ?? null,
    roughness: 0.64,
  });

  // Checkered slate tile floor slab
  const tileFloor = new THREE.Mesh(new THREE.BoxGeometry(3.85, 0.04, 3.65), darkTileMat);
  tileFloor.position.set(0.95, 0.018, 0.1);
  tileFloor.receiveShadow = true;
  group.add(tileFloor);

  // Clawfoot Porcelain Bathtub (North side of bath)
  const tubGroup = new THREE.Group();
  tubGroup.position.set(0.25, 0.04, -0.95);
  const tubOuter = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.56, 0.86), porcelainMat);
  tubOuter.position.y = 0.36;
  tubOuter.castShadow = true;
  const tubWater = new THREE.Mesh(
    new THREE.PlaneGeometry(1.54, 0.68),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.08, metalness: 0.22 }),
  );
  tubWater.rotation.x = -Math.PI / 2;
  tubWater.position.y = 0.645;
  const faucet = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.28, 8), brassMat);
  faucet.position.set(0.75, 0.72, 0);
  for (const [cx, cz] of [
    [-0.72, -0.34],
    [0.72, -0.34],
    [-0.72, 0.34],
    [0.72, 0.34],
  ]) {
    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), brassMat);
    foot.position.set(cx, 0.07, cz);
    tubGroup.add(foot);
  }
  tubGroup.add(tubOuter, tubWater, faucet);
  group.add(tubGroup);

  // Carved Vanity Sink Cabinet with Opening Doors + Wall Mirror (South side of bath)
  const vanity = new THREE.Group();
  vanity.position.set(0.05, 0.04, 1.15);
  const vCabinet = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.78, 0.56), woodMat);
  vCabinet.position.set(0, 0.39, 0);
  const vTop = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.06, 0.62), porcelainMat);
  vTop.position.set(0, 0.81, 0);
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.16, 0.12, 14), porcelainMat);
  basin.position.set(0, 0.84, 0.02);
  const tap = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.18, 8), brassMat);
  tap.position.set(0, 0.92, -0.18);

  const vanityLeftDoor = new THREE.Group();
  vanityLeftDoor.position.set(-0.54, 0.39, 0.29);
  const vlPanel = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.68, 0.04), woodMat);
  vlPanel.position.set(0.26, 0, 0);
  const vlKnob = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), brassMat);
  vlKnob.position.set(0.46, 0.08, 0.03);
  vanityLeftDoor.add(vlPanel, vlKnob);

  const vanityRightDoor = new THREE.Group();
  vanityRightDoor.position.set(0.54, 0.39, 0.29);
  const vrPanel = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.68, 0.04), woodMat);
  vrPanel.position.set(-0.26, 0, 0);
  const vrKnob = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), brassMat);
  vrKnob.position.set(-0.46, 0.08, 0.03);
  vanityRightDoor.add(vrPanel, vrKnob);

  // Silver Wall Mirror above Vanity
  const mirrorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.96, 1.15, 0.05), woodMat);
  mirrorFrame.position.set(0, 1.72, -0.24);
  const mirrorGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.82, 1.0), mirrorMat);
  mirrorGlass.position.set(0, 1.72, -0.21);

  const mirrorLight = new THREE.PointLight(0x93c5fd, 0.85, 6.5, 1.6);
  mirrorLight.position.set(0, 2.38, -0.05);

  vanity.add(
    vCabinet,
    vTop,
    basin,
    tap,
    vanityLeftDoor,
    vanityRightDoor,
    mirrorFrame,
    mirrorGlass,
    mirrorLight,
  );
  group.add(vanity);

  return { group, vanityLeftDoor, vanityRightDoor, mirrorLight };
}

/**
 * First-Person Viewmodel Arms: realistic Nanny sleeves, gloves/hands, brass flashlight & held items.
 */
export function createFirstPersonHandsRig(
  appearance: NannyAppearance,
  textures?: MansionTexturePack,
): FirstPersonHandsRig {
  const group = new THREE.Group();

  const outfitColors: Record<NannyAppearance['outfit'], number> = {
    classic_nanny: 0x262930,
    crimson_coat: 0x5c181b,
    winter_cloak: 0x22303c,
    keeper_attire: 0x3b3126,
  };
  const sleeveMat = new THREE.MeshStandardMaterial({
    color: outfitColors[appearance.outfit] ?? 0x262930,
    roughness: 0.82,
    bumpMap: textures?.fabricBump ?? null,
    bumpScale: 0.012,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(appearance.skinTone || '#d6a584'),
    roughness: 0.56,
    bumpMap: textures?.skinBump ?? null,
    bumpScale: 0.004,
  });
  const cuffMat = new THREE.MeshStandardMaterial({ color: 0xd6d3d1, roughness: 0.72 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xc99a3b, metalness: 0.8, roughness: 0.25 });

  // Right Hand (holds Brass Flashlight forward)
  const rightArm = new THREE.Group();
  rightArm.position.set(0.24, -0.22, -0.34);

  const rSleeve = new THREE.Mesh(new THREE.CapsuleGeometry(0.038, 0.28, 6, 10), sleeveMat);
  rSleeve.rotation.x = Math.PI * 0.46;
  rSleeve.position.set(0.03, -0.04, 0.14);
  const rCuff = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.03, 10), cuffMat);
  rCuff.rotation.x = Math.PI * 0.46;
  rCuff.position.set(0.01, -0.01, 0.02);
  const rHand = new THREE.Mesh(new THREE.SphereGeometry(0.036, 10, 10), skinMat);
  rHand.scale.set(0.85, 0.9, 1.25);
  rHand.position.set(0, 0.01, -0.03);

  const flashlightObj = new THREE.Group();
  flashlightObj.position.set(0, 0.025, -0.07);
  const torchBody = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.018, 0.18, 10), brassMat);
  torchBody.rotation.x = Math.PI / 2;
  const torchBezel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.028, 0.022, 0.025, 12),
    new THREE.MeshBasicMaterial({ color: 0xfef3c7 }),
  );
  torchBezel.rotation.x = Math.PI / 2;
  torchBezel.position.z = -0.095;
  flashlightObj.add(torchBody, torchBezel);
  rightArm.add(rSleeve, rCuff, rHand, flashlightObj);

  // Left Arm (carries Warm Milk Bottle, Impossible Gift, or cradled Infant Nicholas)
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.22, -0.24, -0.36);
  const lSleeve = new THREE.Mesh(new THREE.CapsuleGeometry(0.038, 0.28, 6, 10), sleeveMat);
  lSleeve.rotation.x = Math.PI * 0.46;
  lSleeve.position.set(-0.03, -0.04, 0.14);
  const lCuff = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.03, 10), cuffMat);
  lCuff.rotation.x = Math.PI * 0.46;
  lCuff.position.set(-0.01, -0.01, 0.02);
  const lHand = new THREE.Mesh(new THREE.SphereGeometry(0.036, 10, 10), skinMat);
  lHand.scale.set(0.85, 0.9, 1.25);
  lHand.position.set(0.02, 0.01, -0.03);
  leftArm.add(lSleeve, lCuff, lHand);

  // Held Milk Bottle prop
  const bottleProp = new THREE.Group();
  bottleProp.position.set(0.04, 0.06, -0.06);
  bottleProp.visible = false;
  const bBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.036, 0.04, 0.16, 12),
    new THREE.MeshStandardMaterial({ color: 0xf5f5f4, roughness: 0.22 }),
  );
  const bTip = new THREE.Mesh(
    new THREE.ConeGeometry(0.022, 0.045, 10),
    new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.45 }),
  );
  bTip.position.y = 0.10;
  bottleProp.add(bBody, bTip);
  leftArm.add(bottleProp);

  // Held Impossible Gift prop
  const giftProp = new THREE.Group();
  giftProp.position.set(0.11, 0.03, -0.08);
  giftProp.visible = false;
  const gBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.14, 0.18),
    new THREE.MeshStandardMaterial({ color: 0x140d0e, roughness: 0.35 }),
  );
  const gRib = new THREE.Mesh(
    new THREE.BoxGeometry(0.19, 0.15, 0.03),
    new THREE.MeshStandardMaterial({ color: 0x991b1b, emissive: 0x7f1d1d, emissiveIntensity: 0.4 }),
  );
  giftProp.add(gBox, gRib);
  leftArm.add(giftProp);

  // Held Cradled Tiny Baby Nicholas (tucked cleanly low-left in Nanny's arm, facing gently sideways)
  const babyProp = new THREE.Group();
  babyProp.position.set(0.15, 0.02, -0.10);
  babyProp.rotation.set(0.12, 0.85, -0.15);
  babyProp.visible = false;
  const onesieMat = new THREE.MeshStandardMaterial({ color: 0xd9d2c5, roughness: 0.9 });
  const bTorso = new THREE.Mesh(new THREE.CapsuleGeometry(0.058, 0.16, 6, 10), onesieMat);
  bTorso.rotation.z = Math.PI * 0.42;
  const bHead = new THREE.Mesh(
    new THREE.SphereGeometry(0.068, 14, 12),
    new THREE.MeshStandardMaterial({ color: 0xe6bfaa, roughness: 0.6 }),
  );
  bHead.position.set(-0.12, 0.075, 0.02);
  const bCollar = new THREE.Mesh(
    new THREE.TorusGeometry(0.042, 0.01, 6, 12),
    new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.85 }),
  );
  bCollar.position.set(-0.07, 0.045, 0.01);
  bCollar.rotation.y = Math.PI / 2;
  babyProp.add(bTorso, bHead, bCollar);
  leftArm.add(babyProp);

  // First-person SpotLight aligned to flashlight muzzle
  const fpFlashlightTarget = new THREE.Object3D();
  fpFlashlightTarget.position.set(0, -0.05, -8);
  const fpFlashlight = new THREE.SpotLight(0xffe4b5, 3.8, 26, Math.PI / 5.0, 0.48, 1.3);
  fpFlashlight.position.set(0.22, -0.15, -0.35);
  fpFlashlight.target = fpFlashlightTarget;

  group.add(leftArm, rightArm, fpFlashlight, fpFlashlightTarget);
  return {
    group,
    leftArm,
    rightArm,
    flashlightObj,
    bottleProp,
    giftProp,
    babyProp,
    fpFlashlight,
    fpFlashlightTarget,
  };
}

export function createSecurityDeskModel(): THREE.Group {
  const group = new THREE.Group();
  const desk = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 0.76, 0.72),
    new THREE.MeshStandardMaterial({ color: 0x1e1f24, roughness: 0.68 }),
  );
  desk.position.y = 0.38;
  group.add(desk);

  const monitorFrame = new THREE.Mesh(
    new THREE.BoxGeometry(0.68, 0.44, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.4 }),
  );
  monitorFrame.position.set(0, 1.02, -0.1);
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.6, 0.36),
    new THREE.MeshBasicMaterial({ color: 0x16a34a }),
  );
  screen.position.set(0, 1.02, -0.068);
  group.add(monitorFrame, screen);

  return group;
}

export function createImpossibleGiftModel(): THREE.Group {
  const group = new THREE.Group();
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.45, 0.55),
    new THREE.MeshStandardMaterial({ color: 0x140d0e, roughness: 0.32, metalness: 0.18 }),
  );
  box.position.y = 0.225;
  const ribbonMat = new THREE.MeshStandardMaterial({
    color: 0x991b1b,
    emissive: 0x7f1d1d,
    emissiveIntensity: 0.35,
    roughness: 0.35,
  });
  const ribbonX = new THREE.Mesh(new THREE.BoxGeometry(0.57, 0.47, 0.08), ribbonMat);
  ribbonX.position.y = 0.225;
  const ribbonZ = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.47, 0.57), ribbonMat);
  ribbonZ.position.y = 0.225;
  group.add(box, ribbonX, ribbonZ);
  return group;
}
