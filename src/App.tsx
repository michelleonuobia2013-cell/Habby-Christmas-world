/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HabbyWorldEngine, type EngineHudSnapshot, type RemotePlayerInput } from './engine/HabbyWorldEngine';
import {
  computeAdaptiveDifficulty,
  createDefaultSaveData,
} from './game/adaptiveDifficulty';
import { ALL_100_LEVELS } from './game/levels';
import type {
  BabyState,
  CameraMode,
  GamePhase,
  GameSettings,
  LevelDefinition,
  MenuTab,
  NannyAppearance,
  OwnedPropertyState,
  PlayerSaveData,
  WorldLocation,
} from './game/types';
import { OpeningSequence } from './components/OpeningSequence';
import { MainMenuHub } from './components/MainMenuHub';
import { PlayingHud } from './components/PlayingHud';
import { DevilsGazeOverlay } from './components/DevilsGazeOverlay';
import { OfflineIndicator } from './components/InstallSection';
import type { MultiplayerRoomInfo } from './components/MultiplayerAndProfileViews';

const SAVE_STORAGE_KEY = 'habby_christmas_save_v1';

function loadInitialSave(): PlayerSaveData {
  try {
    const raw = localStorage.getItem(SAVE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PlayerSaveData>;
      const base = createDefaultSaveData(parsed.username || 'Nanny Guest', parsed.isGuest ?? true);
      return {
        ...base,
        ...parsed,
        nanny: { ...base.nanny, ...(parsed.nanny || {}) },
        settings: {
          ...base.settings,
          ...(parsed.settings || {}),
        },
        metrics: { ...base.metrics, ...(parsed.metrics || {}) },
      };
    }
  } catch {
    // Fallback to clean default save
  }
  return createDefaultSaveData();
}

const DEFAULT_HUD: EngineHudSnapshot = {
  babyState: 'normal',
  gazePhase: 'safe',
  gazeProgress: 0,
  inGameMinutes: 172,
  is317Active: false,
  isNightActive: true,
  nearbyInteractable: null,
  nearbyHidingSpot: null,
  nearbyPickupLabel: null,
  isHiding: false,
  activeHidingSpot: null,
  isCrouching: false,
  cameraMode: 'first-person',
  cameraDistance: 3.1,
  carriedItem: 'none',
  playerPos: { x: 0, y: 0, z: 5.4, yaw: 0 },
  flashlightOn: true,
  directorCue: null,
  santaNearby: false,
  santaBehavior: 'patrol',
  proximityCueKind: null,
  proximityIntensity: 0,
  fearLevel: 12,
  fearTier: 'calm',
  clueLingerProgress: 0,
  activeHorrorSting: null,
  activeFlickerStrength: 0,
};

