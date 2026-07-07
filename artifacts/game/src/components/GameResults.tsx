import React from 'react';
import type { GameState } from '../game/types';
import { CHARACTERS } from '../data/characters';
import { resetGameState } from '../game/state';

interface Props {
  gs: GameState;
  onPlayAgain: () => void;
}

export default function GameResults({ gs, onPlayAgain }: Props) {
  const localPlayer = gs.players.find(p => p.id === gs.localPlayerId);
  const myRole = localPlayer?.role ?? 'khozain';
  const iWon = (gs.winner === 'khozaeva' && myRole === 'khozain') ||
               (gs.winner === 'slivshchiki' && myRole === 'slivshchik');

  const slivshchiki = gs.players.filter(p => p.role === 'slivshchik');
  const khozaeva = gs.players.filter(p => p.role === 'khozain');

  const totalFuelStolen = gs.cars.reduce((acc, c) => acc + (100 - c.fuel), 0);
  const totalTasksDone = gs.tasks.filter(t => t.isComplete).length;
  const aliveTime = Math.floor(gs.time);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 60,
      background: iWon
        ? 'linear-gradient(180deg, #1B5E20 0%, #0A0A0A 100%)'
        : 'linear-gradient(180deg, #B71C1C 0%, #0A0A0A 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      overflowY: 'auto', fontFamily: 'sans-serif', padding: '24px 16px',
    }}>
      {/* Result headline */}
      <div style={{ fontSize: 60, marginBottom: 8 }}>
        {iWon ? '🏆' : '💀'}
      </div>
      <div style={{
        fontSize: 26, fontWeight: 'bold', color: '#FFF',
        letterSpacing: 2, textAlign: 'center', marginBottom: 4,
      }}>
        {iWon ? 'ПОБЕДА!' : 'ПОРАЖЕНИЕ'}
      </div>
      <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginBottom: 4 }}>
        {gs.winner === 'khozaeva' ? '🏠 Хозяева победили' : '🪣 Сливщики победили'}
      </div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginBottom: 20, fontStyle: 'italic' }}>
        {gs.winReason}
      </div>

      {/* Stats */}
      <div style={{
        width: '100%', maxWidth: 340,
        background: 'rgba(255,255,255,0.08)', borderRadius: 14,
        padding: '14px 16px', marginBottom: 16,
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
      }}>
        <Stat label="Время игры" value={`${Math.floor(aliveTime / 60)}:${(aliveTime % 60).toString().padStart(2, '0')}`} />
        <Stat label="Единство" value={`${Math.round(gs.unityMeter)}%`} />
        <Stat label="Задач выполнено" value={`${totalTasksDone}`} />
        <Stat label="Топлива слито" value={`${Math.round(totalFuelStolen)}%`} />
      </div>

      {/* Role reveal */}
      <div style={{
        width: '100%', maxWidth: 340,
        background: 'rgba(255,255,255,0.05)', borderRadius: 14,
        padding: '14px 16px', marginBottom: 20,
      }}>
        <div style={{ fontSize: 11, color: '#9E9E9E', marginBottom: 10, textAlign: 'center' }}>
          СЛИВЩИКИ БЫЛИ:
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
          {slivshchiki.map(p => (
            <div key={p.id} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            }}>
              <div style={{ fontSize: 28 }}>{CHARACTERS[p.character].emoji}</div>
              <div style={{ fontSize: 10, color: '#EF5350', fontWeight: 'bold' }}>
                {p.name}
              </div>
              <div style={{ fontSize: 9, color: '#9E9E9E' }}>
                {p.isAlive ? '(выжил)' : '(выброшен)'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA (fuel bot integration per design doc) */}
      <div style={{
        width: '100%', maxWidth: 340,
        background: iWon
          ? 'rgba(76,175,80,0.15)'
          : 'rgba(244,67,54,0.15)',
        border: `1.5px solid ${iWon ? 'rgba(76,175,80,0.4)' : 'rgba(244,67,54,0.4)'}`,
        borderRadius: 14, padding: '14px 16px', marginBottom: 24, textAlign: 'center',
      }}>
        <div style={{ fontSize: 12, color: '#FFF', lineHeight: 1.5, marginBottom: 6 }}>
          {iWon
            ? '🛡️ Вы защитили двор! А в реальности?\nАИ-95 уже 87₽. Зафиксируй цену на 3 месяца:'
            : '⛽ Ваш бак пуст. Не будь жертвой сифонеров — купи талоны по старой цене:'}
        </div>
        <div style={{
          fontSize: 15, fontWeight: 'bold', color: '#FFD700',
          fontFamily: 'monospace', letterSpacing: 1,
        }}>
          → @fuel_fuel_fuel_bot
        </div>
      </div>

      {/* Play again */}
      <button
        onClick={onPlayAgain}
        style={{
          width: '100%', maxWidth: 340,
          padding: '16px',
          background: 'linear-gradient(135deg, #FF5722, #FF8A65)',
          border: 'none', borderRadius: 14,
          fontSize: 16, fontWeight: 'bold', color: '#FFF',
          cursor: 'pointer', letterSpacing: 1,
          boxShadow: '0 4px 20px rgba(255,87,34,0.4)',
        }}
      >
        🎮 СЫГРАТЬ ЕЩЁ
      </button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 18, fontWeight: 'bold', color: '#FFF' }}>{value}</div>
      <div style={{ fontSize: 9, color: '#9E9E9E', marginTop: 2 }}>{label}</div>
    </div>
  );
}
