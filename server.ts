import express from 'express';
import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3000);
const DATA_FILE = path.join(__dirname, '.habby-data.json');

interface StoredUser {
  username: string;
  passwordHash: string;
  isGuest: boolean;
  saveData: Record<string, unknown>;
  updatedAt: string;
}

interface RoomPlayer {
  id: string;
  username: string;
  outfit: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  cameraMode: string;
  isHiding: boolean;
  hidingSpotLabel: string;
  gazeFailed: boolean;
}

interface MultiplayerRoom {
  id: string;
  code: string;
  name: string;
  isPrivate: boolean;
  hostUsername: string;
  level: number;
  district: string;
  players: Map<string, RoomPlayer>;
  sharedObjectives: Record<string, boolean>;
  chatHistory: Array<{ id: string; sender: string; text: string; time: string; system?: boolean }>;
  createdAt: number;
}

interface PersistedStore {
  users: Record<string, StoredUser>;
  reports: Array<{ id: string; reporter: string; target: string; reason: string; createdAt: string }>;
  exchanges: Array<{ id: string; from: string; clueId: string; clueTitle: string; message: string; createdAt: string }>;
}

const DEFAULT_STORE: PersistedStore = {
  users: {
    'clara.vance': {
      username: 'Clara Vance',
      passwordHash: '',
      isGuest: false,
      saveData: {
        username: 'Clara Vance',
        isGuest: false,
        coins: 1450,
        score: 4820,
        highestLevelUnlocked: 14,
        completedLevels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
        unlockedClues: ['clue_001', 'clue_002', 'clue_003', 'clue_004', 'clue_005'],
        unlockedAchievements: ['ach_first_night', 'ach_silent_visitor', 'ach_missing_gift'],
      },
      updatedAt: new Date().toISOString(),
    },
    'julian.blackwood': {
      username: 'Julian Blackwood',
      passwordHash: '',
      isGuest: false,
      saveData: {
        username: 'Julian Blackwood',
        isGuest: false,
        coins: 2900,
        score: 9410,
        highestLevelUnlocked: 32,
        completedLevels: Array.from({ length: 31 }, (_, i) => i + 1),
        unlockedClues: ['clue_001', 'clue_002', 'clue_003', 'clue_004', 'clue_005', 'clue_006'],
        unlockedAchievements: ['ach_first_night', 'ach_silent_visitor', 'ach_missing_gift', 'ach_santa_knows', 'ach_locked_attic'],
      },
      updatedAt: new Date().toISOString(),
    },
  },
  reports: [],
  exchanges: [
    {
      id: 'ex_seed_1',
      from: 'Clara Vance',
      clueId: 'clue_002',
      clueTitle: 'Torn Ornament Tag (1974)',
      message: 'Found beneath the manor parlor tree after 3:17 AM.',
      createdAt: new Date().toISOString(),
    },
  ],
};

function loadStore(): PersistedStore {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      const parsed = JSON.parse(raw) as PersistedStore;
      if (parsed && parsed.users) return parsed;
    }
  } catch {
    // Fallback to default store
  }
  return structuredClone(DEFAULT_STORE);
}

function saveStore(store: PersistedStore): void {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf8');
  } catch {
    // Non-fatal in read-only edge envs
  }
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(`habby_salt_${password}`).digest('hex');
}

function sanitizeChat(text: string): string {
  const blocked = /\b(hate|kill|slur|abuse)\b/gi;
  return text.trim().slice(0, 220).replace(blocked, '***');
}

const store = loadStore();
const rooms = new Map<string, MultiplayerRoom>();
const wsClients = new Map<WebSocket, { clientId: string; roomId: string | null; username: string }>();

// Seed one open public co-op room so players can jump right in or create their own
const seedRoomId = 'ROOM_ESTATE_01';
rooms.set(seedRoomId, {
  id: seedRoomId,
  code: 'XMAS17',
  name: 'Blackwood Estate Co-op Vigil',
  isPrivate: false,
  hostUsername: 'Clara Vance',
  level: 1,
  district: 'christmas_estate',
  players: new Map(),
  sharedObjectives: {},
  chatHistory: [
    {
      id: 'sys_1',
      sender: 'System',
      text: 'Welcome to Blackwood Estate Co-op. Remember: if one nanny triggers The Devil\'s Gaze, surviving partners can keep investigating.',
      time: '00:00',
      system: true,
    },
  ],
  createdAt: Date.now(),
});

