import React, { useMemo, useState } from 'react';
import {
  Home,
  Play,
  Map as MapIcon,
  Building2,
  Users,
  BookOpen,
  User,
  Award,
  Trophy,
  Bell,
  Sliders,
  HelpCircle,
  Download,
  Lock,
  CheckCircle2,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import type {
  AdaptiveProfile,
  GameSettings,
  LevelDefinition,
  MenuTab,
  NannyAppearance,
  OwnedPropertyState,
  PlayerSaveData,
  WorldLocation,
} from '../game/types';
import { ALL_100_LEVELS, CHAPTER_TITLES } from '../game/levels';
import { isLevelUnlocked } from '../game/adaptiveDifficulty';
import { PWAInstallButton, InstallSectionView } from './InstallSection';
import { WorldMapView, HousingView, ArchivesView } from './WorldAndHousingViews';
import {
  AchievementsAndLeaderboardsView,
  MultiplayerView,
  ProfileAndDirectoryView,
  SettingsNotificationsRulesView,
  type MultiplayerRoomInfo,
} from './MultiplayerAndProfileViews';

interface MainMenuHubProps {
  save: PlayerSaveData;
  activeTab: MenuTab;
  adaptive: AdaptiveProfile;
  activeLocationId: string;
  activeRoom: MultiplayerRoomInfo | null;
  onSelectTab: (tab: MenuTab) => void;
  onStartLevel: (levelNum: number) => void;
  onTravelLocation: (loc: WorldLocation) => void;
  onUpdateHousing: (coinsDelta: number, nextOwned: OwnedPropertyState[]) => void;
  onPlayRecordingTone: () => void;
  onConnectCluesHint: (clueA: string, clueB: string) => void;
  onJoinRoom: (roomId: string) => void;
  onLeaveRoom: () => void;
  onSendChat: (text: string) => void;
  onUpdateNanny: (nanny: NannyAppearance) => void;
  onUpdateSettings: (settings: GameSettings) => void;
  onMarkAllRead: () => void;
}

const DESKTOP_NAV_ITEMS: Array<{ id: MenuTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'play', label: '100 Levels', icon: Play },
  { id: 'map', label: 'World Map', icon: MapIcon },
  { id: 'housing', label: 'Housing', icon: Building2 },
  { id: 'multiplayer', label: 'Multiplayer', icon: Users },
  { id: 'archives', label: 'Archives', icon: BookOpen },
  { id: 'achievements', label: 'Achievements', icon: Award },
  { id: 'leaderboards', label: 'Rankings', icon: Trophy },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Alerts', icon: Bell },
  { id: 'settings', label: 'Settings', icon: Sliders },
  { id: 'rules', label: 'Rules', icon: HelpCircle },
  { id: 'install', label: 'Install App', icon: Download },
];

