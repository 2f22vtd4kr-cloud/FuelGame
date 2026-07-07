import type { InputState, GameState } from './types';
import { gs } from './state';
import type { LobbyPlayer } from './network-types';

// ─── Re-export protocol types for client use ─────────────────────────────────
export type { LobbyPlayer } from './network-types';

// ─── Network event callbacks ─────────────────────────────────────────────────

export interface NetworkCallbacks {
  onRoomCreated?: (roomCode: string, playerId: string) => void;
  onRoomJoined?: (roomCode: string, playerId: string) => void;
  onLobbyUpdate?: (players: LobbyPlayer[], roomCode: string, hostId: string) => void;
  onGameStarted?: (yourPlayerId: string) => void;
  onPlayerDisconnected?: (playerId: string, playerName: string) => void;
  onHostChanged?: (newHostId: string) => void;
  onError?: (message: string) => void;
  onClose?: () => void;
}

// ─── GameNetwork ──────────────────────────────────────────────────────────────

export class GameNetwork {
  private ws: WebSocket;
  private latestState: GameState | null = null;
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
      callbacks.onClose?.();
    });

    this.ws.addEventListener('error', () => {
      callbacks.onError?.('Ошибка соединения с сервером');
    });
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

  /** Apply the most recent server state to the local gs object. */
  applyLatestState(): boolean {
    if (!this.latestState) return false;
    const s = this.latestState;
    this.latestState = null;
    // Mutate gs in-place so all existing imports of `gs` see the update
    (Object.keys(s) as Array<keyof GameState>).forEach(k => {
      (gs as unknown as Record<string, unknown>)[k] = s[k as keyof GameState];
    });
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
        this.callbacks.onRoomCreated?.(msg['roomCode'] as string, msg['playerId'] as string);
        break;
      case 'room_joined':
        this.myPlayerId = msg['playerId'] as string;
        this.roomCode = msg['roomCode'] as string;
        this.callbacks.onRoomJoined?.(msg['roomCode'] as string, msg['playerId'] as string);
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
        this.callbacks.onGameStarted?.(msg['yourPlayerId'] as string);
        break;
      case 'state':
        this.latestState = msg['gs'] as GameState;
        break;
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
