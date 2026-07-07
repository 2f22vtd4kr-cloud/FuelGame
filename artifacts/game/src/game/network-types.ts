// Shared WebSocket protocol types for client use.

export interface LobbyPlayer {
  playerId: string;
  character: string;
  playerName: string;
  isHost: boolean;
}
