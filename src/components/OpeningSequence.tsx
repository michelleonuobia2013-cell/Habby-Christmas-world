import React, { useEffect, useState } from 'react';
import { UserCheck, ShieldAlert, Sparkles } from 'lucide-react';
import type { GamePhase, NannyAppearance } from '../game/types';
import { PWAInstallButton } from './InstallSection';

const LOADING_ART_PATH = '/src/assets/images/art_mansion_backdrop_1795030403064.jpg';

const LOADING_TIPS = [
  "THE DEVIL'S GAZE: Never sustain direct eye contact when Baby Nicholas's infant eyes ignite glowing red at night.",
  'THE 3:17 CHRISTMAS RULE: At 03:17 AM every night, the Living House shifts and a unique supernatural event begins.',
  'FIRST & THIRD-PERSON [V]: Explore Blackwood Manor up close in First-Person, or press [V] anytime to switch to Third-Person.',
  'HIDE TO SURVIVE [H]: Slip inside Wardrobes, under Four-Poster Beds, or behind Parlor Sofas to conceal yourself from Santa and the Gaze.',
  'CARRY & INSPECT [G] / [E]: Pick up Baby Nicholas, warm milk bottles, or open mansion doors, cupboards & bathroom cabinets.',
];

interface OpeningSequenceProps {
  phase: GamePhase;
  currentUsername: string;
  initialNanny: NannyAppearance;
  onAdvancePhase: (next: GamePhase) => void;
  onAuthenticated: (username: string, isGuest: boolean, remoteSave?: Record<string, unknown>) => void;
  onSaveCharacter: (nanny: NannyAppearance) => void;
  onOpenInstallTab: () => void;
}

