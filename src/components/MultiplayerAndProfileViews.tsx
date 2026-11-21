import React, { useEffect, useState } from 'react';
import {
  Users,
  Send,
  ShieldAlert,
  Trophy,
  Award,
  Bell,
  Sliders,
  HelpCircle,
  Gift,
  Plus,
  LogIn,
} from 'lucide-react';
import type { GameSettings, NannyAppearance, PlayerSaveData } from '../game/types';
import { ACHIEVEMENTS_CATALOG, ARCHIVE_CLUES, CHARACTER_DIRECTORY } from '../game/worldData';

export interface MultiplayerRoomInfo {
  id: string;
  code: string;
  name: string;
  isPrivate: boolean;
  hostUsername: string;
  level: number;
  district: string;
  playerCount: number;
  players: Array<{
    id: string;
    username: string;
    outfit: string;
    gazeFailed: boolean;
    isHiding?: boolean;
    hidingSpotLabel?: string;
  }>;
  chatHistory: Array<{
    id: string;
    sender: string;
    text: string;
    time: string;
    system?: boolean;
  }>;
}

interface MultiplayerViewProps {
  save: PlayerSaveData;
  activeRoom: MultiplayerRoomInfo | null;
  onJoinRoom: (roomId: string) => void;
  onLeaveRoom: () => void;
  onSendChat: (text: string) => void;
  onStartCoopMission: (levelNum: number) => void;
}

