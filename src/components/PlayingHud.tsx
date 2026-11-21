import React, { useEffect, useRef, useState } from 'react';
import {
  Flashlight,
  Pause,
  Volume2,
  VolumeX,
  BookOpen,
  Video,
  CheckCircle2,
  Circle,
  X,
  ArrowRight,
  RotateCcw,
  Home,
  ZoomIn,
  ZoomOut,
  Shield,
  Hand,
  Footprints,
  Move,
  Camera,
  ArrowUp,
  Package,
} from 'lucide-react';
import type { EngineHudSnapshot } from '../engine/HabbyWorldEngine';
import type { ArchiveClue, GameSettings, LevelDefinition } from '../game/types';
import { ARCHIVE_CLUES } from '../game/worldData';

interface PlayingHudProps {
  level: LevelDefinition;
  completedObjectives: Record<string, boolean>;
  hud: EngineHudSnapshot;
  muted: boolean;
  settings: GameSettings;
  unlockedClues: string[];
  isPaused: boolean;
  isLevelComplete: boolean;
  coopPlayerCount: number;
  onToggleCameraMode: () => void;
  onZoomCamera: (delta: number) => void;
  onResetCamera: () => void;
  onCameraLookDelta: (dx: number, dy: number) => void;
  onToggleFlashlight: () => void;
  onToggleMute: () => void;
  onPauseToggle: () => void;
  onInteract: () => void;
  onPickupDrop: () => void;
  onJump: () => void;
  onToggleHide: () => void;
  onToggleCrouch: () => void;
  onVirtualMove: (x: number, y: number) => void;
  onVirtualSprint: (active: boolean) => void;
  onRestartLevel: () => void;
  onNextLevel: () => void;
  onReturnToMenu: () => void;
  onDecision: (key: string, val: string) => void;
}

