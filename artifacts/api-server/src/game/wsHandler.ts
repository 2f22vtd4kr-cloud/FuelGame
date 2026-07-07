import { WebSocketServer } from 'ws';
import type { WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import type { Duplex } from 'stream';
import { GameRoom } from './room';
import { logger } from '../lib/logger';
import { loadAllRooms } from './roomStore';

// Valid character keys — must stay in sync with data/characters.ts
const VALID_CHARACTERS = new Set([
  'denis','anya','vova','uncle_seryozha','petrovich',
  'marina','ahmet','oleg','lena','barsik',
]);

function sanitizeCharacter(raw: unknown): string {
  return VALID_CHARACTERS.has(String(raw)) ? String(raw) : 'denis';
}

function clamp(val: unknown, min: number, max: number, fallback: number): number {
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function sanitizePlayerName(raw: unknown): string {
  return String(raw ?? '').slice(0, 20).trim() || 'Игрок';
}

const wss = new WebSocketServer({ noServer: true });
export const rooms = new Map<string, GameRoom>();

function generateRoomCode(): string {
  // Unambiguous characters only (no 0/O, 1/I/L)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function uniqueRoomCode(): string {
  let code = generateRoomCode();
  let tries = 0;
  while (rooms.has(code) && tries++ < 100) code = generateRoomCode();
  return code;
}

function newPlayerId(): string {
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

// ── §5.5 Matchmaking queue ─────────────────────────────────────────────────

interface QueueEntry {
  ws: WebSocket;
  playerId: string;
  character: string;
  playerName: string;
}

const matchmakingQueue: QueueEntry[] = [];

/** How many players trigger a Quick Play match. */
const QUICK_MATCH_SIZE = 4;

/** Send current queue depth to everyone waiting. */
function broadcastQueueStatus(): void {
  const msg = JSON.stringify({
    type: 'queue_update',
    count: matchmakingQueue.length,
    total: QUICK_MATCH_SIZE,
  });
  for (const entry of matchmakingQueue) {
    if ((entry.ws.readyState as number) === 1) entry.ws.send(msg);
  }
}

/**
 * If QUICK_MATCH_SIZE or more players are waiting, pluck the first batch,
 * create an auto-starting GameRoom, and send each player their join confirmation.
 */
function tryFlushQueue(): void {
  while (matchmakingQueue.length >= QUICK_MATCH_SIZE) {
    const matched = matchmakingQueue.splice(0, QUICK_MATCH_SIZE);
    const roomCode = uniqueRoomCode();
    const hostEntry = matched[0];

    const room = new GameRoom(
      roomCode,
      hostEntry.playerId,
      { numPlayers: 6, numSlivshchiki: 2 },
      true, // isQuickPlay
    );
    rooms.set(roomCode, room);

    for (const entry of matched) {
      room.addClient({
        ws: entry.ws,
        playerId: entry.playerId,
        character: entry.character,
        playerName: entry.playerName,
      });
      // Tell each matched player their room code + ID.
      if ((entry.ws.readyState as number) === 1) {
        entry.ws.send(JSON.stringify({
          type: 'room_joined',
          roomCode,
          playerId: entry.playerId,
          isQuickPlay: true,
        }));
      }
    }

    logger.info({ roomCode, players: matched.map(e => e.playerName) }, 'Quick Play match created');

    // Notify remaining queued players of updated count (if any left)
    broadcastQueueStatus();
  }
}

// ── Startup: restore persisted rooms from Redis ─────────────────────────────

export async function restoreRoomsFromRedis(): Promise<void> {
  try {
    const persisted = await loadAllRooms();
    let restored = 0;
    for (const data of persisted) {
      // Skip rooms older than 2h or whose code already exists
      if (rooms.has(data.roomCode)) continue;
      const ageMs = Date.now() - data.savedAt;
      if (ageMs > 2 * 60 * 60 * 1000) continue;

      const room = GameRoom.fromPersisted(data);
      rooms.set(data.roomCode, room);
      restored++;
    }
    if (restored > 0) {
      logger.info({ restored }, 'Restored rooms from Redis');
    }
  } catch (err) {
    logger.warn({ err }, 'Failed to restore rooms from Redis');
  }
}

/** Called from index.ts on the server 'upgrade' event. */
export function handleWsUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer): void {
  wss.handleUpgrade(req, socket as import('net').Socket, head, (ws) => {
    wss.emit('connection', ws, req);
  });
}

wss.on('connection', (ws) => {
  let myRoom: GameRoom | null = null;
  let myPlayerId: string | null = null;

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString()) as Record<string, unknown>;
      handleMsg(msg);
    } catch {
      send({ type: 'error', message: 'Invalid JSON' });
    }
  });

  ws.on('close', () => {
    // Remove from matchmaking queue if present
    const qIdx = matchmakingQueue.findIndex(e => e.ws === ws);
    if (qIdx >= 0) {
      matchmakingQueue.splice(qIdx, 1);
      broadcastQueueStatus();
      logger.info({ playerId: myPlayerId }, 'Player left matchmaking queue');
    }

    if (myRoom && myPlayerId) {
      // Pass `ws` so removeClient can skip the removal if a reconnect has
      // already replaced this socket with a new one (prevents the old close
      // event from evicting the freshly reconnected client).
      myRoom.removeClient(myPlayerId, ws);
      if (myRoom.isEmpty) {
        rooms.delete(myRoom.roomCode);
        logger.info({ roomCode: myRoom.roomCode }, 'Room destroyed (empty)');
      }
    }
  });

  ws.on('error', (err) => {
    logger.error({ err }, 'WebSocket error');
  });

  function send(msg: object): void {
    if ((ws.readyState as number) === 1) ws.send(JSON.stringify(msg));
  }

  function handleMsg(msg: Record<string, unknown>): void {
    switch (msg['type']) {

      // ── Custom room: host creates ────────────────────────────────────────
      case 'create': {
        const roomCode = uniqueRoomCode();
        const playerId = newPlayerId();
        const numPlayers = clamp(msg['numPlayers'], 2, 10, 6);
        const numSlivshchiki = clamp(msg['numSlivshchiki'], 1, Math.floor((numPlayers - 1) / 2), 2);
        const room = new GameRoom(roomCode, playerId, { numPlayers, numSlivshchiki });
        rooms.set(roomCode, room);
        myRoom = room;
        myPlayerId = playerId;
        room.addClient({
          ws,
          playerId,
          character: sanitizeCharacter(msg['character']),
          playerName: sanitizePlayerName(msg['playerName']),
        });
        send({ type: 'room_created', roomCode, playerId });
        logger.info({ roomCode, playerId }, 'Room created');
        break;
      }

      // ── Custom room: player joins by code ────────────────────────────────
      case 'join': {
        const rawCode = String(msg['roomCode'] ?? '').toUpperCase().slice(0, 4);
        const room = rooms.get(rawCode);
        if (!room) { send({ type: 'error', message: 'Комната не найдена' }); return; }
        if (room.gameStarted) { send({ type: 'error', message: 'Игра уже началась' }); return; }
        const playerId = newPlayerId();
        myRoom = room;
        myPlayerId = playerId;
        room.addClient({
          ws,
          playerId,
          character: sanitizeCharacter(msg['character']),
          playerName: sanitizePlayerName(msg['playerName']),
        });
        send({ type: 'room_joined', roomCode: rawCode, playerId });
        logger.info({ roomCode: rawCode, playerId }, 'Player joined room');
        break;
      }

      // ── Reconnect after server restart ───────────────────────────────────
      case 'reconnect': {
        const rawCode = String(msg['roomCode'] ?? '').toUpperCase().slice(0, 4);
        const requestedId = String(msg['playerId'] ?? '');
        const room = rooms.get(rawCode);

        if (!room) {
          send({ type: 'error', message: 'Комната не найдена (возможно, истекла)' });
          return;
        }

        // Security: only allow a playerId that was previously a known member of
        // this room. This prevents strangers from claiming another player's ID.
        if (!room.knownPlayerIds.has(requestedId)) {
          send({ type: 'error', message: 'Неверный идентификатор игрока' });
          return;
        }

        const playerId = requestedId;
        myRoom = room;
        myPlayerId = playerId;

        room.addClient({
          ws,
          playerId,
          character: sanitizeCharacter(msg['character']),
          playerName: sanitizePlayerName(msg['playerName']),
        });

        if (room.gameStarted) {
          // Game is already in progress — send game_started so client transitions
          send({ type: 'game_started', yourPlayerId: playerId, reconnected: true });
          // Immediately push the current state
          send({ type: 'state', gs: room.state });
        } else {
          send({ type: 'room_joined', roomCode: rawCode, playerId, reconnected: true });
        }

        logger.info({ roomCode: rawCode, playerId, reconnected: true }, 'Player reconnected');
        break;
      }

      // ── §5.5 Quick Play: join matchmaking queue ──────────────────────────
      case 'quick_join': {
        if (myRoom) { send({ type: 'error', message: 'Уже в комнате' }); return; }

        // Remove any stale entry for this socket (e.g. double-click)
        const staleIdx = matchmakingQueue.findIndex(e => e.ws === ws);
        if (staleIdx >= 0) matchmakingQueue.splice(staleIdx, 1);

        const playerId = newPlayerId();
        myPlayerId = playerId;

        matchmakingQueue.push({
          ws,
          playerId,
          character: sanitizeCharacter(msg['character']),
          playerName: sanitizePlayerName(msg['playerName']),
        });

        logger.info({ playerId, queueLength: matchmakingQueue.length }, 'Player joined queue');

        // Immediately tell the client their position
        broadcastQueueStatus();

        // Check if we now have enough to start a match
        tryFlushQueue();

        // Wire myRoom for disconnect cleanup once the match fires
        for (const [, room] of rooms) {
          if (room.clients.has(myPlayerId)) {
            myRoom = room;
            break;
          }
        }

        break;
      }

      // ── Leave matchmaking queue ──────────────────────────────────────────
      case 'leave_queue': {
        const idx = matchmakingQueue.findIndex(e => e.ws === ws);
        if (idx >= 0) {
          matchmakingQueue.splice(idx, 1);
          broadcastQueueStatus();
          logger.info({ playerId: myPlayerId }, 'Player left queue voluntarily');
        }
        myPlayerId = null;
        break;
      }

      // ── Host starts custom room ──────────────────────────────────────────
      case 'start': {
        if (!myRoom || !myPlayerId) { send({ type: 'error', message: 'Не в комнате' }); return; }
        if (myPlayerId !== myRoom.hostPlayerId) { send({ type: 'error', message: 'Только хост может начать' }); return; }
        if (myRoom.clients.size < 2) { send({ type: 'error', message: 'Нужно хотя бы 2 игрока' }); return; }
        myRoom.startGame();
        logger.info({ roomCode: myRoom.roomCode }, 'Game started');
        break;
      }

      // ── Player input (movement, interact, etc.) ──────────────────────────
      case 'input': {
        if (!myRoom || !myPlayerId) return;
        myRoom.inputs.set(myPlayerId, {
          dx: Number(msg['dx']) || 0,
          dy: Number(msg['dy']) || 0,
          interact: Boolean(msg['interact']),
          prevInteract: Boolean(msg['prevInteract']),
          sprint: Boolean(msg['sprint']),
          crouch: Boolean(msg['crouch']),
          emoteIndex: msg['emoteIndex'] != null ? Number(msg['emoteIndex']) : null,
        });
        break;
      }

      // ── Discrete game action ─────────────────────────────────────────────
      case 'action': {
        if (!myRoom || !myPlayerId) return;
        const actionType = String(msg['action'] ?? '');
        const payload = (msg['payload'] as Record<string, unknown>) ?? {};
        myRoom.handleAction(myPlayerId, actionType, payload);
        break;
      }

      // ── Vote shorthand ───────────────────────────────────────────────────
      case 'vote': {
        if (!myRoom || !myPlayerId) return;
        myRoom.handleAction(myPlayerId, 'vote', { targetId: msg['targetId'] ?? null });
        break;
      }

      default:
        break;
    }
  }
});
