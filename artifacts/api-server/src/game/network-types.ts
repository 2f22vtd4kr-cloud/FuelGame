// Shared WebSocket protocol types for server ↔ client communication.

import type { InputState, GameState } from './types';

// ─── Client → Server ────────────────────────────────────────────────────────

export type ClientMsg =
  | { type: 'create'; character: string; playerName: string; numPlayers: number; numSlivshchiki: number }
  | { type: 'join'; roomCode: string; character: string; playerName: string }
  | { type: 'start' }
  | { type: 'input'; dx: number; dy: number; interact: boolean; prevInteract: boolean; sprint: boolean; crouch: boolean; emoteIndex: number | null }
  | { type: 'vote'; targetId: string | null }
  | { type: 'action'; action: 'minigame_tap' | 'minigame_digit' | 'minigame_choice' | 'minigame_taxi_tap' | 'minigame_cancel' | 'minigame_wire_source' | 'minigame_wire_socket' | 'emote'; payload?: Record<string, unknown> };

// ─── Server → Client ────────────────────────────────────────────────────────

export type ServerMsg =
  | { type: 'room_created'; roomCode: string; playerId: string }
  | { type: 'room_joined'; roomCode: string; playerId: string }
  | { type: 'lobby_update'; players: LobbyPlayer[]; roomCode: string; hostId: string }
  | { type: 'game_started'; yourPlayerId: string }
  | { type: 'state'; gs: GameState }
  | { type: 'error'; message: string };

export interface LobbyPlayer {
  playerId: string;
  character: string;
  playerName: string;
  isHost: boolean;
}
