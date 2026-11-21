import React, { useState } from 'react';
import { RotateCcw, Home, Eye } from 'lucide-react';
import type { BabyState, CameraMode, LevelDefinition } from '../game/types';

interface DevilsGazeOverlayProps {
  level: LevelDefinition;
  details: {
    distance: number;
    cameraMode: CameraMode;
    babyState: BabyState;
    cause?: 'devils_gaze' | 'santa_caught';
  };
  reducedFlicker: boolean;
  onRetry: () => void;
  onReturnToMenu: () => void;
}

export const DevilsGazeOverlay: React.FC<DevilsGazeOverlayProps> = ({
  level,
  details,
  reducedFlicker,
  onRetry,
  onReturnToMenu,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const isSanta = details.cause === 'santa_caught';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="The Devil's Gaze Game Over"
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#050203] px-4 py-6 text-[#e7e5e4] ${
        reducedFlicker ? '' : 'animate-gaze-tremor'
      }`}
    >
      {/* Crimson atmospheric vignette */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            'radial-gradient(circle at center, rgba(139, 26, 26, 0.25) 0%, rgba(5, 2, 3, 0.96) 72%)',
        }}
      />

      <div className="relative z-10 flex w-full max-w-xl flex-col items-center text-center">
        {/* Horrifying Supernatural Loser Face staring straight at the player */}
        <div className="mb-4 w-52 sm:w-64">
          <svg
            viewBox="0 0 260 260"
            className="h-auto w-full drop-shadow-[0_0_28px_rgba(220,38,38,0.65)]"
            aria-hidden="true"
          >
            {/* Gaunt pale-ash face silhouette */}
            <path
              d="M52 95 C52 38 208 38 208 95 L216 142 C216 205 178 242 130 242 C82 242 44 205 44 142 Z"
              fill="#1b1516"
              stroke="#7f1d1d"
              strokeWidth="4"
            />
            {/* Hollowed sunken eye sockets */}
            <ellipse cx="92" cy="112" rx="28" ry="20" fill="#050203" stroke="#450a0a" strokeWidth="2" />
            <ellipse cx="168" cy="112" rx="28" ry="20" fill="#050203" stroke="#450a0a" strokeWidth="2" />
            {/* Intense glowing devil eyes with unnatural darting pupils */}
            <circle cx="92" cy="112" r="11" fill="#dc2626" />
            <circle cx="168" cy="112" r="11" fill="#dc2626" />
            <g className={reducedFlicker ? '' : 'animate-[gazeTremor_0.45s_infinite_alternate]'}>
              <circle cx="92" cy="112" r="4.5" fill="#fef2f2" />
              <circle cx="168" cy="112" r="4.5" fill="#fef2f2" />
            </g>
            {/* Deep brow crease */}
            <path d="M68 86 Q92 98 115 92" fill="none" stroke="#8b1a1a" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M192 86 Q168 98 145 92" fill="none" stroke="#8b1a1a" strokeWidth="3.5" strokeLinecap="round" />
            {/* Hollow nasal bridge */}
            <path d="M130 116 L124 146 L136 146 Z" fill="#090506" />
            {/* Unnatural wide hysterical laughing grin */}
            <path
              d="M72 168 Q130 228 188 168 Q130 192 72 168 Z"
              fill="#050203"
              stroke="#991b1b"
              strokeWidth="3"
            />
            {/* Jagged pale teeth */}
            <path
              d="M84 174 L92 186 L102 177 L112 190 L124 179 L136 190 L148 179 L158 188 L168 176 L176 184"
              fill="none"
              stroke="#d6d3d1"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#ca8a04]">
          {isSanta ? 'SANTA CLAUS ENTITY CAPTURE' : "THE DEVIL'S GAZE ACTIVATED"}
        </p>

        <h1 className="font-display mt-2 text-4xl font-extrabold tracking-wide text-[#dc2626] sm:text-5xl">
          YOU LOSE! TOO BAD!
        </h1>

        <p className="mt-3 text-sm text-[#d6d3d1]">
          Failed on <strong className="text-[#e7e5e4]">Level {level.level}: {level.title}</strong> ({level.chapterTitle}).
          <br />
          {isSanta
            ? 'Santa found you exposed in the dark. Use [H] to hide inside wardrobes, under beds, or behind sofas.'
            : "You held direct eye contact with Baby Nicholas's red eyes."}
        </p>

        {showDetails && (
          <div className="mt-4 w-full rounded border border-[#3f1d1d] bg-[#0d0708] p-4 text-left text-xs text-[#d6d3d1]">
            <div className="grid grid-cols-3 gap-3 font-mono-tabular">
              <div>
                <span className="block text-[#a8a29e]">Distance</span>
                <span className="text-sm font-semibold text-[#e7e5e4]">{details.distance}m</span>
              </div>
              <div>
                <span className="block text-[#a8a29e]">Camera</span>
                <span className="text-sm font-semibold text-[#e7e5e4]">
                  {details.cameraMode === 'first-person' ? 'First-Person' : 'Third-Person'}
                </span>
              </div>
              <div>
                <span className="block text-[#a8a29e]">Baby State</span>
                <span className="text-sm font-semibold text-[#dc2626]">{details.babyState}</span>
              </div>
            </div>
            <p className="mt-3 border-t border-[#291414] pt-2 text-[#a8a29e]">
              Survival Tip: Look away immediately when Nicholas&apos;s eyes glow crimson, press [V] to switch perspective, or press [H] near a Wardrobe, Four-Poster Bed, or Parlor Sofa to hide.
            </p>
          </div>
        )}

        <div className="mt-6 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            data-start="true"
            onClick={onRetry}
            className="inline-flex items-center justify-center gap-2 rounded bg-[#8b1a1a] px-6 py-3 text-sm font-bold text-[#e7e5e4] hover:bg-[#a61f1f] transition-colors whitespace-nowrap"
          >
            <RotateCcw className="h-4 w-4" />
            RETRY LEVEL
          </button>

          <button
            type="button"
            onClick={onReturnToMenu}
            className="inline-flex items-center justify-center gap-2 rounded border border-[#3f1d1d] bg-[#140d0e] px-5 py-3 text-sm font-semibold text-[#e7e5e4] hover:border-[#ca8a04] transition-colors whitespace-nowrap"
          >
            <Home className="h-4 w-4" />
            RETURN TO MAIN MENU
          </button>

          <button
            type="button"
            onClick={() => setShowDetails((prev) => !prev)}
            className="inline-flex items-center justify-center gap-2 rounded border border-[#27272a] bg-[#0d0d10] px-4 py-3 text-sm font-medium text-[#d6d3d1] hover:border-[#71717a] transition-colors whitespace-nowrap"
          >
            <Eye className="h-4 w-4" />
            {showDetails ? 'HIDE DETAILS' : 'VIEW GAME OVER DETAILS'}
          </button>
        </div>
      </div>
    </div>
  );
};