function serializeRoom(room: MultiplayerRoom) {
  return {
    id: room.id,
    code: room.code,
    name: room.name,
    isPrivate: room.isPrivate,
    hostUsername: room.hostUsername,
    level: room.level,
    district: room.district,
    playerCount: room.players.size,
    players: Array.from(room.players.values()),
    sharedObjectives: room.sharedObjectives,
    chatHistory: room.chatHistory.slice(-40),
  };
}

function broadcastRoom(roomId: string, payload: unknown, exclude?: WebSocket): void {
  const serialized = JSON.stringify(payload);
  for (const [ws, meta] of wsClients.entries()) {
    if (meta.roomId === roomId && ws !== exclude && ws.readyState === WebSocket.OPEN) {
      ws.send(serialized);
    }
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, title: 'Habby Christmas', rooms: rooms.size });
  });

  app.post('/api/auth/register', (req, res) => {
    const username = String(req.body?.username || '').trim();
    const password = String(req.body?.password || '');
    if (username.length < 3 || password.length < 4) {
      res.status(400).json({ error: 'Username (min 3 chars) and password (min 4 chars) are required.' });
      return;
    }
    const key = username.toLowerCase();
    if (store.users[key]) {
      res.status(409).json({ error: 'An account with that name already exists.' });
      return;
    }
    store.users[key] = {
      username,
      passwordHash: hashPassword(password),
      isGuest: false,
      saveData: req.body?.saveData || { username, isGuest: false },
      updatedAt: new Date().toISOString(),
    };
    saveStore(store);
    res.json({ username, isGuest: false, saveData: store.users[key].saveData });
  });

  app.post('/api/auth/login', (req, res) => {
    const username = String(req.body?.username || '').trim();
    const password = String(req.body?.password || '');
    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required.' });
      return;
    }
    const key = username.toLowerCase();
    const user = store.users[key];
    if (!user || (user.passwordHash && user.passwordHash !== hashPassword(password))) {
      res.status(401).json({ error: 'Invalid credentials.' });
      return;
    }
    res.json({ username: user.username, isGuest: user.isGuest, saveData: user.saveData });
  });

  app.post('/api/auth/guest', (req, res) => {
    const guestNum = Math.floor(1000 + Math.random() * 9000);
    const username = String(req.body?.username || `Guest Nanny #${guestNum}`).trim();
    res.json({ username, isGuest: true });
  });

  app.post('/api/save', (req, res) => {
    const username = String(req.body?.username || '').trim();
    const saveData = req.body?.saveData;
    if (!username || !saveData) {
      res.status(400).json({ error: 'Missing username or saveData.' });
      return;
    }
    const key = username.toLowerCase();
    const existing = store.users[key];
    store.users[key] = {
      username,
      passwordHash: existing?.passwordHash || '',
      isGuest: Boolean(saveData.isGuest),
      saveData,
      updatedAt: new Date().toISOString(),
    };
    saveStore(store);
    res.json({ saved: true, updatedAt: store.users[key].updatedAt });
  });

  app.get('/api/save/:username', (req, res) => {
    const key = String(req.params.username || '').toLowerCase();
    const user = store.users[key];
    if (!user) {
      res.status(404).json({ error: 'Profile not found.' });
      return;
    }
    res.json({ username: user.username, saveData: user.saveData });
  });

  app.get('/api/rooms', (_req, res) => {
    const list = Array.from(rooms.values())
      .filter((r) => !r.isPrivate)
      .map(serializeRoom);
    res.json({ rooms: list });
  });

  app.post('/api/rooms', (req, res) => {
    const name = String(req.body?.name || 'Midnight Investigation').trim().slice(0, 48);
    const hostUsername = String(req.body?.hostUsername || 'Nanny Guest').trim();
    const isPrivate = Boolean(req.body?.isPrivate);
    const level = Math.max(1, Math.min(100, Number(req.body?.level || 1)));
    const district = String(req.body?.district || 'christmas_estate');

    const id = `ROOM_${Date.now().toString(36).toUpperCase()}`;
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();

    const room: MultiplayerRoom = {
      id,
      code,
      name,
      isPrivate,
      hostUsername,
      level,
      district,
      players: new Map(),
      sharedObjectives: {},
      chatHistory: [
        {
          id: `sys_${Date.now()}`,
          sender: 'System',
          text: `${hostUsername} opened ${isPrivate ? 'a private' : 'a public'} co-op session for Level ${level}.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          system: true,
        },
      ],
      createdAt: Date.now(),
    };
    rooms.set(id, room);
    res.json({ room: serializeRoom(room) });
  });

  app.get('/api/rooms/by-code/:code', (req, res) => {
    const code = String(req.params.code || '').trim().toUpperCase();
    const found = Array.from(rooms.values()).find((r) => r.code === code);
    if (!found) {
      res.status(404).json({ error: 'Room code not found.' });
      return;
    }
    res.json({ room: serializeRoom(found) });
  });

  app.get('/api/leaderboards', (_req, res) => {
    const entries = Object.values(store.users)
      .map((u) => {
        const s = u.saveData as Record<string, unknown>;
        return {
          username: u.username,
          score: Number(s?.score || 0),
          highestLevel: Number(s?.highestLevelUnlocked || 1),
          achievementsCount: Array.isArray(s?.unlockedAchievements) ? s.unlockedAchievements.length : 0,
        };
      })
      .sort((a, b) => b.score - a.score || b.highestLevel - a.highestLevel)
      .slice(0, 20);
    res.json({ leaderboards: entries });
  });

  app.get('/api/exchange', (_req, res) => {
    res.json({ exchanges: store.exchanges.slice(-20).reverse() });
  });

  app.post('/api/exchange', (req, res) => {
    const from = String(req.body?.from || 'Nanny').trim();
    const clueId = String(req.body?.clueId || '').trim();
    const clueTitle = String(req.body?.clueTitle || '').trim();
    const message = sanitizeChat(String(req.body?.message || 'Shared an estate clue.'));
    if (!clueId || !clueTitle) {
      res.status(400).json({ error: 'Clue selection is required.' });
      return;
    }
    const item = {
      id: `ex_${Date.now()}`,
      from,
      clueId,
      clueTitle,
      message,
      createdAt: new Date().toISOString(),
    };
    store.exchanges.push(item);
    saveStore(store);
    res.json({ exchange: item });
  });

  app.post('/api/report', (req, res) => {
    const reporter = String(req.body?.reporter || 'Anonymous').trim();
    const target = String(req.body?.target || '').trim();
    const reason = sanitizeChat(String(req.body?.reason || 'Unsportsmanlike behavior'));
    if (!target) {
      res.status(400).json({ error: 'Target player name is required.' });
      return;
    }
    const report = {
      id: `rep_${Date.now()}`,
      reporter,
      target,
      reason,
      createdAt: new Date().toISOString(),
    };
    store.reports.push(report);
    saveStore(store);
    res.json({ submitted: true, reportId: report.id });
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    try {
      const pathname = new URL(req.url || '/', 'http://localhost').pathname;
      if (pathname === '/ws') {
        wss.handleUpgrade(req, socket, head, (ws) => {
          wss.emit('connection', ws, req);
        });
      }
    } catch {
      socket.destroy();
    }
  });

  wss.on('connection', (ws) => {
    const clientId = `c_${Math.random().toString(36).slice(2, 10)}`;
    wsClients.set(ws, { clientId, roomId: null, username: 'Nanny' });

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(String(raw)) as Record<string, unknown>;
        const meta = wsClients.get(ws);
        if (!meta) return;

        if (msg.type === 'room:join') {
          const roomId = String(msg.roomId || seedRoomId);
          const room = rooms.get(roomId) || rooms.get(seedRoomId);
          if (!room) return;

          if (meta.roomId && rooms.has(meta.roomId)) {
            const old = rooms.get(meta.roomId)!;
            old.players.delete(meta.clientId);
            broadcastRoom(old.id, { type: 'room:state', room: serializeRoom(old) });
          }

          const username = String(msg.username || 'Nanny Guest').slice(0, 30);
          meta.roomId = room.id;
          meta.username = username;

          room.players.set(meta.clientId, {
            id: meta.clientId,
            username,
            outfit: String(msg.outfit || 'classic_nanny'),
            x: 0,
            y: 0,
            z: 6,
            yaw: 0,
            cameraMode: 'third-person',
            isHiding: false,
            hidingSpotLabel: '',
            gazeFailed: false,
          });

          ws.send(JSON.stringify({ type: 'room:joined', clientId: meta.clientId, room: serializeRoom(room) }));
          broadcastRoom(room.id, { type: 'room:state', room: serializeRoom(room) }, ws);
        } else if (msg.type === 'player:move' && meta.roomId) {
          const room = rooms.get(meta.roomId);
          const p = room?.players.get(meta.clientId);
          if (room && p) {
            p.x = Number(msg.x || 0);
            p.y = Number(msg.y || 0);
            p.z = Number(msg.z || 0);
            p.yaw = Number(msg.yaw || 0);
            p.cameraMode = 'third-person';
            p.isHiding = Boolean(msg.isHiding);
            p.hidingSpotLabel = String(msg.hidingSpotLabel || '').slice(0, 48);
            broadcastRoom(room.id, { type: 'player:moved', player: p }, ws);
          }
        } else if (msg.type === 'chat:send' && meta.roomId) {
          const room = rooms.get(meta.roomId);
          const text = sanitizeChat(String(msg.text || ''));
          if (room && text) {
            const entry = {
              id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              sender: meta.username,
              text,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };
            room.chatHistory.push(entry);
            broadcastRoom(room.id, { type: 'chat:message', entry });
          }
        } else if (msg.type === 'mission:objective' && meta.roomId) {
          const room = rooms.get(meta.roomId);
          const objId = String(msg.objectiveId || '');
          if (room && objId) {
            room.sharedObjectives[objId] = true;
            broadcastRoom(room.id, { type: 'mission:sync', sharedObjectives: room.sharedObjectives, by: meta.username });
          }
        } else if (msg.type === 'gaze:triggered' && meta.roomId) {
          const room = rooms.get(meta.roomId);
          const p = room?.players.get(meta.clientId);
          if (room && p) {
            p.gazeFailed = true;
            const entry = {
              id: `sys_${Date.now()}`,
              sender: 'System',
              text: `${meta.username} fell to THE DEVIL'S GAZE! Remaining nannies must survive.`,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              system: true,
            };
            room.chatHistory.push(entry);
            broadcastRoom(room.id, { type: 'chat:message', entry });
            broadcastRoom(room.id, { type: 'room:state', room: serializeRoom(room) });
          }
        } else if (msg.type === 'room:leave' && meta.roomId) {
          const room = rooms.get(meta.roomId);
          if (room) {
            room.players.delete(meta.clientId);
            broadcastRoom(room.id, { type: 'room:state', room: serializeRoom(room) });
          }
          meta.roomId = null;
        }
      } catch {
        // Ignore malformed socket frames
      }
    });

    ws.on('close', () => {
      const meta = wsClients.get(ws);
      if (meta?.roomId && rooms.has(meta.roomId)) {
        const room = rooms.get(meta.roomId)!;
        room.players.delete(meta.clientId);
        broadcastRoom(room.id, { type: 'room:state', room: serializeRoom(room) });
      }
      wsClients.delete(ws);
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const viteModule = await import('vite');
    const vite = await viteModule.createServer({
      server: {
        middlewareMode: true,
        hmr: false,
        allowedHosts: true,
        ws: { server, path: '/__vite_ws' },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Habby Christmas server listening on http://localhost:${PORT}`);
  });
}

startServer();