export const MultiplayerView: React.FC<MultiplayerViewProps> = ({
  save,
  activeRoom,
  onJoinRoom,
  onLeaveRoom,
  onSendChat,
  onStartCoopMission,
}) => {
  const [rooms, setRooms] = useState<MultiplayerRoomInfo[]>([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [chatText, setChatText] = useState('');
  const [reportTarget, setReportTarget] = useState('');
  const [reportReason, setReportReason] = useState('');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [exchanges, setExchanges] = useState<
    Array<{ id: string; from: string; clueTitle: string; message: string }>
  >([]);

  const fetchRoomsAndExchange = async () => {
    try {
      const [rRes, eRes] = await Promise.all([fetch('/api/rooms'), fetch('/api/exchange')]);
      const rJson = await rRes.json();
      const eJson = await eRes.json();
      setRooms(rJson.rooms || []);
      setExchanges(eJson.exchanges || []);
    } catch {
      // Offline fallback handled cleanly
    }
  };

  useEffect(() => {
    fetchRoomsAndExchange();
  }, []);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    const res = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newRoomName.trim(),
        hostUsername: save.username,
        isPrivate,
        level: Math.min(100, save.highestLevelUnlocked),
        district: 'christmas_estate',
      }),
    });
    const data = await res.json();
    if (data.room) {
      setNewRoomName('');
      onJoinRoom(data.room.id);
      fetchRoomsAndExchange();
    }
  };

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    const res = await fetch(`/api/rooms/by-code/${encodeURIComponent(joinCode.trim())}`);
    if (!res.ok) {
      setStatusMsg('Room code not found.');
      return;
    }
    const data = await res.json();
    if (data.room) {
      setJoinCode('');
      onJoinRoom(data.room.id);
    }
  };

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportTarget.trim()) return;
    const res = await fetch('/api/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reporter: save.username,
        target: reportTarget.trim(),
        reason: reportReason.trim() || 'Inappropriate conduct',
      }),
    });
    if (res.ok) {
      setStatusMsg(`Moderation report logged against ${reportTarget.trim()}.`);
      setReportTarget('');
      setReportReason('');
    }
  };

  const handleShareClue = async (clueId: string) => {
    const clue = ARCHIVE_CLUES.find((c) => c.id === clueId);
    if (!clue) return;
    const res = await fetch('/api/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: save.username,
        clueId: clue.id,
        clueTitle: clue.title,
        message: `Shared from Level ${clue.unlockedAtLevel} archive.`,
      }),
    });
    if (res.ok) {
      setStatusMsg(`Posted "${clue.title}" to The Secret Exchange.`);
      fetchRoomsAndExchange();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#ca8a04]">
          Online Cooperative Mode · Authoritative WebSocket Sync
        </p>
        <h2 className="font-display text-2xl font-bold text-[#e7e5e4]">
          Multiplayer Vigil Rooms &amp; Secret Exchange
        </h2>
      </div>

      {statusMsg && (
        <p className="rounded border border-[#ca8a04]/50 bg-[#18120c] px-4 py-2 text-xs text-[#e7e5e4]">
          {statusMsg}
        </p>
      )}

      {activeRoom ? (
        <div className="grid gap-5 rounded-lg border border-[#ca8a04]/50 bg-[#0e0b0c] p-5 lg:grid-cols-3">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-[#ca8a04]">
                  Room Code: <span className="font-mono-tabular">{activeRoom.code}</span>
                </p>
                <h3 className="font-display text-lg font-bold text-[#e7e5e4]">{activeRoom.name}</h3>
              </div>
              <button
                type="button"
                onClick={onLeaveRoom}
                className="rounded border border-[#3f1d1d] px-3 py-1 text-xs text-[#fca5a5] hover:bg-[#1e0c0d]"
              >
                Leave
              </button>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#a8a29e]">
                Connected Nannies ({activeRoom.players.length})
              </p>
              <ul className="mt-2 space-y-1.5 text-xs">
                {activeRoom.players.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between rounded border border-[#27272a] bg-[#070709] px-3 py-2"
                  >
                    <span className="font-semibold text-[#e7e5e4]">{p.username}</span>
                    <span className={p.gazeFailed ? 'text-[#dc2626]' : p.isHiding ? 'text-[#22c55e]' : 'text-[#ca8a04]'}>
                      {p.gazeFailed
                        ? 'Fell to Devil Gaze'
                        : p.isHiding
                        ? p.hidingSpotLabel || 'Hiding Safely'
                        : 'Active'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="button"
              onClick={() => onStartCoopMission(activeRoom.level)}
              className="w-full rounded bg-[#8b1a1a] py-2.5 text-sm font-bold text-white hover:bg-[#a61f1f]"
            >
              Launch Co-op Mission (Level {activeRoom.level})
            </button>
          </div>

          {/* Live Safe In-Game Chat */}
          <div className="flex flex-col justify-between rounded border border-[#27272a] bg-[#070709] p-4 lg:col-span-2">
            <div className="h-56 space-y-2 overflow-y-auto pr-1 text-xs">
              {activeRoom.chatHistory.map((m) => (
                <div key={m.id} className={m.system ? 'italic text-[#ca8a04]' : 'text-[#e7e5e4]'}>
                  <span className="font-mono-tabular text-[#71717a]">[{m.time}] </span>
                  <strong>{m.sender}: </strong>
                  <span>{m.text}</span>
                </div>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!chatText.trim()) return;
                onSendChat(chatText);
                setChatText('');
              }}
              className="mt-3 flex gap-2"
            >
              <input
                type="text"
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                placeholder="Send safe co-op message..."
                className="flex-1 rounded border border-[#2e2324] bg-[#0e0b0c] px-3 py-2 text-sm text-[#e7e5e4]"
              />
              <button
                type="submit"
                aria-label="Send chat message"
                className="inline-flex items-center gap-1.5 rounded bg-[#8b1a1a] px-4 py-2 text-xs font-bold text-white hover:bg-[#a61f1f]"
              >
                <Send className="h-3.5 w-3.5" />
                Send
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          {/* Public Rooms */}
          <div className="space-y-3 rounded-lg border border-[#3f1d1d] bg-[#0e0b0c] p-5 lg:col-span-2">
            <h3 className="font-display text-lg font-bold text-[#e7e5e4]">Public Co-op Sessions</h3>
            <div className="space-y-2.5">
              {rooms.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded border border-[#27272a] bg-[#070709] p-3.5"
                >
                  <div>
                    <p className="text-sm font-bold text-[#e7e5e4]">{r.name}</p>
                    <p className="text-xs text-[#a8a29e]">
                      Host: {r.hostUsername} · Level {r.level} · Code: {r.code} · {r.playerCount} Online
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onJoinRoom(r.id)}
                    className="inline-flex items-center gap-1.5 rounded bg-[#8b1a1a] px-4 py-2 text-xs font-bold text-white hover:bg-[#a61f1f]"
                  >
                    <LogIn className="h-3.5 w-3.5" />
                    Join Room
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Create / Private Code */}
          <div className="space-y-4 rounded-lg border border-[#27272a] bg-[#0e0b0c] p-5">
            <form onSubmit={handleCreateRoom} className="space-y-3">
              <h3 className="font-display text-base font-bold text-[#e7e5e4]">Create Session</h3>
              <input
                type="text"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="Room title (e.g. Midnight Hunt)"
                className="w-full rounded border border-[#2e2324] bg-[#070709] px-3 py-2 text-xs text-[#e7e5e4]"
              />
              <label className="flex items-center gap-2 text-xs text-[#d6d3d1]">
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                />
                Private Invite-Only Room
              </label>
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-1.5 rounded bg-[#8b1a1a] py-2 text-xs font-bold text-white hover:bg-[#a61f1f]"
              >
                <Plus className="h-3.5 w-3.5" />
                Create Room
              </button>
            </form>

            <form onSubmit={handleJoinByCode} className="space-y-2 border-t border-[#27272a] pt-4">
              <label htmlFor="room-code" className="block text-xs font-semibold text-[#d6d3d1]">
                Join Private Room by Code
              </label>
              <div className="flex gap-2">
                <input
                  id="room-code"
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="XMAS17"
                  className="flex-1 rounded border border-[#2e2324] bg-[#070709] px-3 py-1.5 text-xs uppercase text-[#e7e5e4]"
                />
                <button
                  type="submit"
                  className="rounded border border-[#ca8a04]/60 px-3 py-1.5 text-xs font-semibold text-[#ca8a04]"
                >
                  Join
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Secret Gift Exchange & Safety Reporting */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-lg border border-[#27272a] bg-[#0e0b0c] p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display flex items-center gap-2 text-base font-bold text-[#e7e5e4]">
              <Gift className="h-4 w-4 text-[#ca8a04]" />
              The Secret Exchange
            </h3>
            {save.unlockedClues[0] && (
              <button
                type="button"
                onClick={() => handleShareClue(save.unlockedClues[0])}
                className="rounded border border-[#ca8a04]/50 px-2.5 py-1 text-xs font-semibold text-[#ca8a04]"
              >
                Share Clue
              </button>
            )}
          </div>
          <ul className="mt-3 space-y-2 text-xs">
            {exchanges.slice(0, 4).map((ex) => (
              <li key={ex.id} className="rounded border border-[#27272a] bg-[#070709] p-2.5">
                <span className="font-semibold text-[#ca8a04]">{ex.from}</span> shared{' '}
                <strong className="text-[#e7e5e4]">{ex.clueTitle}</strong>
                <p className="mt-0.5 text-[#a8a29e]">{ex.message}</p>
              </li>
            ))}
          </ul>
        </div>

        <form onSubmit={handleReport} className="space-y-3 rounded-lg border border-[#27272a] bg-[#0e0b0c] p-5">
          <h3 className="font-display flex items-center gap-2 text-base font-bold text-[#e7e5e4]">
            <ShieldAlert className="h-4 w-4 text-[#dc2626]" />
            Player Reporting &amp; Moderation
          </h3>
          <input
            type="text"
            value={reportTarget}
            onChange={(e) => setReportTarget(e.target.value)}
            placeholder="Player username to report"
            className="w-full rounded border border-[#2e2324] bg-[#070709] px-3 py-2 text-xs text-[#e7e5e4]"
          />
          <input
            type="text"
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            placeholder="Reason (griefing, abusive chat)"
            className="w-full rounded border border-[#2e2324] bg-[#070709] px-3 py-2 text-xs text-[#e7e5e4]"
          />
          <button
            type="submit"
            className="rounded border border-[#3f1d1d] bg-[#180d0e] px-4 py-2 text-xs font-semibold text-[#fca5a5] hover:bg-[#8b1a1a] hover:text-white"
          >
            Submit Moderation Report
          </button>
        </form>
      </div>
    </div>
  );
};

export const AchievementsAndLeaderboardsView: React.FC<{
  save: PlayerSaveData;
  mode: 'achievements' | 'leaderboards';
}> = ({ save, mode }) => {
  const [leaders, setLeaders] = useState<
    Array<{ username: string; score: number; highestLevel: number; achievementsCount: number }>
  >([]);

  useEffect(() => {
    if (mode !== 'leaderboards') return;
    fetch('/api/leaderboards')
      .then((r) => r.json())
      .then((d) => setLeaders(d.leaderboards || []))
      .catch(() => {});
  }, [mode]);

  if (mode === 'achievements') {
    return (
      <div className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#ca8a04]">
            {save.unlockedAchievements.length} / {ACHIEVEMENTS_CATALOG.length} Unlocked
          </p>
          <h2 className="font-display text-2xl font-bold text-[#e7e5e4]">Achievement Board</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ACHIEVEMENTS_CATALOG.map((ach) => {
            const unlocked = save.unlockedAchievements.includes(ach.id);
            return (
              <div
                key={ach.id}
                className={`rounded-lg border p-4 ${
                  unlocked ? 'border-[#ca8a04] bg-[#16120c]' : 'border-[#27272a] bg-[#0d0d10] opacity-75'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#ca8a04]">{ach.rarity}</span>
                  <Award className={`h-4 w-4 ${unlocked ? 'text-[#ca8a04]' : 'text-[#52525b]'}`} />
                </div>
                <h3 className="mt-2 text-sm font-bold text-[#e7e5e4]">{ach.title}</h3>
                <p className="mt-1 text-xs text-[#a8a29e]">{ach.description}</p>
                <p className="mt-2 text-[11px] font-medium text-[#d6d3d1]">Reward: {ach.rewardText}</p>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#ca8a04]">
          Global Nanny Survival Rankings
        </p>
        <h2 className="font-display text-2xl font-bold text-[#e7e5e4]">Leaderboards</h2>
      </div>
      <div className="overflow-hidden rounded-lg border border-[#3f1d1d] bg-[#0e0b0c]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[#27272a] bg-[#140e0f] text-xs uppercase text-[#a8a29e]">
            <tr>
              <th className="px-4 py-3">Rank</th>
              <th className="px-4 py-3">Nanny</th>
              <th className="px-4 py-3">Highest Level</th>
              <th className="px-4 py-3">Achievements</th>
              <th className="px-4 py-3 text-right">Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e1718] font-mono-tabular">
            {leaders.map((entry, idx) => (
              <tr key={entry.username} className="hover:bg-[#140d0e]">
                <td className="px-4 py-3 font-bold text-[#ca8a04]">#{idx + 1}</td>
                <td className="px-4 py-3 font-sans font-semibold text-[#e7e5e4]">{entry.username}</td>
                <td className="px-4 py-3 text-[#d6d3d1]">Level {entry.highestLevel}</td>
                <td className="px-4 py-3 text-[#d6d3d1]">{entry.achievementsCount}</td>
                <td className="px-4 py-3 text-right font-bold text-[#e7e5e4]">{entry.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const ProfileAndDirectoryView: React.FC<{
  save: PlayerSaveData;
  onUpdateNanny: (n: NannyAppearance) => void;
}> = ({ save, onUpdateNanny }) => {
  const [nanny, setNanny] = useState<NannyAppearance>(save.nanny);
  const [savedNotice, setSavedNotice] = useState(false);

  return (
    <div className="space-y-6">
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-lg border border-[#3f1d1d] bg-[#0e0b0c] p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#ca8a04]">
            Nanny Profile &amp; Wardrobe
          </p>
          <h2 className="font-display mt-1 text-2xl font-bold text-[#e7e5e4]">{save.username}</h2>
          <p className="mt-1 text-xs text-[#a8a29e]">
            {save.isGuest ? 'Guest Session (Saved Locally & Cloud Synced)' : 'Registered Nanny Account'} · {save.coins} Coins · {save.score} Score
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="prof-name" className="block text-xs text-[#d6d3d1]">Display Name</label>
              <input
                id="prof-name"
                type="text"
                value={nanny.name}
                onChange={(e) => setNanny({ ...nanny, name: e.target.value })}
                className="mt-1 w-full rounded border border-[#2e2324] bg-[#070709] px-3 py-2 text-xs text-[#e7e5e4]"
              />
            </div>
            <div>
              <label htmlFor="prof-outfit" className="block text-xs text-[#d6d3d1]">Outfit</label>
              <select
                id="prof-outfit"
                value={nanny.outfit}
                onChange={(e) => setNanny({ ...nanny, outfit: e.target.value as NannyAppearance['outfit'] })}
                className="mt-1 w-full rounded border border-[#2e2324] bg-[#070709] px-3 py-2 text-xs text-[#e7e5e4]"
              >
                <option value="classic_nanny">Classic Charcoal Coat</option>
                <option value="crimson_coat">Dark Crimson Coat</option>
                <option value="winter_cloak">Frosted Cloak</option>
                <option value="keeper_attire">Keeper Tweed Attire</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              onUpdateNanny(nanny);
              setSavedNotice(true);
              setTimeout(() => setSavedNotice(false), 2000);
            }}
            className="mt-4 rounded bg-[#8b1a1a] px-5 py-2 text-xs font-bold text-white hover:bg-[#a61f1f]"
          >
            {savedNotice ? 'Appearance Saved!' : 'Save Customization'}
          </button>
        </div>

        <div className="rounded-lg border border-[#27272a] bg-[#0d0d10] p-5">
          <h3 className="font-display flex items-center gap-2 text-lg font-bold text-[#e7e5e4]">
            <Users className="h-4 w-4 text-[#ca8a04]" />
            Official Character Directory
          </h3>
          <div className="mt-3 max-h-64 space-y-2.5 overflow-y-auto pr-1 text-xs">
            {CHARACTER_DIRECTORY.map((c) => (
              <div key={c.id} className="rounded border border-[#27272a] bg-[#070709] p-3">
                <div className="flex items-center justify-between">
                  <strong className="text-sm text-[#e7e5e4]">{c.name}</strong>
                  <span className="text-[#ca8a04]">{c.role}</span>
                </div>
                <p className="mt-1 text-[#d6d3d1]">{c.description}</p>
                <p className="mt-1 text-[#a8a29e]">Schedule: {c.schedule}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const SettingsNotificationsRulesView: React.FC<{
  tab: 'settings' | 'notifications' | 'rules';
  save: PlayerSaveData;
  onUpdateSettings: (s: GameSettings) => void;
  onMarkAllRead: () => void;
}> = ({ tab, save, onUpdateSettings, onMarkAllRead }) => {
  const s = save.settings;

  if (tab === 'notifications') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display flex items-center gap-2 text-2xl font-bold text-[#e7e5e4]">
            <Bell className="h-5 w-5 text-[#ca8a04]" />
            Notifications
          </h2>
          <button
            type="button"
            onClick={onMarkAllRead}
            className="rounded border border-[#3f1d1d] px-3 py-1.5 text-xs font-semibold text-[#ca8a04]"
          >
            Mark All Read
          </button>
        </div>
        <div className="space-y-2.5">
          {save.notifications.map((n) => (
            <div
              key={n.id}
              className={`rounded-lg border p-4 ${
                n.read ? 'border-[#27272a] bg-[#0d0d10]' : 'border-[#8b1a1a] bg-[#140c0d]'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-[#ca8a04]">
                <span className="uppercase">{n.kind}</span>
                <span>{n.timestamp}</span>
              </div>
              <h3 className="mt-1 text-sm font-bold text-[#e7e5e4]">{n.title}</h3>
              <p className="mt-1 text-xs text-[#d6d3d1]">{n.body}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (tab === 'rules') {
    return (
      <div className="space-y-5 rounded-lg border border-[#3f1d1d] bg-[#0e0b0c] p-6">
        <h2 className="font-display flex items-center gap-2 text-2xl font-bold text-[#e7e5e4]">
          <HelpCircle className="h-5 w-5 text-[#ca8a04]" />
          How to Play &amp; Estate Rules
        </h2>
        <div className="grid gap-4 md:grid-cols-2 text-sm text-[#d6d3d1]">
          <div className="space-y-2">
            <h3 className="font-semibold text-[#ca8a04]">Core Babysitting &amp; Immersive Controls</h3>
            <p>1. Read the parents&apos; parlor note, warm milk in the kitchen, inspect the ensuite bathroom vanity, and check tiny infant Nicholas in the nursery.</p>
            <p>2. Move with <strong>WASD</strong> / <strong>Virtual Joystick</strong>, press <strong>[E]</strong> to interact or open doors &amp; kitchen cupboards, <strong>[G]</strong> to pick up or drop Baby Nicholas and items, <strong>[Space]</strong> to jump, and <strong>[V]</strong> to switch between First-Person and Third-Person.</p>
            <p>3. Listen carefully with stereo audio: faint binaural music-box whispers signal nearby secret clues, while hollow wood creaks point to Wardrobes, Beds, Sofas, or Pantry hiding spots (<strong>[H]</strong>).</p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold text-[#dc2626]">THE DEVIL&apos;S GAZE &amp; 3:17 Rule</h3>
            <p>4. During night shifts, if Baby Nicholas&apos;s eyes glow red, break direct eye contact or hide immediately—otherwise <strong>THE DEVIL&apos;S GAZE</strong> ends your night (&ldquo;YOU LOSE! TOO BAD!&rdquo;).</p>
            <p>5. Every night at <strong>03:17 AM</strong>, a unique supernatural event triggers and Evil Santa stalks closer.</p>
            <p>6. In Online Co-op, teammates see when you are hiding safely, and surviving nannies can continue if one player falls.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 rounded-lg border border-[#3f1d1d] bg-[#0e0b0c] p-6">
      <h2 className="font-display flex items-center gap-2 text-2xl font-bold text-[#e7e5e4]">
        <Sliders className="h-5 w-5 text-[#ca8a04]" />
        Settings &amp; Accessibility
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="set-cam-mode" className="block text-xs font-medium text-[#d6d3d1]">
            Default Camera Perspective ([V] Toggle In-Game)
          </label>
          <select
            id="set-cam-mode"
            value={s.cameraDefault}
            onChange={(e) =>
              onUpdateSettings({
                ...s,
                cameraDefault: e.target.value as GameSettings['cameraDefault'],
              })
            }
            className="mt-1 w-full rounded border border-[#2e2324] bg-[#070709] px-3 py-2 text-sm text-[#e7e5e4]"
          >
            <option value="first-person">First-Person (Immersive Horror)</option>
            <option value="third-person">Third-Person (Over-Shoulder Orbit)</option>
          </select>
        </div>

        <div>
          <label htmlFor="set-cam-dist" className="block text-xs font-medium text-[#d6d3d1]">
            Third-Person Camera Distance ({(s.cameraDistance ?? 3.1).toFixed(1)}m)
          </label>
          <input
            id="set-cam-dist"
            type="range"
            min="1.8"
            max="5.2"
            step="0.1"
            value={s.cameraDistance ?? 3.1}
            onChange={(e) =>
              onUpdateSettings({
                ...s,
                cameraDistance: Number(e.target.value),
              })
            }
            className="mt-2 w-full accent-[#8b1a1a]"
          />
        </div>

        <div>
          <label htmlFor="set-touch" className="block text-xs font-medium text-[#d6d3d1]">
            On-Screen Joystick &amp; Touch Controller
          </label>
          <select
            id="set-touch"
            value={s.showTouchControls}
            onChange={(e) =>
              onUpdateSettings({
                ...s,
                showTouchControls: e.target.value as GameSettings['showTouchControls'],
              })
            }
            className="mt-1 w-full rounded border border-[#2e2324] bg-[#070709] px-3 py-2 text-sm text-[#e7e5e4]"
          >
            <option value="auto">Auto-Detect Mobile / Tablet</option>
            <option value="always">Always Visible (Joystick + Look Pad)</option>
            <option value="off">Keyboard &amp; Mouse Hints Only</option>
          </select>
        </div>

        <div>
          <label htmlFor="set-qual" className="block text-xs font-medium text-[#d6d3d1]">Graphics Quality</label>
          <select
            id="set-qual"
            value={s.graphicsQuality}
            onChange={(e) => onUpdateSettings({ ...s, graphicsQuality: e.target.value as GameSettings['graphicsQuality'] })}
            className="mt-1 w-full rounded border border-[#2e2324] bg-[#070709] px-3 py-2 text-sm text-[#e7e5e4]"
          >
            <option value="high">High (PBR + Shadows)</option>
            <option value="medium">Medium</option>
            <option value="low">Low (Mobile Battery Saver)</option>
          </select>
        </div>

        <div>
          <label htmlFor="set-sens" className="block text-xs font-medium text-[#d6d3d1]">
            Camera Sensitivity ({s.mouseSensitivity.toFixed(1)}x)
          </label>
          <input
            id="set-sens"
            type="range"
            min="0.4"
            max="2.2"
            step="0.1"
            value={s.mouseSensitivity}
            onChange={(e) => onUpdateSettings({ ...s, mouseSensitivity: Number(e.target.value) })}
            className="mt-2 w-full accent-[#8b1a1a]"
          />
        </div>

        <div>
          <label htmlFor="set-vol" className="block text-xs font-medium text-[#d6d3d1]">
            Master 3D Audio Volume ({Math.round(s.masterVolume * 100)}%)
          </label>
          <input
            id="set-vol"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={s.masterVolume}
            onChange={(e) => onUpdateSettings({ ...s, masterVolume: Number(e.target.value) })}
            className="mt-2 w-full accent-[#8b1a1a]"
          />
        </div>

        <label className="flex items-center gap-2.5 text-xs text-[#d6d3d1]">
          <input
            type="checkbox"
            checked={s.accessibilitySlowGaze}
            onChange={(e) => onUpdateSettings({ ...s, accessibilitySlowGaze: e.target.checked })}
          />
          Accessibility: Extended Devil&apos;s Gaze Grace Window (+35%)
        </label>

        <label className="flex items-center gap-2.5 text-xs text-[#d6d3d1]">
          <input
            type="checkbox"
            checked={s.reducedFlicker}
            onChange={(e) => onUpdateSettings({ ...s, reducedFlicker: e.target.checked })}
          />
          Accessibility: Reduced Screen Tremor &amp; Flickering
        </label>
      </div>
    </div>
  );
};
