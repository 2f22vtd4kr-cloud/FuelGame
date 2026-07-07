import { useState, useCallback, useEffect } from 'react';
import type { GameState } from '../game/types';
import { gs } from '../game/state';
import { triggerEmote } from '../game/logic';
import { submitVote } from '../game/gameActions';
import { CHARACTERS } from '../data/characters';
import { audio } from '../game/audio';

interface MeetingScreenProps {
  state: GameState;
}

// ── Quick-chat phrases (§2.7.5 — 12 phrases, clock positions 12→11) ────────

const QUICK_CHAT = [
  { text: 'Я был у шавермы!', emoji: '🌯' },             // 12
  { text: 'Вова смотрел на мой бак!', emoji: '🚗' },      // 1
  { text: 'Слива! Слива!', emoji: '⚡' },                  // 2
  { text: 'Я видел Серёжу у мусорок.', emoji: '🗑️' },     // 3
  { text: 'Где ты был последние 30 секунд?', emoji: '🤔' },// 4
  { text: 'Это не я, честно!', emoji: '🙅' },              // 5
  { text: 'Давайте пропустим и сыграем.', emoji: '⏭️' },   // 6
  { text: 'У меня есть алиби.', emoji: '📜' },             // 7
  { text: 'Кто-то только что ушёл от меня.', emoji: '🏃' },// 8
  { text: 'Я выполнял задачу.', emoji: '✅' },             // 9
  { text: 'Почему ты молчал?', emoji: '🙄' },              // 10
  { text: 'Я видел канистру!', emoji: '🪣' },              // 11
];

const MEETING_REASON_TEXT: Record<string, string> = {
  alarm:       'Созвано собрание',
  body:        '💀 Обнаружено тело!',
  drained_car: '🪣 Слив обнаружен!',
};

