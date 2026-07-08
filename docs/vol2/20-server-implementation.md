## SECTION 20: SERVER IMPLEMENTATION GUIDE  
  
### 20.1 — Server Architecture  
  
```  
┌─────────────────────────────────────────────────┐  
│                  Cloudflare                       │  
│         (CDN, DDoS protection, TLS)               │  
└────────────────────┬────────────────────────────┘  
                     │  
         ┌───────────┴───────────┐  
         │    Hetzner VPS (CX22)  │  
         │    2 vCPU, 4GB RAM     │  
         │                       │  
         │  ┌─────────────────┐  │  
         │  │  Nginx (Reverse │  │  
         │  │     Proxy, TLS) │  │  
         │  └────────┬────────┘  │  
         │           │           │  
         │  ┌────────┴────────┐  │  
         │  │  Node.js Server │  │  
         │  │  (Express + ws) │  │  
         │  │                 │  │  
         │  │  ┌───────────┐  │  │  
         │  │  │ HTTP API  │  │  │  
         │  │  │ (auth,    │  │  │  
         │  │  │  inventory,│  │  │  
         │  │  │  leaderbd) │  │  │  
         │  │  └───────────┘  │  │  
         │  │                 │  │  
         │  │  ┌───────────┐  │  │  
         │  │  │ WS Server │  │  │  
         │  │  │ (game     │  │  │  
         │  │  │  rooms,   │  │  │  
         │  │  │  real-time│  │  │  
         │  │  │  sync)    │  │  │  
         │  │  └───────────┘  │  │  
         │  └─────────────────┘  │  
         │                       │  
         │  ┌────────┬────────┐  │  
         │  │Postgres│ Redis  │  │  
         │  │ (data) │(cache) │  │  
         │  └────────┴────────┘  │  
         └───────────────────────┘  
```  
  
### 20.2 — Server Entry Point  
  
```typescript  
// server/src/index.ts  
import express from 'express';  
import http from 'http';  
import { WebSocketServer } from 'ws';  
import { Pool } from 'pg';  
import Redis from 'ioredis';  
import { authRoutes } from './routes/auth';  
import { inventoryRoutes } from './routes/inventory';  
import { leaderboardRoutes } from './routes/leaderboard';  
import { handleWebSocket } from './ws/handler';  
  
const app = express();  
const server = http.createServer(app);  
const wss = new WebSocketServer({ server, path: '/ws' });  
  
// Database  
export const pg = new Pool({  
  connectionString: process.env.DATABASE_URL,  
  max: 10,  
});  
  
// Cache  
export const redis = new Redis(process.env.REDIS_URL);  
  
// Middleware  
app.use(express.json());  
app.use(cors({ origin: '*' }));  // Telegram WebView needs CORS  
app.use(authMiddleware);  // Validates Telegram initData  
  
// HTTP Routes  
app.use('/api/auth', authRoutes);  
app.use('/api/inventory', inventoryRoutes);  
app.use('/api/leaderboard', leaderboardRoutes);  
app.use('/api/match', matchRoutes);  // Match history, stats  
  
// Static files (frontend)  
app.use(express.static('../web/dist'));  
  
// WebSocket  
wss.on('connection', (ws, req) => {  
  handleWebSocket(ws, req);  
});  
  
// Health check  
app.get('/health', (req, res) => {  
  res.json({ status: 'ok', uptime: process.uptime() });  
});  
  
const PORT = process.env.PORT || 8080;  
server.listen(PORT, () => {  
  console.log(`Server running on port ${PORT}`);  
});  
```  
  
### 20.3 — WebSocket Handler  
  
```typescript  
// server/src/ws/handler.ts  
import { WebSocket } from 'ws';  
import { RoomManager } from './roomManager';  
  
const roomManager = new RoomManager();  
  
export function handleWebSocket(ws: WebSocket, req: any) {  
  // Authenticate via URL param (Telegram initData)  
  const url = new URL(req.url!, `http://${req.headers.host}`);  
  const initData = url.searchParams.get('initData');  
  const user = validateTelegramInitData(initData);  
    
  if (!user) {  
    ws.close(4001, 'Invalid auth');  
    return;  
  }  
    
  ws.on('message', (data) => {  
    try {  
      const packet = decodePacket(data);  
      handlePacket(ws, user, packet);  
    } catch (e) {  
      console.error('Packet error:', e);  
    }  
  });  
    
  ws.on('close', () => {  
    roomManager.handleDisconnect(user.id);  
  });  
    
  ws.on('error', (e) => {  
    console.error('WS error:', e);  
  });  
}  
  
