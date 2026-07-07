import { WebSocketServer } from 'ws';
import type { IncomingMessage } from 'http';
import type { Duplex } from 'stream';
import { GameRoom } from './room';
import { logger } from '../lib/logger';

// Valid character keys — must stay in sync with data/characters.ts
const VALID_CHARACTERS = new Set([
  'denis','anya','vova','dyadya','petrovich',
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
const rooms = new Map<string, GameRoom>();

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
    if (myRoom && myPlayerId) {
      myRoom.removeClient(myPlayerId);
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

      case 'start': {
        if (!myRoom || !myPlayerId) { send({ type: 'error', message: 'Не в комнате' }); return; }
        if (myPlayerId !== myRoom.hostPlayerId) { send({ type: 'error', message: 'Только хост может начать' }); return; }
        if (myRoom.clients.size < 1) { send({ type: 'error', message: 'Нужно хотя бы 2 игрока' }); return; }
        myRoom.startGame();
        logger.info({ roomCode: myRoom.roomCode }, 'Game started');
        break;
      }

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

      case 'action': {
        if (!myRoom || !myPlayerId) return;
        const actionType = String(msg['action'] ?? '');
        const payload = (msg['payload'] as Record<string, unknown>) ?? {};
        myRoom.handleAction(myPlayerId, actionType, payload);
        break;
      }

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
