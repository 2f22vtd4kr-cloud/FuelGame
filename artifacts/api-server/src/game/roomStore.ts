/**
 * Redis-backed room persistence.
 * Serialises the non-WS parts of a GameRoom so they survive server restarts.
 */

import type { GameState } from './types';
import { getRedis } from '../lib/redis';
import { logger } from '../lib/logger';

export const ROOM_TTL_SECONDS = 60 * 60 * 2; // 2 hours
const ROOM_KEY_PREFIX = 'room:';
const ROOM_SCAN_PATTERN = `${ROOM_KEY_PREFIX}*`;

export interface PersistedPlayerMeta {
  playerId: string;
  character: string;
  playerName: string;
  isHost: boolean;
}

export interface PersistedRoom {
  roomCode: string;
  hostPlayerId: string;
  settings: { numPlayers: number; numSlivshchiki: number };
  isQuickPlay: boolean;
  gameStarted: boolean;
  playerMeta: PersistedPlayerMeta[];
  gameState: GameState;
  savedAt: number;
}

function roomKey(code: string): string {
  return `${ROOM_KEY_PREFIX}${code}`;
}

/** Save a room snapshot to Redis (fire-and-forget; errors are logged but not thrown). */
export async function saveRoom(data: PersistedRoom): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.set(roomKey(data.roomCode), JSON.stringify(data), 'EX', ROOM_TTL_SECONDS);
  } catch (err) {
    logger.warn({ err, roomCode: data.roomCode }, 'saveRoom failed');
  }
}

/** Load a single room by code. Returns null if not found or Redis is unavailable. */
export async function loadRoom(code: string): Promise<PersistedRoom | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    const raw = await redis.get(roomKey(code));
    if (!raw) return null;
    return JSON.parse(raw) as PersistedRoom;
  } catch (err) {
    logger.warn({ err, code }, 'loadRoom failed');
    return null;
  }
}

/** Load all persisted rooms (called on startup to restore state). */
export async function loadAllRooms(): Promise<PersistedRoom[]> {
  const redis = getRedis();
  if (!redis) return [];
  try {
    const keys: string[] = [];
    let cursor = '0';
    do {
      const [nextCursor, batch] = await redis.scan(cursor, 'MATCH', ROOM_SCAN_PATTERN, 'COUNT', 100);
      cursor = nextCursor;
      keys.push(...batch);
    } while (cursor !== '0');

    if (keys.length === 0) return [];

    const values = await redis.mget(...keys);
    const rooms: PersistedRoom[] = [];
    for (const v of values) {
      if (v) {
        try {
          rooms.push(JSON.parse(v) as PersistedRoom);
        } catch { /* skip corrupt entry */ }
      }
    }
    return rooms;
  } catch (err) {
    logger.warn({ err }, 'loadAllRooms failed');
    return [];
  }
}

/** Delete a room from Redis (when the room is destroyed). */
export async function deleteRoom(code: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.del(roomKey(code));
  } catch (err) {
    logger.warn({ err, code }, 'deleteRoom failed');
  }
}
