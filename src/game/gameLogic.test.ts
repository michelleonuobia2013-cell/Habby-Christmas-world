import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateDevilsGaze } from './devilGaze';
import { evaluateProximityHaunting } from './ambientAudio';
import { ALL_100_LEVELS } from './levels';
import { is317Window, isNightTimeWindow, stepBabyAI, stepSantaEntityAI } from './babyAI';
import {
  computeAdaptiveDifficulty,
  createDefaultSaveData,
  evaluateUnlockedEndings,
} from './adaptiveDifficulty';
import { EnvironmentalHorrorDirector } from './environmentalHorrorDirector';

describe('Habby Christmas — Core Gameplay & Logic Suite', () => {
  it('triggers THE DEVIL\'S GAZE in both First-Person and Third-Person on unobstructed nighttime red-eye contact', () => {
    const fpBase = {
      cameraMode: 'first-person' as const,
      cameraPos: { x: 0, y: 1.56, z: 4.5 },
      cameraForward: { x: 0, y: -0.25, z: -0.968 },
      playerEyePos: { x: 0, y: 1.56, z: 4.5 },
      babyEyePos: { x: 0, y: 0.34, z: 0 },
      babyForward: { x: 0, y: 0, z: 1 },
      babyState: 'supernatural' as const,
      lineOfSightBlocked: false,
      dt: 0.5,
      currentExposureSec: 0,
      thresholdSec: 1.4,
      isHiding: false,
      isNightActive: true,
    };

    const fpWarn = evaluateDevilsGaze(fpBase);
    assert.equal(fpWarn.isDirectEyeContact, true);
    assert.equal(fpWarn.phase, 'warning');

    const fpTrig = evaluateDevilsGaze({ ...fpBase, currentExposureSec: 1.1 });
    assert.equal(fpTrig.phase, 'triggered');

    const tpBase = {
      ...fpBase,
      cameraMode: 'third-person' as const,
      cameraPos: { x: 0, y: 2.1, z: 7.4 },
      cameraForward: { x: 0, y: -0.23, z: -0.973 },
    };

    const tpWarn = evaluateDevilsGaze(tpBase);
    assert.equal(tpWarn.isDirectEyeContact, true);
    assert.equal(tpWarn.phase, 'warning');

    // Looking away breaks contact immediately
    const rAway = evaluateDevilsGaze({
      ...fpBase,
      cameraForward: { x: 1, y: 0, z: 0 },
      currentExposureSec: 0.8,
    });
    assert.equal(rAway.isDirectEyeContact, false);
    assert.ok(rAway.exposureSec < 0.8);

    // Hiding inside wardrobe/under bed completely blocks Devil's Gaze
    const rHidden = evaluateDevilsGaze({
      ...fpBase,
      currentExposureSec: 0.9,
      isHiding: true,
    });
    assert.equal(rHidden.isDirectEyeContact, false);
    assert.equal(rHidden.phase, 'safe');

    // Daytime infant state keeps eyes natural and never triggers red-eye gaze
    const rDay = evaluateDevilsGaze({
      ...fpBase,
      babyState: 'normal',
      isNightActive: false,
    });
    assert.equal(rDay.isDirectEyeContact, false);
    assert.equal(rDay.eyeGlowIntensity, 0);
  });

  it('prevents false triggers when a wall blocks line of sight or baby faces away', () => {
    const blocked = evaluateDevilsGaze({
      cameraMode: 'first-person',
      cameraPos: { x: 0, y: 1.56, z: 3 },
      cameraForward: { x: 0, y: -0.35, z: -0.93 },
      playerEyePos: { x: 0, y: 1.56, z: 3 },
      babyEyePos: { x: 0, y: 0.34, z: 0 },
      babyForward: { x: 0, y: 0, z: 1 },
      babyState: 'supernatural',
      lineOfSightBlocked: true,
      dt: 1.5,
      currentExposureSec: 0,
      thresholdSec: 1.4,
    });
    assert.equal(blocked.isDirectEyeContact, false);
    assert.equal(blocked.phase, 'safe');

    const babyTurnedAway = evaluateDevilsGaze({
      cameraMode: 'third-person',
      cameraPos: { x: 0, y: 2.0, z: 6.2 },
      cameraForward: { x: 0, y: -0.25, z: -0.968 },
      playerEyePos: { x: 0, y: 1.62, z: 3 },
      babyEyePos: { x: 0, y: 0.34, z: 0 },
      babyForward: { x: 0, y: 0, z: -1 },
      babyState: 'supernatural',
      lineOfSightBlocked: false,
      dt: 1.5,
      currentExposureSec: 0,
      thresholdSec: 1.4,
    });
    assert.equal(babyTurnedAway.isDirectEyeContact, false);
  });

  it('computes dynamic binaural pan and intensity near secret clues and hiding spots', () => {
    const sources = [
      { id: 'clue_gift', kind: 'clue' as const, x: 3.0, y: 0.5, z: 0, radius: 5.0 },
      { id: 'hide_wardrobe', kind: 'hiding_spot' as const, x: -2.0, y: 0.5, z: 0, radius: 4.5 },
    ];

    // Facing North (yaw = 0): clue to the right (+X) pans right (+1)
    const nearClueRight = evaluateProximityHaunting({
      listenerPos: { x: 1.5, y: 1.5, z: 0 },
      cameraYaw: 0,
      sources,
    });
    assert.equal(nearClueRight.active, true);
    assert.equal(nearClueRight.kind, 'clue');
    assert.ok(nearClueRight.pan > 0.8);
    assert.ok(nearClueRight.intensity > 0.4);

    // Facing North (yaw = 0): hiding spot to the left (-X) pans left (-1)
    const nearHideLeft = evaluateProximityHaunting({
      listenerPos: { x: -1.0, y: 1.5, z: 0 },
      cameraYaw: 0,
      sources,
    });
    assert.equal(nearHideLeft.active, true);
    assert.equal(nearHideLeft.kind, 'hiding_spot');
    assert.ok(nearHideLeft.pan < -0.8);

    // Far away -> silent
    const far = evaluateProximityHaunting({
      listenerPos: { x: 0, y: 1.5, z: 18 },
      cameraYaw: 0,
      sources,
    });
    assert.equal(far.active, false);
    assert.equal(far.intensity, 0);
  });

  it('generates all 100 unique progressive levels across 10 chapters', () => {
    assert.equal(ALL_100_LEVELS.length, 100);
    const numbers = new Set(ALL_100_LEVELS.map((l) => l.level));
    assert.equal(numbers.size, 100);
    assert.equal(ALL_100_LEVELS[0].chapter, 1);
    assert.equal(ALL_100_LEVELS[99].chapter, 10);
    assert.ok(ALL_100_LEVELS[0].objectives.length >= 3);
    assert.ok(ALL_100_LEVELS[99].eyeGazeThresholdSec < ALL_100_LEVELS[0].eyeGazeThresholdSec);
  });

  it('activates 3:17 AM rule window, distinguishes daytime vs nighttime infant eyes, and protects hiding players from Santa', () => {
    assert.equal(is317Window(197), true);
    assert.equal(is317Window(198), true);
    assert.equal(is317Window(160), false);
    assert.equal(isNightTimeWindow(720), false);
    assert.equal(isNightTimeWindow(180), true);

    const dayDecision = stepBabyAI({
      babyPos: { x: -4, y: 0, z: -6 },
      playerPos: { x: 0, y: 0, z: 4 },
      playerSprinting: false,
      playerCrouching: false,
      flashlightOn: true,
      inGameMinutes: 720,
      level: 1,
      objectivesCompleted: 1,
      totalObjectives: 3,
      speedMultiplier: 1.0,
      recentSoundEvent: false,
      playerLookingAtBaby: true,
      elapsedSeconds: 45,
      lastRelocateTime: 0,
    });
    assert.equal(dayDecision.turnEyesRed, false);
    assert.equal(dayDecision.isNightActive, false);

    const night317 = stepBabyAI({
      babyPos: { x: -4, y: 0, z: -6 },
      playerPos: { x: 0, y: 0, z: 4 },
      playerSprinting: false,
      playerCrouching: false,
      flashlightOn: true,
      inGameMinutes: 197,
      level: 1,
      objectivesCompleted: 1,
      totalObjectives: 3,
      speedMultiplier: 1.0,
      recentSoundEvent: false,
      playerLookingAtBaby: false,
      elapsedSeconds: 45,
      lastRelocateTime: 0,
    });
    assert.equal(night317.nextState, 'supernatural');
    assert.equal(night317.trigger317Event, true);
    assert.equal(night317.turnEyesRed, true);

    const santaExposed = stepSantaEntityAI({
      santaPos: { x: 1, y: 0, z: 2 },
      playerPos: { x: 1, y: 0, z: 5 },
      playerHiding: false,
      playerCrouching: false,
      lineOfSightBlocked: false,
      isNightActive: true,
      is317Active: true,
      level: 3,
      elapsedSeconds: 40,
      dt: 0.1,
    });
    assert.equal(santaExposed.behavior, 'stalking');

    const santaHidden = stepSantaEntityAI({
      santaPos: { x: 1, y: 0, z: 2 },
      playerPos: { x: 1, y: 0, z: 3 },
      playerHiding: true,
      playerCrouching: true,
      lineOfSightBlocked: false,
      isNightActive: true,
      is317Active: true,
      level: 3,
      elapsedSeconds: 40,
      dt: 0.1,
    });
    assert.equal(santaHidden.behavior, 'searching');
  });

  it('scales adaptive difficulty and unlocks endings from clues & decisions', () => {
    const save = createDefaultSaveData('Clara', false);
    assert.equal(save.settings.cameraDefault, 'first-person');

    const guided = computeAdaptiveDifficulty(
      { ...save.metrics, gazeDeathsCount: 4 },
      false,
      true,
    );
    assert.equal(guided.tier, 'Story-Guided');
    assert.ok(guided.gazeGraceMultiplier > 1.4);

    const unlockedBefore = evaluateUnlockedEndings(save);
    assert.equal(unlockedBefore.length, 0);

    const endSave = {
      ...save,
      completedLevels: Array.from({ length: 100 }, (_, i) => i + 1),
      unlockedClues: Array.from({ length: 12 }, (_, i) => `clue_${String(i + 1).padStart(3, '0')}`),
      decisions: { mercy_nicholas: 'yes', trust_evelyn: 'yes' },
    };
    const unlockedAfter = evaluateUnlockedEndings(endSave);
    assert.ok(unlockedAfter.some((e) => e.id === 'ending_broken_curse'));
    assert.ok(unlockedAfter.some((e) => e.id === 'ending_hidden'));
  });

  it('observes Nanny behavior & Fear Level and triggers procedural 3D horror stings when lingering near a clue', () => {
    const director = new EnvironmentalHorrorDirector();
    director.reset(12);

    const baseInput = {
      dt: 0.2,
      elapsedSec: 0,
      playerPos: { x: -2.2, y: 0, z: 2.2 },
      cameraYaw: 0,
      isSprinting: false,
      isCrouching: false,
      isHiding: false,
      flashlightOn: true,
      carriedItem: 'none' as const,
      babyState: 'normal' as const,
      babyDistance: 8,
      gazePhase: 'safe' as const,
      santaNearby: false,
      is317Active: false,
      isNightActive: true,
      nearClue: { id: 'clue_note', x: -1.8, y: 0.9, z: 2.0, distance: 0.6, pan: 0.5 },
      reducedFlicker: false,
    };

    // Linger near clue until procedural horror sting triggers
    let triggered = null as ReturnType<EnvironmentalHorrorDirector['observe']>['stingTriggered'];
    let lastOut = director.observe(baseInput);
    for (let step = 1; step <= 45; step++) {
      lastOut = director.observe({
        ...baseInput,
        elapsedSec: step * 0.2,
        flashlightOn: false, // standing in darkness raises Fear faster
      });
      if (lastOut.stingTriggered) {
        triggered = lastOut.stingTriggered;
        break;
      }
    }

    assert.ok(triggered, 'Expected lingering near clue to trigger a procedural horror sting');
    assert.equal(triggered!.clueId, 'clue_note');
    assert.ok(['door_slam', 'light_flicker', 'electrical_surge', 'shadow_whisper'].includes(triggered!.kind));
    assert.ok(lastOut.fearLevel > 30, 'Expected Fear Level to climb from lingering in darkness');
    assert.ok(lastOut.activeFlickerStrength > 0, 'Expected active flicker strength after sting');

    // Immediate next frame respects cooldown and does not re-spam a sting
    const immediateNext = director.observe({
      ...baseInput,
      elapsedSec: 9.2,
    });
    assert.equal(immediateNext.stingTriggered, null);

    // Hiding calmly away from clues lowers Fear Level
    let hiddenOut = immediateNext;
    for (let i = 0; i < 20; i++) {
      hiddenOut = director.observe({
        ...baseInput,
        elapsedSec: 10 + i * 0.2,
        isHiding: true,
        flashlightOn: true,
        nearClue: null,
      });
    }
    assert.ok(hiddenOut.fearLevel < lastOut.fearLevel, 'Expected Fear Level to ease when hiding calmly');
  });

  it('triggers door_slam near mirror/bathroom clues and caps flicker under reducedFlicker', () => {
    const director = new EnvironmentalHorrorDirector();
    director.reset(60);

    let out = director.observe({
      dt: 0.25,
      elapsedSec: 0,
      playerPos: { x: -7.5, y: 0, z: 0.8 },
      cameraYaw: 0,
      isSprinting: true,
      isCrouching: false,
      isHiding: false,
      flashlightOn: true,
      carriedItem: 'gift',
      babyState: 'supernatural',
      babyDistance: 4.5,
      gazePhase: 'safe',
      santaNearby: false,
      is317Active: true,
      isNightActive: true,
      nearClue: { id: 'clue_mirror', x: -8.2, y: 1.1, z: 0.75, distance: 0.7, pan: -0.9 },
      reducedFlicker: true,
    });

    let triggered = out.stingTriggered;
    for (let s = 1; s <= 30 && !triggered; s++) {
      out = director.observe({
        dt: 0.25,
        elapsedSec: s * 0.25,
        playerPos: { x: -7.5, y: 0, z: 0.8 },
        cameraYaw: 0,
        isSprinting: true,
        isCrouching: false,
        isHiding: false,
        flashlightOn: true,
        carriedItem: 'gift',
        babyState: 'supernatural',
        babyDistance: 4.5,
        gazePhase: 'safe',
        santaNearby: false,
        is317Active: true,
        isNightActive: true,
        nearClue: { id: 'clue_mirror', x: -8.2, y: 1.1, z: 0.75, distance: 0.7, pan: -0.9 },
        reducedFlicker: true,
      });
      triggered = out.stingTriggered;
    }

    assert.ok(triggered);
    assert.equal(triggered!.kind, 'door_slam');
    assert.equal(triggered!.targetDoor, 'bathroom');
    assert.ok(out.activeFlickerStrength <= 0.45, 'reducedFlicker caps strobe strength <= 0.45');
  });
});
