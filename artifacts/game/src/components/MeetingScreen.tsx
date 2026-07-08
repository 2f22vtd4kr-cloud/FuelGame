import { useState, useCallback, useEffect, useRef } from 'react';
import type { GameState, Player } from '../game/types';
import { gs } from '../game/state';
import { triggerEmote } from '../game/logic';
import { submitVote, submitSkipDiscussion } from '../game/gameActions';
import { CHARACTERS } from '../data/characters';
import { audio } from '../game/audio';
import { t } from '../i18n/strings';

// ─── §2.7.6 Ejection Cinematic ────────────────────────────────────────────────

interface EjectionProps {
  ejectedId: string | null;
  ejectionText: string | null;
  timer: number;
  players: Player[];
}

function EjectionCinematic({ ejectedId, ejectionText, players }: EjectionProps) {
  const [phase, setPhase] = useState<'drop' | 'reveal'>('drop');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setPhase('drop');
    timerRef.current = setTimeout(() => setPhase('reveal'), 2200);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [ejectedId]);

  if (!ejectionText) {
    // No ejection — tie result
    return (
      <div style={{
        padding: '14px 24px',
        background: 'rgba(33,33,33,0.7)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        textAlign: 'center', fontSize: 13, color: '#ccc',
      }}>
        {ejectionText ?? 'Ничья! Никто не выброшен.'}
      </div>
    );
  }

  if (!ejectedId) {
    return (
      <div style={{
        padding: '14px 24px',
        background: 'rgba(33,33,33,0.7)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        textAlign: 'center', fontSize: 13, color: '#ccc',
      }}>
        {ejectionText}
      </div>
    );
  }

  const ejected = players.find(p => p.id === ejectedId);
  const charDef = ejected ? CHARACTERS[ejected.character] : null;

  return (
    <div style={{
      padding: '16px 24px',
      background: 'rgba(10,5,20,0.92)',
      borderTop: '1px solid rgba(229,57,53,0.35)',
      textAlign: 'center',
      overflow: 'hidden',
      minHeight: 130,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Trash chute + falling character */}
      <div style={{ position: 'relative', height: 90, width: '100%' }}>
        {/* Chute opening */}
        <div style={{
          position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
          width: 56, height: 18,
          background: 'rgba(80,40,10,0.9)',
          border: '2px solid #795548',
          borderRadius: '4px 4px 0 0',
          zIndex: 2,
        }} />
        {/* Falling character */}
        <div style={{
          position: 'absolute', left: '50%', transform: 'translateX(-50%)',
          top: phase === 'drop' ? 0 : 72,
          transition: phase === 'drop' ? 'top 1.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none',
          fontSize: 32,
          zIndex: 1,
          opacity: phase === 'reveal' ? 0 : 1,
        }}>
          {charDef?.emoji ?? '💀'}
        </div>
        {/* Chute body */}
        <div style={{
          position: 'absolute', top: 18, left: '50%', transform: 'translateX(-50%)',
          width: 50, height: 60,
          background: 'rgba(50,25,5,0.7)',
          border: '2px solid #4E342E',
          borderTop: 'none',
          borderRadius: '0 0 8px 8px',
          zIndex: 0,
        }} />
      </div>

      {/* Reveal text fades in */}
      <div style={{
        opacity: phase === 'reveal' ? 1 : 0,
        transition: 'opacity 0.6s ease',
        marginTop: 4,
      }}>
        <div style={{ fontSize: 32, marginBottom: 6 }}>{charDef?.emoji ?? '💀'}</div>
        <div style={{ fontSize: 13, fontWeight: 'bold', color: '#FF8A80', lineHeight: 1.4 }}>
          {ejectionText}
        </div>
      </div>
    </div>
  );
}

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

  // §13.1 Simplified chat wheel — show 6 phrases for new players, 12 for regulars
  const chatPhrases = state.simplifiedChatWheel ? QUICK_CHAT.slice(0, 6) : QUICK_CHAT;

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

  // Propaganda design tokens
  const P_RED = '#cc2b1d';
  const P_MUSTARD = '#e5a50a';
  const P_CREAM = '#f4ebd0';
  const P_BLACK = '#1a1a1a';

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: P_BLACK,
      display: 'flex', flexDirection: 'column',
      fontFamily: 'Oswald, sans-serif',
      color: P_CREAM, zIndex: 20, overflow: 'hidden',
    }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{
        padding: '10px 16px',
        background: P_RED,
        borderBottom: `4px solid ${P_BLACK}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1 }}>
            {MEETING_REASON_TEXT[meeting.reason] ?? t('meeting_title', state.language)}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', marginTop: 1, fontWeight: 700 }}>
            {caller?.name} созвал(а) собрание
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontSize: 28, fontWeight: 900,
            color: meeting.timer < 10 ? P_MUSTARD : '#fff',
            textShadow: meeting.timer < 10 ? `0 0 10px ${P_MUSTARD}` : 'none',
          }}>
            {Math.ceil(meeting.timer)}с
          </div>
          <div style={{
            fontSize: 9, color: 'rgba(255,255,255,0.7)',
            textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700,
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

          {/* §2.7.4 Skip discussion — majority vote to move to voting */}
          {meeting.phase === 'discussion' && (() => {
            const aliveCount = state.players.filter(p => p.isAlive).length;
            const skipCount = meeting.skipDiscussionVotes.length;
            const hasSkipped = meeting.skipDiscussionVotes.includes(state.localPlayerId);
            const needed = Math.floor(aliveCount / 2) + 1;
            return (
              <div style={{
                padding: '6px 10px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <button
                  onClick={() => !hasSkipped && submitSkipDiscussion(state.localPlayerId)}
                  disabled={hasSkipped}
                  style={{
                    flex: 1, minHeight: 44, padding: '6px', borderRadius: 8,
                    background: hasSkipped ? 'rgba(255,255,255,0.03)' : 'rgba(255,152,0,0.25)',
                    border: `1px solid ${hasSkipped ? 'rgba(255,255,255,0.08)' : 'rgba(255,152,0,0.5)'}`,
                    color: hasSkipped ? '#666' : '#FFB300',
                    cursor: hasSkipped ? 'default' : 'pointer', fontSize: 11,
                  }}
                >
                  {hasSkipped ? '✓ Вы хотите перейти к голосованию' : '⏭️ К голосованию'}
                </button>
                <div style={{ fontSize: 10, color: '#888', whiteSpace: 'nowrap' }}>
                  {skipCount}/{needed}
                </div>
              </div>
            );
          })()}

          {/* Quick-chat panel */}
          {meeting.phase === 'discussion' && (
            <div style={{ padding: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              {!showQuickChat ? (
                <button
                  onClick={() => setShowQuickChat(true)}
                  style={{
                    width: '100%', minHeight: 44, padding: '8px', borderRadius: 8,
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
                    maxHeight: 220, overflowY: 'auto',
                  }}>
                    {chatPhrases.map((qc, i) => (
                      <button
                        key={i}
                        onClick={() => handleQuickChat(qc.text)}
                        style={{
                          // §13.1 44px minimum touch target
                          minHeight: 44, padding: '5px 6px', borderRadius: 6, fontSize: 9,
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
                      marginTop: 5, width: '100%', minHeight: 44, padding: '4px', fontSize: 9,
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

      {/* ── Reveal panel — §2.7.6 trash-chute ejection cinematic ─────────────── */}
      {meeting.phase === 'reveal' && (
        <EjectionCinematic
          ejectedId={meeting.ejectedId}
          ejectionText={meeting.ejectionText}
          timer={meeting.timer}
          players={state.players}
        />
      )}

      {/* ── §13.1 Subtitle strip — last chat message shown prominently ─────── */}
      {meeting.phase !== 'reveal' && meeting.chatMessages.length > 0 && (() => {
        const last = meeting.chatMessages[meeting.chatMessages.length - 1];
        const sender = state.players.find(p => p.id === last.playerId);
        const charDef = sender ? CHARACTERS[sender.character] : null;
        const tScale = state.textSize === 'large' ? 1.3 : state.textSize === 'small' ? 0.82 : 1.0;
        const avatarSz = Math.round(22 * tScale);
        return (
          <div style={{
            padding: `${Math.round(6 * tScale)}px 20px`,
            background: state.textSize === 'large' ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.4)',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <div style={{
              width: avatarSz, height: avatarSz, borderRadius: '50%', flexShrink: 0,
              background: charDef?.color ?? '#555',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: Math.round(11 * tScale),
            }}>
              {charDef?.emoji ?? '?'}
            </div>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: Math.round(11 * tScale), color: charDef?.color ?? '#aaa', fontWeight: 'bold' }}>
                {last.playerName}:{' '}
              </span>
              <span style={{ fontSize: Math.round(13 * tScale), color: '#eee' }}>{last.text}</span>
            </div>
          </div>
        );
      })()}

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