export default function MeetingScreen({ state }: MeetingScreenProps) {
  const meeting = state.meeting;
  if (!meeting) return null;

  const [showQuickChat, setShowQuickChat] = useState(false);
  const [myVote, setMyVote] = useState<string | 'skip' | null>(null);

  // Reset local UI state whenever a new meeting starts
  useEffect(() => {
    setMyVote(null);
    setShowQuickChat(false);
  }, [meeting?.meetingId]);

  const localPlayer = state.players.find(p => p.id === state.localPlayerId);
  const alive = state.players.filter(p => p.isAlive);

  const handleVote = useCallback((targetId: string | null) => {
    if (myVote !== null) return;
    submitVote(state.localPlayerId, targetId);
    setMyVote(targetId ?? 'skip');
    audio.play('vote_cast');
  }, [myVote, state.localPlayerId]);

  const handleQuickChat = useCallback((phrase: string) => {
    if (!gs.meeting) return;
    const caller = state.players.find(p => p.id === state.localPlayerId);
    gs.meeting.chatMessages.push({
      playerId: state.localPlayerId,
      playerName: caller?.name ?? '???',
      text: phrase,
      timestamp: Date.now(),
    });
    if (caller) triggerEmote(caller.id, '💬');
    audio.play('ui_click');
    setShowQuickChat(false);
  }, [state.localPlayerId, state.players]);

  const getVotesFor = (playerId: string) =>
    meeting.votes.filter(v => v.targetId === playerId).length;

  const caller = state.players.find(p => p.id === meeting.callerId);

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'linear-gradient(180deg, #0D0D1A 0%, #1A0A28 100%)',
      display: 'flex', flexDirection: 'column',
      fontFamily: '"Segoe UI", Arial, sans-serif',
      color: '#fff', zIndex: 20, overflow: 'hidden',
    }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{
        padding: '16px 20px 12px',
        background: 'rgba(0,0,0,0.5)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 'bold' }}>
            {MEETING_REASON_TEXT[meeting.reason] ?? '📢 СХОДКА'}
          </div>
          <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>
            {caller?.name} созвал(а) собрание
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontSize: 24, fontWeight: 'bold',
            color: meeting.timer < 10 ? '#FF5252' : '#FFD700',
          }}>
            {Math.ceil(meeting.timer)}с
          </div>
          <div style={{
            fontSize: 10, color: '#aaa',
            textTransform: 'uppercase', letterSpacing: 1,
          }}>
            {meeting.phase === 'discussion' ? 'Обсуждение' :
             meeting.phase === 'voting' ? 'Голосование' : 'Итог'}
          </div>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', gap: 0, overflow: 'hidden', minHeight: 0 }}>

        {/* Left: players grid */}
        <div style={{
          width: '55%', padding: '12px',
          display: 'flex', flexDirection: 'column', gap: 8,
          overflowY: 'auto',
        }}>
          {alive.map(p => {
            const charDef = CHARACTERS[p.character];
            const votes = getVotesFor(p.id);
            const isMine = p.id === state.localPlayerId;
            const hasVoted = meeting.votes.some(v => v.voterId === state.localPlayerId);
            const myVoteTarget = meeting.votes.find(v => v.voterId === state.localPlayerId);
            const isMyTarget = myVoteTarget?.targetId === p.id;
            const canVoteThis = !isMine && meeting.phase === 'voting' && !hasVoted;

            return (
              <div
                key={p.id}
                onClick={() => canVoteThis && handleVote(p.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', borderRadius: 10,
                  background: isMyTarget
                    ? 'rgba(229,57,53,0.3)'
                    : isMine
                    ? 'rgba(255,215,0,0.1)'
                    : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${
                    isMyTarget ? '#E53935' :
                    isMine ? 'rgba(255,215,0,0.3)' :
                    'rgba(255,255,255,0.08)'
                  }`,
                  cursor: canVoteThis ? 'pointer' : 'default',
                  transition: 'all 0.15s',
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: 34, height: 34, borderRadius: '50%',
                  background: charDef.color,
                  border: `2px solid ${isMine ? '#FFD700' : 'rgba(255,255,255,0.2)'}`,
                  flexShrink: 0, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 14,
                }}>
                  {charDef.emoji}
                </div>

                {/* Name + role hint */}
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 500,
                    color: isMine ? '#FFD700' : '#fff',
                  }}>
                    {p.name} {isMine && '(ты)'}
                  </div>
                  {/* Only reveal the ejected player's role per §2.7.4 */}
                  {meeting.phase === 'reveal' && meeting.ejectedId === p.id && (
                    <div style={{
                      fontSize: 10,
                      color: p.role === 'slivshchik' ? '#FF5252' : '#4CAF50',
                    }}>
                      {p.role === 'slivshchik' ? '🪣 Сливщик' : '🏠 Хозяин'}
                    </div>
                  )}
                </div>

                {/* Vote count chips — hidden during voting, shown only at reveal (§2.7.4) */}
                {meeting.phase === 'reveal' && votes > 0 && (
                  <div style={{
                    background: 'rgba(229,57,53,0.6)', color: '#fff',
                    borderRadius: 10, padding: '2px 8px', fontSize: 11, fontWeight: 'bold',
                  }}>
                    {votes}
                  </div>
                )}

                {/* Check/vote indicator */}
                {meeting.votes.map(v => v.voterId).includes(p.id) && (
                  <div style={{ fontSize: 10, color: '#aaa' }}>✓голос</div>
                )}
              </div>
            );
          })}

          {/* Dead players */}
          {state.players.filter(p => !p.isAlive).map(p => {
            const charDef = CHARACTERS[p.character];
            return (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '6px 12px', borderRadius: 10,
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid rgba(255,255,255,0.04)',
                opacity: 0.5,
              }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: charDef.color, opacity: 0.5,
                  flexShrink: 0,
                }} />
                <div style={{ fontSize: 11, color: '#666', textDecoration: 'line-through' }}>
                  {p.name}
                </div>
                <div style={{ fontSize: 10, color: '#555' }}>💀</div>
              </div>
            );
          })}

          {/* Skip vote button */}
          {meeting.phase === 'voting' && !meeting.votes.some(v => v.voterId === state.localPlayerId) && (
            <button
              onClick={() => handleVote(null)}
              style={{
                marginTop: 4, padding: '8px', borderRadius: 8,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#aaa', cursor: 'pointer', fontSize: 12,
              }}
            >
              ⏭️ Пропустить
            </button>
          )}
        </div>

        {/* Right: chat log + quick-chat */}
        <div style={{
          width: '45%', display: 'flex', flexDirection: 'column',
          borderLeft: '1px solid rgba(255,255,255,0.06)',
          overflow: 'hidden',
        }}>
          {/* Chat messages */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '10px',
            display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            {meeting.chatMessages.map((msg, i) => {
              const sender = state.players.find(p => p.id === msg.playerId);
              const charDef = sender ? CHARACTERS[sender.character] : null;
              return (
                <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                    background: charDef?.color ?? '#555',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10,
                  }}>
                    {charDef?.emoji ?? '?'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 9, color: '#888' }}>{msg.playerName}</div>
                    <div style={{
                      fontSize: 11, color: '#ddd',
                      background: 'rgba(255,255,255,0.06)',
                      padding: '3px 7px', borderRadius: 6, marginTop: 1,
                    }}>
                      {msg.text}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick-chat panel */}
          {meeting.phase === 'discussion' && (
            <div style={{ padding: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              {!showQuickChat ? (
                <button
                  onClick={() => setShowQuickChat(true)}
                  style={{
                    width: '100%', padding: '8px', borderRadius: 8,
                    background: 'rgba(99,102,241,0.3)',
                    border: '1px solid rgba(99,102,241,0.5)',
                    color: '#fff', cursor: 'pointer', fontSize: 12,
                  }}
                >
                  💬 Быстрый чат
                </button>
              ) : (
                <div>
                  <div style={{
                    fontSize: 9, color: '#aaa', marginBottom: 6, textAlign: 'center',
                  }}>
                    БЫСТРЫЕ ФРАЗЫ (§2.7.5)
                  </div>
                  <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4,
                    maxHeight: 200, overflowY: 'auto',
                  }}>
                    {QUICK_CHAT.map((qc, i) => (
                      <button
                        key={i}
                        onClick={() => handleQuickChat(qc.text)}
                        style={{
                          padding: '5px 6px', borderRadius: 6, fontSize: 9,
                          background: 'rgba(255,255,255,0.07)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          color: '#ddd', cursor: 'pointer', textAlign: 'left',
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}
                      >
                        <span>{qc.emoji}</span>
                        <span style={{ flex: 1 }}>{qc.text}</span>
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setShowQuickChat(false)}
                    style={{
                      marginTop: 5, width: '100%', padding: '4px', fontSize: 9,
                      background: 'transparent', border: 'none', color: '#888', cursor: 'pointer',
                    }}
                  >
                    ✕ закрыть
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Reveal panel ─────────────────────────────────────────────────────── */}
      {meeting.phase === 'reveal' && meeting.ejectedId !== null && meeting.ejectionText && (
        <div style={{
          padding: '16px 24px',
          background: 'rgba(183,28,28,0.5)',
          borderTop: '1px solid rgba(229,57,53,0.4)',
          textAlign: 'center',
        }}>
          {(() => {
            const ejected = state.players.find(p => p.id === meeting.ejectedId);
            const charDef = ejected ? CHARACTERS[ejected.character] : null;
            return (
              <>
                <div style={{ fontSize: 32, marginBottom: 6 }}>
                  {charDef?.emoji ?? '💀'}
                </div>
                <div style={{ fontSize: 14, fontWeight: 'bold', color: '#FF8A80' }}>
                  {meeting.ejectionText}
                </div>
              </>
            );
          })()}
        </div>
      )}

      {meeting.phase === 'reveal' && meeting.ejectedId === null && meeting.ejectionText && (
        <div style={{
          padding: '14px 24px',
          background: 'rgba(33,33,33,0.7)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          textAlign: 'center', fontSize: 13, color: '#ccc',
        }}>
          {meeting.ejectionText}
        </div>
      )}

      {/* ── Canisters evidence note ─────────────────────────────────────────── */}
      {state.canisters.length > 0 && meeting.phase !== 'reveal' && (
        <div style={{
          padding: '6px 20px',
          background: 'rgba(245,166,35,0.15)',
          borderTop: '1px solid rgba(245,166,35,0.3)',
          fontSize: 11, color: '#F5A623', textAlign: 'center',
        }}>
          🪣 Найдено {state.canisters.length} канистр(ы) — учитывайте при голосовании!
        </div>
      )}

      {/* ── Bodies evidence note ─────────────────────────────────────────────── */}
      {state.bodies.length > 0 && meeting.phase !== 'reveal' && (
        <div style={{
          padding: '6px 20px',
          background: 'rgba(183,28,28,0.15)',
          borderTop: '1px solid rgba(183,28,28,0.3)',
          fontSize: 11, color: '#FF8A80', textAlign: 'center',
        }}>
          💀 Обнаружено {state.bodies.filter(b => b.reportedBy !== null).length} тел — кто рядом?
        </div>
      )}
    </div>
  );
}
