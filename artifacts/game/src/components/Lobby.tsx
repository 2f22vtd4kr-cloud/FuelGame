import React, { useState } from 'react';
import type { CharacterKey } from '../game/types';
import { CHARACTERS, CHARACTER_KEYS } from '../data/characters';
import { gs, startGame } from '../game/state';

interface Props {
  onStart: () => void;
}

export default function Lobby({ onStart }: Props) {
  const [selected, setSelected] = useState<CharacterKey>('denis');
  const [playerCount, setPlayerCount] = useState(6);
  const [siphonersCount, setSiphonersCount] = useState(2);
  const charDef = CHARACTERS[selected];

  function handleStart() {
    gs.selectedCharacter = selected;
    startGame(selected, playerCount, siphonersCount);
    onStart();
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 60,
      background: 'linear-gradient(180deg, #0D1B2A 0%, #1B2838 60%, #0D1B2A 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      overflowY: 'auto', padding: '24px 16px',
      fontFamily: 'sans-serif',
    }}>
      {/* Logo / Title */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 48, marginBottom: 4 }}>🏘️</div>
        <div style={{
          fontSize: 32, fontWeight: 900, color: '#FF5722',
          letterSpacing: 3, textShadow: '0 2px 12px rgba(255,87,34,0.5)',
        }}>
          95-Й
        </div>
        <div style={{ fontSize: 13, color: '#9E9E9E', marginTop: 4, letterSpacing: 2 }}>
          ЖК «Цветочные Поляны»
        </div>
        <div style={{ fontSize: 11, color: '#607D8B', marginTop: 2 }}>
          Кто из соседей сливает бензин?
        </div>
      </div>

      {/* Character select */}
      <div style={{ width: '100%', maxWidth: 380, marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: '#9E9E9E', marginBottom: 8, letterSpacing: 1 }}>
          ВЫБЕРИ ПЕРСОНАЖА
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 8, marginBottom: 12,
        }}>
          {CHARACTER_KEYS.map(key => {
            const c = CHARACTERS[key];
            const isSelected = key === selected;
            return (
              <button
                key={key}
                onClick={() => setSelected(key)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: 2, padding: '8px 4px',
                  background: isSelected
                    ? `${c.color}33`
                    : 'rgba(255,255,255,0.05)',
                  border: isSelected
                    ? `2px solid ${c.color}`
                    : '2px solid transparent',
                  borderRadius: 10, cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ fontSize: 24 }}>{c.emoji}</div>
                <div style={{ fontSize: 8, color: isSelected ? '#FFF' : '#9E9E9E', textAlign: 'center', lineHeight: 1.2 }}>
                  {c.name.split(' ')[0]}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected character info */}
        <div style={{
          background: `${charDef.color}22`,
          border: `1.5px solid ${charDef.color}66`,
          borderRadius: 12, padding: '12px 14px',
          display: 'flex', gap: 12, alignItems: 'flex-start',
        }}>
          <div style={{ fontSize: 40, flexShrink: 0 }}>{charDef.emoji}</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 'bold', color: '#FFF', marginBottom: 2 }}>
              {charDef.name}
            </div>
            <div style={{ fontSize: 11, color: '#BDBDBD', lineHeight: 1.4, marginBottom: 6 }}>
              {charDef.description}
            </div>
            <div style={{ fontSize: 10, color: charDef.color, fontStyle: 'italic' }}>
              «{charDef.voiceLines[0]}»
            </div>
          </div>
        </div>
      </div>

      {/* Game settings */}
      <div style={{
        width: '100%', maxWidth: 380,
        background: 'rgba(255,255,255,0.05)',
        borderRadius: 12, padding: '14px 16px', marginBottom: 20,
      }}>
        <div style={{ fontSize: 11, color: '#9E9E9E', marginBottom: 12, letterSpacing: 1 }}>
          НАСТРОЙКИ ИГРЫ
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: '#FFF' }}>Игроков (включая ботов)</span>
              <span style={{ fontSize: 12, color: '#FF5722', fontWeight: 'bold' }}>{playerCount}</span>
            </div>
            <input
              type="range" min={4} max={10} value={playerCount}
              onChange={e => {
                const n = +e.target.value;
                setPlayerCount(n);
                if (siphonersCount >= n - 1) setSiphonersCount(Math.max(1, n - 2));
              }}
              style={{ width: '100%', accentColor: '#FF5722' }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: '#FFF' }}>Сливщиков</span>
              <span style={{ fontSize: 12, color: '#F44336', fontWeight: 'bold' }}>{siphonersCount} 🪣</span>
            </div>
            <input
              type="range" min={1} max={Math.floor((playerCount - 1) / 2)}
              value={siphonersCount}
              onChange={e => setSiphonersCount(+e.target.value)}
              style={{ width: '100%', accentColor: '#F44336' }}
            />
          </div>
        </div>

        <div style={{
          marginTop: 10, padding: '8px 12px',
          background: 'rgba(255,255,255,0.04)',
          borderRadius: 8, fontSize: 11, color: '#9E9E9E', lineHeight: 1.4,
        }}>
          🏠 {playerCount - siphonersCount} хозяев vs 🪣 {siphonersCount} сливщик{siphonersCount === 1 ? '' : 'а'}
          <br/>
          Задача хозяев: заполни метр единства до 100% или выгони всех сливщиков.
        </div>
      </div>

      {/* How to play */}
      <div style={{
        width: '100%', maxWidth: 380,
        background: 'rgba(255,255,255,0.03)',
        borderRadius: 12, padding: '12px 14px', marginBottom: 20,
        fontSize: 11, color: '#757575', lineHeight: 1.6,
      }}>
        <div style={{ color: '#9E9E9E', fontWeight: 'bold', marginBottom: 6, fontSize: 11, letterSpacing: 1 }}>
          КАК ИГРАТЬ
        </div>
        🕹️ Двигайся джойстиком (или WASD на ПК)<br/>
        🅴 Кнопка E — взаимодействие с объектами<br/>
        🌯 Выполняй задачи → заполняй метр единства<br/>
        🔔 Подойди к арке и нажми E → вызвать сходку<br/>
        🗳️ На сходке голосуй за подозреваемых<br/>
        🪣 Сливщики: сливай баки и не попадайся!
      </div>

      {/* Start button */}
      <button
        onClick={handleStart}
        style={{
          width: '100%', maxWidth: 380,
          padding: '18px',
          background: 'linear-gradient(135deg, #FF5722 0%, #FF8A65 100%)',
          border: 'none', borderRadius: 16,
          fontSize: 18, fontWeight: 900, color: '#FFF',
          cursor: 'pointer', letterSpacing: 2,
          boxShadow: '0 6px 24px rgba(255,87,34,0.5)',
          textTransform: 'uppercase' as const,
        }}
      >
        🎮 Играть
      </button>

      <div style={{ marginTop: 16, fontSize: 10, color: '#424242', textAlign: 'center' }}>
        ЖК «Цветочные Поляны», 2026 • @bakstab_bot
      </div>
    </div>
  );
}
