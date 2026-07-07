import React, { useState, useEffect, useRef } from 'react';
import type { CharacterKey } from '../game/types';
import { CHARACTERS, CHARACTER_KEYS } from '../data/characters';
import { GameNetwork, saveSession, loadSession, clearSession } from '../game/network';
import type { LobbyPlayer } from '../game/network';

type Screen = 'menu' | 'queueing' | 'waiting';

interface Props {
  onGameStarted: (network: GameNetwork, myPlayerId: string) => void;
  onBack: () => void;
  /** Pre-filled room code from Telegram startapp deep link (e.g. "ROOM_XXXX" → "XXXX") */
  initialJoinCode?: string;
}

export default function MultiplayerLobby({ onGameStarted, onBack, initialJoinCode }: Props) {
  const [screen, setScreen] = useState<Screen>('menu');
  const [character, setCharacter] = useState<CharacterKey>('denis');
  const [playerName, setPlayerName] = useState('');
  const [joinCode, setJoinCode] = useState(initialJoinCode ?? '');
  const [numPlayers, setNumPlayers] = useState(6);
  const [numSlivshchiki, setNumSlivshchiki] = useState(2);

  // Waiting room state
  const [network, setNetwork] = useState<GameNetwork | null>(null);
  const networkRef = useRef<GameNetwork | null>(null);
  const [roomCode, setRoomCode] = useState('');
  const [lobbyPlayers, setLobbyPlayers] = useState<LobbyPlayer[]>([]);
  const [amHost, setAmHost] = useState(false);
  const [error, setError] = useState('');
  const [connecting, setConnecting] = useState(false);

  // §5.5 Quick Play queue state
  const [queueCount, setQueueCount] = useState(0);
  const [queueTotal, setQueueTotal] = useState(4);
  const [quickCountdown, setQuickCountdown] = useState<number | null>(null);
  const isQuickPlayRef = useRef(false);

  // §2.1 Auto-start countdown for custom rooms (host-triggered at 8 players)
  const [autoStartCountdown, setAutoStartCountdown] = useState<number | null>(null);
  const autoStartTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const charDef = CHARACTERS[character];
  const effectiveName = playerName.trim() || charDef.name;

  // Track whether the game has started so we don't close the socket on lobby unmount
  const gameStartedRef = useRef(false);

  // Cleanup network on unmount — only close if game never started
  useEffect(() => {
    return () => {
      if (!gameStartedRef.current) network?.close();
    };
  }, [network]);

  // §2.1 Auto-start for custom rooms: host + 8 players → 10s countdown
  useEffect(() => {
    const shouldStart = amHost && lobbyPlayers.length >= 8 && screen === 'waiting' && !isQuickPlayRef.current;

    if (shouldStart) {
      if (autoStartTimerRef.current === null) {
        let secs = 10;
        setAutoStartCountdown(secs);
        autoStartTimerRef.current = setInterval(() => {
          secs -= 1;
          setAutoStartCountdown(secs);
          if (secs <= 0) {
            clearInterval(autoStartTimerRef.current!);
            autoStartTimerRef.current = null;
            networkRef.current?.startGame();
          }
        }, 1000);
      }
    } else if (autoStartTimerRef.current !== null) {
      clearInterval(autoStartTimerRef.current);
      autoStartTimerRef.current = null;
      setAutoStartCountdown(null);
    }
  }, [amHost, lobbyPlayers.length, screen]);

  useEffect(() => {
    return () => {
      if (autoStartTimerRef.current !== null) {
        clearInterval(autoStartTimerRef.current);
        autoStartTimerRef.current = null;
      }
    };
  }, []);

  // ── Network builders ──────────────────────────────────────────────────────

  function buildNetwork(onCreate: (net: GameNetwork) => void): GameNetwork {
    setConnecting(true);
    setError('');
    gameStartedRef.current = false;
    isQuickPlayRef.current = false;

    const net = new GameNetwork({
      onRoomCreated(code, id) {
        setRoomCode(code);
        setAmHost(true);
        setScreen('waiting');
        setConnecting(false);
        // Persist session for reconnect
        saveSession({
          roomCode: code, playerId: id,
          character, playerName: effectiveName,
          gameStarted: false, savedAt: Date.now(),
        });
      },
      onRoomJoined(code, id, isQuickPlay) {
        setRoomCode(code);
        setAmHost(false);
        isQuickPlayRef.current = Boolean(isQuickPlay);
        setScreen('waiting');
        setConnecting(false);
        if (isQuickPlay) setQueueCount(0);
        saveSession({
          roomCode: code, playerId: id,
          character, playerName: effectiveName,
          gameStarted: false, savedAt: Date.now(),
        });
      },
      onLobbyUpdate(players, _code, hostId) {
        setLobbyPlayers(players);
        setAmHost(net.myPlayerId === hostId);
      },
      onGameStarted(yourPlayerId) {
        gameStartedRef.current = true;
        // Mark session as in-progress so reconnect knows to skip lobby
        if (net.roomCode) {
          saveSession({
            roomCode: net.roomCode, playerId: yourPlayerId,
            character, playerName: effectiveName,
            gameStarted: true, savedAt: Date.now(),
          });
        }
        onGameStarted(net, yourPlayerId);
      },
      onQueueUpdate(count, total) {
        setQueueCount(count);
        setQueueTotal(total);
      },
      onQuickCountdown(seconds) {
        setQuickCountdown(seconds);
      },
      onError(msg) {
        setError(msg);
        setConnecting(false);
        setScreen('menu');
        clearSession();
      },
      onClose() {
        if (!gameStartedRef.current) {
          setError('Соединение с сервером потеряно');
          setScreen('menu');
          setConnecting(false);
          clearSession();
        }
        // If game had started, session remains in localStorage for reconnect
      },
    });

    networkRef.current = net;
    setNetwork(net);
    onCreate(net);
    return net;
  }

  // ── Auto-reconnect on mount ───────────────────────────────────────────────

  function handleReconnect(session: NonNullable<ReturnType<typeof loadSession>>): void {
    buildNetwork(net => {
      net.reconnectRoom({
        roomCode: session.roomCode,
        playerId: session.playerId,
        character: session.character,
        playerName: session.playerName,
      });
    });
  }

  // ── Actions ───────────────────────────────────────────────────────────────

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

  function handleQuickJoin(): void {
    setQueueCount(0);
    setQueueTotal(4);
    setQuickCountdown(null);
    buildNetwork(net => {
      net.quickJoin({ character, playerName: effectiveName });
    });
    setScreen('queueing');
    setConnecting(false);
  }

  function handleCancelQueue(): void {
    networkRef.current?.leaveQueue();
    networkRef.current?.close();
    networkRef.current = null;
    setNetwork(null);
    setScreen('menu');
    setQueueCount(0);
    setConnecting(false);
  }

  function handleStart(): void {
    network?.startGame();
  }

  // ── Auto-reconnect banner (shown in menu screen) ─────────────────────────
  const [pendingSession, setPendingSession] = useState<ReturnType<typeof loadSession> | null>(null);
  const sessionCheckedRef = useRef(false);

  useEffect(() => {
    if (sessionCheckedRef.current) return;
    sessionCheckedRef.current = true;
    const s = loadSession();
    if (s) setPendingSession(s);
  }, []);

  // ── §5.5 Queueing screen ──────────────────────────────────────────────────

  if (screen === 'queueing') {
    const dots = queueTotal;
    return (
      <div style={containerStyle}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 48, marginBottom: 8, animation: 'pulse 1.5s ease-in-out infinite' }}>⚡</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#FF5722', letterSpacing: 2, marginBottom: 4 }}>
            БЫСТРАЯ ИГРА
          </div>
          <div style={{ fontSize: 12, color: '#607D8B' }}>
            Ищем соседей во дворе...
          </div>
        </div>

        {/* Queue progress dots */}
        <div style={{
          display: 'flex', gap: 14, justifyContent: 'center', marginBottom: 28,
        }}>
          {Array.from({ length: dots }).map((_, i) => (
            <div key={i} style={{
              width: 44, height: 44, borderRadius: '50%',
              background: i < queueCount ? '#FF5722' : 'rgba(255,255,255,0.08)',
              border: `2px solid ${i < queueCount ? '#FF5722' : 'rgba(255,255,255,0.2)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20,
              transition: 'all 0.3s',
              boxShadow: i < queueCount ? '0 0 16px rgba(255,87,34,0.5)' : 'none',
            }}>
              {i < queueCount ? '👤' : ''}
            </div>
          ))}
        </div>

        <div style={{
          fontSize: 16, color: '#FFF', fontWeight: 700, marginBottom: 6, textAlign: 'center',
        }}>
          {queueCount} / {queueTotal} игрок{queueCount === 1 ? '' : 'а'} готов{queueCount === 1 ? '' : 'о'}
        </div>
        <div style={{ fontSize: 11, color: '#607D8B', marginBottom: 32, textAlign: 'center' }}>
          Игра начнётся автоматически при {queueTotal} игроках
        </div>

        {/* Animated waiting bar */}
        <div style={{
          width: '100%', maxWidth: 380, height: 4,
          background: 'rgba(255,255,255,0.07)',
          borderRadius: 2, marginBottom: 32, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${(queueCount / queueTotal) * 100}%`,
            background: 'linear-gradient(90deg, #FF5722, #FF8A65)',
            borderRadius: 2,
            transition: 'width 0.4s ease',
          }} />
        </div>

        <button onClick={handleCancelQueue} style={{ ...secondaryBtn, maxWidth: 380, width: '100%' }}>
          ✕ Отмена
        </button>

        <style>{`
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.15); opacity: 0.8; }
          }
        `}</style>
      </div>
    );
  }

  // ── Waiting room screen ───────────────────────────────────────────────────

  if (screen === 'waiting') {
    const isQP = isQuickPlayRef.current;
    return (
      <div style={containerStyle}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 28, marginBottom: 4 }}>{isQP ? '⚡' : '🎮'}</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#FF5722', letterSpacing: 2 }}>
            {isQP ? 'БЫСТРАЯ ИГРА' : 'КОМНАТА'}
          </div>
          {!isQP && (
            <>
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
              {/* §9.4 Friend invite deep link */}
              <button
                onClick={async () => {
                  const link = `https://t.me/bakstab_bot?startapp=ROOM_${roomCode}`;
                  const shareText = `Играем в 95-Й! Код: ${roomCode}`;
                  const tg = (window as any).Telegram?.WebApp;
                  if (tg?.openTelegramLink) {
                    tg.openTelegramLink(
                      `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(shareText)}`
                    );
                  } else {
                    const full = `🏠 ${shareText}\n→ ${link}`;
                    const copied = navigator.clipboard
                      ? await navigator.clipboard.writeText(full).then(() => true).catch(() => false)
                      : false;
                    alert(copied
                      ? `Ссылка скопирована!\n${link}`
                      : `Код комнаты: ${roomCode}\nСсылка: ${link}`
                    );
                  }
                }}
                style={{
                  marginTop: 10, padding: '8px 20px',
                  background: 'linear-gradient(135deg, #FF5722, #FF8A65)',
                  border: 'none', borderRadius: 20,
                  fontSize: 12, fontWeight: 700, color: '#FFF',
                  cursor: 'pointer', letterSpacing: 0.5,
                  boxShadow: '0 3px 12px rgba(255,87,34,0.4)',
                  display: 'inline-block',
                }}
              >
                🔗 Пригласить друзей
              </button>
            </>
          )}
          {isQP && (
            <div style={{ fontSize: 12, color: '#607D8B', marginTop: 4 }}>
              Все игроки подобраны — игра скоро начнётся!
            </div>
          )}
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
                    {p.isHost && !isQP && <span style={{ fontSize: 10, color: '#FF5722', marginLeft: 6 }}>👑 хост</span>}
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

        {/* §5.5 Quick Play server countdown */}
        {isQP && quickCountdown !== null && (
          <div style={{
            width: '100%', maxWidth: 380, marginBottom: 12,
            background: quickCountdown <= 2
              ? 'rgba(244,67,54,0.20)'
              : 'rgba(255,87,34,0.15)',
            border: `1px solid ${quickCountdown <= 2 ? '#F44336' : '#FF5722'}`,
            borderRadius: 10, padding: '14px 16px',
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: 28, fontWeight: 900,
              color: quickCountdown <= 2 ? '#F44336' : '#FF8A65',
              letterSpacing: 1,
            }}>
              ⚡ {quickCountdown > 0 ? `Старт через ${quickCountdown}с` : 'Поехали!'}
            </div>
            <div style={{ fontSize: 10, color: '#9E9E9E', marginTop: 4 }}>
              Команда собрана — двор ждёт!
            </div>
            <div style={{
              height: 4, background: 'rgba(255,255,255,0.1)',
              borderRadius: 2, marginTop: 10, overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: quickCountdown > 0 ? `${(quickCountdown / 5) * 100}%` : '0%',
                background: quickCountdown <= 2 ? '#F44336' : '#FF5722',
                borderRadius: 2,
                transition: 'width 1s linear, background 0.3s',
              }} />
            </div>
          </div>
        )}

        {/* §2.1 Custom room auto-start countdown (host-triggered at 8 players) */}
        {!isQP && autoStartCountdown !== null && (
          <div style={{
            width: '100%', maxWidth: 380, marginBottom: 12,
            background: autoStartCountdown <= 3
              ? 'rgba(244,67,54,0.20)'
              : 'rgba(76,175,80,0.15)',
            border: `1px solid ${autoStartCountdown <= 3 ? '#F44336' : '#4CAF50'}`,
            borderRadius: 10, padding: '12px 16px',
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: 22, fontWeight: 900,
              color: autoStartCountdown <= 3 ? '#F44336' : '#4CAF50',
              letterSpacing: 1,
            }}>
              🚀 Игра начнётся через {autoStartCountdown}с
            </div>
            <div style={{ fontSize: 10, color: '#9E9E9E', marginTop: 4 }}>
              Двор полон — все игроки в сборе!
            </div>
            <div style={{
              height: 4, background: 'rgba(255,255,255,0.1)',
              borderRadius: 2, marginTop: 8, overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${(autoStartCountdown / 10) * 100}%`,
                background: autoStartCountdown <= 3 ? '#F44336' : '#4CAF50',
                borderRadius: 2,
                transition: 'width 1s linear, background 0.3s',
              }} />
            </div>
          </div>
        )}

        <div style={{ width: '100%', maxWidth: 380, display: 'flex', gap: 10 }}>
          <button onClick={onBack} style={secondaryBtn}>← Выйти</button>
          {!isQP && amHost && (
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
              {autoStartCountdown !== null ? `⏱ ${autoStartCountdown}с — Начать сейчас` : '🚀 Начать игру'}
            </button>
          )}
          {!isQP && !amHost && (
            <div style={{ flex: 2, color: '#666', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {autoStartCountdown !== null
                ? <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>🚀 Старт через {autoStartCountdown}с...</span>
                : 'Ожидание хоста...'}
            </div>
          )}
          {isQP && (
            <div style={{ flex: 2, color: '#FF8A65', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {quickCountdown !== null
                ? `⚡ Старт через ${quickCountdown}с...`
                : '⏳ Ожидание начала...'}
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
          Быстрый поиск или своя комната
        </div>
      </div>

      {/* Character + Name (shared for both modes) */}
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

      {/* §5.5 Quick Play — primary CTA */}
      <div style={{ width: '100%', maxWidth: 380, marginBottom: 20 }}>
        <button
          onClick={handleQuickJoin}
          disabled={connecting}
          style={{
            width: '100%', padding: '18px',
            background: connecting
              ? 'rgba(255,87,34,0.3)'
              : 'linear-gradient(135deg, #FF5722 0%, #FF8A65 100%)',
            border: 'none', borderRadius: 14,
            fontSize: 18, fontWeight: 900, color: '#FFF',
            cursor: connecting ? 'not-allowed' : 'pointer',
            letterSpacing: 2,
            boxShadow: '0 6px 24px rgba(255,87,34,0.5)',
            textTransform: 'uppercase' as const,
            marginBottom: 6,
          }}
        >
          ⚡ Быстрая игра
        </button>
        <div style={{ fontSize: 10, color: '#607D8B', textAlign: 'center' }}>
          Автоподбор 4 игроков · Старт без ожидания хоста
        </div>
      </div>

      {/* Divider */}
      <div style={{
        width: '100%', maxWidth: 380, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
      }}>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
        <div style={{ fontSize: 10, color: '#424242', letterSpacing: 1 }}>ИЛИ</div>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
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
        <button onClick={handleCreate} disabled={connecting} style={{ ...secondaryBtn, width: '100%' }}>
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

      {/* Reconnect banner */}
      {pendingSession && (
        <div style={{
          width: '100%', maxWidth: 380,
          background: 'rgba(76,175,80,0.15)',
          border: '1px solid rgba(76,175,80,0.5)',
          borderRadius: 12, padding: '14px 16px',
          marginBottom: 14,
        }}>
          <div style={{ fontSize: 13, color: '#A5D6A7', fontWeight: 700, marginBottom: 6 }}>
            🔄 Активная игра обнаружена
          </div>
          <div style={{ fontSize: 11, color: '#81C784', marginBottom: 10 }}>
            Комната {pendingSession.roomCode} · {pendingSession.gameStarted ? 'игра идёт' : 'лобби'}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => { handleReconnect(pendingSession); setPendingSession(null); }}
              style={{
                flex: 2, padding: '10px',
                background: 'linear-gradient(135deg, #4CAF50, #66BB6A)',
                border: 'none', borderRadius: 8,
                fontSize: 13, fontWeight: 700, color: '#FFF', cursor: 'pointer',
              }}
            >
              ↩ Вернуться
            </button>
            <button
              onClick={() => { clearSession(); setPendingSession(null); }}
              style={{
                flex: 1, padding: '10px',
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 8, fontSize: 12, color: '#9E9E9E', cursor: 'pointer',
              }}
            >
              ✕ Нет
            </button>
          </div>
        </div>
      )}

      <button onClick={() => { onBack(); clearSession(); }} style={{ ...secondaryBtn, maxWidth: 380, width: '100%' }}>
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
