import React, { useState, useCallback } from 'react';
import type { GameState } from './game/types';
import { gs, resetGameState } from './game/state';
import { CHARACTERS } from './data/characters';
import Lobby from './components/Lobby';
import GameCanvas from './components/GameCanvas';
import HUD from './components/HUD';
import MeetingScreen from './components/MeetingScreen';
import GameResults from './components/GameResults';

type AppPhase = 'lobby' | 'briefing' | 'play' | 'meeting' | 'results';

export default function App() {
  const [appPhase, setAppPhase] = useState<AppPhase>('lobby');
  // Snapshot used for overlay components (meeting, results, HUD, briefing countdown)
  const [snapshot, setSnapshot] = useState<GameState>(() => ({ ...gs, players: [], cars: [], tasks: [], meeting: null, briefingTimer: 0 }));

  // Single source of truth: gs.phase drives all transitions via the 10Hz snapshot.
  // gs.briefingTimer is the authoritative countdown — no duplicate React timer.
  const handleSnapshot = useCallback((snap: GameState) => {
    setSnapshot(snap);
    setAppPhase(prev => {
      const incoming = snap.phase as AppPhase;
      if (incoming === 'lobby') return prev;   // never revert to lobby from snapshot
      if (incoming !== prev) return incoming;
      return prev;
    });
  }, []);

  const handleGameStart = useCallback(() => {
    // startGame() was called by Lobby; gs.phase is now 'briefing'.
    // GameCanvas mounts below and immediately starts ticking gs.briefingTimer down.
    setAppPhase('briefing');
  }, []);

  const handlePlayAgain = useCallback(() => {
    resetGameState();
    setAppPhase('lobby');
  }, []);

  const isInGame = appPhase === 'briefing' || appPhase === 'play' || appPhase === 'meeting' || appPhase === 'results';

  // For the briefing overlay: read role from gs directly (populated by startGame)
  const localGsPlayer = gs.players.find(p => p.isHuman);
  const roleIsSlivshchik = localGsPlayer?.role === 'slivshchik';
  const charDef = localGsPlayer ? CHARACTERS[localGsPlayer.character] : null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0D1B0D', overflow: 'hidden' }}>
      {/* ── Lobby ── */}
      {appPhase === 'lobby' && (
        <Lobby onStart={handleGameStart} />
      )}

      {/* ── Canvas (always mounted during active game; ticks game loop) ── */}
      {(appPhase === 'briefing' || appPhase === 'play' || appPhase === 'meeting') && (
        <GameCanvas onStateSnapshot={handleSnapshot} />
      )}

      {/* ── §2.1 Briefing overlay (5s role-reveal cinematic) ── */}
      {appPhase === 'briefing' && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(0,0,0,0.88)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          fontFamily: 'sans-serif',
          animation: 'fadeInBriefing 0.4s ease',
        }}>
          {/* Role card */}
          <div style={{
            background: roleIsSlivshchik
              ? 'linear-gradient(160deg,#1a0000 0%,#3b0000 100%)'
              : 'linear-gradient(160deg,#001b0d 0%,#003820 100%)',
            border: `2px solid ${roleIsSlivshchik ? '#FF1744' : '#00E676'}`,
            borderRadius: 16, padding: '32px 40px',
            textAlign: 'center', maxWidth: 340,
            boxShadow: `0 0 60px ${roleIsSlivshchik ? 'rgba(255,23,68,0.35)' : 'rgba(0,230,118,0.25)'}`,
          }}>
            {/* Character emoji / color blob */}
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

            <div style={{
              fontSize: 22, fontWeight: 900, marginBottom: 12,
              color: '#fff',
            }}>
              {localGsPlayer?.name ?? ''}
            </div>

            <div style={{
              fontSize: 12, color: '#ccc', lineHeight: 1.6, marginBottom: 20,
            }}>
              {roleIsSlivshchik
                ? 'Слей бензин из машин соседей.\nНе попадись. Устраняй свидетелей.'
                : 'Следи за машинами. Вычисли Сливщика.\nСообщай на Сходке.'}
            </div>

            {/* Key bindings reminder */}
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

          {/* Countdown — driven by gs.briefingTimer via snapshot (single source of truth) */}
          <div style={{
            marginTop: 24, fontSize: 14, color: '#666', letterSpacing: 2,
          }}>
            ИГРА НАЧНЁТСЯ ЧЕРЕЗ {Math.ceil(snapshot.briefingTimer || 0)}с...
          </div>
        </div>
      )}

      {/* ── HUD overlay (play only) ── */}
      {appPhase === 'play' && (
        <HUD state={snapshot} />
      )}

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
