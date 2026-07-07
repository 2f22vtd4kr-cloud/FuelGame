import React, { useState, useEffect } from 'react';
import type { CharacterKey } from '../game/types';
import { CHARACTERS, CHARACTER_KEYS } from '../data/characters';
import { GameNetwork } from '../game/network';
import type { LobbyPlayer } from '../game/network';

type Screen = 'menu' | 'waiting';

interface Props {
  onGameStarted: (network: GameNetwork, myPlayerId: string) => void;
  onBack: () => void;
}

export default function MultiplayerLobby({ onGameStarted, onBack }: Props) {
  const [screen, setScreen] = useState<Screen>('menu');
  const [character, setCharacter] = useState<CharacterKey>('denis');
  const [playerName, setPlayerName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [numPlayers, setNumPlayers] = useState(6);
  const [numSlivshchiki, setNumSlivshchiki] = useState(2);

  // Waiting room state
  const [network, setNetwork] = useState<GameNetwork | null>(null);
  const [roomCode, setRoomCode] = useState('');
  const [lobbyPlayers, setLobbyPlayers] = useState<LobbyPlayer[]>([]);
  const [amHost, setAmHost] = useState(false);
  const [error, setError] = useState('');
  const [connecting, setConnecting] = useState(false);

  const charDef = CHARACTERS[character];
  const effectiveName = playerName.trim() || charDef.name;

  // Cleanup network on unmount
  useEffect(() => {
    return () => { network?.close(); };
  }, [network]);

  function buildNetwork(onCreate: (net: GameNetwork) => void): void {
    setConnecting(true);
    setError('');
    const net = new GameNetwork({
      onRoomCreated(code, _id) {
        setRoomCode(code);
        setAmHost(true);
        setScreen('waiting');
        setConnecting(false);
      },
      onRoomJoined(code, _id) {
        setRoomCode(code);
        setAmHost(false);
        setScreen('waiting');
        setConnecting(false);
      },
      onLobbyUpdate(players, _code, hostId) {
        setLobbyPlayers(players);
        setAmHost(net.myPlayerId === hostId);
      },
      onGameStarted(yourPlayerId) {
        onGameStarted(net, yourPlayerId);
      },
      onError(msg) {
        setError(msg);
        setConnecting(false);
      },
      onClose() {
        setError('Соединение с сервером потеряно');
        setScreen('menu');
      },
    });
    setNetwork(net);
    // Wait for open — buffered send handles it
    onCreate(net);
  }

  function handleCreate(): void {
    buildNetwork(net => {
      net.createRoom({ character, playerName: effectiveName, numPlayers, numSlivshchiki });
    });
  }

  function handleJoin(): void {
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 4) { setError('Введи 4-значный код комнаты'); return; }
    buildNetwork(net => {
      net.joinRoom({ roomCode: code, character, playerName: effectiveName });
    });
  }

  function handleStart(): void {
    network?.startGame();
  }

  if (screen === 'waiting') {
    return (
      <div style={containerStyle}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 28, marginBottom: 4 }}>🎮</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#FF5722', letterSpacing: 2 }}>
            КОМНАТА
          </div>
          <div style={{
            fontSize: 36, fontWeight: 900, letterSpacing: 8, color: '#FFF',
            background: 'rgba(255,87,34,0.15)',
            border: '2px solid rgba(255,87,34,0.4)',
            borderRadius: 12, padding: '8px 24px', marginTop: 8, display: 'inline-block',
          }}>
            {roomCode}
          </div>
          <div style={{ fontSize: 11, color: '#607D8B', marginTop: 6 }}>
            Поделись кодом с друзьями
          </div>
        </div>

        {/* Player list */}
        <div style={{ width: '100%', maxWidth: 380, marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: '#9E9E9E', marginBottom: 8, letterSpacing: 1 }}>
            ИГРОКИ ({lobbyPlayers.length})
          </div>
          {lobbyPlayers.map(p => {
            const c = CHARACTERS[p.character as CharacterKey];
            return (
              <div key={p.playerId} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 10, padding: '10px 14px', marginBottom: 6,
                border: p.isHost ? '1px solid rgba(255,87,34,0.4)' : '1px solid transparent',
              }}>
                <div style={{ fontSize: 28 }}>{c?.emoji ?? '👤'}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: '#FFF', fontWeight: 'bold' }}>
                    {p.playerName}
                    {p.isHost && <span style={{ fontSize: 10, color: '#FF5722', marginLeft: 6 }}>👑 хост</span>}
                    {p.playerId === network?.myPlayerId && <span style={{ fontSize: 10, color: '#4CAF50', marginLeft: 6 }}>← ты</span>}
                  </div>
                  <div style={{ fontSize: 11, color: '#9E9E9E' }}>{c?.name}</div>
                </div>
              </div>
            );
          })}
          {lobbyPlayers.length === 0 && (
            <div style={{ color: '#555', fontSize: 12, textAlign: 'center', padding: 20 }}>
              Ожидание игроков...
            </div>
          )}
        </div>

        {error && (
          <div style={{ color: '#F44336', fontSize: 12, marginBottom: 12, textAlign: 'center' }}>
            {error}
          </div>
        )}

        <div style={{ width: '100%', maxWidth: 380, display: 'flex', gap: 10 }}>
          <button onClick={onBack} style={secondaryBtn}>← Выйти</button>
          {amHost && (
            <button
              onClick={handleStart}
              disabled={lobbyPlayers.length < 1}
              style={{
                ...primaryBtn,
                flex: 2,
                opacity: lobbyPlayers.length < 1 ? 0.5 : 1,
                cursor: lobbyPlayers.length < 1 ? 'not-allowed' : 'pointer',
              }}
            >
              🚀 Начать игру
            </button>
          )}
          {!amHost && (
            <div style={{ flex: 2, color: '#666', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              Ожидание хоста...
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Menu screen ──────────────────────────────────────────────────────────────

  return (
    <div style={containerStyle}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 36, marginBottom: 4 }}>🌐</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#FF5722', letterSpacing: 2 }}>
          МУЛЬТИПЛЕЕР
        </div>
        <div style={{ fontSize: 11, color: '#607D8B', marginTop: 2 }}>
          Играй с друзьями по коду комнаты
        </div>
      </div>

      {/* Character */}
      <div style={{ width: '100%', maxWidth: 380, marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: '#9E9E9E', marginBottom: 8, letterSpacing: 1 }}>
          ПЕРСОНАЖ
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginBottom: 10 }}>
          {CHARACTER_KEYS.map(key => {
            const c = CHARACTERS[key];
            const sel = key === character;
            return (
              <button key={key} onClick={() => setCharacter(key)} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 2, padding: '6px 4px',
                background: sel ? `${c.color}33` : 'rgba(255,255,255,0.05)',
                border: sel ? `2px solid ${c.color}` : '2px solid transparent',
                borderRadius: 8, cursor: 'pointer',
              }}>
                <div style={{ fontSize: 22 }}>{c.emoji}</div>
                <div style={{ fontSize: 8, color: sel ? '#FFF' : '#9E9E9E' }}>{c.name.split(' ')[0]}</div>
              </button>
            );
          })}
        </div>

        {/* Name */}
        <input
          type="text"
          placeholder={`Имя (по умолч. ${charDef.name})`}
          value={playerName}
          onChange={e => setPlayerName(e.target.value)}
          maxLength={20}
          style={{
            width: '100%', padding: '10px 12px', boxSizing: 'border-box',
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 8, color: '#FFF', fontSize: 13,
            outline: 'none',
          }}
        />
      </div>

      {/* Create room */}
      <div style={{ width: '100%', maxWidth: 380, marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: '#9E9E9E', marginBottom: 8, letterSpacing: 1 }}>
          СОЗДАТЬ КОМНАТУ
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <span style={{ fontSize: 11, color: '#CCC' }}>Игроков</span>
              <span style={{ fontSize: 11, color: '#FF5722' }}>{numPlayers}</span>
            </div>
            <input type="range" min={2} max={10} value={numPlayers}
              onChange={e => { const n = +e.target.value; setNumPlayers(n); if (numSlivshchiki >= n) setNumSlivshchiki(Math.max(1, n-1)); }}
              style={{ width: '100%', accentColor: '#FF5722' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
              <span style={{ fontSize: 11, color: '#CCC' }}>Сливщиков</span>
              <span style={{ fontSize: 11, color: '#F44336' }}>{numSlivshchiki}</span>
            </div>
            <input type="range" min={1} max={Math.max(1, Math.floor((numPlayers-1)/2))} value={numSlivshchiki}
              onChange={e => setNumSlivshchiki(+e.target.value)}
              style={{ width: '100%', accentColor: '#F44336' }}
            />
          </div>
        </div>
        <button onClick={handleCreate} disabled={connecting} style={{ ...primaryBtn, width: '100%' }}>
          {connecting ? 'Подключение...' : '🏠 Создать комнату'}
        </button>
      </div>

      {/* Join room */}
      <div style={{ width: '100%', maxWidth: 380, marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: '#9E9E9E', marginBottom: 8, letterSpacing: 1 }}>
          ВОЙТИ В КОМНАТУ
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            placeholder="XXXX"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 4))}
            style={{
              flex: 1, padding: '10px 12px',
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 8, color: '#FFF', fontSize: 18,
              fontWeight: 'bold', letterSpacing: 6, textAlign: 'center',
              outline: 'none',
            }}
          />
          <button onClick={handleJoin} disabled={connecting} style={{ ...primaryBtn, flex: 1 }}>
            {connecting ? '...' : '🚪 Войти'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ color: '#F44336', fontSize: 12, marginBottom: 12, textAlign: 'center' }}>
          ⚠️ {error}
        </div>
      )}

      <button onClick={onBack} style={{ ...secondaryBtn, maxWidth: 380, width: '100%' }}>
        ← Назад
      </button>
    </div>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 60,
  background: 'linear-gradient(180deg, #0D1B2A 0%, #1B2838 60%, #0D1B2A 100%)',
  display: 'flex', flexDirection: 'column', alignItems: 'center',
  overflowY: 'auto', padding: '24px 16px',
  fontFamily: 'sans-serif',
};

const primaryBtn: React.CSSProperties = {
  padding: '12px 16px',
  background: 'linear-gradient(135deg, #FF5722 0%, #FF8A65 100%)',
  border: 'none', borderRadius: 10,
  fontSize: 14, fontWeight: 700, color: '#FFF',
  cursor: 'pointer', letterSpacing: 1,
  boxShadow: '0 4px 16px rgba(255,87,34,0.4)',
};

const secondaryBtn: React.CSSProperties = {
  padding: '12px 16px',
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 10, fontSize: 14, color: '#CCC',
  cursor: 'pointer',
};
