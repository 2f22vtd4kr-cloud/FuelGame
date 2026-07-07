import type { WebSocket } from 'ws';
import type { InputState } from './types';
import { gs, setGs, startGameMultiplayer, createInitialState } from './state';
import type { HumanPlayerInfo } from './state';
import { tickGameMulti, submitVote, submitSkipDiscussion, onMiniGameTap, onMiniGameDigitTap, onMiniGameChoice, onMiniGameTaxiTap, onMiniGameWireSource, onMiniGameWireSocket, cancelMiniGame, triggerEmote } from './logic';
import type { LobbyPlayer } from './network-types';

export interface ClientInfo {
  ws: WebSocket;
  playerId: string;
  character: string;
  playerName: string;
}

export class GameRoom {
  readonly roomCode: string;
  hostPlayerId: string;
  clients: Map<string, ClientInfo> = new Map();
  inputs: Map<string, InputState> = new Map();
  state = createInitialState();
  gameStarted = false;

  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private broadcastInterval: ReturnType<typeof setInterval> | null = null;
  private lastTickMs = Date.now();

  settings: { numPlayers: number; numSlivshchiki: number };

  constructor(
    roomCode: string,
    hostPlayerId: string,
    settings: { numPlayers: number; numSlivshchiki: number },
  ) {
    this.roomCode = roomCode;
    this.hostPlayerId = hostPlayerId;
    this.settings = settings;
  }

  // ── Client management ──────────────────────────────────────────────────────

  addClient(info: ClientInfo): void {
    this.clients.set(info.playerId, info);
    this.inputs.set(info.playerId, {
      dx: 0, dy: 0,
      interact: false, prevInteract: false,
      sprint: false, crouch: false,
      emoteIndex: null,
    });
    this.broadcastLobbyState();
  }

  removeClient(playerId: string): void {
    this.clients.delete(playerId);
    this.inputs.delete(playerId);

    if (this.clients.size === 0) {
      this.stop();
      return;
    }

    // If game is running, mark the player as dead/disconnected so they
    // don't block win-condition counts and stop moving.
    if (this.gameStarted) {
      setGs(this.state);
      const p = gs.players.find(pl => pl.id === playerId);
      if (p) {
        p.isAlive = false;    // removes from living count / win-condition checks
        p.isHuman = false;    // prevents interaction loops from stalling
      }
      this.state = gs;
      this.broadcast({
        type: 'player_disconnected',
        playerId,
        playerName: p?.name ?? '',
      });
    } else {
      // In lobby: reassign host if the host left
      if (playerId === this.hostPlayerId) {
        const next = this.clients.values().next().value as ClientInfo | undefined;
        if (next) {
          this.hostPlayerId = next.playerId;
          this.broadcast({ type: 'host_changed', newHostId: next.playerId });
        }
      }
      this.broadcastLobbyState();
    }
  }

  get isEmpty(): boolean {
    return this.clients.size === 0;
  }

  // ── Game lifecycle ─────────────────────────────────────────────────────────

  startGame(): void {
    if (this.gameStarted) return;
    this.gameStarted = true;

    const humanPlayers: HumanPlayerInfo[] = Array.from(this.clients.values()).map(c => ({
      id: c.playerId,
      character: c.character,
      playerName: c.playerName,
    }));

    setGs(this.state);
    startGameMultiplayer(humanPlayers, this.settings.numPlayers, this.settings.numSlivshchiki);
    this.state = gs;

    // Tell each client its player ID and that the game is starting
    for (const [playerId, client] of this.clients) {
      this.sendTo(client.ws, { type: 'game_started', yourPlayerId: playerId });
    }

    // 60fps tick
    this.lastTickMs = Date.now();
    this.tickInterval = setInterval(() => {
      const now = Date.now();
      const dt = Math.min((now - this.lastTickMs) / 1000, 0.05);
      this.lastTickMs = now;
      this.tick(dt);
    }, 16);

    // Broadcast at 20Hz
    this.broadcastInterval = setInterval(() => {
      this.broadcast({ type: 'state', gs: this.state });
    }, 50);
  }

  stop(): void {
    if (this.tickInterval) { clearInterval(this.tickInterval); this.tickInterval = null; }
    if (this.broadcastInterval) { clearInterval(this.broadcastInterval); this.broadcastInterval = null; }
  }

  // ── Tick ──────────────────────────────────────────────────────────────────

  private tick(dt: number): void {
    setGs(this.state);
    tickGameMulti(dt, this.inputs);
    this.state = gs;
  }

  // ── Discrete actions ──────────────────────────────────────────────────────

  handleAction(playerId: string, type: string, payload: Record<string, unknown>): void {
    setGs(this.state);
    const origId = gs.localPlayerId;
    gs.localPlayerId = playerId;

    switch (type) {
      case 'vote':
        submitVote(playerId, (payload['targetId'] as string | null) ?? null);
        break;
      case 'skip_discussion':
        submitSkipDiscussion(playerId);
        break;
      case 'minigame_tap':
        onMiniGameTap();
        break;
      case 'minigame_digit':
        onMiniGameDigitTap(payload['digit'] as number);
        break;
      case 'minigame_choice':
        onMiniGameChoice(payload['index'] as number);
        break;
      case 'minigame_taxi_tap':
        onMiniGameTaxiTap();
        break;
      case 'minigame_cancel':
        cancelMiniGame();
        break;
      case 'minigame_wire_source':
        onMiniGameWireSource(payload['colorIndex'] as number);
        break;
      case 'minigame_wire_socket':
        onMiniGameWireSocket(payload['socketPos'] as number);
        break;
      case 'emote':
        triggerEmote(playerId, payload['emote'] as string);
        break;
    }

    gs.localPlayerId = origId;
    this.state = gs;
  }

  // ── Messaging ──────────────────────────────────────────────────────────────

  broadcastLobbyState(): void {
    const players: LobbyPlayer[] = Array.from(this.clients.values()).map(c => ({
      playerId: c.playerId,
      character: c.character,
      playerName: c.playerName,
      isHost: c.playerId === this.hostPlayerId,
    }));
    this.broadcast({ type: 'lobby_update', players, roomCode: this.roomCode, hostId: this.hostPlayerId });
  }

  broadcast(msg: object): void {
    const json = JSON.stringify(msg);
    for (const client of this.clients.values()) {
      if ((client.ws.readyState as number) === 1 /* OPEN */) {
        client.ws.send(json);
      }
    }
  }

  sendTo(ws: WebSocket, msg: object): void {
    if ((ws.readyState as number) === 1) {
      ws.send(JSON.stringify(msg));
    }
  }
}
