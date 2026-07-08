import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { GameState } from './game/types';
import { gs, resetGameState } from './game/state';
import { CHARACTERS } from './data/characters';
import { setActiveNetwork } from './game/gameActions';
import { skipBriefing } from './game/logic';
import { clearMoment } from './game/replayBuffer';
import { GameNetwork } from './game/network';
import { audio } from './game/audio';
import Lobby from './components/Lobby';
import MultiplayerLobby from './components/MultiplayerLobby';
import GameCanvas from './components/GameCanvas';
import HUD from './components/HUD';
import MeetingScreen from './components/MeetingScreen';
import GameResults from './components/GameResults';
import { loadProfile } from './game/profile';

type AppPhase = 'lobby' | 'multiplayer' | 'briefing' | 'play' | 'meeting' | 'results';

/** Extract room code from Telegram startapp param "ROOM_XXXX" → "XXXX" */
function getTelegramStartRoomCode(): string | null {
  try {
    const param = (window as any).Telegram?.WebApp?.initDataUnsafe?.start_param as string | undefined;
    if (param?.startsWith('ROOM_')) return param.slice(5);
  } catch { /* not in Telegram */ }
  return null;
}

export default function App() {
  const [appPhase, setAppPhase] = useState<AppPhase>(() => {
    // Deep-linked via Telegram invite → go straight to multiplayer
    if (getTelegramStartRoomCode()) return 'multiplayer';
    return 'lobby';
  });
  const [snapshot, setSnapshot] = useState<GameState>(() => ({
    ...gs, players: [], cars: [], tasks: [], meeting: null, briefingTimer: 0,
  }));

  // Multiplayer network ref (null in single-player mode)
  const networkRef = useRef<GameNetwork | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [multiDisconnected, setMultiDisconnected] = useState(false);
  const [matchCancelled, setMatchCancelled] = useState(false);

  // ── Snapshot from game loop ────────────────────────────────────────────────
  const handleSnapshot = useCallback((snap: GameState) => {
    setSnapshot(snap);
    setAppPhase(prev => {
      const incoming = snap.phase as AppPhase;
      if (incoming === 'lobby') return prev;
      if (incoming !== prev && ['briefing','play','meeting','results'].includes(incoming)) {
        return incoming;
      }
      return prev;
    });
  }, []);

  // ── Single-player start ────────────────────────────────────────────────────
  // New-player onboarding is handled by the in-game interactive shawarma
  // tutorial (§12.4) that activates automatically during the play phase,
  // replacing the old card-overlay Tutorial.tsx.
  const handleGameStart = useCallback(() => {
    setMyPlayerId(null);
    setActiveNetwork(null);
    setAppPhase('briefing');
  }, []);

  // ── Multiplayer: game started (server tells us) ───────────────────────────
  const handleMultiGameStarted = useCallback((network: GameNetwork, playerId: string) => {
    networkRef.current = network;
    setMyPlayerId(playerId);
    setActiveNetwork(network);
    setMultiDisconnected(false);
    setMatchCancelled(false);
    // Re-register callbacks for the in-game phase so lobby-unmount callbacks
    // don't try to update unmounted lobby state.
    network.updateCallbacks({
      onClose() {
        setMultiDisconnected(true);
      },
      onError(_msg) {
        setMultiDisconnected(true);
      },
      // §5.4 Match cancelled because a human left in the first 30s
      onMatchCancelled(_reason) {
        setMatchCancelled(true);
      },
      // Disable lobby-phase callbacks that would reference unmounted state
      onRoomCreated: undefined,
      onRoomJoined: undefined,
      onLobbyUpdate: undefined,
    });
    setAppPhase('briefing');
  }, []);

  // ── Return to lobby ────────────────────────────────────────────────────────
  const handlePlayAgain = useCallback(() => {
    if (networkRef.current) {
      networkRef.current.close();
      networkRef.current = null;
    }
    setActiveNetwork(null);
    setMyPlayerId(null);
    setMultiDisconnected(false);
    setMatchCancelled(false);
    resetGameState();
    clearMoment();
    audio.stopMusic();
    audio.playMusic('menu');
    setAppPhase('lobby');
  }, []);

  // §8.1 Play menu music on initial load (first user gesture is handled inside audio.init())
  useEffect(() => {
    // Delay slightly so AudioContext is allowed after mount
    const id = setTimeout(() => { audio.playMusic('menu'); }, 300);
    return () => clearTimeout(id);
  }, []);

  const isInGame = appPhase === 'briefing' || appPhase === 'play' || appPhase === 'meeting' || appPhase === 'results';

  const localGsPlayer = gs.players.find(p => myPlayerId ? p.id === myPlayerId : p.isHuman);
  const roleIsSlivshchik = localGsPlayer?.role === 'slivshchik';
  const charDef = localGsPlayer ? CHARACTERS[localGsPlayer.character] : null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0D1B0D', overflow: 'hidden' }}>

      {/* ── Lobby ── */}
      {appPhase === 'lobby' && (
        <Lobby
          onStart={handleGameStart}
          onMultiplayer={() => setAppPhase('multiplayer')}
        />
      )}

      {/* ── Multiplayer lobby ── */}
      {appPhase === 'multiplayer' && (
        <MultiplayerLobby
          onGameStarted={handleMultiGameStarted}
          onBack={() => setAppPhase('lobby')}
          initialJoinCode={getTelegramStartRoomCode() ?? undefined}
        />
      )}

      {/* ── Canvas (ticks game loop when in active game) ── */}
      {(appPhase === 'briefing' || appPhase === 'play' || appPhase === 'meeting') && (
        <GameCanvas
          onStateSnapshot={handleSnapshot}
          network={networkRef.current}
          myPlayerId={myPlayerId}
        />
      )}

      {/* ── §2.1 Briefing overlay ── */}
      {appPhase === 'briefing' && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(0,0,0,0.92)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          fontFamily: 'sans-serif', gap: 14,
          animation: 'fadeInBriefing 0.4s ease',
          overflowY: 'auto', padding: '16px',
        }}>
          {/* §2.1 Atmospheric setting text */}
          <div style={{
            textAlign: 'center', maxWidth: 320,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 12, padding: '12px 18px',
          }}>
            <div style={{ fontSize: 11, color: '#76C043', letterSpacing: 2, marginBottom: 4 }}>
              ЖК «ЦВЕТОЧНЫЕ ПОЛЯНЫ»
            </div>
            <div style={{ fontSize: 10, color: '#888', marginBottom: 6 }}>
              Лето 2026 · АИ-95: {snapshot.ai95Price}₽/л
            </div>
            <div style={{ fontSize: 13, color: '#e0e0e0', lineHeight: 1.6, fontStyle: 'italic' }}>
              «Кто-то сифонит ваши баки.»
            </div>
          </div>

          {/* Role card */}
          <div style={{
            background: roleIsSlivshchik
              ? 'linear-gradient(160deg,#1a0000 0%,#3b0000 100%)'
              : 'linear-gradient(160deg,#001b0d 0%,#003820 100%)',
            border: `2px solid ${roleIsSlivshchik ? '#FF1744' : '#00E676'}`,
            borderRadius: 16, padding: '24px 32px',
            textAlign: 'center', maxWidth: 320, width: '100%',
            boxShadow: `0 0 60px ${roleIsSlivshchik ? 'rgba(255,23,68,0.35)' : 'rgba(0,230,118,0.25)'}`,
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: charDef?.color ?? '#888',
              margin: '0 auto 12px',
              border: `3px solid ${roleIsSlivshchik ? '#FF1744' : '#00E676'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24,
            }}>
              {roleIsSlivshchik ? '🪣' : '🏠'}
            </div>

            <div style={{
              fontSize: 11, letterSpacing: 3, marginBottom: 6,
              color: roleIsSlivshchik ? '#FF5252' : '#69F0AE',
            }}>
              ВЫ — {roleIsSlivshchik ? 'СЛИВЩИК' : 'ХОЗЯИН'}
            </div>

            <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 10, color: '#fff' }}>
              {localGsPlayer?.name ?? ''}
            </div>

            <div style={{ fontSize: 12, color: '#ccc', lineHeight: 1.6, marginBottom: 14 }}>
              {roleIsSlivshchik
                ? 'Слей бензин из машин соседей.\nНе попадись. Устраняй свидетелей.'
                : 'Следи за машинами. Вычисли Сливщика.\nЗаполни метр единства до 100%.'}
            </div>

            {/* §3.1.3 Neutral role text */}
            {localGsPlayer?.neutralRole && (
              <div style={{
                background: 'rgba(255,200,0,0.12)',
                border: '1px solid rgba(255,200,0,0.35)',
                borderRadius: 8, padding: '8px 10px',
                fontSize: 11, color: '#FFD700', lineHeight: 1.6, marginBottom: 12,
              }}>
                {localGsPlayer.neutralRole === 'barsik' && (
                  <>😺 <strong>БАРСИК</strong> — выживи до конца матча. Тебя никто не проголосует.</>
                )}
                {localGsPlayer.neutralRole === 'policeman' && (
                  <>🕵️ <strong>УЧАСТКОВЫЙ</strong> — правильно проголосуй за Сливщика на Сходке.</>
                )}
                {localGsPlayer.neutralRole === 'janitor' && (
                  <>🧹 <strong>ДВОРНИК</strong> — собери 3 канистры, брошенные Сливщиками.</>
                )}
              </div>
            )}

            <div style={{
              background: 'rgba(255,255,255,0.07)', borderRadius: 8,
              padding: '8px 12px', fontSize: 10, color: '#bbb',
              textAlign: 'left', lineHeight: 1.8,
            }}>
              <div>🕹️ WASD / стрелки — движение</div>
              <div>⚡ Shift — спринт (переключатель)</div>
              <div>🦆 Ctrl / Z — пригнуться</div>
              <div>🔔 E — взаимодействие / слив</div>
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: '#555', letterSpacing: 2, marginBottom: 10 }}>
              {snapshot.briefingTimer > 0
                ? `ИГРА НАЧНЁТСЯ ЧЕРЕЗ ${Math.ceil(snapshot.briefingTimer)}с...`
                : 'ЗАГРУЖАЕМ ДВОР...'}
            </div>
            {/* §2.1 Skip button — appears 2s after briefing starts (briefingTimer < 3) */}
            {(snapshot.briefingTimer < 3) && (
              <button
                onClick={() => skipBriefing()}
                style={{
                  padding: '8px 24px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 20, fontSize: 11,
                  color: '#aaa', cursor: 'pointer', letterSpacing: 1,
                }}
              >
                ▶ Пропустить
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── HUD overlay ── */}
      {appPhase === 'play' && <HUD state={snapshot} />}

      {/* ── Meeting overlay ── */}
      {appPhase === 'meeting' && snapshot.meeting && (
        <MeetingScreen state={snapshot} />
      )}

      {/* ── Results screen ── */}
      {appPhase === 'results' && (
        <GameResults gs={snapshot} onPlayAgain={handlePlayAgain} />
      )}

      {/* ── §5.4 Match cancelled (human left in first 30s) ── */}
      {matchCancelled && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          fontFamily: 'sans-serif',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#FF9800', marginBottom: 8 }}>
            Матч отменён
          </div>
          <div style={{ fontSize: 13, color: '#aaa', marginBottom: 28, textAlign: 'center', maxWidth: 260 }}>
            Игрок вышел в первые 30 секунд. Матч аннулирован.
          </div>
          <button
            onClick={handlePlayAgain}
            style={{
              padding: '12px 28px',
              background: 'linear-gradient(135deg,#FF9800,#FFB74D)',
              border: 'none', borderRadius: 10,
              fontSize: 15, fontWeight: 700, color: '#fff',
              cursor: 'pointer',
            }}
          >
            ← В главное меню
          </button>
        </div>
      )}

      {/* ── Multiplayer disconnect overlay ── */}
      {multiDisconnected && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          fontFamily: 'sans-serif',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📡</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#FF5722', marginBottom: 8 }}>
            Соединение потеряно
          </div>
          <div style={{ fontSize: 13, color: '#aaa', marginBottom: 28, textAlign: 'center' }}>
            Связь с сервером прервалась.
          </div>
          <button
            onClick={handlePlayAgain}
            style={{
              padding: '12px 28px',
              background: 'linear-gradient(135deg,#FF5722,#FF8A65)',
              border: 'none', borderRadius: 10,
              fontSize: 15, fontWeight: 700, color: '#fff',
              cursor: 'pointer',
            }}
          >
            ← В главное меню
          </button>
        </div>
      )}

      <style>{`
        @keyframes fadeInBriefing {
          from { opacity: 0; transform: scale(0.96); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
