import React, { useState, useCallback, useRef } from 'react';
import type { GameState } from './game/types';
import { gs, resetGameState } from './game/state';
import { CHARACTERS } from './data/characters';
import { setActiveNetwork } from './game/gameActions';
import { GameNetwork } from './game/network';
import Lobby from './components/Lobby';
import MultiplayerLobby from './components/MultiplayerLobby';
import GameCanvas from './components/GameCanvas';
import HUD from './components/HUD';
import MeetingScreen from './components/MeetingScreen';
import GameResults from './components/GameResults';

type AppPhase = 'lobby' | 'multiplayer' | 'briefing' | 'play' | 'meeting' | 'results';

export default function App() {
  const [appPhase, setAppPhase] = useState<AppPhase>('lobby');
  const [snapshot, setSnapshot] = useState<GameState>(() => ({
    ...gs, players: [], cars: [], tasks: [], meeting: null, briefingTimer: 0,
  }));

  // Multiplayer network ref (null in single-player mode)
  const networkRef = useRef<GameNetwork | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);

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
    resetGameState();
    setAppPhase('lobby');
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
          background: 'rgba(0,0,0,0.88)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          fontFamily: 'sans-serif',
          animation: 'fadeInBriefing 0.4s ease',
        }}>
          <div style={{
            background: roleIsSlivshchik
              ? 'linear-gradient(160deg,#1a0000 0%,#3b0000 100%)'
              : 'linear-gradient(160deg,#001b0d 0%,#003820 100%)',
            border: `2px solid ${roleIsSlivshchik ? '#FF1744' : '#00E676'}`,
            borderRadius: 16, padding: '32px 40px',
            textAlign: 'center', maxWidth: 340,
            boxShadow: `0 0 60px ${roleIsSlivshchik ? 'rgba(255,23,68,0.35)' : 'rgba(0,230,118,0.25)'}`,
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: charDef?.color ?? '#888',
              margin: '0 auto 16px',
              border: `3px solid ${roleIsSlivshchik ? '#FF1744' : '#00E676'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28,
            }}>
              {roleIsSlivshchik ? '🪣' : '🏠'}
            </div>

            <div style={{
              fontSize: 11, letterSpacing: 3, marginBottom: 8,
              color: roleIsSlivshchik ? '#FF5252' : '#69F0AE',
            }}>
              ВЫ — {roleIsSlivshchik ? 'СЛИВЩИК' : 'ХОЗЯИН'}
            </div>

            <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 12, color: '#fff' }}>
              {localGsPlayer?.name ?? ''}
            </div>

            <div style={{ fontSize: 12, color: '#ccc', lineHeight: 1.6, marginBottom: 20 }}>
              {roleIsSlivshchik
                ? 'Слей бензин из машин соседей.\nНе попадись. Устраняй свидетелей.'
                : 'Следи за машинами. Вычисли Сливщика.\nСообщай на Сходке.'}
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.07)', borderRadius: 8,
              padding: '8px 12px', fontSize: 10, color: '#bbb',
              textAlign: 'left', lineHeight: 1.8,
            }}>
              <div>🕹️ WASD / стрелки — движение</div>
              <div>⚡ Shift — спринт</div>
              <div>🦆 Ctrl / Z — пригнуться</div>
              <div>🔔 E — взаимодействие / слив</div>
            </div>
          </div>

          <div style={{ marginTop: 24, fontSize: 14, color: '#666', letterSpacing: 2 }}>
            ИГРА НАЧНЁТСЯ ЧЕРЕЗ {Math.ceil(snapshot.briefingTimer || 0)}с...
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

      <style>{`
        @keyframes fadeInBriefing {
          from { opacity: 0; transform: scale(0.96); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