function handlePacket(ws: WebSocket, user: User, packet: ClientPacket) {  
  switch (packet.t) {  
    case 'join_room':  
      roomManager.joinRoom(ws, user, packet.roomCode);  
      break;  
    case 'create_room':  
      roomManager.createRoom(ws, user);  
      break;  
    case 'start_match':  
      roomManager.startMatch(user.id);  
      break;  
    case 'move':  
      roomManager.playerMove(user.id, packet.x, packet.y, packet.a, packet.s);  
      break;  
    case 'interact':  
      roomManager.playerInteract(user.id, packet.target, packet.action);  
      break;  
    case 'siphon':  
      roomManager.playerSiphon(user.id, packet.car, packet.hold);  
      break;  
    case 'meeting':  
      roomManager.callMeeting(user.id, packet.reason, packet.target);  
      break;  
    case 'vote':  
      roomManager.playerVote(user.id, packet.target);  
      break;  
    case 'chat':  
      roomManager.playerChat(user.id, packet.msg);  
      break;  
    case 'sabotage':  
      roomManager.playerSabotage(user.id, packet.s);  
      break;  
    case 'leave_room':  
      roomManager.leaveRoom(user.id);  
      break;  
  }  
}  
```  
  
### 20.4 — Room Manager  
  
```typescript  
// server/src/ws/roomManager.ts  
import { WebSocket } from 'ws';  
import { GameState, simulateTick } from '../game/state';  
  
interface Room {  
  code: string;  
  hostId: bigint;  
  players: Map<bigint, { ws: WebSocket; user: User; ready: boolean }>;  
  gameState: GameState | null;  
  phase: 'lobby' | 'briefing' | 'play' | 'meeting' | 'resolution' | 'finished';  
  createdAt: number;  
}  
  
class RoomManager {  
  private rooms: Map<string, Room> = new Map();  
  private playerRoom: Map<bigint, string> = new Map();  
  private tickInterval: NodeJS.Timeout | null = null;  
    
  constructor() {  
    // Game loop: tick all active rooms at 20Hz  
    this.tickInterval = setInterval(() => this.tickAll(), 50);  
  }  
    
  createRoom(ws: WebSocket, user: User) {  
    const code = generateRoomCode();  
    const room: Room = {  
      code,  
      hostId: user.id,  
      players: new Map([[user.id, { ws, user, ready: false }]]),  
      gameState: null,  
      phase: 'lobby',  
      createdAt: Date.now(),  
    };  
    this.rooms.set(code, room);  
    this.playerRoom.set(user.id, code);  
      
    this.broadcast(room, { t: 'room_created', code });  
    this.broadcastLobbyState(room);  
  }  
    
  joinRoom(ws: WebSocket, user: User, code: string) {  
    const room = this.rooms.get(code);  
    if (!room) {  
      this.send(ws, { t: 'error', msg: 'Комната не найдена' });  
      return;  
    }  
    if (room.phase !== 'lobby') {  
      this.send(ws, { t: 'error', msg: 'Игра уже началась' });  
      return;  
    }  
    if (room.players.size >= 8) {  
      this.send(ws, { t: 'error', msg: 'Комната полная' });  
      return;  
    }  
      
    room.players.set(user.id, { ws, user, ready: false });  
    this.playerRoom.set(user.id, code);  
      
    this.broadcastLobbyState(room);  
  }  
    
  startMatch(hostId: bigint) {  
    const code = this.playerRoom.get(hostId);  
    const room = code ? this.rooms.get(code) : null;  
    if (!room || room.hostId !== hostId) return;  
    if (room.players.size < 4) {  
      this.broadcast(room, { t: 'error', msg: 'Нужно минимум 4 игрока' });  
      return;  
    }  
      
    // Create game state with role assignment  
    room.gameState = createGameState(Array.from(room.players.values()).map(p => p.user));  
    room.phase = 'briefing';  
      
    // Send role assignments privately  
    for (const [playerId, { ws }] of room.players) {  
      const role = room.gameState.players.find(p => p.id === playerId)?.role;  
      this.send(ws, { t: 'role', role });  
    }  
      
    // 5-second briefing  
    setTimeout(() => {  
      room.phase = 'play';  
      this.broadcast(room, { t: 'phase', phase: 'play' });  
    }, 5000);  
  }  
    
