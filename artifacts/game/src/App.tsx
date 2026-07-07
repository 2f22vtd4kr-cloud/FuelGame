import React, { useState, useCallback } from 'react';
import type { GameState } from './game/types';
import { gs, resetGameState } from './game/state';
import Lobby from './components/Lobby';
import GameCanvas from './components/GameCanvas';
import MeetingScreen from './components/MeetingScreen';
import GameResults from './components/GameResults';

type AppPhase = 'lobby' | 'play' | 'meeting' | 'results';

export default function App() {
  const [appPhase, setAppPhase] = useState<AppPhase>('lobby');
  // Snapshot used for overlay components (meeting, results)
  const [snapshot, setSnapshot] = useState<GameState>(() => ({ ...gs, players: [], cars: [], tasks: [], meeting: null }));

  // Called by GameCanvas at 10Hz with the latest game state snapshot
  const handleSnapshot = useCallback((snap: GameState) => {
    const incomingPhase = snap.phase as AppPhase;
    setSnapshot(snap);
    setAppPhase(prev => {
      if (prev !== incomingPhase && incomingPhase !== 'lobby') {
        return incomingPhase;
      }
      return prev;
    });
  }, []);

  const handleGameStart = useCallback(() => {
    setAppPhase('play');
  }, []);

  const handlePlayAgain = useCallback(() => {
    resetGameState();
    setAppPhase('lobby');
  }, []);

  const isInGame = appPhase === 'play' || appPhase === 'meeting' || appPhase === 'results';

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0D1B0D', overflow: 'hidden' }}>
      {/* ── Lobby ── */}
      {appPhase === 'lobby' && (
        <Lobby onStart={handleGameStart} />
      )}

      {/* ── Canvas (mounted while game is active, dims during meeting) ── */}
      {(appPhase === 'play' || appPhase === 'meeting') && (
        <GameCanvas
          onSnapshot={handleSnapshot}
          dimCanvas={appPhase === 'meeting'}
        />
      )}

      {/* ── Meeting overlay ── */}
      {appPhase === 'meeting' && snapshot.meeting && (
        <MeetingScreen gs={snapshot} />
      )}

      {/* ── Results screen ── */}
      {appPhase === 'results' && (
        <GameResults gs={snapshot} onPlayAgain={handlePlayAgain} />
      )}

      {/* ── Dev hint (desktop) ── */}
      {appPhase === 'play' && (
        <div style={{
          position: 'fixed', bottom: 8, left: '50%', transform: 'translateX(-50%)',
          zIndex: 5, pointerEvents: 'none',
          fontSize: 10, color: 'rgba(255,255,255,0.25)',
          display: 'none', // hide on mobile
        }}>
          WASD / стрелки — движение · E — взаимодействие
        </div>
      )}
    </div>
  );
}
