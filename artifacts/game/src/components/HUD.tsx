import { useState } from 'react';
import type { GameState, SabotageKey } from '../game/types';
import { SPRINT_MAX, SABOTAGE_LABELS, SABOTAGE_COOLDOWNS, SABOTAGE_DURATIONS, SIPHON_AUDIO_RADIUS } from '../game/types';
import { NEWS_HEADLINES } from '../data/ticker';
import { CHARACTERS } from '../data/characters';
import { triggerSabotage, triggerEmote, PLAY_EMOTES, triggerBarsikMeow, investigateBody, janitorCollectCanister } from '../game/logic';
import { gs } from '../game/state';
import TaskMiniGame from './TaskMiniGame';

interface HUDProps {
  state: GameState;
}

const SABOTAGE_KEYS: SabotageKey[] = ['alarm_chaos', 'chat_offline', 'babushka_cerberus', 'pipe_burst'];

export default function HUD({ state }: HUDProps) {
  const [showSabotageMenu, setShowSabotageMenu] = useState(false);
  const [showEmoteWheel, setShowEmoteWheel] = useState(false);
  const [showObjective, setShowObjective] = useState(false);

  const localPlayer = state.players.find(p => p.id === state.localPlayerId);
  if (!localPlayer) return null;

  const isSlivshchik = localPlayer.role === 'slivshchik';
  const aliveSlivshchiki = state.players.filter(p => p.isAlive && p.role === 'slivshchik').length;
  const aliveKhozaeva = state.players.filter(p => p.isAlive && p.role === 'khozain').length;
  const staminaPct = (localPlayer.stamina / SPRINT_MAX) * 100;
  const sabotageCooldown = localPlayer.sabotageCooldown;

  // §13.1 Siphon audio indicator — any active siphon (phase 2) within 8m
  const nearAudioSiphon = state.cars.some(c =>
    c.siphonPhase === 2 &&
    Math.hypot(c.pos.x - localPlayer.pos.x, c.pos.y - localPlayer.pos.y) <= SIPHON_AUDIO_RADIUS,
  );

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      pointerEvents: 'none', zIndex: 10,
    }}>
      {/* ── §2.5 Task mini-game overlay (full priority, intercepts pointer events) ── */}
      {state.activeMiniGame && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'all', zIndex: 100,
        }}>
          <TaskMiniGame mg={state.activeMiniGame} />
        </div>
      )}

      {/* ── §2.9 Active sabotage banners ── */}
      {state.activeSabotages.length > 0 && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          display: 'flex', flexDirection: 'column', gap: 0,
          pointerEvents: 'none',
        }}>
          {state.activeSabotages.map(sab => {
            const isPipeBurst = sab.key === 'pipe_burst';
            const urgency = sab.timer < 15 ? '#F44336' : isPipeBurst ? '#FF5722' : '#FF9800';
            const v1Pct = Math.min(100, (sab.valve1Progress / 3) * 100);
            const v2Pct = Math.min(100, (sab.valve2Progress / 3) * 100);
            return (
              <div key={sab.id} style={{
                background: `rgba(${isPipeBurst ? '183,28,28' : '230,81,0'},0.92)`,
                borderBottom: `1px solid ${urgency}`,
                padding: '4px 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                fontSize: 11, color: '#fff', fontWeight: isPipeBurst ? 'bold' : 'normal',
              }}>
                <span>{SABOTAGE_LABELS[sab.key]}</span>
                {isPipeBurst && (
                  <span style={{ fontSize: 10 }}>
                    Вентиль 1: {Math.round(v1Pct)}% | Вентиль 2: {Math.round(v2Pct)}%
                  </span>
                )}
                <span style={{ color: urgency, fontWeight: 'bold' }}>
                  ⏱ {Math.ceil(sab.timer)}с
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Top bar ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        padding: `${state.activeSabotages.length > 0 ? 22 * state.activeSabotages.length + 8 : 8}px 12px 8px`,
        gap: 8,
      }}>

        {/* Unity meter */}
        <div style={{ flex: 1, maxWidth: 220 }}>
          <div style={{ fontSize: 10, color: '#aaa', marginBottom: 3, textShadow: '0 1px 2px #000' }}>
            🤝 ЕДИНСТВО ДВОРА
          </div>
          <div style={{
            height: 14, background: 'rgba(0,0,0,0.55)', borderRadius: 7,
            border: '1px solid rgba(255,255,255,0.15)', overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${state.unityMeter}%`,
              background: 'linear-gradient(90deg, #4CAF50, #8BC34A)',
              borderRadius: 7, transition: 'width 0.3s',
            }} />
          </div>
          <div style={{ fontSize: 9, color: '#8BC34A', marginTop: 1, textShadow: '0 1px 2px #000' }}>
            {Math.round(state.unityMeter)}% / 100%
          </div>
        </div>

        {/* Center: role badge + match clock */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            display: 'inline-block',
            padding: '4px 10px',
            borderRadius: 20,
            background: isSlivshchik ? 'rgba(183,28,28,0.85)' : 'rgba(21,101,192,0.85)',
            border: `1px solid ${isSlivshchik ? '#E53935' : '#1565C0'}`,
            fontSize: 12, fontWeight: 'bold', color: '#fff',
            textShadow: '0 1px 2px rgba(0,0,0,0.8)',
          }}>
            {isSlivshchik ? '🪣 СЛИВЩИК' : '🏠 ХОЗЯИН'}
            {localPlayer.neutralRole === 'barsik' && ' 😺'}
            {localPlayer.neutralRole === 'policeman' && ' 🕵️'}
            {localPlayer.neutralRole === 'janitor' && ' 🧹'}
          </div>
          {/* §2.1 Match time limit countdown */}
          {(() => {
            const tleft = state.matchTimeLimit;
            const mins = Math.floor(tleft / 60).toString().padStart(2, '0');
            const secs = Math.floor(tleft % 60).toString().padStart(2, '0');
            const urgent = tleft < 60;
            return (
              <div style={{
                fontSize: 10, fontWeight: 'bold', marginTop: 2,
                color: urgent ? '#FF5252' : '#ccc',
                textShadow: '0 1px 2px #000',
                animation: urgent && Math.floor(tleft) % 2 === 0 ? 'none' : undefined,
              }}>
                ⏱ {mins}:{secs}
              </div>
            );
          })()}
        </div>

        {/* Car fuel bars */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 9, color: '#aaa', marginBottom: 3, textShadow: '0 1px 2px #000' }}>
            🚗 БАКИ
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {state.cars.map(car => {
              const fuelPct = car.fuel;
              const color = fuelPct > 40 ? '#4CAF50' : fuelPct > 20 ? '#FF9800' : '#F44336';
              return (
                <div key={car.id} style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end' }}>
                  <div style={{ fontSize: 9, color: '#ccc', minWidth: 24 }}>
                    {Math.round(fuelPct)}%
                  </div>
                  <div style={{
                    width: 60, height: 7,
                    background: 'rgba(0,0,0,0.55)', borderRadius: 4,
                    border: '1px solid rgba(255,255,255,0.12)', overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%', width: `${fuelPct}%`,
                      background: color, borderRadius: 4, transition: 'width 0.2s',
                    }} />
                  </div>
                  {car.siphonPhase === 2 && (
                    <span style={{ fontSize: 10, color: '#FF1744' }}>🪣</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Stamina bar ── */}
      {(localPlayer.isSprinting || localPlayer.stamina < SPRINT_MAX - 0.1) && (
        <div style={{ padding: '0 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10, color: localPlayer.isSprinting ? '#FFD700' : '#aaa' }}>
              {localPlayer.isSprinting ? '🏃 СПРИНТ' : '😮‍💨 УСТАЛОСТЬ'}
            </span>
            <div style={{
              flex: 1, maxWidth: 120, height: 6,
              background: 'rgba(0,0,0,0.5)', borderRadius: 3,
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <div style={{
                height: '100%', width: `${staminaPct}%`,
                background: localPlayer.isSprinting ? '#FFD700' : '#81D4FA',
                borderRadius: 3, transition: 'width 0.1s',
              }} />
            </div>
          </div>
        </div>
      )}

      {/* ── Prompt ── */}
      {state.promptText && !state.activeMiniGame && (
        <div style={{ textAlign: 'center', padding: '6px 0' }}>
          <div style={{
            display: 'inline-block',
            background: 'rgba(0,0,0,0.75)',
            padding: '6px 16px', borderRadius: 20,
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#fff', fontSize: 13, fontWeight: 500,
            textShadow: '0 1px 3px rgba(0,0,0,0.8)',
          }}>
            {state.promptText}
          </div>
        </div>
      )}

      {/* ── Alive counters ── */}
      <div style={{ position: 'absolute', top: 70, left: 12 }}>
        <div style={{
          background: 'rgba(0,0,0,0.6)', borderRadius: 8,
          padding: '4px 10px', border: '1px solid rgba(255,255,255,0.1)',
          fontSize: 11, color: '#ccc',
        }}>
          🏠 {aliveKhozaeva} {isSlivshchik && <span style={{ color: '#FF5252' }}>🪣 {aliveSlivshchiki}</span>}
          {!isSlivshchik && <span style={{ color: '#aaa' }}> (из {state.players.length})</span>}
        </div>
      </div>

      {/* ── Bodies found indicator ── */}
      {state.bodies.length > 0 && (
        <div style={{ position: 'absolute', top: 70, right: 12 }}>
          <div style={{
            background: 'rgba(183,28,28,0.75)', borderRadius: 8,
            padding: '4px 10px', border: '1px solid rgba(255,255,255,0.1)',
            fontSize: 11, color: '#fff',
          }}>
            💀 {state.bodies.length} тел
          </div>
        </div>
      )}

      {/* ── §13.1 "Что делать?" objective button ── */}
      {localPlayer.isAlive && (
        <div style={{ position: 'absolute', top: 100, right: 12, pointerEvents: 'all' }}>
          <button
            onClick={() => setShowObjective(o => !o)}
            style={{
              background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 8, padding: '5px 10px',
              fontSize: 10, color: '#ccc', cursor: 'pointer',
            }}
          >
            ❓ Что делать?
          </button>
          {showObjective && (
            <div style={{
              position: 'absolute', top: 34, right: 0,
              background: 'rgba(10,10,20,0.97)', border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 12, padding: '12px 14px',
              width: 220, fontSize: 11, color: '#ccc', lineHeight: 1.6,
              boxShadow: '0 4px 20px rgba(0,0,0,0.8)',
              zIndex: 50,
            }}>
              {isSlivshchik ? (
                <>
                  <div style={{ color: '#F44336', fontWeight: 'bold', marginBottom: 6 }}>🪣 Ты — Сливщик</div>
                  <div>• Подойди к машине [удерживай E] → сливай бензин</div>
                  <div>• Подними канистру после слива</div>
                  <div>• Выброси канистру у мусорки</div>
                  <div>• Делай вид, что выполняешь задачи</div>
                  <div>• Вызывай диверсии через кнопку 🔧</div>
                  <div>• Устраивай засаду, когда никого нет рядом</div>
                </>
              ) : (
                <>
                  <div style={{ color: '#4CAF50', fontWeight: 'bold', marginBottom: 6 }}>🏠 Ты — Хозяин</div>
                  <div>• Выполняй задачи → заполняй метр единства</div>
                  <div>• Следи за уровнем бензина в машинах</div>
                  <div>• Подойди к арке [E] → вызвать сходку</div>
                  <div>• На сходке — голосуй за подозреваемых</div>
                  <div>• Выгони всех сливщиков или доведи метр до 100%</div>
                </>
              )}
              <div style={{ marginTop: 8, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 6, fontSize: 9, color: '#616161' }}>
                Нажми снова чтобы закрыть
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Player list ── */}
      <div style={{
        position: 'absolute', top: 100, left: 12,
        display: 'flex', flexDirection: 'column', gap: 3,
        maxHeight: 220, overflowY: 'hidden',
      }}>
        {state.players.map(p => {
          const charDef = CHARACTERS[p.character];
          const isLocal = p.id === state.localPlayerId;
          const showAsSlivshchik = isLocal || (isSlivshchik && p.role === 'slivshchik');
          return (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 5, opacity: p.isAlive ? 1 : 0.4 }}>
              <div style={{
                width: 10, height: 10, borderRadius: '50%',
                background: charDef.color,
                border: isLocal ? '2px solid #FFD700' : '1px solid rgba(255,255,255,0.3)',
                flexShrink: 0,
              }} />
              <div style={{
                fontSize: 9,
                color: p.isAlive ? (isLocal ? '#FFD700' : '#ccc') : '#666',
                textShadow: '0 1px 2px rgba(0,0,0,0.9)',
                textDecoration: p.isAlive ? 'none' : 'line-through',
              }}>
                {p.name}
                {!p.isAlive && ' 💀'}
                {showAsSlivshchik && p.role === 'slivshchik' && (
                  <span style={{ color: '#FF5252', marginLeft: 3 }}>🪣</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── §2.9 Slivshchik sabotage menu button ── */}
      {isSlivshchik && localPlayer.isAlive && (
        <div style={{
          position: 'absolute', bottom: 120, right: 16,
          pointerEvents: 'all',
        }}>
          {/* Sabotage panel */}
          {showSabotageMenu && (
            <div style={{
              position: 'absolute', bottom: 52, right: 0,
              background: 'rgba(10,10,20,0.97)',
              border: '1px solid rgba(183,28,28,0.5)',
              borderRadius: 14,
              padding: '10px 12px',
              minWidth: 220,
              boxShadow: '0 4px 24px rgba(0,0,0,0.8)',
              display: 'flex', flexDirection: 'column', gap: 7,
            }}>
              <div style={{ fontSize: 11, color: '#E53935', fontWeight: 'bold', marginBottom: 2 }}>
                🔧 ДИВЕРСИИ
              </div>
              {SABOTAGE_KEYS.map(key => {
                const isActive = state.activeSabotages.some(s => s.key === key && !s.isResolved);
                const onCooldown = sabotageCooldown > 0;
                const blocked = isActive || onCooldown;
                return (
                  <button
                    key={key}
                    disabled={blocked}
                    onClick={() => {
                      triggerSabotage(key);
                      setShowSabotageMenu(false);
                    }}
                    style={{
                      padding: '8px 10px',
                      background: blocked ? 'rgba(255,255,255,0.04)' : 'rgba(183,28,28,0.2)',
                      border: `1px solid ${blocked ? 'rgba(255,255,255,0.1)' : 'rgba(183,28,28,0.5)'}`,
                      borderRadius: 8,
                      color: blocked ? '#555' : '#fff',
                      fontSize: 11, cursor: blocked ? 'not-allowed' : 'pointer',
                      textAlign: 'left',
                      display: 'flex', flexDirection: 'column', gap: 2,
                    }}
                  >
                    <span>{SABOTAGE_LABELS[key]}</span>
                    <span style={{ fontSize: 9, color: '#888' }}>
                      {isActive
                        ? '⚡ Уже активно'
                        : onCooldown
                          ? `⏱ Перезарядка ${Math.ceil(sabotageCooldown)}с`
                          : `Кд ${SABOTAGE_COOLDOWNS[key]}с | ${SABOTAGE_DURATIONS[key]}с эффект`
                      }
                    </span>
                  </button>
                );
              })}
              <button
                onClick={() => setShowSabotageMenu(false)}
                style={{
                  padding: '5px', background: 'transparent', border: 'none',
                  color: '#555', fontSize: 11, cursor: 'pointer',
                }}
              >
                Закрыть
              </button>
            </div>
          )}

          {/* Toggle button */}
          <button
            onClick={() => setShowSabotageMenu(v => !v)}
            style={{
              width: 44, height: 44, borderRadius: 22,
              background: showSabotageMenu
                ? 'rgba(183,28,28,0.9)'
                : sabotageCooldown > 0
                  ? 'rgba(80,20,20,0.7)'
                  : 'rgba(183,28,28,0.75)',
              border: '2px solid rgba(244,67,54,0.7)',
              color: '#fff', fontSize: 18, cursor: 'pointer',
              boxShadow: '0 2px 12px rgba(0,0,0,0.7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative',
            }}
          >
            🔧
            {sabotageCooldown > 0 && (
              <div style={{
                position: 'absolute', bottom: -14, left: '50%', transform: 'translateX(-50%)',
                fontSize: 8, color: '#888', whiteSpace: 'nowrap',
              }}>
                {Math.ceil(sabotageCooldown)}с
              </div>
            )}
          </button>
        </div>
      )}

      {/* ── News ticker ── */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'rgba(0,0,0,0.7)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        padding: '4px 12px',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          flexShrink: 0,
          background: '#D32F2F', color: '#fff',
          fontSize: 8, fontWeight: 'bold', padding: '1px 5px', borderRadius: 2,
        }}>
          АИ-95 ₽{state.ai95Price}/л
        </div>
        <div style={{
          flex: 1, overflow: 'hidden',
          fontSize: 10, color: '#ddd',
          whiteSpace: 'nowrap', textOverflow: 'ellipsis',
        }}>
          {NEWS_HEADLINES[state.tickerIndex]}
        </div>
      </div>

      {/* ── Meeting cooldown indicator ── */}
      {state.meetingCooldown > 0 && (
        <div style={{
          position: 'absolute', bottom: 28, right: 12,
          background: 'rgba(0,0,0,0.6)', borderRadius: 6,
          padding: '2px 8px', fontSize: 9, color: '#aaa',
        }}>
          🔔 сходка через {Math.ceil(state.meetingCooldown)}с
        </div>
      )}

      {/* ── §13.1 Siphon audio indicator ── */}
      {nearAudioSiphon && (
        <div style={{
          position: 'absolute',
          top: '50%', left: 16,
          transform: 'translateY(-50%)',
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'rgba(255,23,68,0.18)',
          border: '1px solid rgba(255,23,68,0.55)',
          borderRadius: 8, padding: '6px 10px',
          pointerEvents: 'none',
          animation: 'siphonPulse 0.8s ease-in-out infinite alternate',
        }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <div>
            <div style={{ fontSize: 10, fontWeight: 'bold', color: '#FF5252', letterSpacing: 1 }}>
              СЛЫШЕН СЛИВ
            </div>
            <div style={{ fontSize: 9, color: '#ffcdd2' }}>где-то рядом...</div>
          </div>
        </div>
      )}

      {/* ── §3.1.3 Neutral role ability buttons ── */}
      {localPlayer.isAlive && localPlayer.neutralRole && (
        <div style={{
          position: 'absolute', bottom: 160, left: '50%', transform: 'translateX(-50%)',
          pointerEvents: 'all', display: 'flex', gap: 8,
        }}>
          {localPlayer.neutralRole === 'barsik' && (
            <button
              onClick={() => triggerBarsikMeow(gs.localPlayerId)}
              disabled={localPlayer.barsikMeowCooldown > 0}
              style={{
                padding: '7px 14px', borderRadius: 20,
                background: localPlayer.barsikMeowCooldown > 0
                  ? 'rgba(80,80,80,0.7)' : 'rgba(255,153,0,0.85)',
                border: '1px solid rgba(255,200,0,0.5)',
                color: '#fff', fontSize: 12, fontWeight: 'bold',
                cursor: localPlayer.barsikMeowCooldown > 0 ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
              }}
            >
              😺 МЯУ!{localPlayer.barsikMeowCooldown > 0 ? ` ${Math.ceil(localPlayer.barsikMeowCooldown)}с` : ''}
            </button>
          )}
          {localPlayer.neutralRole === 'policeman' && (
            <button
              onClick={() => investigateBody(gs.localPlayerId)}
              style={{
                padding: '7px 14px', borderRadius: 20,
                background: 'rgba(0,100,200,0.8)',
                border: '1px solid rgba(100,180,255,0.5)',
                color: '#fff', fontSize: 12, fontWeight: 'bold', cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
              }}
            >
              🕵️ Расследовать тело
            </button>
          )}
          {localPlayer.neutralRole === 'janitor' && (
            <button
              onClick={() => janitorCollectCanister(gs.localPlayerId)}
              style={{
                padding: '7px 14px', borderRadius: 20,
                background: 'rgba(0,140,50,0.8)',
                border: '1px solid rgba(100,255,130,0.4)',
                color: '#fff', fontSize: 12, fontWeight: 'bold', cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
              }}
            >
              🧹 Подобрать канистру ({localPlayer.canistersCollected}/3)
            </button>
          )}
        </div>
      )}

      {/* ── §2.2 Emote wheel (4 quick emotes) ── */}
      {localPlayer.isAlive && (
        <div style={{ position: 'absolute', bottom: 100, right: 12, pointerEvents: 'all' }}>
          {showEmoteWheel && (
            <div style={{
              position: 'absolute', bottom: 42, right: 0,
              display: 'grid', gridTemplateColumns: '1fr 1fr',
              gap: 6, marginBottom: 6,
            }}>
              {PLAY_EMOTES.map((emote, i) => (
                <button
                  key={i}
                  onClick={() => {
                    triggerEmote(gs.localPlayerId, emote);
                    setShowEmoteWheel(false);
                  }}
                  style={{
                    width: 44, height: 44,
                    background: 'rgba(0,0,0,0.75)',
                    border: '1px solid rgba(255,255,255,0.25)',
                    borderRadius: 10,
                    fontSize: 22, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {emote}
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => setShowEmoteWheel(v => !v)}
            style={{
              width: 40, height: 40,
              background: showEmoteWheel ? 'rgba(255,87,34,0.85)' : 'rgba(0,0,0,0.65)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '50%', fontSize: 18, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            title="Эмоция (§2.2)"
          >
            😊
          </button>
        </div>
      )}

      {/* ── §10.2 Immunity Ticket HUD badge ── */}
      {localPlayer.hasImmunityTicket && (
        <div style={{
          position: 'absolute', top: 80, right: 12,
          background: 'rgba(255,193,7,0.2)',
          border: '1px solid #FFD700',
          borderRadius: 10, padding: '6px 10px',
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 11, color: '#FFD700', fontWeight: 'bold',
          pointerEvents: 'none',
        }}>
          🎟️ ТАЛОН В РУКАХ
          <span style={{ fontSize: 9, color: '#FFF9C4', fontWeight: 'normal' }}>
            Подойди к баку → [E]
          </span>
        </div>
      )}

      <style>{`
        @keyframes siphonPulse {
          from { opacity: 0.6; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
