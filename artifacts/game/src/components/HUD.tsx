import React from 'react';
import type { GameState } from '../game/types';
import { CHARACTERS } from '../data/characters';
import { NEWS_HEADLINES } from '../data/ticker';

interface Props {
  gs: GameState;
}

export default function HUD({ gs }: Props) {
  const localPlayer = gs.players.find(p => p.id === gs.localPlayerId);
  const aliveCount = gs.players.filter(p => p.isAlive).length;
  const aliveSlivshchiki = gs.players.filter(p => p.isAlive && p.role === 'slivshchik').length;
  const headline = NEWS_HEADLINES[gs.tickerIndex] ?? '';

  return (
    <>
      {/* ── Top bar ── */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 30,
        display: 'flex', flexDirection: 'column', gap: 0,
        pointerEvents: 'none',
      }}>
        {/* Unity + cars row */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 12px',
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
        }}>
          {/* Fuel price */}
          <div style={{ fontSize: 11, color: '#FF6B35', fontWeight: 'bold', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
            АИ-95: {gs.ai95Price}₽↑
          </div>

          {/* Unity meter */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10, color: '#9CCC65', whiteSpace: 'nowrap' }}>ЕДИНСТВО</span>
            <div style={{ flex: 1, height: 12, background: '#333', borderRadius: 6, overflow: 'hidden', border: '1px solid #555' }}>
              <div style={{
                height: '100%',
                width: `${gs.unityMeter}%`,
                background: 'linear-gradient(90deg, #4CAF50, #8BC34A)',
                borderRadius: 6,
                transition: 'width 0.3s',
              }} />
            </div>
            <span style={{ fontSize: 10, color: '#9CCC65', minWidth: 28 }}>{Math.round(gs.unityMeter)}%</span>
          </div>

          {/* Player count */}
          <div style={{ fontSize: 11, color: '#FFF', whiteSpace: 'nowrap' }}>
            👥 {aliveCount}
          </div>
        </div>

        {/* Car fuel bars */}
        <div style={{
          display: 'flex', gap: 4, padding: '4px 12px',
          background: 'rgba(0,0,0,0.55)',
        }}>
          {gs.cars.map(car => (
            <div key={car.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <div style={{ fontSize: 13 }}>🚗</div>
              <div style={{ width: '100%', height: 5, background: '#333', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${car.fuel}%`,
                  background: car.fuel > 50 ? '#4CAF50' : car.fuel > 25 ? '#FFC107' : '#F44336',
                  transition: 'width 0.2s',
                  borderRadius: 3,
                }} />
              </div>
              {car.hasImmunity && <div style={{ fontSize: 8, color: '#FFD700' }}>🛡️</div>}
              {car.siphoner && <div style={{ fontSize: 8, color: '#F44336' }}>⚠️</div>}
            </div>
          ))}
        </div>

        {/* News ticker */}
        <div style={{
          padding: '2px 12px',
          background: 'rgba(200,50,30,0.85)',
          fontSize: 10,
          color: '#FFF',
          fontFamily: 'monospace',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
        }}>
          📰 {headline}
        </div>
      </div>

      {/* ── Role badge (bottom-left) ── */}
      {localPlayer && (
        <div style={{
          position: 'fixed', bottom: 170, left: 12, zIndex: 30,
          background: localPlayer.role === 'slivshchik' ? 'rgba(183,28,28,0.9)' : 'rgba(27,94,32,0.9)',
          borderRadius: 8, padding: '6px 12px',
          border: `2px solid ${localPlayer.role === 'slivshchik' ? '#EF5350' : '#66BB6A'}`,
          pointerEvents: 'none',
        }}>
          <div style={{ fontSize: 12, color: '#FFF', fontWeight: 'bold' }}>
            {localPlayer.role === 'slivshchik' ? '🪣 СЛИВЩИК' : '🏠 ХОЗЯИН'}
          </div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)' }}>
            {CHARACTERS[localPlayer.character].name}
          </div>
        </div>
      )}

      {/* ── Interact prompt (center-bottom) ── */}
      {gs.promptText && (
        <div style={{
          position: 'fixed',
          bottom: 165,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 30,
          background: 'rgba(0,0,0,0.82)',
          borderRadius: 10,
          padding: '8px 18px',
          fontSize: 13,
          color: '#FFD700',
          fontWeight: 'bold',
          border: '1.5px solid rgba(255,215,0,0.4)',
          pointerEvents: 'none',
          textAlign: 'center',
          maxWidth: '80%',
        }}>
          {gs.promptText}
        </div>
      )}

      {/* ── Meeting cooldown indicator ── */}
      {gs.meetingCooldown > 0 && (
        <div style={{
          position: 'fixed', bottom: 12, left: '50%', transform: 'translateX(-50%)',
          zIndex: 30, fontSize: 10, color: 'rgba(255,255,255,0.5)',
          pointerEvents: 'none',
        }}>
          ⏳ Сходка доступна через {Math.ceil(gs.meetingCooldown)}с
        </div>
      )}

      {/* ── Timer display ── */}
      <div style={{
        position: 'fixed', top: '50%', right: 10, transform: 'translateY(-50%)',
        zIndex: 30, pointerEvents: 'none',
        display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        {/* Live player list (compact) */}
        {gs.players.slice(0, 8).map(p => (
          <div key={p.id} style={{
            display: 'flex', alignItems: 'center', gap: 4,
            opacity: p.isAlive ? 1 : 0.4,
          }}>
            <div style={{
              width: 10, height: 10, borderRadius: '50%',
              background: CHARACTERS[p.character].color,
              border: p.id === gs.localPlayerId ? '1.5px solid white' : 'none',
              flexShrink: 0,
            }} />
            <div style={{ fontSize: 9, color: p.isAlive ? '#FFF' : '#666', fontFamily: 'sans-serif' }}>
              {CHARACTERS[p.character].emoji} {p.name.slice(0, 8)}
              {!p.isAlive && ' 💀'}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
