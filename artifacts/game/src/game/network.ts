import type { InputState, GameState } from './types';
import { gs } from './state';
import type { LobbyPlayer } from './network-types';

// ─── Re-export protocol types for client use ─────────────────────────────────
export type { LobbyPlayer } from './network-types';

// ─── §5.3 Interpolation buffer ────────────────────────────────────────────────

interface StateSnapshot {
  state: GameState;
  receivedAt: number; // performance.now() when this packet arrived
}

const INTERP_DELAY_MS = 100; // render remote players 100ms in the past
const MAX_HISTORY = 12;      // ~600ms of history at 20Hz

// ─── Network event callbacks ─────────────────────────────────────────────────

export interface NetworkCallbacks {
  onRoomCreated?: (roomCode: string, playerId: string) => void;
  onRoomJoined?: (roomCode: string, playerId: string, isQuickPlay?: boolean) => void;
  onLobbyUpdate?: (players: LobbyPlayer[], roomCode: string, hostId: string) => void;
  onGameStarted?: (yourPlayerId: string, reconnected?: boolean) => void;
  onPlayerDisconnected?: (playerId: string, playerName: string) => void;
  onHostChanged?: (newHostId: string) => void;
  onError?: (message: string) => void;
  onClose?: () => void;
  /** §5.5 Quick Play — called while waiting in matchmaking queue. */
  onQueueUpdate?: (count: number, total: number) => void;
  /** §5.5 Quick Play — server countdown before auto-start (seconds remaining). */
  onQuickCountdown?: (seconds: number) => void;
}

// ─── Persisted session (localStorage) ────────────────────────────────────────

export interface PersistedSession {
  roomCode: string;
  playerId: string;
  character: string;
  playerName: string;
  gameStarted: boolean;
  savedAt: number;
}

const SESSION_KEY = '95y_mp_session';
const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

export function saveSession(s: PersistedSession): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ ...s, savedAt: Date.now() }));
  } catch { /* storage full — not critical */ }
}

export function loadSession(): PersistedSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as PersistedSession;
    if (Date.now() - s.savedAt > SESSION_TTL_MS) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  try { localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
}

// ─── GameNetwork ──────────────────────────────────────────────────────────────

export class GameNetwork {
  private ws: WebSocket;
  /** §5.3 Ring buffer of received server states with timestamps */
  private stateHistory: StateSnapshot[] = [];
  public myPlayerId: string | null = null;
  public roomCode: string | null = null;
  private callbacks: NetworkCallbacks;
  private _ready = false;
  private pendingMsgs: object[] = [];

  constructor(callbacks: NetworkCallbacks) {
    this.callbacks = callbacks;
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.ws = new WebSocket(`${proto}//${location.host}/api/ws`);

    this.ws.addEventListener('open', () => {
      this._ready = true;
      for (const m of this.pendingMsgs) this._sendNow(m);
      this.pendingMsgs = [];
    });

    this.ws.addEventListener('message', (e: MessageEvent) => {
      try {
        const msg = JSON.parse(e.data as string) as Record<string, unknown>;
        this.handleMsg(msg);
      } catch { /* ignore malformed */ }
    });

    this.ws.addEventListener('close', () => {
      this._ready = false;
      this.callbacks.onClose?.();
    });

    this.ws.addEventListener('error', () => {
      this.callbacks.onError?.('Ошибка соединения с сервером');
    });
  }

