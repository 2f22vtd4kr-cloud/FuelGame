import type { WebSocket } from 'ws';
import { encode } from '@msgpack/msgpack';
import type { InputState } from './types';
import { gs, setGs, startGameMultiplayer, createInitialState } from './state';
import type { HumanPlayerInfo } from './state';
import { tickGameMulti, submitVote, submitSkipDiscussion, onMiniGameTap, onMiniGameDigitTap, onMiniGameChoice, onMiniGameTaxiTap, onMiniGameWireSource, onMiniGameWireSocket, cancelMiniGame, triggerEmote } from './logic';
import type { LobbyPlayer } from './network-types';
import { saveRoom, deleteRoom } from './roomStore';
import type { PersistedRoom } from './roomStore';

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
  readonly isQuickPlay: boolean;

  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private broadcastInterval: ReturnType<typeof setInterval> | null = null;
  private quickStartTimeout: ReturnType<typeof setTimeout> | null = null;
  private saveInterval: ReturnType<typeof setInterval> | null = null;
  private lastTickMs = Date.now();

  // §5.4 Reconnection timing
  private gameStartWallTime = 0;
  private rejoinTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  // §5.3 Meeting-sync pause: freeze broadcast at 'play' for 200ms when meeting first starts
  private meetingFreezeUntil: number | null = null;

  settings: { numPlayers: number; numSlivshchiki: number };

  /**
   * Set of playerIds that have ever been in this room (including disconnected ones).
   * Used to validate reconnect requests.
   */
  knownPlayerIds: Set<string> = new Set();

  constructor(
    roomCode: string,
    hostPlayerId: string,
    settings: { numPlayers: number; numSlivshchiki: number },
    isQuickPlay = false,
  ) {
    this.roomCode = roomCode;
    this.hostPlayerId = hostPlayerId;
    this.settings = settings;
    this.isQuickPlay = isQuickPlay;

    if (isQuickPlay) {
      this.scheduleQuickStart();
    }
  }

  // ── Restore from persisted snapshot ───────────────────────────────────────

  /**
   * Rehydrate a room from a Redis snapshot.
   * Clients map starts empty — players reconnect via `reconnect` WS message.
   * NOTE: does NOT restart intervals; those start in resumeGameLoopsIfNeeded()
   * which is called when the first client reconnects.
   */
  static fromPersisted(data: PersistedRoom): GameRoom {
    const room = new GameRoom(data.roomCode, data.hostPlayerId, data.settings, data.isQuickPlay);
    room.gameStarted = data.gameStarted;
    room.state = data.gameState;
    // Populate knownPlayerIds from persisted metadata
    for (const p of data.playerMeta) {
      room.knownPlayerIds.add(p.playerId);
    }
    return room;
  }

  /** Snapshot the serialisable parts of this room for Redis. */
  toPersistedData(): PersistedRoom {
    const playerMeta = Array.from(this.clients.values()).map(c => ({
      playerId: c.playerId,
      character: c.character,
      playerName: c.playerName,
      isHost: c.playerId === this.hostPlayerId,
    }));
    return {
      roomCode: this.roomCode,
      hostPlayerId: this.hostPlayerId,
      settings: this.settings,
      isQuickPlay: this.isQuickPlay,
      gameStarted: this.gameStarted,
      playerMeta,
      gameState: this.state,
      savedAt: Date.now(),
    };
  }

  persist(): void {
    void saveRoom(this.toPersistedData());
  }

  /**
   * Resume tick/broadcast/save intervals after a server restart when a client
   * reconnects to an in-progress game. Safe to call multiple times — it checks
   * that intervals are not already running.
   */
  resumeGameLoopsIfNeeded(): void {
    if (!this.gameStarted) return;
    if (this.tickInterval !== null) return; // already running

    this.lastTickMs = Date.now();

    this.tickInterval = setInterval(() => {
      const now = Date.now();
      const dt = Math.min((now - this.lastTickMs) / 1000, 0.05);
      this.lastTickMs = now;
      this.tick(dt);
    }, 16);

    this.broadcastInterval = setInterval(() => {
      // §5.3 Meeting-sync pause: hold at 'play' for 200ms when meeting first triggers
      if (this.meetingFreezeUntil !== null) {
        if (Date.now() < this.meetingFreezeUntil) {
          this.broadcast({ type: 'state', gs: { ...this.state, phase: 'play' } });
          return;
        }
        this.meetingFreezeUntil = null; // freeze expired — let meeting through
      }
      this.broadcast({ type: 'state', gs: this.state });
    }, 50);

    this.saveInterval = setInterval(() => {
      this.persist();
    }, 5000);
  }

  // ── Quick Play auto-start countdown ────────────────────────────────────────

  private scheduleQuickStart(): void {
    let secs = 5;
    const tick = () => {
      if (this.gameStarted) return;
      this.broadcast({ type: 'quick_countdown', seconds: secs });
      if (secs === 0) {
        this.startGame();
        return;
      }
      secs--;
      this.quickStartTimeout = setTimeout(tick, 1000);
    };
    this.quickStartTimeout = setTimeout(tick, 1000);
  }

  // ── Client management ──────────────────────────────────────────────────────

  addClient(info: ClientInfo): void {
    this.clients.set(info.playerId, info);
    this.knownPlayerIds.add(info.playerId);
    this.inputs.set(info.playerId, {
      dx: 0, dy: 0,
      interact: false, prevInteract: false,
      sprint: false, crouch: false,
      emoteIndex: null,
    });

    // §5.4 Rejoin within 60s window: cancel timer and restore player as human
    const rejoinTimer = this.rejoinTimers.get(info.playerId);
    if (rejoinTimer) {
      clearTimeout(rejoinTimer);
      this.rejoinTimers.delete(info.playerId);
      setGs(this.state);
      const p = gs.players.find(pl => pl.id === info.playerId);
      if (p) {
        p.isHuman = true;
        p.name = info.playerName;
      }
      this.state = gs;
      logger.info({ playerId: info.playerId, roomCode: this.roomCode }, 'Player rejoined within window — restored as human');
    }

    this.broadcastLobbyState();
    this.persist();

    // If this is a reconnect to an in-progress game, resume the game loops
    this.resumeGameLoopsIfNeeded();
  }

  /**
   * Remove a client from the room.
   * @param ws — if supplied, only remove the client if its WebSocket still matches.
   *             This prevents a stale close-event from evicting a newly reconnected client.
   */
  removeClient(playerId: string, ws?: WebSocket): void {
    const existing = this.clients.get(playerId);

    // Guard: a reconnect may have already replaced this socket.
    // If the ws we're being asked to remove is no longer the registered one, bail.
    if (ws && existing && existing.ws !== ws) return;

    this.clients.delete(playerId);
    this.inputs.delete(playerId);

    if (this.clients.size === 0) {
      this.stop();
      return;
    }

    if (this.gameStarted) {
      setGs(this.state);
      const p = gs.players.find(pl => pl.id === playerId);
      const playerName = p?.name ?? '';
      const elapsedSecs = (Date.now() - this.gameStartWallTime) / 1000;

      // §5.4 First 30s: cancel the match if a human player disconnects
      if (p?.isHuman && elapsedSecs < 30) {
        logger.info({ playerId, roomCode: this.roomCode, elapsedSecs }, 'Match cancelled — human disconnect within 30s');
        this.broadcast({ type: 'match_cancelled', reason: 'disconnect_early' });
        this.stop();
        this.gameStarted = false;
        return;
      }

      if (p) {
        // §5.4 After 30s: AI takeover — keep player alive, hand control to bot
        p.isHuman = false;

        // §5.4 During Сходка: auto-cast skip vote for disconnected player
        if (gs.phase === 'meeting' && gs.meeting) {
          const alreadyVoted = gs.meeting.votes.some(v => v.voterId === playerId);
          if (!alreadyVoted) {
            gs.meeting.votes.push({ voterId: playerId, targetId: null }); // skip
          }
        }
      }

      this.state = gs;
      this.broadcast({ type: 'player_disconnected', playerId, playerName });

      // §5.4 Start 60s rejoin window; after it expires the player stays as AI permanently
      const timer = setTimeout(() => {
        this.rejoinTimers.delete(playerId);
        logger.info({ playerId, roomCode: this.roomCode }, 'Rejoin window expired — player remains as AI');
      }, 60_000);
      this.rejoinTimers.set(playerId, timer);
    } else {
      if (playerId === this.hostPlayerId) {
        const next = this.clients.values().next().value as ClientInfo | undefined;
        if (next) {
          this.hostPlayerId = next.playerId;
          this.broadcast({ type: 'host_changed', newHostId: next.playerId });
        }
      }
      this.broadcastLobbyState();
    }
    this.persist();
  }

  get isEmpty(): boolean {
    return this.clients.size === 0;
  }

  // ── Game lifecycle ─────────────────────────────────────────────────────────

  startGame(): void {
    if (this.gameStarted) return;
    this.gameStarted = true;
    this.gameStartWallTime = Date.now();

    if (this.quickStartTimeout) {
      clearTimeout(this.quickStartTimeout);
      this.quickStartTimeout = null;
    }

    const humanPlayers: HumanPlayerInfo[] = Array.from(this.clients.values()).map(c => ({
      id: c.playerId,
      character: c.character,
      playerName: c.playerName,
    }));

    setGs(this.state);
    startGameMultiplayer(humanPlayers, this.settings.numPlayers, this.settings.numSlivshchiki);
    this.state = gs;

    for (const [playerId, client] of this.clients) {
      this.sendTo(client.ws, { type: 'game_started', yourPlayerId: playerId });
    }

    this.resumeGameLoopsIfNeeded();
    this.persist();
  }

  stop(): void {
    if (this.tickInterval) { clearInterval(this.tickInterval); this.tickInterval = null; }
    if (this.broadcastInterval) { clearInterval(this.broadcastInterval); this.broadcastInterval = null; }
    if (this.quickStartTimeout) { clearTimeout(this.quickStartTimeout); this.quickStartTimeout = null; }
    if (this.saveInterval) { clearInterval(this.saveInterval); this.saveInterval = null; }
    // §5.4 Clear any pending rejoin timers
    for (const t of this.rejoinTimers.values()) clearTimeout(t);
    this.rejoinTimers.clear();
    void deleteRoom(this.roomCode);
  }

  // ── Tick ──────────────────────────────────────────────────────────────────

  private tick(dt: number): void {
    setGs(this.state);
    const prevPhase = gs.phase;
    tickGameMulti(dt, this.inputs);
    this.state = gs;

    // §5.3 Meeting-sync: when phase first transitions play→meeting, freeze broadcast 200ms
    if (this.state.phase === 'meeting' && prevPhase === 'play' && this.meetingFreezeUntil === null) {
      this.meetingFreezeUntil = Date.now() + 200;
    }
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
    const buf = Buffer.from(encode(msg));
    for (const client of this.clients.values()) {
      if ((client.ws.readyState as number) === 1 /* OPEN */) {
        client.ws.send(buf);
      }
    }
  }

  sendTo(ws: WebSocket, msg: object): void {
    if ((ws.readyState as number) === 1) {
      ws.send(Buffer.from(encode(msg)));
    }
  }
}