  private tickAll() {  
    for (const room of this.rooms.values()) {  
      if (room.phase === 'play' || room.phase === 'meeting') {  
        simulateTick(room.gameState, 0.05);  // 50ms = 0.05s  
        this.broadcastState(room);  
          
        // Check win conditions  
        const winner = checkWinCondition(room.gameState);  
        if (winner) {  
          this.endMatch(room, winner);  
        }  
      }  
    }  
  }  
    
  private broadcastState(room: Room) {  
    const state = serializeGameState(room.gameState);  
    for (const { ws } of room.players.values()) {  
      if (ws.readyState === WebSocket.OPEN) {  
        this.send(ws, { t: 'state', ...state });  
      }  
    }  
  }  
    
  handleDisconnect(playerId: bigint) {  
    const code = this.playerRoom.get(playerId);  
    if (!code) return;  
    const room = this.rooms.get(code);  
    if (!room) return;  
      
    if (room.phase === 'lobby') {  
      // Remove from lobby  
      room.players.delete(playerId);  
      this.playerRoom.delete(playerId);  
      this.broadcastLobbyState(room);  
      if (room.players.size === 0) {  
        this.rooms.delete(code);  
      }  
    } else if (room.phase === 'play') {  
      // Mark as disconnected, AI takes over  
      const player = room.gameState?.players.find(p => p.id === playerId);  
      if (player) {  
        player.isDisconnected = true;  
        player.aiControlled = true;  
      }  
      // Reconnection window: 60 seconds  
      setTimeout(() => {  
        if (room.gameState?.players.find(p => p.id === playerId)?.isDisconnected) {  
          // Permanently AI  
        }  
      }, 60000);  
    }  
  }  
    
  // ... (move, interact, siphon, vote, sabotage handlers)  
}  
```  
  
### 20.5 — Server-Side Game State  
  
```typescript  
// server/src/game/state.ts  
export interface GameState {  
  players: Player[];  
  cars: Car[];  
  tasks: Task[];  
  sabotages: ActiveSabotage[];  
  unityMeter: number;  // 0-100  
  phase: 'play' | 'meeting' | 'resolution';  
  meetingTimer: number | null;  
  matchStartTime: number;  
}  
  
export interface Player {  
  id: bigint;  
  name: string;  
  character: string;  
  role: 'owner' | 'drainer' | 'neutral';  
  neutralType?: 'janitor' | 'police' | 'cat';  
  pos: { x: number; y: number };  
  angle: number;  
  alive: boolean;  
  isSiphoning: boolean;  
  siphonCarId: string | null;  
  isCarryingCanister: boolean;  
  isDisconnected: boolean;  
  aiControlled: boolean;  
  siphonCooldown: number;  
  ambushCooldown: number;  
  suspicion: Map<bigint, number>;  
  assignedTasks: string[];  
  completedTasks: string[];  
  isSprinting: boolean;  
  isCrouching: boolean;  
}  
  
export interface Car {  
  id: string;  
  type: 'moskvich' | 'zeekr' | 'tesla' | 'haval' | 'vesta' | 'yandex_lada';  
  pos: { x: number; y: number };  
  ownerId: bigint | null;  // null = unowned (NPC car)  
  fuel: number;  // 0-100  
  locked: boolean;  // Immunity Ticket active  
  lockTimer: number;  
  drained: boolean;  // fuel reached 0  
}  
  
export function simulateTick(state: GameState, dt: number) {  
  // Update cooldowns  
  for (const p of state.players) {  
    if (p.siphonCooldown > 0) p.siphonCooldown -= dt;  
    if (p.ambushCooldown > 0) p.ambushCooldown -= dt;  
  }  
    
  // Update car locks  
  for (const c of state.cars) {  
    if (c.locked) {  
      c.lockTimer -= dt;  
      if (c.lockTimer <= 0) c.locked = false;  
    }  
  }  
    
  // Update siphoning  
  for (const p of state.players) {  
    if (p.isSiphoning && p.siphonCarId) {  
      const car = state.cars.find(c => c.id === p.siphonCarId);  
      if (car && !car.locked && car.fuel > 0) {  
        car.fuel -= (100 / 7) * dt;  // 7 seconds to drain  
        if (car.fuel <= 0) {  
          car.fuel = 0;  
          car.drained = true;  
          p.isSiphoning = false;  
          p.isCarryingCanister = true;  
          p.siphonCooldown = 15;  
        }  
      } else {  
        // Siphon interrupted (car locked or already empty)  
        p.isSiphoning = false;  
        p.siphonCooldown = 15;  
      }  
    }  
  }  
    
  // Update sabotages  
  for (const s of state.sabotages) {  
    s.timer -= dt;  
    if (s.timer <= 0) {  
      // Resolve or trigger failure  
      resolveSabotage(state, s);  
    }  
  }  
    
  // AI updates (for disconnected players or single-player mode)  
  for (const p of state.players) {  
    if (p.aiControlled && p.alive) {  
      const action = aiTick(p, state, dt);  
      executeAction(p, action, state, dt);  
    }  
  }  
    
  // Check win conditions  
  const winner = checkWinCondition(state);  
  if (winner) {  
    state.phase = 'finished';  
  }  
}  
  