export const MainMenuHub: React.FC<MainMenuHubProps> = ({
  save,
  activeTab,
  adaptive,
  activeLocationId,
  activeRoom,
  onSelectTab,
  onStartLevel,
  onTravelLocation,
  onUpdateHousing,
  onPlayRecordingTone,
  onConnectCluesHint,
  onJoinRoom,
  onLeaveRoom,
  onSendChat,
  onUpdateNanny,
  onUpdateSettings,
  onMarkAllRead,
}) => {
  const continueLevelNum = Math.min(100, save.highestLevelUnlocked || 1);
  const defaultChapter = Math.ceil(continueLevelNum / 10);
  const [selectedChapter, setSelectedChapter] = useState<number>(defaultChapter);
  const [selectedLevelPreview, setSelectedLevelPreview] = useState<LevelDefinition>(
    ALL_100_LEVELS[continueLevelNum - 1] || ALL_100_LEVELS[0],
  );

  const chapterLevels = useMemo(
    () => ALL_100_LEVELS.filter((l) => l.chapter === selectedChapter),
    [selectedChapter],
  );

  const unreadCount = save.notifications.filter((n) => !n.read).length;

  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-[#070709]/92 text-[#e7e5e4]">
      {/* Top Bar */}
      <header className="shrink-0 border-b border-[#2e1717] bg-[#0a0809]/95 px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="font-display truncate text-lg font-extrabold tracking-wider text-[#e7e5e4] sm:text-xl">
              HABBY CHRISTMAS
            </span>
            <span className="hidden text-xs text-[#a8a29e] md:inline">
              · {save.username} · {save.coins} Coins · Lvl {continueLevelNum}/100
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:block">
              <PWAInstallButton compact onOpenInstallSection={() => onSelectTab('install')} />
            </div>
            <button
              type="button"
              data-start="true"
              onClick={() => onStartLevel(continueLevelNum)}
              className="inline-flex items-center gap-1.5 rounded bg-[#8b1a1a] px-3 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#a61f1f] transition-colors whitespace-nowrap shrink-0 sm:px-4"
            >
              <Play className="h-3.5 w-3.5" />
              <span className="sm:hidden">Lvl {continueLevelNum}</span>
              <span className="hidden sm:inline">Continue Lvl {continueLevelNum}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area: Sidebar (Desktop) + Scrollable Viewport */}
      <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 overflow-hidden">
        {/* Desktop Navigation Rail */}
        <aside className="hidden w-52 shrink-0 overflow-y-auto border-r border-[#241414] bg-[#090708]/90 p-3 lg:block">
          <nav aria-label="Main Menu Navigation" className="space-y-1">
            {DESKTOP_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  className={`flex w-full items-center justify-between rounded px-3 py-2 text-left text-xs font-semibold transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-[#8b1a1a] text-white'
                      : 'text-[#d6d3d1] hover:bg-[#160e0f] hover:text-white'
                  }`}
                >
                  <span className="inline-flex items-center gap-2.5">
                    <Icon className={`h-4 w-4 ${active ? 'text-white' : 'text-[#ca8a04]'}`} />
                    {item.label}
                  </span>
                  {item.id === 'notifications' && unreadCount > 0 && (
                    <span className="font-mono-tabular text-[11px] font-bold text-[#ca8a04]">
                      {unreadCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Tab Viewport */}
        <main className="min-w-0 flex-1 overflow-y-auto p-4 pb-20 sm:p-6 lg:pb-8">
          {/* Tablet / Mobile Secondary Horizontal Quick Links for non-bottom-bar tabs */}
          <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1 lg:hidden">
            {(['housing', 'multiplayer', 'archives', 'achievements', 'leaderboards', 'settings', 'rules', 'install'] as MenuTab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onSelectTab(t)}
                className={`rounded border px-3 py-1.5 text-xs font-semibold capitalize whitespace-nowrap shrink-0 ${
                  activeTab === t
                    ? 'border-[#ca8a04] bg-[#8b1a1a] text-white'
                    : 'border-[#2e1d1e] bg-[#0f0b0c] text-[#d6d3d1]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {activeTab === 'home' && (
            <div className="space-y-6">
              {/* Hero Play Panel */}
              <div className="rounded-lg border border-[#3f1d1d] bg-gradient-to-br from-[#140b0c] via-[#0d090a] to-[#070709] p-6">
                <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
                  <div className="max-w-2xl space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#ca8a04]">
                      Active Assignment · Chapter {Math.ceil(continueLevelNum / 10)} of 10
                    </p>
                    <h1 className="font-display text-3xl font-extrabold text-[#e7e5e4]">
                      Level {continueLevelNum}: {ALL_100_LEVELS[continueLevelNum - 1]?.title}
                    </h1>
                    <p className="text-sm text-[#d6d3d1]">
                      {ALL_100_LEVELS[continueLevelNum - 1]?.summary}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-[#a8a29e]">
                      <span>Director Tier: <strong className="text-[#ca8a04]">{adaptive.tier}</strong></span>
                      <span aria-hidden="true">·</span>
                      <span>Clues: <strong className="text-[#e7e5e4]">{save.unlockedClues.length}</strong></span>
                      <span aria-hidden="true">·</span>
                      <span>Completed: <strong className="text-[#e7e5e4]">{save.completedLevels.length}/100</strong></span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2.5 sm:flex-row md:flex-col shrink-0">
                    <button
                      type="button"
                      data-start="true"
                      onClick={() => onStartLevel(continueLevelNum)}
                      className="inline-flex items-center justify-center gap-2 rounded bg-[#8b1a1a] px-6 py-3 text-sm font-bold text-white hover:bg-[#a61f1f] whitespace-nowrap"
                    >
                      <Play className="h-4 w-4" />
                      Play Level {continueLevelNum}
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectTab('play')}
                      className="inline-flex items-center justify-center gap-2 rounded border border-[#3f1d1d] bg-[#140e0f] px-5 py-2.5 text-xs font-semibold text-[#e7e5e4] hover:border-[#ca8a04] whitespace-nowrap"
                    >
                      Browse All 100 Levels
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Survival Warnings & Quick Access Grid */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border border-[#3f1d1d] bg-[#0e0a0b] p-5">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#dc2626]">
                    <AlertTriangle className="h-4 w-4" />
                    The Devil&apos;s Gaze Rule
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-[#d6d3d1]">
                    Never sustain direct eye contact with Baby Nicholas when his eyes ignite crimson at night. Look away immediately in First-Person or Third-Person, or press <strong>[H]</strong> to hide inside a wardrobe or under a bed.
                  </p>
                </div>

                <div className="rounded-lg border border-[#27272a] bg-[#0d0d10] p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#ca8a04]">
                    Adaptive Horror Director
                  </p>
                  <p className="mt-2 text-sm font-bold text-[#e7e5e4]">{adaptive.tier}</p>
                  <p className="mt-1 text-xs text-[#a8a29e]">{adaptive.reason}</p>
                </div>

                <div className="rounded-lg border border-[#27272a] bg-[#0d0d10] p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#ca8a04]">
                    Christmas Archives &amp; Co-op
                  </p>
                  <p className="mt-2 text-xs text-[#d6d3d1]">
                    Inspect recovered newspapers, tapes, and Impossible Gifts or join another Nanny in real-time WebSocket co-op.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectTab('archives')}
                      className="rounded border border-[#3f1d1d] bg-[#170e0f] px-3 py-1.5 text-xs font-semibold text-[#e7e5e4] hover:border-[#ca8a04]"
                    >
                      Open Archives
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectTab('multiplayer')}
                      className="rounded border border-[#3f1d1d] bg-[#170e0f] px-3 py-1.5 text-xs font-semibold text-[#e7e5e4] hover:border-[#ca8a04]"
                    >
                      Co-op Rooms
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'play' && (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[#ca8a04]">
                  10 Chapters · 100 Progressive Horror Levels
                </p>
                <h2 className="font-display text-2xl font-bold text-[#e7e5e4]">
                  Story Campaign &amp; Level Select
                </h2>
              </div>

              {/* Chapter Selector */}
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {CHAPTER_TITLES.map((cTitle, idx) => {
                  const ch = idx + 1;
                  const active = selectedChapter === ch;
                  return (
                    <button
                      key={cTitle}
                      type="button"
                      onClick={() => {
                        setSelectedChapter(ch);
                        const firstInCh = ALL_100_LEVELS.find((l) => l.chapter === ch);
                        if (firstInCh) setSelectedLevelPreview(firstInCh);
                      }}
                      className={`rounded border px-3 py-2 text-left text-xs transition-colors whitespace-nowrap shrink-0 ${
                        active
                          ? 'border-[#ca8a04] bg-[#8b1a1a] text-white font-bold'
                          : 'border-[#27272a] bg-[#0e0b0c] text-[#a8a29e] hover:border-[#3f1d1d] hover:text-white'
                      }`}
                    >
                      Ch {ch}: {cTitle}
                    </button>
                  );
                })}
              </div>

              <div className="grid gap-5 lg:grid-cols-3">
                {/* 10 Levels in Selected Chapter */}
                <div className="grid gap-3 sm:grid-cols-2 lg:col-span-2">
                  {chapterLevels.map((lvl) => {
                    const unlocked = isLevelUnlocked(lvl.level, save);
                    const completed = save.completedLevels.includes(lvl.level);
                    const selected = selectedLevelPreview.level === lvl.level;
                    return (
                      <button
                        key={lvl.level}
                        type="button"
                        onClick={() => setSelectedLevelPreview(lvl)}
                        className={`flex flex-col justify-between rounded-lg border p-4 text-left transition-colors ${
                          selected
                            ? 'border-[#ca8a04] bg-[#180e10]'
                            : unlocked
                            ? 'border-[#3f1d1d] bg-[#0e0b0c] hover:border-[#ca8a04]/70'
                            : 'border-[#1f1f23] bg-[#09090b] opacity-65'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono-tabular font-semibold text-[#ca8a04]">
                            Level {lvl.level}
                          </span>
                          {completed ? (
                            <CheckCircle2 className="h-4 w-4 text-[#ca8a04]" />
                          ) : !unlocked ? (
                            <Lock className="h-3.5 w-3.5 text-[#52525b]" />
                          ) : null}
                        </div>
                        <h3 className="mt-1.5 text-sm font-bold text-[#e7e5e4]">{lvl.title}</h3>
                        <p className="mt-1 line-clamp-2 text-xs text-[#a8a29e]">{lvl.summary}</p>
                      </button>
                    );
                  })}
                </div>

                {/* Selected Level Briefing */}
                <div className="flex flex-col justify-between rounded-lg border border-[#3f1d1d] bg-[#0e0b0c] p-5">
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#ca8a04]">
                      Chapter {selectedLevelPreview.chapter} · {selectedLevelPreview.district.replace('_', ' ')}
                    </p>
                    <h3 className="font-display text-xl font-bold text-[#e7e5e4]">
                      Level {selectedLevelPreview.level}: {selectedLevelPreview.title}
                    </h3>
                    <p className="text-xs leading-relaxed text-[#d6d3d1]">
                      {selectedLevelPreview.summary}
                    </p>

                    <div className="border-t border-[#27272a] pt-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#a8a29e]">
                        Primary Objectives
                      </p>
                      <ul className="mt-1.5 space-y-1 text-xs text-[#e7e5e4]">
                        {selectedLevelPreview.objectives.map((o) => (
                          <li key={o.id}>· {o.label}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded border border-[#3f1d1d] bg-[#140a0b] p-3 text-xs">
                      <p className="font-semibold text-[#dc2626]">3:17 AM Rule Anomaly</p>
                      <p className="mt-1 text-[#d6d3d1]">{selectedLevelPreview.rule317Event}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!isLevelUnlocked(selectedLevelPreview.level, save)}
                    onClick={() => onStartLevel(selectedLevelPreview.level)}
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded bg-[#8b1a1a] py-3 text-sm font-bold text-white hover:bg-[#a61f1f] disabled:cursor-not-allowed disabled:bg-[#27272a] disabled:text-[#71717a]"
                  >
                    <Play className="h-4 w-4" />
                    {isLevelUnlocked(selectedLevelPreview.level, save)
                      ? `Start Level ${selectedLevelPreview.level}`
                      : `Complete Level ${selectedLevelPreview.level - 1} First`}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'map' && (
            <WorldMapView
              save={save}
              activeLocationId={activeLocationId}
              onTravelLocation={onTravelLocation}
            />
          )}

          {activeTab === 'housing' && (
            <HousingView save={save} onUpdateHousing={onUpdateHousing} />
          )}

          {activeTab === 'multiplayer' && (
            <MultiplayerView
              save={save}
              activeRoom={activeRoom}
              onJoinRoom={onJoinRoom}
              onLeaveRoom={onLeaveRoom}
              onSendChat={onSendChat}
              onStartCoopMission={(lvl) => onStartLevel(lvl)}
            />
          )}

          {activeTab === 'archives' && (
            <ArchivesView
              save={save}
              onPlayRecordingTone={onPlayRecordingTone}
              onConnectCluesHint={onConnectCluesHint}
            />
          )}

          {(activeTab === 'achievements' || activeTab === 'leaderboards') && (
            <AchievementsAndLeaderboardsView save={save} mode={activeTab} />
          )}

          {activeTab === 'profile' && (
            <ProfileAndDirectoryView save={save} onUpdateNanny={onUpdateNanny} />
          )}

          {(activeTab === 'settings' || activeTab === 'notifications' || activeTab === 'rules') && (
            <SettingsNotificationsRulesView
              tab={activeTab}
              save={save}
              onUpdateSettings={onUpdateSettings}
              onMarkAllRead={onMarkAllRead}
            />
          )}

          {activeTab === 'install' && <InstallSectionView />}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (5 compact tabs, <= 60px high) */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-[#2e1717] bg-[#0a0809]/95 lg:hidden"
      >
        {(
          [
            { id: 'home', label: 'Home', icon: Home },
            { id: 'play', label: 'Play', icon: Play },
            { id: 'map', label: 'Map', icon: MapIcon },
            { id: 'profile', label: 'Profile', icon: User },
            { id: 'notifications', label: 'Alerts', icon: Bell },
          ] as Array<{ id: MenuTab; label: string; icon: React.ComponentType<{ className?: string }> }>
        ).map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`relative flex flex-col items-center justify-center py-2 text-[10px] font-semibold whitespace-nowrap ${
                active ? 'text-[#ca8a04]' : 'text-[#a8a29e]'
              }`}
            >
              <Icon className="mb-0.5 h-4 w-4" />
              <span>{item.label}</span>
              {item.id === 'notifications' && unreadCount > 0 && (
                <span className="absolute right-3 top-1.5 h-2 w-2 rounded-full bg-[#dc2626]" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};