export default function App() {
  const isAutostart = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('autostart') === '1';
  }, []);

  const [save, setSave] = useState<PlayerSaveData>(() => loadInitialSave());
  const [phase, setPhase] = useState<GamePhase>(isAutostart ? 'playing' : 'logo');
  const [menuTab, setMenuTab] = useState<MenuTab>('home');
  const [activeLocationId, setActiveLocationId] = useState<string>('loc_estate');
  const [currentLevelNum, setCurrentLevelNum] = useState<number>(() =>
    isAutostart ? 1 : Math.min(100, loadInitialSave().highestLevelUnlocked || 1),
  );
  const [completedObjectives, setCompletedObjectives] = useState<Record<string, boolean>>({});
  const [hud, setHud] = useState<EngineHudSnapshot>(DEFAULT_HUD);
  const [muted, setMuted] = useState<boolean>(false);
  const [gazeDetails, setGazeDetails] = useState<{
    distance: number;
    cameraMode: CameraMode;
    babyState: BabyState;
    cause?: 'devils_gaze' | 'santa_caught';
  }>({
    distance: 2.5,
    cameraMode: 'first-person',
    babyState: 'supernatural',
    cause: 'devils_gaze',
  });
  const [activeRoom, setActiveRoom] = useState<MultiplayerRoomInfo | null>(null);

  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<HabbyWorldEngine | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const remotePlayersRef = useRef<Map<string, RemotePlayerInput>>(new Map());
  const levelStartTimeRef = useRef<number>(Date.now());
  const lastMoveSyncRef = useRef<number>(0);

  const currentLevel: LevelDefinition = useMemo(
    () => ALL_100_LEVELS[Math.max(0, Math.min(99, currentLevelNum - 1))],
    [currentLevelNum],
  );

  const adaptive = useMemo(
    () =>
      computeAdaptiveDifficulty(
        save.metrics,
        Boolean(activeRoom && activeRoom.players.length > 1),
        save.settings.accessibilitySlowGaze,
      ),
    [save.metrics, save.settings.accessibilitySlowGaze, activeRoom],
  );

  // Refs for stable engine callbacks
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const currentLevelRef = useRef(currentLevel);
  currentLevelRef.current = currentLevel;
  const completedObjectivesRef = useRef(completedObjectives);
  completedObjectivesRef.current = completedObjectives;
  const saveRef = useRef(save);
  saveRef.current = save;
  const activeRoomRef = useRef(activeRoom);
  activeRoomRef.current = activeRoom;

  // Persist save locally + server
  const persistSave = useCallback((nextSave: PlayerSaveData) => {
    setSave(nextSave);
    try {
      localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(nextSave));
    } catch {
      // Ignore storage quota issues
    }
    fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: nextSave.username, saveData: nextSave }),
    }).catch(() => {});
  }, []);

  // Sync document.body.dataset.state for testability & phase awareness
  useEffect(() => {
    const stateMap: Record<GamePhase, string> = {
      logo: 'title',
      cover: 'title',
      loading: 'title',
      account: 'title',
      character: 'title',
      menu: 'title',
      playing: 'playing',
      paused: 'paused',
      gameover_gaze: 'gameover',
      level_complete: 'gameover',
    };
    document.body.dataset.state = stateMap[phase];
  }, [phase]);

  const handleCompleteLevel = useCallback((lvl: LevelDefinition, currentSave: PlayerSaveData) => {
    const clearSec = Math.max(8, Math.round((Date.now() - levelStartTimeRef.current) / 1000));
    const prevAvg = currentSave.metrics.averageClearSeconds || clearSec;
    const nextAvg = Math.round((prevAvg + clearSec) / 2);

    const nextCompleted = Array.from(new Set([...currentSave.completedLevels, lvl.level]));
    const nextHighest = Math.min(100, Math.max(currentSave.highestLevelUnlocked, lvl.level + 1));
    const nextClues = Array.from(new Set([...currentSave.unlockedClues, lvl.hiddenClueId]));

    const nextAch = new Set(currentSave.unlockedAchievements);
    if (lvl.level >= 1) nextAch.add('ach_first_night');
    if (hud.is317Active) nextAch.add('ach_317_survivor');
    if (nextClues.length >= 3) nextAch.add('ach_missing_gift');
    if (lvl.level >= 4) nextAch.add('ach_silent_visitor');
    if (lvl.level >= 6) nextAch.add('ach_locked_attic');
    if (lvl.level >= 10) nextAch.add('ach_santa_knows');

    const nextSave: PlayerSaveData = {
      ...currentSave,
      coins: currentSave.coins + lvl.rewardCoins,
      score: currentSave.score + lvl.rewardCoins + Math.max(20, 180 - clearSec),
      highestLevelUnlocked: nextHighest,
      completedLevels: nextCompleted,
      unlockedClues: nextClues,
      unlockedAchievements: Array.from(nextAch),
      metrics: {
        ...currentSave.metrics,
        averageClearSeconds: nextAvg,
        cluesFoundCount: nextClues.length,
        roomsExploredCount: Math.max(currentSave.metrics.roomsExploredCount, lvl.level + 1),
        coopMissionsCleared: activeRoomRef.current
          ? currentSave.metrics.coopMissionsCleared + 1
          : currentSave.metrics.coopMissionsCleared,
      },
      notifications: [
        {
          id: `notif_lvl_${lvl.level}_${Date.now()}`,
          title: `Level ${lvl.level} Cleared: ${lvl.title}`,
          body: `Earned +${lvl.rewardCoins} Coins and archived evidence ${lvl.hiddenClueId.toUpperCase()}.`,
          kind: 'mission',
          timestamp: 'Just now',
          read: false,
        },
        ...currentSave.notifications.slice(0, 14),
      ],
    };

    persistSave(nextSave);
    engineRef.current?.setMode('paused');
    engineRef.current?.audio.playPositionalEvent('bells', 0, 1);
    setPhase('level_complete');
  }, [hud.is317Active, persistSave]);

  const handleEngineInteract = useCallback((interactId: string) => {
    const lvl = currentLevelRef.current;
    const prev = completedObjectivesRef.current;
    let updated = false;
    const next: Record<string, boolean> = { ...prev };

    for (const obj of lvl.objectives) {
      if (obj.interactTarget === interactId && !next[obj.id]) {
        next[obj.id] = true;
        updated = true;
        if (wsRef.current?.readyState === WebSocket.OPEN && activeRoomRef.current) {
          wsRef.current.send(JSON.stringify({ type: 'mission:objective', objectiveId: obj.id }));
        }
      }
    }

    if (!updated) return;
    setCompletedObjectives(next);
    const doneCount = lvl.objectives.filter((o) => next[o.id]).length;
    engineRef.current?.setObjectiveProgress(doneCount, lvl.objectives.length);

    if (doneCount >= lvl.objectives.length) {
      handleCompleteLevel(lvl, saveRef.current);
    }
  }, [handleCompleteLevel]);

  const handleDevilsGazeTriggered = useCallback(
    (details: {
      distance: number;
      cameraMode: CameraMode;
      babyState: BabyState;
      cause?: 'devils_gaze' | 'santa_caught';
    }) => {
      setGazeDetails(details);
      setPhase('gameover_gaze');
      const curSave = saveRef.current;
      const nextSave: PlayerSaveData = {
        ...curSave,
        metrics: {
          ...curSave.metrics,
          gazeDeathsCount: curSave.metrics.gazeDeathsCount + 1,
        },
      };
      persistSave(nextSave);

      if (wsRef.current?.readyState === WebSocket.OPEN && activeRoomRef.current) {
        wsRef.current.send(JSON.stringify({ type: 'gaze:triggered' }));
      }
    },
    [persistSave],
  );

  // Mount Three.js engine once
  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const engine = new HabbyWorldEngine(mount, saveRef.current.nanny, {
      onHudUpdate: (snap) => {
        setHud(snap);
        if (
          phaseRef.current === 'playing' &&
          wsRef.current?.readyState === WebSocket.OPEN &&
          activeRoomRef.current &&
          Date.now() - lastMoveSyncRef.current > 110
        ) {
          lastMoveSyncRef.current = Date.now();
          wsRef.current.send(
            JSON.stringify({
              type: 'player:move',
              x: snap.playerPos.x,
              y: snap.playerPos.y,
              z: snap.playerPos.z,
              yaw: snap.playerPos.yaw,
              cameraMode: snap.cameraMode,
              isHiding: snap.isHiding,
              hidingSpotLabel: snap.activeHidingSpot?.label || '',
            }),
          );
        }
      },
      onInteract: (interactId) => {
        handleEngineInteract(interactId);
      },
      onDevilsGazeTriggered: (details) => {
        handleDevilsGazeTriggered(details);
      },
    });

    engine.setSensitivity(saveRef.current.settings.mouseSensitivity);
    engine.setCameraMode(saveRef.current.settings.cameraDefault ?? 'first-person');
    engine.setCameraDistance(saveRef.current.settings.cameraDistance ?? 3.1);
    engine.audio.setVolume(saveRef.current.settings.masterVolume);
    engineRef.current = engine;

    if (isAutostart) {
      const startLvl = ALL_100_LEVELS[0];
      const prof = computeAdaptiveDifficulty(
        saveRef.current.metrics,
        false,
        saveRef.current.settings.accessibilitySlowGaze,
      );
      levelStartTimeRef.current = Date.now();
      engine.startLevel(startLvl, prof.babySpeedMultiplier, prof.gazeGraceMultiplier);
    } else {
      engine.setMode('tour');
    }

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Global Pause key handler (Esc / P)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (phaseRef.current === 'playing') {
          engineRef.current?.setMode('paused');
          setPhase('paused');
        } else if (phaseRef.current === 'paused') {
          engineRef.current?.setMode('playing');
          setPhase('playing');
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Sync audio & settings to engine when updated
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.setSensitivity(save.settings.mouseSensitivity);
    engine.setReducedFlicker(save.settings.reducedFlicker);
    engine.audio.setVolume(save.settings.masterVolume);
  }, [save.settings.mouseSensitivity, save.settings.reducedFlicker, save.settings.masterVolume]);

  const startPlayLevel = useCallback(
    (levelNum: number) => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      const lvl = ALL_100_LEVELS[Math.max(0, Math.min(99, levelNum - 1))];
      setCurrentLevelNum(lvl.level);
      setCompletedObjectives({});
      levelStartTimeRef.current = Date.now();

      const engine = engineRef.current;
      if (engine) {
        engine.setCameraMode(saveRef.current.settings.cameraDefault ?? 'first-person');
        engine.startLevel(lvl, adaptive.babySpeedMultiplier, adaptive.gazeGraceMultiplier);
      }
      setPhase('playing');
    },
    [adaptive.babySpeedMultiplier, adaptive.gazeGraceMultiplier],
  );

  // WebSocket Multiplayer Manager
  const connectAndJoinRoom = useCallback((roomId: string) => {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${proto}//${window.location.host}/ws`;

    const sendJoin = (socket: WebSocket) => {
      socket.send(
        JSON.stringify({
          type: 'room:join',
          roomId,
          username: saveRef.current.username,
          outfit: saveRef.current.nanny.outfit,
          cameraMode: saveRef.current.settings.cameraDefault ?? 'first-person',
        }),
      );
    };

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      sendJoin(wsRef.current);
      return;
    }

    if (wsRef.current) {
      wsRef.current.close();
    }

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      sendJoin(ws);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(String(event.data)) as Record<string, unknown>;
        if (msg.type === 'room:joined' || msg.type === 'room:state') {
          const room = msg.room as MultiplayerRoomInfo;
          setActiveRoom(room);
        } else if (msg.type === 'chat:message') {
          const entry = msg.entry as MultiplayerRoomInfo['chatHistory'][number];
          setActiveRoom((prev) =>
            prev ? { ...prev, chatHistory: [...prev.chatHistory.slice(-39), entry] } : prev,
          );
        } else if (msg.type === 'player:moved') {
          const rp = msg.player as RemotePlayerInput;
          if (rp && rp.id) {
            remotePlayersRef.current.set(rp.id, rp);
            engineRef.current?.syncRemotePlayers(
              Array.from(remotePlayersRef.current.values()),
              saveRef.current.username,
            );
          }
        } else if (msg.type === 'mission:sync') {
          const shared = (msg.sharedObjectives || {}) as Record<string, boolean>;
          setCompletedObjectives((prev) => ({ ...prev, ...shared }));
        }
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => {
      remotePlayersRef.current.clear();
    };
  }, []);

  const leaveRoom = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'room:leave' }));
    }
    remotePlayersRef.current.clear();
    engineRef.current?.syncRemotePlayers([], saveRef.current.username);
    setActiveRoom(null);
  }, []);

  const sendRoomChat = useCallback((text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'chat:send', text }));
    }
  }, []);

  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  const handleToggleMute = () => {
    const next = !muted;
    setMuted(next);
    engineRef.current?.audio.setMuted(next);
  };

  const handleReturnToMenu = () => {
    engineRef.current?.setMode('tour');
    setPhase('menu');
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#070709] text-[#e7e5e4]">
      {/* Persistent Three.js Canvas Mount (Never unmounted by HUD re-renders) */}
      <div ref={canvasMountRef} className="fixed inset-0 z-0" />

      {/* Opening Sequence: Logo -> Cover -> Loading -> Account -> Character */}
      {(phase === 'logo' ||
        phase === 'cover' ||
        phase === 'loading' ||
        phase === 'account' ||
        phase === 'character') && (
        <OpeningSequence
          phase={phase}
          currentUsername={save.username}
          initialNanny={save.nanny}
          onAdvancePhase={(next) => setPhase(next)}
          onAuthenticated={(username, isGuest, remoteSave) => {
            const base = createDefaultSaveData(username, isGuest);
            const merged: PlayerSaveData = remoteSave
              ? {
                  ...base,
                  ...(remoteSave as Partial<PlayerSaveData>),
                  username,
                  isGuest,
                  nanny: {
                    ...base.nanny,
                    ...((remoteSave.nanny as Partial<NannyAppearance>) || {}),
                  },
                }
              : base;
            persistSave(merged);
            engineRef.current?.updateAppearance(merged.nanny);
            setPhase('character');
          }}
          onSaveCharacter={(nanny) => {
            const nextSave = { ...save, nanny };
            persistSave(nextSave);
            engineRef.current?.updateAppearance(nanny);
            setPhase('menu');
          }}
          onOpenInstallTab={() => {
            setMenuTab('install');
            setPhase('menu');
          }}
        />
      )}

      {/* Main Menu Hub & Open-World / Archives / Housing / Multiplayer Views */}
      {phase === 'menu' && (
        <MainMenuHub
          save={save}
          activeTab={menuTab}
          adaptive={adaptive}
          activeLocationId={activeLocationId}
          activeRoom={activeRoom}
          onSelectTab={setMenuTab}
          onStartLevel={startPlayLevel}
          onTravelLocation={(loc: WorldLocation) => {
            setActiveLocationId(loc.id);
            engineRef.current?.setDistrict(loc.district);
            const matchingLevel =
              ALL_100_LEVELS.find((l) => l.district === loc.district && l.level <= save.highestLevelUnlocked) ||
              ALL_100_LEVELS[0];
            startPlayLevel(matchingLevel.level);
          }}
          onUpdateHousing={(coinsDelta: number, nextOwned: OwnedPropertyState[]) => {
            persistSave({
              ...save,
              coins: Math.max(0, save.coins + coinsDelta),
              ownedProperties: nextOwned,
            });
          }}
          onPlayRecordingTone={() => {
            engineRef.current?.audio.unlock();
            engineRef.current?.audio.playPositionalEvent('whisper', 0, 1);
          }}
          onConnectCluesHint={() => {
            const nextAch = new Set(save.unlockedAchievements);
            nextAch.add('ach_archive_sleuth');
            persistSave({
              ...save,
              unlockedAchievements: Array.from(nextAch),
            });
          }}
          onJoinRoom={connectAndJoinRoom}
          onLeaveRoom={leaveRoom}
          onSendChat={sendRoomChat}
          onUpdateNanny={(nanny) => {
            persistSave({ ...save, nanny });
            engineRef.current?.updateAppearance(nanny);
          }}
          onUpdateSettings={(settings: GameSettings) => {
            persistSave({ ...save, settings });
            engineRef.current?.setCameraMode(settings.cameraDefault);
            engineRef.current?.setCameraDistance(settings.cameraDistance ?? 3.1);
          }}
          onMarkAllRead={() => {
            persistSave({
              ...save,
              notifications: save.notifications.map((n) => ({ ...n, read: true })),
            });
          }}
        />
      )}

      {/* Active Gameplay HUD, Pause Overlay, CCTV Modal & Level Complete Modal */}
      {(phase === 'playing' || phase === 'paused' || phase === 'level_complete') && (
        <PlayingHud
          level={currentLevel}
          completedObjectives={completedObjectives}
          hud={hud}
          muted={muted}
          settings={save.settings}
          unlockedClues={save.unlockedClues}
          isPaused={phase === 'paused'}
          isLevelComplete={phase === 'level_complete'}
          coopPlayerCount={activeRoom?.players.length || 1}
          onToggleCameraMode={() => engineRef.current?.toggleCameraMode()}
          onZoomCamera={(delta) => engineRef.current?.adjustCameraZoom(delta)}
          onResetCamera={() => engineRef.current?.resetCameraBehindNanny()}
          onCameraLookDelta={(dx, dy) => engineRef.current?.applyLookDelta(dx, dy)}
          onToggleFlashlight={() => engineRef.current?.toggleFlashlight()}
          onToggleMute={handleToggleMute}
          onPauseToggle={() => {
            if (phase === 'playing') {
              engineRef.current?.setMode('paused');
              setPhase('paused');
            } else {
              engineRef.current?.setMode('playing');
              setPhase('playing');
            }
          }}
          onInteract={() => engineRef.current?.triggerInteract()}
          onPickupDrop={() => engineRef.current?.triggerPickupDrop()}
          onJump={() => engineRef.current?.triggerJump()}
          onToggleHide={() => engineRef.current?.toggleHide()}
          onToggleCrouch={() => engineRef.current?.toggleCrouch()}
          onVirtualMove={(x, y) => engineRef.current?.setVirtualMove(x, y)}
          onVirtualSprint={(active) => engineRef.current?.setVirtualSprint(active)}
          onRestartLevel={() => startPlayLevel(currentLevel.level)}
          onNextLevel={() => startPlayLevel(Math.min(100, currentLevel.level + 1))}
          onReturnToMenu={handleReturnToMenu}
          onDecision={(key, val) => {
            persistSave({
              ...save,
              decisions: { ...save.decisions, [key]: val },
            });
          }}
        />
      )}

      {/* THE DEVIL'S GAZE Instant Game-Over Sequence */}
      {phase === 'gameover_gaze' && (
        <DevilsGazeOverlay
          level={currentLevel}
          details={gazeDetails}
          reducedFlicker={save.settings.reducedFlicker}
          onRetry={() => startPlayLevel(currentLevel.level)}
          onReturnToMenu={handleReturnToMenu}
        />
      )}

      <OfflineIndicator />
    </div>
  );
}
