import React, { useState, useEffect } from 'react';
import type { GameState } from '../game/types';
import { CHARACTERS } from '../data/characters';
import { gs as gameState } from '../game/state';
import { submitVote } from '../game/logic';

interface Props {
  gs: GameState;
}

export default function MeetingScreen({ gs }: Props) {
  const m = gs.meeting;
  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    setHasVoted(false);
  }, [m?.phase]);

  if (!m) return null;

  const localPlayer = gs.players.find(p => p.id === gs.localPlayerId);
  const alivePlayers = gs.players.filter(p => p.isAlive);
  const caller = gs.players.find(p => p.id === m.callerId);
  const ejected = m.ejectedId ? gs.players.find(p => p.id === m.ejectedId) : null;

  const timerColor = m.timer < 10 ? '#F44336' : m.timer < 20 ? '#FFC107' : '#4CAF50';

  function handleVote(targetId: string | null) {
    if (hasVoted || m!.phase !== 'voting') return;
    submitVote(gs.localPlayerId, targetId);
    setHasVoted(true);
  }

  const myVote = m.votes.find(v => v.voterId === gs.localPlayerId);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(10,10,20,0.93)',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'sans-serif',
      overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 16px 8px',
        background: 'linear-gradient(180deg, #1A1A2E, transparent)',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 28, marginBottom: 4 }}>⚠️</div>
        <div style={{ fontSize: 18, fontWeight: 'bold', color: '#FFF', letterSpacing: 1 }}>
          СХОДКА
        </div>
        <div style={{ fontSize: 12, color: '#9E9E9E', marginTop: 2 }}>
          {caller ? `${caller.name} вызвал(а) собрание` : 'Собрание созвано'}
        </div>

        {/* Phase + Timer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 10 }}>
          <div style={{
            fontSize: 12, fontWeight: 'bold',
            color: m.phase === 'discussion' ? '#64B5F6' : m.phase === 'voting' ? '#FFB74D' : '#EF9A9A',
            background: 'rgba(255,255,255,0.08)',
            padding: '4px 12px', borderRadius: 20,
          }}>
            {m.phase === 'discussion' ? '💬 ОБСУЖДЕНИЕ' : m.phase === 'voting' ? '🗳️ ГОЛОСОВАНИЕ' : '📢 РЕЗУЛЬТАТ'}
          </div>
          <div style={{
            fontSize: 22, fontWeight: 'bold', color: timerColor,
            fontFamily: 'monospace',
            minWidth: 50, textAlign: 'center',
          }}>
            {Math.ceil(m.timer)}с
          </div>
        </div>
      </div>

      {/* REVEAL phase */}
      {m.phase === 'reveal' && (
        <div style={{
          margin: '20px 16px',
          background: ejected ? 'rgba(183,28,28,0.3)' : 'rgba(0,0,0,0.3)',
          borderRadius: 16,
          padding: '20px 16px',
          textAlign: 'center',
          border: `2px solid ${ejected ? '#EF5350' : '#555'}`,
        }}>
          {ejected ? (
            <>
              <div style={{ fontSize: 48, marginBottom: 8 }}>
                {CHARACTERS[ejected.character].emoji}
              </div>
              <div style={{ fontSize: 16, color: '#FFF', fontWeight: 'bold', marginBottom: 8 }}>
                {ejected.name} выброшен(а) из двора!
              </div>
              {m.ejectionText && (
                <div style={{ fontSize: 13, color: '#BDBDBD', fontStyle: 'italic', lineHeight: 1.4 }}>
                  "{m.ejectionText}"
                </div>
              )}
              <div style={{ marginTop: 16, fontSize: 22, color: ejected.role === 'slivshchik' ? '#EF5350' : '#66BB6A' }}>
                {ejected.role === 'slivshchik' ? '✅ Сливщик пойман!' : '❌ Это был невиновный...'}
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 40 }}>🤷</div>
              <div style={{ fontSize: 15, color: '#FFF', fontWeight: 'bold', marginTop: 8 }}>
                {m.ejectionText}
              </div>
            </>
          )}
        </div>
      )}

      {/* Chat messages */}
      {(m.phase === 'discussion' || m.phase === 'voting') && m.chatMessages.length > 0 && (
        <div style={{
          margin: '8px 16px',
          background: 'rgba(255,255,255,0.04)',
          borderRadius: 12, padding: '8px 12px',
          maxHeight: 140, overflowY: 'auto',
        }}>
          {m.chatMessages.map((msg, i) => {
            const char = gs.players.find(p => p.id === msg.playerId);
            const color = char ? CHARACTERS[char.character].color : '#FFF';
            return (
              <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 5, alignItems: 'flex-start' }}>
                <div style={{ color, fontSize: 11, fontWeight: 'bold', whiteSpace: 'nowrap', minWidth: 60 }}>
                  {msg.playerName}:
                </div>
                <div style={{ fontSize: 11, color: '#E0E0E0', lineHeight: 1.3 }}>{msg.text}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Player grid — voting targets */}
      {(m.phase === 'discussion' || m.phase === 'voting') && (
        <div style={{ margin: '8px 16px', flex: 1 }}>
          <div style={{ fontSize: 11, color: '#9E9E9E', marginBottom: 8, textAlign: 'center' }}>
            {m.phase === 'voting'
              ? hasVoted ? `✅ Ты проголосовал(а)${myVote?.targetId ? ` за ${gs.players.find(p=>p.id===myVote.targetId)?.name}` : ' (пропуск)'}` : 'Выбери подозреваемого:'
              : 'Обсуждение...'}
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 8,
          }}>
            {alivePlayers.map(player => {
              const charDef = CHARACTERS[player.character];
              const isSelf = player.id === gs.localPlayerId;
              const votedFor = m.votes.find(v => v.targetId === player.id);
              const voteCount = m.votes.filter(v => v.targetId === player.id).length;
              const myVoteIsThis = myVote?.targetId === player.id;
              const canVote = m.phase === 'voting' && !hasVoted && !isSelf && localPlayer?.isAlive;

              return (
                <button
                  key={player.id}
                  onClick={() => canVote && handleVote(player.id)}
                  disabled={!canVote}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: 4, padding: '8px 4px',
                    background: myVoteIsThis
                      ? 'rgba(244,67,54,0.3)'
                      : 'rgba(255,255,255,0.06)',
                    border: myVoteIsThis
                      ? '2px solid #EF5350'
                      : isSelf
                      ? '2px solid rgba(255,215,0,0.4)'
                      : '2px solid transparent',
                    borderRadius: 10,
                    cursor: canVote ? 'pointer' : 'default',
                    opacity: isSelf ? 0.6 : 1,
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ fontSize: 24 }}>{charDef.emoji}</div>
                  <div style={{
                    fontSize: 9, color: '#FFF', fontWeight: 'bold',
                    textAlign: 'center', lineHeight: 1.2,
                  }}>
                    {player.name}
                    {isSelf && ' (я)'}
                  </div>
                  {voteCount > 0 && (
                    <div style={{
                      fontSize: 10, color: '#EF5350', fontWeight: 'bold',
                      background: 'rgba(244,67,54,0.2)',
                      borderRadius: 8, padding: '1px 6px',
                    }}>
                      {voteCount}🗳️
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Skip vote button */}
          {m.phase === 'voting' && !hasVoted && localPlayer?.isAlive && (
            <button
              onClick={() => handleVote(null)}
              style={{
                width: '100%', marginTop: 10, padding: '10px',
                background: 'rgba(255,255,255,0.08)',
                border: '1.5px solid rgba(255,255,255,0.2)',
                borderRadius: 10, color: '#9E9E9E', fontSize: 12,
                cursor: 'pointer',
              }}
            >
              ⏭️ Пропустить голосование
            </button>
          )}
        </div>
      )}

      {/* Vote tally (visible during voting) */}
      {m.phase === 'voting' && m.votes.length > 0 && (
        <div style={{ padding: '8px 16px', fontSize: 10, color: '#757575', textAlign: 'center' }}>
          Проголосовало: {m.votes.length} / {alivePlayers.length}
        </div>
      )}
    </div>
  );
}