  /** Replace callbacks after construction (e.g. when game starts and lobby unmounts). */
  updateCallbacks(cb: Partial<NetworkCallbacks>): void {
    Object.assign(this.callbacks, cb);
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  createRoom(opts: {
    character: string;
    playerName: string;
    numPlayers: number;
    numSlivshchiki: number;
  }): void {
    this.send({ type: 'create', ...opts });
  }

  joinRoom(opts: { roomCode: string; character: string; playerName: string }): void {
    this.send({ type: 'join', ...opts });
  }

  /** Reconnect to an existing room after a server restart. */
  reconnectRoom(opts: { roomCode: string; playerId: string; character: string; playerName: string }): void {
    this.send({ type: 'reconnect', ...opts });
  }

  /** §5.5 Join the Quick Play matchmaking queue. Server auto-creates a room when QUICK_MATCH_SIZE players are waiting. */
  quickJoin(opts: { character: string; playerName: string }): void {
    this.send({ type: 'quick_join', ...opts });
  }

  /** §5.5 Leave the matchmaking queue (cancel Quick Play search). */
  leaveQueue(): void {
    this.send({ type: 'leave_queue' });
  }

  startGame(): void {
    this.send({ type: 'start' });
  }

  sendInput(input: InputState): void {
    if (!this._ready) return;
    this._sendNow({ type: 'input', ...input });
  }

  sendAction(action: string, payload?: Record<string, unknown>): void {
    this.send({ type: 'action', action, payload: payload ?? {} });
  }

  sendVote(targetId: string | null): void {
    this.send({ type: 'vote', targetId });
  }

  /**
   * §5.3 Apply server state to gs with remote-player interpolation.
   * @param nowMs — performance.now() from the render loop. If omitted, snaps to latest.
   */
  applyLatestState(nowMs?: number): boolean {
    if (this.stateHistory.length === 0) return false;

    // Not enough history or no timestamp → snap to latest (single-player compat)
    if (!nowMs || this.stateHistory.length < 2) {
      const s = this.stateHistory[this.stateHistory.length - 1].state;
      (Object.keys(s) as Array<keyof GameState>).forEach(k => {
        (gs as unknown as Record<string, unknown>)[k] = s[k as keyof GameState];
      });
      return true;
    }

    const targetTime = nowMs - INTERP_DELAY_MS;

    // Find the pair of snapshots that bracket targetTime.
    // Edge cases: if targetTime < first snapshot, snap to first pair.
    //             if targetTime > last snapshot, snap to last pair.
    const hist = this.stateHistory;
    let before = hist[0];
    let after  = hist[1];
    if (targetTime >= hist[hist.length - 1].receivedAt) {
      // Beyond newest — snap to the last two (t will clamp to 1, giving latest)
      before = hist[hist.length - 2];
      after  = hist[hist.length - 1];
    } else if (targetTime > hist[0].receivedAt) {
      // Somewhere in the middle — find the bracketing pair
      for (let i = 0; i < hist.length - 1; i++) {
        if (hist[i].receivedAt <= targetTime && hist[i + 1].receivedAt >= targetTime) {
          before = hist[i];
          after  = hist[i + 1];
          break;
        }
      }
    }
    // else targetTime <= first snapshot: keep before=hist[0], after=hist[1] (t clamps to 0)

    // Apply all non-player fields from the 'after' snapshot
    const s = after.state;
    (Object.keys(s) as Array<keyof GameState>).forEach(k => {
      if (k !== 'players') {
        (gs as unknown as Record<string, unknown>)[k] = s[k as keyof GameState];
      }
    });

    // Interpolation factor (clamped 0–1)
    const span = after.receivedAt - before.receivedAt;
    const t = span <= 0 ? 1 : Math.max(0, Math.min(1, (targetTime - before.receivedAt) / span));

    // Sync players, interpolating remote positions
    for (const sp of after.state.players) {
      const isLocal = sp.id === this.myPlayerId;
      const bp = before.state.players.find(p => p.id === sp.id);

      let gsp = gs.players.find(p => p.id === sp.id);
      if (!gsp) {
        gs.players.push({ ...sp });
        gsp = gs.players[gs.players.length - 1];
      }

      Object.assign(gsp, sp); // copy all fields first

      if (!isLocal && bp) {
        // Remote player: lerp position + angle between the two snapshots
        gsp.pos = {
          x: bp.pos.x + (sp.pos.x - bp.pos.x) * t,
          y: bp.pos.y + (sp.pos.y - bp.pos.y) * t,
        };
        // Angle lerp with wraparound
        let da = sp.facingAngle - bp.facingAngle;
        if (da >  Math.PI) da -= 2 * Math.PI;
        if (da < -Math.PI) da += 2 * Math.PI;
        gsp.facingAngle = bp.facingAngle + da * t;
      }
    }

    // Remove players no longer present on server
    gs.players = gs.players.filter(gsp =>
      after.state.players.some(sp => sp.id === gsp.id),
    );

    return true;
  }

  close(): void {
    this.ws.close();
  }

  // ── Internal ────────────────────────────────────────────────────────────────

  private handleMsg(msg: Record<string, unknown>): void {
    switch (msg['type']) {
      case 'room_created':
        this.myPlayerId = msg['playerId'] as string;
        this.roomCode = msg['roomCode'] as string;
        this.stateHistory = []; // clear stale cross-session snapshots
        this.callbacks.onRoomCreated?.(msg['roomCode'] as string, msg['playerId'] as string);
        break;
      case 'room_joined':
        this.myPlayerId = msg['playerId'] as string;
        this.roomCode = msg['roomCode'] as string;
        if (!msg['reconnected']) this.stateHistory = []; // clear stale cross-session snapshots
        this.callbacks.onRoomJoined?.(
          msg['roomCode'] as string,
          msg['playerId'] as string,
          Boolean(msg['isQuickPlay']),
        );
        break;
      case 'lobby_update':
        this.callbacks.onLobbyUpdate?.(
          msg['players'] as LobbyPlayer[],
          msg['roomCode'] as string,
          msg['hostId'] as string,
        );
        break;
      case 'game_started':
        this.myPlayerId = msg['yourPlayerId'] as string;
        if (!msg['reconnected']) this.stateHistory = []; // fresh slate — no cross-match interpolation artifacts
        this.callbacks.onGameStarted?.(msg['yourPlayerId'] as string, Boolean(msg['reconnected']));
        break;
      case 'state': {
        // §5.3 Push into ring buffer with arrival timestamp
        this.stateHistory.push({ state: msg['gs'] as GameState, receivedAt: performance.now() });
        if (this.stateHistory.length > MAX_HISTORY) this.stateHistory.shift();
        break;
      }
      case 'player_disconnected':
        this.callbacks.onPlayerDisconnected?.(
          msg['playerId'] as string,
          msg['playerName'] as string,
        );
        break;
      case 'host_changed':
        this.callbacks.onHostChanged?.(msg['newHostId'] as string);
        break;
      case 'error':
        this.callbacks.onError?.(msg['message'] as string);
        break;
      case 'queue_update':
        this.callbacks.onQueueUpdate?.(msg['count'] as number, msg['total'] as number);
        break;
      case 'quick_countdown':
        this.callbacks.onQuickCountdown?.(msg['seconds'] as number);
        break;
    }
  }

  private send(msg: object): void {
    if (this._ready) {
      this._sendNow(msg);
    } else {
      this.pendingMsgs.push(msg);
    }
  }

  private _sendNow(msg: object): void {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }
}