export const OpeningSequence: React.FC<OpeningSequenceProps> = ({
  phase,
  currentUsername,
  initialNanny,
  onAdvancePhase,
  onAuthenticated,
  onSaveCharacter,
  onOpenInstallTab,
}) => {
  const [loadProgress, setLoadProgress] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);

  // Account form state
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);

  // Character creator state
  const [nanny, setNanny] = useState<NannyAppearance>(initialNanny);

  // Studio logo auto-advance (skippable on click/key)
  useEffect(() => {
    if (phase !== 'logo') return;
    const t = window.setTimeout(() => onAdvancePhase('cover'), 1500);
    return () => clearTimeout(t);
  }, [phase, onAdvancePhase]);

  // Enter / Space handshake on Cover screen
  useEffect(() => {
    if (phase !== 'cover') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onAdvancePhase('loading');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, onAdvancePhase]);

  // Loading progress simulation
  useEffect(() => {
    if (phase !== 'loading') return;
    setLoadProgress(12);
    const id = window.setInterval(() => {
      setLoadProgress((prev) => {
        const next = Math.min(100, prev + 22);
        if (next >= 100) {
          clearInterval(id);
          window.setTimeout(() => onAdvancePhase('account'), 260);
        }
        return next;
      });
    }, 240);
    const tipTimer = window.setInterval(() => {
      setTipIndex((i) => (i + 1) % LOADING_TIPS.length);
    }, 1800);
    return () => {
      clearInterval(id);
      clearInterval(tipTimer);
    };
  }, [phase, onAdvancePhase]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (username.trim().length < 3 || password.length < 4) {
      setAuthError('Please enter a username (min 3 characters) and password (min 4 characters).');
      return;
    }
    setAuthBusy(true);
    try {
      const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Authentication failed.');
      } else {
        onAuthenticated(data.username, Boolean(data.isGuest), data.saveData);
      }
    } catch {
      setAuthError('Network error reaching Habby Christmas auth server.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleGuest = async () => {
    setAuthBusy(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/auth/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      onAuthenticated(data.username || 'Nanny Guest', true);
    } catch {
      onAuthenticated('Nanny Guest', true);
    } finally {
      setAuthBusy(false);
    }
  };

  if (phase === 'logo') {
    return (
      <div
        onClick={() => onAdvancePhase('cover')}
        className="fixed inset-0 z-40 flex cursor-pointer flex-col items-center justify-center bg-[#070709] text-center"
      >
        <div className="mb-3 h-12 w-12 rounded-full border border-[#8b1a1a] bg-[#13080a] p-2.5">
          <svg viewBox="0 0 24 24" className="h-full w-full text-[#ca8a04]" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5Z" />
          </svg>
        </div>
        <p className="font-display text-xl tracking-[0.35em] text-[#e7e5e4]">FROSTBITE NIGHTWORKS</p>
        <p className="mt-2 text-xs tracking-widest text-[#a8a29e]">Click anywhere to continue</p>
      </div>
    );
  }

  if (phase === 'cover') {
    return (
      <div className="fixed inset-0 z-40 flex flex-col justify-between bg-gradient-to-r from-[#070709]/95 via-[#070709]/65 to-transparent p-6 sm:p-12">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[#ca8a04]">
            Horror Baby Christmas · 100 Levels
          </span>
          <PWAInstallButton compact onOpenInstallSection={onOpenInstallTab} />
        </div>

        <div className="my-auto max-w-xl space-y-6">
          {/* Bespoke inline SVG Title Crest */}
          <div className="flex items-center gap-4">
            <svg viewBox="0 0 80 80" className="h-16 w-16 shrink-0" aria-hidden="true">
              <circle cx="40" cy="40" r="36" fill="#13080a" stroke="#8b1a1a" strokeWidth="2.5" />
              <path d="M20 34 C22 18 58 18 60 34 Z" fill="#7f1d1d" />
              <rect x="18" y="31" width="44" height="6" rx="3" fill="#d6d3d1" />
              <circle cx="31" cy="46" r="4" fill="#ef4444" />
              <circle cx="49" cy="46" r="4" fill="#ef4444" />
              <path d="M29 57 Q40 65 51 57" fill="none" stroke="#ca8a04" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
            <div>
              <h1 className="font-display text-4xl font-extrabold tracking-wider text-[#e7e5e4] sm:text-6xl">
                HABBY CHRISTMAS
              </h1>
              <p className="mt-1 text-sm font-medium tracking-widest text-[#dc2626]">
                OPEN-WORLD SUPERNATURAL HORROR SIMULATION
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              data-start="true"
              onClick={() => onAdvancePhase('loading')}
              className="rounded bg-[#8b1a1a] px-8 py-3.5 text-sm font-bold uppercase tracking-wider text-[#e7e5e4] shadow-lg hover:bg-[#a61f1f] transition-colors whitespace-nowrap"
            >
              Enter the Estate
            </button>
            <PWAInstallButton onOpenInstallSection={onOpenInstallTab} />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 rounded bg-[#070709]/70 border border-white/10 px-4 py-2.5 text-xs text-[#e7e5e4] backdrop-blur-sm">
          <span>WASD / Joystick · [E] Open/Interact · [G] Pick/Drop · [Space] Jump · [H] Hide · [V] 1st/3rd Camera</span>
          <span className="font-semibold text-[#ca8a04]">Press Enter to Start</span>
        </div>
      </div>
    );
  }

  if (phase === 'loading') {
    return (
      <div className="fixed inset-0 z-40 flex flex-col justify-end bg-[#070709]">
        <img
          src={LOADING_ART_PATH}
          alt="Blackwood Christmas Estate in winter midnight fog"
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full object-cover opacity-55"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#070709] via-[#070709]/65 to-transparent" />

        <div className="relative z-10 mx-auto w-full max-w-4xl space-y-5 p-6 sm:p-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#ca8a04]">
                Loading Blackwood Estate &amp; Silent Town
              </p>
              <h2 className="font-display mt-1 text-2xl font-bold text-[#e7e5e4]">
                HABBY CHRISTMAS
              </h2>
            </div>
            <span className="font-mono-tabular text-lg font-bold text-[#ca8a04]">{loadProgress}%</span>
          </div>

          <div className="h-2 w-full overflow-hidden rounded bg-[#1c1917]">
            <div
              className="h-full bg-[#8b1a1a] transition-all duration-200"
              style={{ width: `${loadProgress}%` }}
            />
          </div>

          <p className="text-sm text-[#d6d3d1]">{LOADING_TIPS[tipIndex]}</p>
        </div>
      </div>
    );
  }

  if (phase === 'account') {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#070709]/95 p-4">
        <div className="w-full max-w-md rounded-lg border border-[#3f1d1d] bg-[#0e0b0c] p-6 shadow-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#ca8a04]">
            Nanny Registry · Cloud Save &amp; Co-op
          </p>
          <h2 className="font-display mt-1 text-2xl font-bold text-[#e7e5e4]">
            Sign In or Play as Guest
          </h2>

          <div className="mt-4 flex gap-1 rounded bg-[#181314] p-1">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setAuthError(null);
              }}
              className={`flex-1 rounded py-2 text-xs font-semibold transition-colors ${
                authMode === 'login' ? 'bg-[#8b1a1a] text-white' : 'text-[#a8a29e] hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('register');
                setAuthError(null);
              }}
              className={`flex-1 rounded py-2 text-xs font-semibold transition-colors ${
                authMode === 'register' ? 'bg-[#8b1a1a] text-white' : 'text-[#a8a29e] hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="mt-4 space-y-3">
            <div>
              <label htmlFor="auth-username" className="block text-xs font-medium text-[#d6d3d1]">
                Nanny Username
              </label>
              <input
                id="auth-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. Clara Vance"
                className="mt-1 w-full rounded border border-[#2e2324] bg-[#070709] px-3 py-2 text-sm text-[#e7e5e4] focus:border-[#ca8a04] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="auth-password" className="block text-xs font-medium text-[#d6d3d1]">
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 4 characters"
                className="mt-1 w-full rounded border border-[#2e2324] bg-[#070709] px-3 py-2 text-sm text-[#e7e5e4] focus:border-[#ca8a04] focus:outline-none"
              />
            </div>

            {authError && (
              <p role="alert" className="rounded border border-[#8b1a1a] bg-[#1c0a0b] px-3 py-2 text-xs text-[#fca5a5]">
                {authError}
              </p>
            )}

            <button
              type="submit"
              disabled={authBusy}
              className="w-full rounded bg-[#8b1a1a] py-2.5 text-sm font-semibold text-white hover:bg-[#a61f1f] disabled:opacity-50"
            >
              {authBusy ? 'Connecting...' : authMode === 'login' ? 'Sign In & Load Save' : 'Create Nanny Account'}
            </button>
          </form>

          <div className="my-4 flex items-center gap-3 text-xs text-[#71717a]">
            <span className="h-px flex-1 bg-[#27272a]" />
            <span>OR</span>
            <span className="h-px flex-1 bg-[#27272a]" />
          </div>

          <button
            type="button"
            onClick={handleGuest}
            disabled={authBusy}
            className="flex w-full items-center justify-center gap-2 rounded border border-[#3f1d1d] bg-[#140e0f] py-2.5 text-sm font-semibold text-[#e7e5e4] hover:border-[#ca8a04]"
          >
            <UserCheck className="h-4 w-4 text-[#ca8a04]" />
            Continue as Guest ({currentUsername})
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'character') {
    const skinTones = ['#f0d0b8', '#d6a584', '#a87454', '#6d442d'];
    const hairColors = ['#1c1917', '#4a2c18', '#8b3a1a', '#d4a34a'];
    const outfits: Array<{ id: NannyAppearance['outfit']; label: string }> = [
      { id: 'classic_nanny', label: 'Classic Charcoal Coat' },
      { id: 'crimson_coat', label: 'Dark Crimson Coat' },
      { id: 'winter_cloak', label: 'Frosted Cloak' },
      { id: 'keeper_attire', label: 'Keeper Tweed Attire' },
    ];

    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-[#070709]/95 p-4">
        <div className="w-full max-w-2xl rounded-lg border border-[#3f1d1d] bg-[#0e0b0c] p-6 shadow-2xl">
          <div className="flex items-center justify-between border-b border-[#27272a] pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#ca8a04]">
                Character Customization
              </p>
              <h2 className="font-display text-2xl font-bold text-[#e7e5e4]">Customize The Nanny</h2>
            </div>
            <ShieldAlert className="h-6 w-6 text-[#8b1a1a]" />
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="nanny-name" className="block text-xs font-medium text-[#d6d3d1]">
                Nanny Name
              </label>
              <input
                id="nanny-name"
                type="text"
                value={nanny.name}
                onChange={(e) => setNanny({ ...nanny, name: e.target.value })}
                className="mt-1.5 w-full rounded border border-[#2e2324] bg-[#070709] px-3 py-2 text-sm text-[#e7e5e4]"
              />
            </div>

            <div>
              <label htmlFor="nanny-hairstyle" className="block text-xs font-medium text-[#d6d3d1]">
                Hairstyle
              </label>
              <select
                id="nanny-hairstyle"
                value={nanny.hairStyle}
                onChange={(e) => setNanny({ ...nanny, hairStyle: e.target.value as NannyAppearance['hairStyle'] })}
                className="mt-1.5 w-full rounded border border-[#2e2324] bg-[#070709] px-3 py-2 text-sm text-[#e7e5e4]"
              >
                <option value="bun">Classic Nanny Bun</option>
                <option value="bob">Winter Bob</option>
                <option value="braids">Twin Braids</option>
                <option value="waves">Long Waves</option>
              </select>
            </div>

            <div>
              <span className="block text-xs font-medium text-[#d6d3d1]">Skin Tone</span>
              <div className="mt-2 flex gap-2.5">
                {skinTones.map((tone) => (
                  <button
                    key={tone}
                    type="button"
                    aria-label={`Select skin tone ${tone}`}
                    onClick={() => setNanny({ ...nanny, skinTone: tone })}
                    className={`h-8 w-8 rounded-full border-2 ${
                      nanny.skinTone === tone ? 'border-[#ca8a04]' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: tone }}
                  />
                ))}
              </div>
            </div>

            <div>
              <span className="block text-xs font-medium text-[#d6d3d1]">Hair Color</span>
              <div className="mt-2 flex gap-2.5">
                {hairColors.map((col) => (
                  <button
                    key={col}
                    type="button"
                    aria-label={`Select hair color ${col}`}
                    onClick={() => setNanny({ ...nanny, hairColor: col })}
                    className={`h-8 w-8 rounded-full border-2 ${
                      nanny.hairColor === col ? 'border-[#ca8a04]' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: col }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="nanny-outfit" className="block text-xs font-medium text-[#d6d3d1]">
                Winter Coat / Outfit
              </label>
              <select
                id="nanny-outfit"
                value={nanny.outfit}
                onChange={(e) => setNanny({ ...nanny, outfit: e.target.value as NannyAppearance['outfit'] })}
                className="mt-1.5 w-full rounded border border-[#2e2324] bg-[#070709] px-3 py-2 text-sm text-[#e7e5e4]"
              >
                {outfits.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="nanny-accessory" className="block text-xs font-medium text-[#d6d3d1]">
                Accessory &amp; Voice
              </label>
              <div className="mt-1.5 flex gap-2">
                <select
                  id="nanny-accessory"
                  value={nanny.accessory}
                  onChange={(e) => setNanny({ ...nanny, accessory: e.target.value as NannyAppearance['accessory'] })}
                  className="flex-1 rounded border border-[#2e2324] bg-[#070709] px-2.5 py-2 text-sm text-[#e7e5e4]"
                >
                  <option value="gold_locket">Gold Locket</option>
                  <option value="lantern_brooch">Lantern Brooch</option>
                  <option value="silver_spectacles">Spectacles</option>
                  <option value="none">None</option>
                </select>
                <select
                  aria-label="Voice tone"
                  value={nanny.voiceTone}
                  onChange={(e) => setNanny({ ...nanny, voiceTone: e.target.value as NannyAppearance['voiceTone'] })}
                  className="w-28 rounded border border-[#2e2324] bg-[#070709] px-2.5 py-2 text-sm text-[#e7e5e4]"
                >
                  <option value="steady">Steady</option>
                  <option value="warm">Warm</option>
                  <option value="whisper">Whisper</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-[#27272a] pt-4">
            <button
              type="button"
              onClick={() => onSaveCharacter(nanny)}
              className="inline-flex items-center gap-2 rounded bg-[#8b1a1a] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#a61f1f]"
            >
              <Sparkles className="h-4 w-4 text-[#ca8a04]" />
              Confirm Nanny &amp; Enter Main Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