export function checkWinCondition(state: GameState): string | null {  
  // Хозяева win: Unity Meter 100% or all Сливщики dead/ejected  
  if (state.unityMeter >= 100) return 'owners';  
  const aliveDrainers = state.players.filter(p => p.alive && p.role === 'drainer').length;  
  if (aliveDrainers === 0) return 'owners';  
    
  // Сливщики win: all cars drained or Хозяев count <= Сливщики count  
  const allDrained = state.cars.every(c => c.fuel <= 0);  
  if (allDrained) return 'drainers';  
  const aliveOwners = state.players.filter(p => p.alive && p.role === 'owner').length;  
  if (aliveOwners <= aliveDrainers) return 'drainers';  
    
  // Critical sabotage unresolved  
  const criticalSabotage = state.sabotages.find(s => s.critical && s.timer <= 0);  
  if (criticalSabotage) return 'drainers';  
    
  return null;  
}  
```  
  
### 20.6 — Database Migrations  
  
```sql  
-- migration 001_initial.sql  
CREATE TABLE users (  
    telegram_id BIGINT PRIMARY KEY,  
    username VARCHAR(100) NOT NULL,  
    first_name VARCHAR(100),  
    photo_url VARCHAR(500),  
    babki INTEGER DEFAULT 0,  
    stars INTEGER DEFAULT 0,  
    battle_pass_tier INTEGER DEFAULT 0,  
    battle_pass_xp INTEGER DEFAULT 0,  
    battle_pass_premium BOOLEAN DEFAULT FALSE,  
    fuel_bot_linked BOOLEAN DEFAULT FALSE,  
    created_at TIMESTAMP DEFAULT NOW(),  
    last_seen TIMESTAMP DEFAULT NOW()  
);  
  
CREATE TABLE inventory (  
    user_id BIGINT REFERENCES users(telegram_id) ON DELETE CASCADE,  
    item_type VARCHAR(50) NOT NULL,  
    item_id VARCHAR(100) NOT NULL,  
    equipped BOOLEAN DEFAULT FALSE,  
    acquired_at TIMESTAMP DEFAULT NOW(),  
    PRIMARY KEY (user_id, item_type, item_id)  
);  
  
CREATE TABLE match_history (  
    match_id UUID DEFAULT gen_random_uuid(),  
    user_id BIGINT REFERENCES users(telegram_id),  
    role VARCHAR(20) NOT NULL,  
    result VARCHAR(20) NOT NULL,  
    fuel_siphoned INTEGER DEFAULT 0,  
    tasks_completed INTEGER DEFAULT 0,  
    survived_seconds INTEGER,  
    character VARCHAR(50),  
    played_at TIMESTAMP DEFAULT NOW()  
);  
  
CREATE INDEX idx_match_history_user ON match_history (user_id, played_at DESC);  
  
CREATE TABLE daily_leaderboard (  
    date DATE NOT NULL,  
    user_id BIGINT REFERENCES users(telegram_id),  
    score INTEGER NOT NULL,  
    matches_played INTEGER DEFAULT 0,  
    PRIMARY KEY (date, user_id)  
);  
  
CREATE TABLE achievements (  
    user_id BIGINT REFERENCES users(telegram_id) ON DELETE CASCADE,  
    achievement_id VARCHAR(100) NOT NULL,  
    unlocked_at TIMESTAMP DEFAULT NOW(),  
    PRIMARY KEY (user_id, achievement_id)  
);  
  
CREATE TABLE rooms_log (  
    room_code VARCHAR(10),  
    host_id BIGINT,  
    created_at TIMESTAMP DEFAULT NOW(),  
    ended_at TIMESTAMP,  
    player_count INTEGER,  
    winner VARCHAR(20)  
);  
```  
  
---  
  