export const PlayingHud: React.FC<PlayingHudProps> = ({
  level,
  completedObjectives,
  hud,
  muted,
  settings,
  unlockedClues,
  isPaused,
  isLevelComplete,
  coopPlayerCount,
  onToggleCameraMode,
  onZoomCamera,
  onResetCamera,
  onCameraLookDelta,
  onToggleFlashlight,
  onToggleMute,
  onPauseToggle,
  onInteract,
  onPickupDrop,
  onJump,
  onToggleHide,
  onToggleCrouch,
  onVirtualMove,
  onVirtualSprint,
  onRestartLevel,
  onNextLevel,
  onReturnToMenu,
  onDecision,
}) => {
  const [showCctv, setShowCctv] = useState(false);
  const [activeCamFeed, setActiveCamFeed] = useState<'CAM-01 Nursery' | 'CAM-02 Porch' | 'CAM-03 Living Room' | 'CAM-04 Basement'>('CAM-01 Nursery');
  const [showQuickArchive, setShowQuickArchive] = useState(false);
  const [selectedClue, setSelectedClue] = useState<ArchiveClue | null>(null);
  const [isTouchViewport, setIsTouchViewport] = useState(false);

  useEffect(() => {
    const checkTouch = () => {
      const coarse = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
      const touchPts = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;
      const narrow = typeof window !== 'undefined' && window.innerWidth <= 1024;
      setIsTouchViewport(Boolean(coarse || touchPts || narrow));
    };
    checkTouch();
    window.addEventListener('resize', checkTouch);
    return () => window.removeEventListener('resize', checkTouch);
  }, []);

  // Analog Virtual Joystick state (smooth 360° & diagonal drag)
  const joyBaseRef = useRef<HTMLDivElement | null>(null);
  const [joyKnob, setJoyKnob] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const joyPointerIdRef = useRef<number | null>(null);

  // Independent Camera Look Pad state (drag to look around front/back/sides/up/down)
  const lookPointerRef = useRef<{ id: number | null; x: number; y: number }>({
    id: null,
    x: 0,
    y: 0,
  });

  const hours = Math.floor(hud.inGameMinutes / 60) % 24;
  const mins = Math.floor(hud.inGameMinutes % 60);
  const clockLabel = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')} AM`;

  const showController =
    settings.showTouchControls === 'always' ||
    (settings.showTouchControls === 'auto' && isTouchViewport);
  const collectedClues = ARCHIVE_CLUES.filter((c) => unlockedClues.includes(c.id));

  const updateJoystickFromEvent = (clientX: number, clientY: number) => {
    const el = joyBaseRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = rect.width * 0.4;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxR) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
    }
    setJoyKnob({ x: dx, y: dy });
    // Screen +X = right (+1), Screen -Y (up) = forward (+1)
    onVirtualMove(Number((dx / maxR).toFixed(3)), Number((-dy / maxR).toFixed(3)));
  };

  const resetJoystick = () => {
    joyPointerIdRef.current = null;
    setJoyKnob({ x: 0, y: 0 });
    onVirtualMove(0, 0);
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex flex-col justify-between p-3 sm:p-5">
      {/* Environmental Horror Director Sting Vignette (flicker / door slam dread pulse) */}
      {hud.activeFlickerStrength > 0.05 && (
        <div
          data-testid="horror-sting-fx"
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-10 transition-opacity duration-75"
          style={{
            backgroundColor: `rgba(5, 3, 4, ${(hud.activeFlickerStrength * 0.42).toFixed(2)})`,
            boxShadow: `inset 0 0 ${Math.round(90 + hud.activeFlickerStrength * 110)}px rgba(139, 26, 26, ${(
              hud.activeFlickerStrength * 0.48
            ).toFixed(2)})`,
          }}
        />
      )}

      {/* THE DEVIL'S GAZE Warning Vignette */}
      {hud.gazePhase === 'warning' && (
        <div
          aria-live="assertive"
          className="pointer-events-none fixed inset-0 z-20 flex items-start justify-center pt-16"
          style={{
            boxShadow: `inset 0 0 ${Math.round(70 + hud.gazeProgress * 140)}px rgba(220, 38, 38, ${
              0.35 + hud.gazeProgress * 0.5
            })`,
          }}
        >
          <div className="rounded border border-[#dc2626] bg-[#160506]/92 px-4 py-2 text-center shadow-lg">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#fca5a5]">
              THE DEVIL&apos;S GAZE — LOOK AWAY OR HIDE NOW
            </p>
            <div className="mt-1.5 h-1.5 w-48 overflow-hidden rounded bg-[#2e1012]">
              <div
                className="h-full bg-[#dc2626] transition-all duration-75"
                style={{ width: `${Math.round(hud.gazeProgress * 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Top Row: Compact Objective Cluster (Left) + Third-Person Camera & Utility Controls (Right) */}
      <div className="relative z-30 flex items-start justify-between gap-2 sm:gap-3">
        <div className="pointer-events-auto max-w-[196px] rounded border border-[#3f1d1d]/85 bg-[#070709]/86 px-2.5 py-2 shadow-lg sm:max-w-xs sm:px-3.5 sm:py-2.5">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#ca8a04] sm:gap-2 sm:text-[11px]">
            <span className="whitespace-nowrap">Level {level.level}</span>
            <span aria-hidden="true">·</span>
            <span className="truncate">{level.title}</span>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono-tabular text-[11px] sm:gap-2.5 sm:text-xs">
            <span className={hud.is317Active ? 'font-bold text-[#dc2626]' : 'text-[#e7e5e4]'}>
              {clockLabel}
            </span>
            <span className="text-[#a8a29e]">
              Nicholas: <strong className={hud.babyState === 'supernatural' ? 'text-[#dc2626]' : 'text-[#e7e5e4]'}>{hud.babyState}</strong>
            </span>
            {coopPlayerCount > 1 && (
              <span className="text-[#ca8a04]">Co-op ({coopPlayerCount})</span>
            )}
          </div>

          <div
            data-testid="fear-level-indicator"
            className="mt-1.5 flex items-center gap-2 font-mono-tabular text-[10px] sm:text-[11px]"
          >
            <span className="text-[#a8a29e]">Fear</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded bg-[#1c1415]">
              <div
                className={`h-full transition-all duration-150 ${
                  hud.fearTier === 'terror'
                    ? 'bg-[#dc2626]'
                    : hud.fearTier === 'dread'
                    ? 'bg-[#ea580c]'
                    : hud.fearTier === 'uneasy'
                    ? 'bg-[#ca8a04]'
                    : 'bg-[#57534e]'
                }`}
                style={{ width: `${Math.max(4, hud.fearLevel)}%` }}
              />
            </div>
            <span
              className={`font-semibold uppercase ${
                hud.fearTier === 'terror'
                  ? 'text-[#fca5a5]'
                  : hud.fearTier === 'dread'
                  ? 'text-[#fdba74]'
                  : 'text-[#d6d3d1]'
              }`}
            >
              {hud.fearLevel}%
            </span>
          </div>

          <ul className="mt-1.5 space-y-1 text-[11px] sm:mt-2 sm:text-xs">
            {level.objectives.map((obj) => {
              const done = Boolean(completedObjectives[obj.id]);
              return (
                <li
                  key={obj.id}
                  className={`flex items-start gap-1.5 ${done ? 'text-[#a8a29e] line-through' : 'text-[#e7e5e4]'}`}
                >
                  {done ? (
                    <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-[#ca8a04] sm:h-3.5 sm:w-3.5" />
                  ) : (
                    <Circle className="mt-0.5 h-3 w-3 shrink-0 text-[#8b1a1a] sm:h-3.5 sm:w-3.5" />
                  )}
                  <span className="leading-snug">{obj.label}</span>
                </li>
              );
            })}
          </ul>

          {hud.carriedItem !== 'none' && (
            <p className="mt-1.5 border-t border-[#291717] pt-1 text-[11px] font-semibold text-[#ca8a04]">
              Carrying:{' '}
              {hud.carriedItem === 'baby'
                ? 'Baby Nicholas'
                : hud.carriedItem === 'milk_bottle'
                ? 'Warm Milk Bottle'
                : 'Impossible Gift'}{' '}
              <span className="font-normal text-[#a8a29e]">([G] drop)</span>
            </p>
          )}

          {hud.proximityCueKind && hud.proximityIntensity >= 0.2 && (
            <p className="mt-1 text-[10px] italic text-[#d6d3d1]">
              {hud.proximityCueKind === 'clue'
                ? 'A faint music-box whisper echoes nearby...'
                : 'Hollow floorboards creak beside a hiding spot...'}
            </p>
          )}

          {hud.directorCue && (
            <p className="mt-2 border-t border-[#291717] pt-1.5 text-[11px] italic text-[#fca5a5]">
              {hud.directorCue}
            </p>
          )}
        </div>

        {/* Top-Right Utility & Switchable Camera [V] Controls */}
        <div className="pointer-events-auto flex max-w-[166px] flex-wrap items-center justify-end gap-1 sm:max-w-none sm:gap-1.5">
          <div className="inline-flex items-center rounded border border-[#3f1d1d] bg-[#070709]/88 text-xs font-semibold text-[#e7e5e4]">
            <button
              type="button"
              tabIndex={-1}
              data-testid="camera-mode-toggle"
              aria-label="Switch first or third person camera"
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleCameraMode();
              }}
              className="inline-flex items-center gap-1 px-2 py-1.5 font-mono-tabular text-[10px] hover:text-[#ca8a04] sm:px-2.5 sm:py-2 sm:text-[11px]"
            >
              <Camera className="h-3.5 w-3.5 text-[#ca8a04]" />
              <span>{hud.cameraMode === 'first-person' ? '[V] 1st' : `[V] 3rd · ${hud.cameraDistance.toFixed(1)}m`}</span>
            </button>
            {hud.cameraMode === 'third-person' && (
              <>
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label="Zoom camera in"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onZoomCamera(-0.4);
                  }}
                  className="border-l border-[#291819] px-1.5 py-1.5 hover:text-[#ca8a04] sm:px-2 sm:py-2"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label="Reset camera behind nanny"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onResetCamera();
                  }}
                  className="border-l border-[#291819] px-1.5 py-1 text-[10px] hover:text-[#ca8a04] sm:px-2"
                >
                  Center
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label="Zoom camera out"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onZoomCamera(0.4);
                  }}
                  className="border-l border-[#291819] px-1.5 py-1.5 hover:text-[#ca8a04] sm:px-2 sm:py-2"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleFlashlight();
            }}
            aria-label="Toggle flashlight"
            className="inline-flex items-center gap-1.5 rounded border border-[#3f1d1d] bg-[#070709]/88 p-1.5 text-xs font-semibold text-[#e7e5e4] hover:border-[#ca8a04] sm:px-2.5 sm:py-2"
          >
            <Flashlight className={`h-3.5 w-3.5 ${hud.flashlightOn ? 'text-[#ca8a04]' : 'text-[#71717a]'}`} />
            <span className="hidden sm:inline">[F]</span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              setShowCctv((s) => !s);
            }}
            aria-label="Open security cameras"
            className="inline-flex items-center gap-1.5 rounded border border-[#3f1d1d] bg-[#070709]/88 p-1.5 text-xs font-semibold text-[#e7e5e4] hover:border-[#ca8a04] sm:px-2.5 sm:py-2"
          >
            <Video className="h-3.5 w-3.5 text-[#dc2626]" />
            <span className="hidden sm:inline">CCTV</span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              setShowQuickArchive((s) => !s);
            }}
            aria-label="Open Christmas Archives"
            className="inline-flex items-center gap-1.5 rounded border border-[#3f1d1d] bg-[#070709]/88 p-1.5 text-xs font-semibold text-[#e7e5e4] hover:border-[#ca8a04] sm:px-2.5 sm:py-2"
          >
            <BookOpen className="h-3.5 w-3.5 text-[#ca8a04]" />
            <span className="hidden sm:inline">Archives</span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            aria-label={muted ? 'Unmute audio' : 'Mute audio'}
            className="rounded border border-[#3f1d1d] bg-[#070709]/88 p-1.5 text-[#e7e5e4] hover:border-[#ca8a04] sm:p-2"
          >
            {muted ? <VolumeX className="h-3.5 w-3.5 text-[#dc2626] sm:h-4 sm:w-4" /> : <Volume2 className="h-3.5 w-3.5 text-[#ca8a04] sm:h-4 sm:w-4" />}
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onPauseToggle();
            }}
            aria-label="Pause game"
            className="rounded border border-[#3f1d1d] bg-[#070709]/88 p-1.5 text-[#e7e5e4] hover:border-[#ca8a04] sm:p-2"
          >
            <Pause className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
        </div>
      </div>

      {/* Center Stealth / Context Prompts (never blocking playfield) */}
      {!isPaused && !isLevelComplete && (
        <div className="pointer-events-none fixed left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 text-center">
          <div className="mx-auto h-1.5 w-1.5 rounded-full bg-[#e7e5e4]/75 ring-2 ring-[#070709]/60" />

          {hud.isHiding && hud.activeHidingSpot && (
            <div className="pointer-events-auto mt-6 flex flex-col items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded border border-[#ca8a04] bg-[#0c110d]/92 px-3.5 py-1.5 text-xs font-semibold text-[#e7e5e4]">
                <Shield className="h-3.5 w-3.5 text-[#ca8a04]" />
                <span>HIDDEN ({hud.activeHidingSpot.room}) — Concealed from Santa &amp; Devil&apos;s Gaze</span>
              </div>
              <button
                type="button"
                onClick={onToggleHide}
                className="rounded border border-[#ca8a04] bg-[#8b1a1a] px-4 py-1.5 text-xs font-bold text-white shadow-lg hover:bg-[#a61f1f]"
              >
                [H] Exit Hiding Spot
              </button>
            </div>
          )}

          {!hud.isHiding && (hud.nearbyInteractable || hud.nearbyPickupLabel || hud.nearbyHidingSpot) && (
            <div className="pointer-events-auto mt-5 flex flex-col items-center gap-1.5">
              {hud.nearbyInteractable && (
                <button
                  type="button"
                  onClick={onInteract}
                  className="rounded border border-[#ca8a04] bg-[#0d0a08]/92 px-4 py-1.5 text-xs font-semibold text-[#e7e5e4] shadow-lg hover:bg-[#1c130d]"
                >
                  [E] {hud.nearbyInteractable.label}
                </button>
              )}
              {hud.nearbyPickupLabel && (
                <button
                  type="button"
                  onClick={onPickupDrop}
                  className="rounded border border-[#d97706] bg-[#161009]/92 px-4 py-1.5 text-xs font-semibold text-[#fef3c7] shadow-lg hover:bg-[#24190c]"
                >
                  {hud.nearbyPickupLabel}
                </button>
              )}
              {hud.nearbyHidingSpot && (
                <button
                  type="button"
                  onClick={onToggleHide}
                  className="rounded border border-[#8b1a1a] bg-[#140a0b]/92 px-4 py-1.5 text-xs font-semibold text-[#fca5a5] shadow-lg hover:bg-[#241012]"
                >
                  [H] {hud.nearbyHidingSpot.label}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Bottom Row: Responsive Analog Virtual Joystick (Left) + Look Orbit Pad & Action Buttons (Right) */}
      <div className="relative z-30 flex items-end justify-between gap-2 sm:gap-4">
        {showController ? (
          <>
            {/* Left Analog Virtual Joystick (360° + Diagonal Movement) */}
            <div className="pointer-events-auto flex items-end gap-1.5 sm:gap-2.5">
              <div
                ref={joyBaseRef}
                role="application"
                aria-label="Virtual movement joystick"
                data-testid="virtual-joystick"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  joyPointerIdRef.current = e.pointerId;
                  updateJoystickFromEvent(e.clientX, e.clientY);
                }}
                onPointerMove={(e) => {
                  if (joyPointerIdRef.current !== e.pointerId) return;
                  updateJoystickFromEvent(e.clientX, e.clientY);
                }}
                onPointerUp={(e) => {
                  if (joyPointerIdRef.current === e.pointerId) {
                    resetJoystick();
                  }
                }}
                onPointerCancel={resetJoystick}
                className="relative flex h-24 w-24 touch-none select-none items-center justify-center rounded-full border-2 border-[#ca8a04]/55 bg-[#070709]/82 shadow-xl sm:h-32 sm:w-32"
              >
                <div className="pointer-events-none absolute inset-3 rounded-full border border-dashed border-[#3f1d1d]" />
                <span className="pointer-events-none absolute top-1 text-[9px] font-bold uppercase text-[#a8a29e]">
                  FWD
                </span>
                <div
                  className="pointer-events-none flex h-10 w-10 items-center justify-center rounded-full border border-[#ca8a04] bg-[#8b1a1a] shadow-lg sm:h-11 sm:w-11"
                  style={{
                    transform: `translate(${joyKnob.x}px, ${joyKnob.y}px)`,
                  }}
                >
                  <Move className="h-4 w-4 text-[#fef3c7]" />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label="Hold to sprint"
                  onPointerDown={() => onVirtualSprint(true)}
                  onPointerUp={() => onVirtualSprint(false)}
                  onPointerLeave={() => onVirtualSprint(false)}
                  className="inline-flex items-center gap-1 rounded border border-[#3f1d1d] bg-[#0a0809]/88 px-2 py-1.5 text-[10px] font-semibold text-[#e7e5e4] active:bg-[#8b1a1a] sm:px-2.5 sm:text-[11px]"
                >
                  <Footprints className="h-3 w-3 text-[#ca8a04] sm:h-3.5 sm:w-3.5" />
                  <span>RUN</span>
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label="Toggle crouch"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onToggleCrouch();
                  }}
                  className={`rounded border px-2 py-1.5 text-[10px] font-semibold sm:px-2.5 sm:text-[11px] ${
                    hud.isCrouching
                      ? 'border-[#ca8a04] bg-[#8b1a1a] text-white'
                      : 'border-[#3f1d1d] bg-[#0a0809]/88 text-[#e7e5e4]'
                  }`}
                >
                  CROUCH
                </button>
              </div>
            </div>

            {/* Subtle Center Control Legend on Wide Screens */}
            <p className="hidden rounded bg-[#070709]/78 px-3 py-1 text-[11px] text-[#a8a29e] xl:block">
              Joystick / WASD Move · Drag Look · [E] Interact · [G] Pick/Drop · [Space] Jump · [H] Hide · [V] Camera
            </p>

            {/* Right Side: Action Cluster (Interact / Pick-Drop / Jump / Hide) + Look Pad */}
            <div className="pointer-events-auto flex items-end gap-1.5 sm:gap-2">
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  tabIndex={-1}
                  data-testid="hud-interact-btn"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onInteract();
                  }}
                  className="inline-flex items-center justify-center gap-1 rounded border border-[#ca8a04] bg-[#8b1a1a] px-2 py-1.5 text-[10px] font-bold text-white shadow hover:bg-[#a61f1f] sm:px-3 sm:py-2 sm:text-xs"
                >
                  <Hand className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span>USE</span>
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  data-testid="hud-pickup-btn"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onPickupDrop();
                  }}
                  className={`inline-flex items-center justify-center gap-1 rounded border px-2 py-1.5 text-[10px] font-bold shadow sm:px-3 sm:py-2 sm:text-xs ${
                    hud.carriedItem !== 'none'
                      ? 'border-[#ca8a04] bg-[#78350f] text-[#fef3c7]'
                      : 'border-[#3f1d1d] bg-[#0a0809]/88 text-[#e7e5e4]'
                  }`}
                >
                  <Package className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span>{hud.carriedItem !== 'none' ? 'DROP' : 'GRAB'}</span>
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  data-testid="hud-jump-btn"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onJump();
                  }}
                  className="inline-flex items-center justify-center gap-1 rounded border border-[#3f1d1d] bg-[#0a0809]/88 px-2 py-1.5 text-[10px] font-bold text-[#e7e5e4] shadow active:bg-[#8b1a1a] sm:px-3 sm:py-2 sm:text-xs"
                >
                  <ArrowUp className="h-3 w-3 text-[#ca8a04] sm:h-3.5 sm:w-3.5" />
                  <span>JUMP</span>
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  data-testid="hud-hide-btn"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onToggleHide();
                  }}
                  className={`inline-flex items-center justify-center gap-1 rounded border px-2 py-1.5 text-[10px] font-bold shadow sm:px-3 sm:py-2 sm:text-xs ${
                    hud.isHiding
                      ? 'border-[#ca8a04] bg-[#166534] text-white'
                      : hud.nearbyHidingSpot
                      ? 'border-[#ca8a04] bg-[#3b1214] text-[#fef3c7]'
                      : 'border-[#3f1d1d] bg-[#0a0809]/88 text-[#d6d3d1]'
                  }`}
                >
                  <Shield className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span>{hud.isHiding ? 'EXIT' : 'HIDE'}</span>
                </button>
              </div>

              {/* Independent Drag Look Pad */}
              <div
                role="application"
                aria-label="Camera rotation look pad"
                data-testid="camera-look-pad"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  lookPointerRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
                }}
                onPointerMove={(e) => {
                  if (lookPointerRef.current.id !== e.pointerId) return;
                  const dx = e.clientX - lookPointerRef.current.x;
                  const dy = e.clientY - lookPointerRef.current.y;
                  lookPointerRef.current.x = e.clientX;
                  lookPointerRef.current.y = e.clientY;
                  onCameraLookDelta(dx, dy);
                }}
                onPointerUp={(e) => {
                  if (lookPointerRef.current.id === e.pointerId) {
                    lookPointerRef.current.id = null;
                  }
                }}
                onPointerCancel={() => {
                  lookPointerRef.current.id = null;
                }}
                className="flex h-20 w-20 touch-none select-none flex-col items-center justify-center rounded-full border-2 border-[#3f1d1d] bg-[#070709]/82 text-center shadow-xl sm:h-28 sm:w-28"
              >
                <span className="pointer-events-none text-[10px] font-bold uppercase tracking-wider text-[#ca8a04]">
                  LOOK
                </span>
                <span className="pointer-events-none mt-0.5 text-[9px] text-[#a8a29e]">
                  Drag 360°
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="mx-auto flex flex-wrap items-center justify-center gap-2 rounded bg-[#070709]/82 px-3.5 py-1.5 text-[11px] text-[#a8a29e]">
            <span>WASD Move · Drag Look · [E] Interact/Door · [G] Pick/Drop · [Space] Jump · [H] Hide · [C] Crouch · [V] Camera · [F] Light · Esc Pause</span>
          </div>
        )}
      </div>

      {/* Security Camera Observation Modal */}
      {showCctv && (
        <div className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-black/82 p-4">
          <div className="w-full max-w-2xl rounded-lg border border-[#3f1d1d] bg-[#0a0a0c] p-5 text-[#e7e5e4] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[#dc2626]">
                  Santa&apos;s Observation System · Live Estate CCTV
                </p>
                <h3 className="font-display text-lg font-bold">{activeCamFeed}</h3>
              </div>
              <button
                type="button"
                aria-label="Close CCTV"
                onClick={() => setShowCctv(false)}
                className="rounded p-1.5 text-[#a8a29e] hover:bg-[#1c1917] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {(['CAM-01 Nursery', 'CAM-02 Porch', 'CAM-03 Living Room', 'CAM-04 Basement'] as const).map((cam) => (
                <button
                  key={cam}
                  type="button"
                  onClick={() => setActiveCamFeed(cam)}
                  className={`rounded px-3 py-1.5 text-xs font-semibold ${
                    activeCamFeed === cam ? 'bg-[#8b1a1a] text-white' : 'bg-[#18181b] text-[#a8a29e] hover:text-white'
                  }`}
                >
                  {cam}
                </button>
              ))}
            </div>

            <div className="relative mt-4 flex h-56 flex-col justify-between overflow-hidden rounded border border-[#27272a] bg-[#050507] p-4 font-mono-tabular text-xs">
              <div className="flex justify-between text-[#a8a29e]">
                <span>REC · {clockLabel}</span>
                <span className="text-[#dc2626]">SIGNAL: {hud.is317Active ? '3:17 INTERFERENCE' : 'NOMINAL'}</span>
              </div>
              <div className="my-auto text-center">
                {activeCamFeed === 'CAM-01 Nursery' && (
                  <p className="text-sm text-[#e7e5e4]">
                    Baby Nicholas state: <strong className="text-[#dc2626]">{hud.babyState.toUpperCase()}</strong>
                    <br />
                    <span className="text-xs text-[#a8a29e]">
                      {hud.babyState === 'supernatural'
                        ? 'ALERT: Infant crawling toward parlor with glowing crimson eyes.'
                        : 'Tiny infant Nicholas resting near oak crib. Nursery sensors active.'}
                    </span>
                  </p>
                )}
                {activeCamFeed === 'CAM-02 Porch' && (
                  <p className="text-sm text-[#e7e5e4]">
                    {hud.santaNearby
                      ? `PROXIMITY WARNING (${hud.santaBehavior.toUpperCase()}): Evil Santa patrolling estate threshold!`
                      : 'Heavy boot impressions visible in fresh snow along the front steps.'}
                  </p>
                )}
                {activeCamFeed === 'CAM-03 Living Room' && (
                  <p className="text-sm text-[#e7e5e4]">
                    Fireplace hearth burning. Parlor sofa and hallway wardrobe available as stealth hiding spots.
                  </p>
                )}
                {activeCamFeed === 'CAM-04 Basement' && (
                  <p className="text-sm text-[#e7e5e4]">
                    Subterranean hatch sealed. Faint footsteps recorded beneath parlor floorboards at 03:17.
                  </p>
                )}
              </div>
              <div className="text-[11px] text-[#71717a]">BLACKWOOD SECURITY OS · ARCHIVE LINKED</div>
            </div>
          </div>
        </div>
      )}

      {/* Quick In-Game Christmas Archives Drawer */}
      {showQuickArchive && (
        <div className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-black/82 p-4">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-[#3f1d1d] bg-[#0d0a0b] p-5 text-[#e7e5e4] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
              <h3 className="font-display text-lg font-bold">Christmas Archives ({collectedClues.length} Collected)</h3>
              <button
                type="button"
                aria-label="Close quick archives"
                onClick={() => setShowQuickArchive(false)}
                className="rounded p-1.5 text-[#a8a29e] hover:bg-[#1c1917] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {collectedClues.map((clue) => (
                <button
                  key={clue.id}
                  type="button"
                  onClick={() => setSelectedClue(clue)}
                  className="rounded border border-[#2e2223] bg-[#140e0f] p-3 text-left hover:border-[#ca8a04]"
                >
                  <p className="text-[11px] uppercase tracking-wider text-[#ca8a04]">{clue.category}</p>
                  <p className="mt-1 text-sm font-semibold text-[#e7e5e4]">{clue.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-[#a8a29e]">{clue.excerpt}</p>
                </button>
              ))}
            </div>
            {selectedClue && (
              <div className="mt-4 rounded border border-[#8b1a1a] bg-[#070709] p-4">
                <p className="text-xs font-semibold text-[#ca8a04]">
                  {selectedClue.title} · Connected to {selectedClue.connectedCharacter}
                </p>
                <p className="mt-2 text-sm text-[#e7e5e4]">{selectedClue.excerpt}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pause Modal */}
      {isPaused && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Game Paused"
          className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-black/85 p-4"
        >
          <div className="w-full max-w-sm rounded-lg border border-[#3f1d1d] bg-[#0e0b0c] p-6 text-center shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#ca8a04]">Simulation Paused</p>
            <h2 className="font-display mt-1 text-2xl font-bold text-[#e7e5e4]">Level {level.level}: {level.title}</h2>
            <div className="mt-5 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={onPauseToggle}
                className="rounded bg-[#8b1a1a] py-2.5 text-sm font-bold text-white hover:bg-[#a61f1f]"
              >
                Resume Night
              </button>
              <button
                type="button"
                onClick={onRestartLevel}
                className="inline-flex items-center justify-center gap-2 rounded border border-[#3f1d1d] bg-[#140e0f] py-2.5 text-sm font-semibold text-[#e7e5e4] hover:border-[#ca8a04]"
              >
                <RotateCcw className="h-4 w-4" />
                Restart Level
              </button>
              <button
                type="button"
                onClick={onReturnToMenu}
                className="inline-flex items-center justify-center gap-2 rounded border border-[#27272a] bg-[#0d0d10] py-2.5 text-sm font-medium text-[#d6d3d1] hover:border-[#71717a]"
              >
                <Home className="h-4 w-4" />
                Return to Main Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Level Complete & Branching Choice Modal */}
      {isLevelComplete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Level Complete"
          className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-black/85 p-4"
        >
          <div className="w-full max-w-lg rounded-lg border border-[#ca8a04]/60 bg-[#0e0b0c] p-6 shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#ca8a04]">
              Night Survived · Chapter {level.chapter}
            </p>
            <h2 className="font-display mt-1 text-2xl font-bold text-[#e7e5e4]">
              Level {level.level} Cleared: {level.title}
            </h2>
            <p className="mt-2 text-sm text-[#d6d3d1]">{level.supernaturalEvent}</p>

            <div className="mt-4 grid grid-cols-2 gap-3 rounded border border-[#27272a] bg-[#070709] p-3 font-mono-tabular text-xs">
              <div>
                <span className="block text-[#a8a29e]">Reward</span>
                <span className="text-base font-bold text-[#ca8a04]">+{level.rewardCoins} Coins</span>
              </div>
              <div>
                <span className="block text-[#a8a29e]">Archive Discovery</span>
                <span className="text-sm font-semibold text-[#e7e5e4]">{level.hiddenClueId.toUpperCase()}</span>
              </div>
            </div>

            {level.level % 3 === 0 && (
              <div className="mt-4 rounded border border-[#3f1d1d] bg-[#140c0d] p-3">
                <p className="text-xs font-semibold text-[#ca8a04]">The Christmas That Remembers — Choose Your Action:</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onDecision('trust_evelyn', 'yes')}
                    className="rounded border border-[#3f1d1d] bg-[#1e1213] px-3 py-1.5 text-xs text-[#e7e5e4] hover:border-[#ca8a04]"
                  >
                    Confide in Mrs. Evelyn
                  </button>
                  <button
                    type="button"
                    onClick={() => onDecision('mercy_nicholas', 'yes')}
                    className="rounded border border-[#3f1d1d] bg-[#1e1213] px-3 py-1.5 text-xs text-[#e7e5e4] hover:border-[#ca8a04]"
                  >
                    Protect Baby Nicholas
                  </button>
                  <button
                    type="button"
                    onClick={() => onDecision('accept_lantern', 'yes')}
                    className="rounded border border-[#3f1d1d] bg-[#1e1213] px-3 py-1.5 text-xs text-[#e7e5e4] hover:border-[#ca8a04]"
                  >
                    Accept Keeper&apos;s Lantern
                  </button>
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={onReturnToMenu}
                className="rounded border border-[#27272a] bg-[#0d0d10] px-4 py-2.5 text-sm font-medium text-[#d6d3d1] hover:border-[#71717a]"
              >
                Main Menu
              </button>
              <button
                type="button"
                data-start="true"
                onClick={onNextLevel}
                className="inline-flex items-center gap-2 rounded bg-[#8b1a1a] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#a61f1f]"
              >
                Next Level ({Math.min(100, level.level + 1)})
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
