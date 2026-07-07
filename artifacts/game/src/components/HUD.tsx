import { useState, useEffect } from 'react';
import type { GameState, SabotageKey } from '../game/types';
import { downloadMoment, getMomentDataUrl } from '../game/replayBuffer';
import { SPRINT_MAX, SABOTAGE_LABELS, SABOTAGE_COOLDOWNS, SABOTAGE_DURATIONS, SIPHON_AUDIO_RADIUS } from '../game/types';
import { NEWS_HEADLINES } from '../data/ticker';
import { CHARACTERS } from '../data/characters';
import { MAP_W, MAP_H } from '../data/map';
import { triggerSabotage, triggerEmote, PLAY_EMOTES, triggerBarsikMeow, investigateBody, janitorCollectCanister } from '../game/logic';
import { gs } from '../game/state';
import { audio } from '../game/audio';
import TaskMiniGame from './TaskMiniGame';

// ─── §13.1 Minimap ───────────────────────────────────────────────────────────
const MM_W = 90;  // minimap display width px
const MM_H = 68;  // minimap display height px (≈ MAP_H/MAP_W ratio)
const MM_SX = MM_W / MAP_W;
const MM_SY = MM_H / MAP_H;

function Minimap({ state }: { state: GameState }) {
  const localPlayer = state.players.find(p => p.id === state.localPlayerId);
  return (
    <div style={{
      position: 'relative',
      width: MM_W, height: MM_H,
      background: 'rgba(10,14,20,0.88)',
      border: '1px solid rgba(255,255,255,0.18)',
      borderRadius: 5,
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      {/* Courtyard area tint */}
      <div style={{
        position: 'absolute',
        left: 90 * MM_SX, top: 90 * MM_SY,
        width: (MAP_W - 180) * MM_SX, height: (MAP_H - 180) * MM_SY,
        background: 'rgba(50,80,40,0.3)',
      }} />
      {/* Parking lot tint */}
      <div style={{
        position: 'absolute',
        left: 90 * MM_SX, top: 90 * MM_SY,
        width: (MAP_W - 180) * MM_SX, height: 380 * MM_SY,
        background: 'rgba(80,80,80,0.25)',
      }} />

      {/* Cars */}
      {state.cars.map(car => (
        <div key={car.id}
          className={car.fuel < 10 ? 'mm-car-low-fuel' : undefined}
          style={{
            position: 'absolute',
            left: car.pos.x * MM_SX - 3,
            top: car.pos.y * MM_SY - 2,
            width: 6, height: 4,
            background: car.fuel < 10 ? '#FF1744' : car.fuel < 30 ? '#FF9800' : car.color,
            borderRadius: 1,
            opacity: 0.9,
          }}
        />
      ))}

      {/* Tasks (incomplete only) */}
      {state.tasks.filter(t => !t.isComplete).map(t => {
        const localP = state.players.find(p => p.id === state.localPlayerId);
        const color = localP?.role === 'slivshchik' ? '#888' : '#4CAF50';
        return (
          <div key={t.id} style={{
            position: 'absolute',
            left: t.pos.x * MM_SX - 2,
            top: t.pos.y * MM_SY - 2,
            width: 4, height: 4,
            background: color,
            borderRadius: '50%',
            opacity: 0.75,
          }} />
        );
      })}

      {/* Immunity tickets */}
      {state.immunityTickets.map(it => (
        <div key={it.id} style={{
          position: 'absolute',
          left: it.pos.x * MM_SX - 2,
          top: it.pos.y * MM_SY - 2,
          width: 4, height: 4,
          background: '#FFD700',
          borderRadius: '50%',
        }} />
      ))}

      {/* Bodies */}
      {state.bodies.map(b => (
        <div key={b.id} style={{
          position: 'absolute',
          left: b.pos.x * MM_SX - 2,
          top: b.pos.y * MM_SY - 2,
          width: 4, height: 4,
          background: '#CC0000',
          borderRadius: '50%',
        }} />
      ))}

      {/* Other players */}
      {state.players.filter(p => p.id !== state.localPlayerId && p.isAlive).map(p => {
        const charDef = CHARACTERS[p.character];
        return (
          <div key={p.id} style={{
            position: 'absolute',
            left: p.pos.x * MM_SX - 3,
            top: p.pos.y * MM_SY - 3,
            width: 6, height: 6,
            background: charDef.color,
            borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.4)',
          }} />
        );
      })}

      {/* Local player — gold dot */}
      {localPlayer && (
        <div style={{
          position: 'absolute',
          left: localPlayer.pos.x * MM_SX - 4,
          top: localPlayer.pos.y * MM_SY - 4,
          width: 8, height: 8,
          background: '#FFD700',
          borderRadius: '50%',
          border: '1px solid #fff',
          zIndex: 2,
        }} />
      )}

      {/* Legend label */}
      <div style={{
        position: 'absolute', bottom: 1, right: 3,
        fontSize: 6, color: 'rgba(255,255,255,0.35)',
        userSelect: 'none', pointerEvents: 'none',
      }}>🗺</div>
    </div>
  );
}

interface HUDProps {
  state: GameState;
}

const SABOTAGE_KEYS: SabotageKey[] = ['alarm_chaos', 'chat_offline', 'babushka_cerberus', 'pipe_burst'];

export default function HUD({ state }: HUDProps) {
  const [showSabotageMenu, setShowSabotageMenu] = useState(false);
  const [showEmoteWheel, setShowEmoteWheel] = useState(false);
  const [showObjective, setShowObjective] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const localPlayer = state.players.find(p => p.id === state.localPlayerId);
  if (!localPlayer) return null;

  // §13.1 Text size scale factor
  const textScale = state.textSize === 'small' ? 0.82 : state.textSize === 'large' ? 1.22 : 1.0;

  // §12.4 Tutorial: show on first-ever play
  useEffect(() => {
    if (state.phase === 'play' && gs.tutorialStep === 0) {
      const done = localStorage.getItem('95Y_tutorial') === 'done';
      if (!done) gs.tutorialStep = 1;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase]);

  // Tutorial step 3: auto-dismiss after 3 s and save to localStorage
  useEffect(() => {
    if (state.tutorialStep !== 3) return;
    const t = window.setTimeout(() => {
      gs.tutorialStep = 0;
      localStorage.setItem('95Y_tutorial', 'done');
    }, 3000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.tutorialStep]);

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
    <div
      data-hc={state.highContrastMode ? '1' : undefined}
      style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        pointerEvents: 'none', zIndex: 10,
        filter: state.highContrastMode ? 'contrast(1.15) brightness(1.05)' : undefined,
      }}
    >
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
              const color = state.colorblindMode
                ? fuelPct > 40 ? '#2196F3' : fuelPct > 20 ? '#FF9800' : '#FF5722'
                : fuelPct > 40 ? '#4CAF50' : fuelPct > 20 ? '#FF9800' : '#F44336';
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
            color: '#fff', fontSize: Math.round(13 * textScale), fontWeight: 500,
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

      {/* ── §13.1 Minimap — always available, bottom-left above settings ── */}
      <div style={{ position: 'absolute', bottom: 148, left: 12, pointerEvents: 'none' }}>
        <Minimap state={state} />
        {/* Bodies badge overlaid on minimap bottom */}
        {state.bodies.length > 0 && (
          <div style={{
            position: 'absolute', bottom: -1, right: -1,
            background: 'rgba(183,28,28,0.92)', borderRadius: 4,
            padding: '1px 5px',
            fontSize: 9, color: '#fff', fontWeight: 'bold',
          }}>
            💀{state.bodies.length}
          </div>
        )}
      </div>

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

      {/* ── §12.4 Tutorial overlay ── */}
      {state.tutorialStep >= 1 && state.tutorialStep <= 3 && state.phase === 'play' && (
        <div style={{
          position: 'absolute', bottom: 150, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(10,20,40,0.96)',
          border: '2px solid #FFD700',
          borderRadius: 16, padding: '14px 20px',
          maxWidth: 290, pointerEvents: 'all', zIndex: 50,
          textAlign: 'center', boxShadow: '0 6px 28px rgba(0,0,0,0.8)',
        }}>
          {state.tutorialStep === 1 && (
            <>
              <div style={{ fontSize: 24, marginBottom: 6 }}>🌯</div>
              <div style={{ fontSize: Math.round(13 * textScale), color: '#FFD700', fontWeight: 'bold', marginBottom: 5 }}>
                Добро пожаловать!
              </div>
              <div style={{ fontSize: Math.round(11 * textScale), color: '#ddd', lineHeight: 1.5 }}>
                Подойди к ларьку с шавермой ↗<br/>
                <span style={{ fontSize: Math.round(9 * textScale), color: '#888' }}>Смотри на метки на миникарте</span>
              </div>
            </>
          )}
          {state.tutorialStep === 2 && (
            <>
              <div style={{ fontSize: 24, marginBottom: 6 }}>🌯</div>
              <div style={{ fontSize: Math.round(13 * textScale), color: '#FFD700', fontWeight: 'bold', marginBottom: 5 }}>
                Ты у ларька!
              </div>
              <div style={{ fontSize: Math.round(11 * textScale), color: '#ddd', lineHeight: 1.5 }}>
                Нажми [E] чтобы купить шаверму<br/>
                <span style={{ fontSize: Math.round(9 * textScale), color: '#888' }}>Задачи пополняют метр единства</span>
              </div>
            </>
          )}
          {state.tutorialStep === 3 && (
            <>
              <div style={{ fontSize: 24, marginBottom: 6 }}>✅</div>
              <div style={{ fontSize: Math.round(13 * textScale), color: '#4CAF50', fontWeight: 'bold', marginBottom: 5 }}>
                Молодец!
              </div>
              <div style={{ fontSize: Math.round(11 * textScale), color: '#ddd', lineHeight: 1.5 }}>
                Выполняй задачи, следи за баками.<br/>Удачи в ЖК!
              </div>
            </>
          )}
          <button
            onClick={() => { gs.tutorialStep = 0; localStorage.setItem('95Y_tutorial', 'done'); }}
            style={{
              marginTop: 10, padding: '4px 14px', borderRadius: 8,
              background: 'transparent', border: '1px solid rgba(255,255,255,0.2)',
              color: '#888', fontSize: 9, cursor: 'pointer',
            }}
          >
            Пропустить обучение
          </button>
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

      {/* ── §13.1 Settings (volume + colorblind mode) ── */}
      <div style={{ position: 'absolute', bottom: 100, left: 12, pointerEvents: 'all' }}>
        {showSettings && (
          <div style={{
            position: 'absolute', bottom: 42, left: 0,
            background: 'rgba(10,10,20,0.97)', border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 14, padding: '14px 16px', minWidth: 230,
            boxShadow: '0 4px 24px rgba(0,0,0,0.8)',
            display: 'flex', flexDirection: 'column', gap: 11,
          }}>
            <div style={{ fontSize: 11, color: '#90A4AE', fontWeight: 'bold' }}>⚙️ НАСТРОЙКИ</div>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: 10, color: '#aaa' }}>🔊 Мастер: {Math.round(state.volumeMaster * 100)}%</span>
              <input type="range" min={0} max={1} step={0.05}
                defaultValue={state.volumeMaster}
                onChange={e => {
                  const v = parseFloat(e.target.value);
                  gs.volumeMaster = v;
                  audio.setMasterVolume(v);
                }}
                style={{ width: '100%', accentColor: '#4CAF50' }}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: 10, color: '#aaa' }}>🎵 Музыка: {Math.round(state.volumeMusic * 100)}%</span>
              <input type="range" min={0} max={1} step={0.05}
                defaultValue={state.volumeMusic}
                onChange={e => {
                  const v = parseFloat(e.target.value);
                  gs.volumeMusic = v;
                  audio.setMusicVolume(v);
                }}
                style={{ width: '100%', accentColor: '#2196F3' }}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: 10, color: '#aaa' }}>💥 Эффекты: {Math.round(state.volumeSfx * 100)}%</span>
              <input type="range" min={0} max={1} step={0.05}
                defaultValue={state.volumeSfx}
                onChange={e => {
                  const v = parseFloat(e.target.value);
                  gs.volumeSfx = v;
                  audio.setSfxVolume(v);
                }}
                style={{ width: '100%', accentColor: '#FF9800' }}
              />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox"
                defaultChecked={state.colorblindMode}
                onChange={e => { gs.colorblindMode = e.target.checked; }}
                style={{ accentColor: '#2196F3', width: 14, height: 14 }}
              />
              <span style={{ fontSize: 11, color: '#aaa' }}>🎨 Режим для дальтоников</span>
            </label>

            {/* §13.1 Text size */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 10, color: '#aaa' }}>📐 Размер текста</span>
              <div style={{ display: 'flex', gap: 4 }}>
                {(['small', 'medium', 'large'] as const).map(sz => (
                  <button key={sz}
                    onClick={() => { gs.textSize = sz; }}
                    style={{
                      flex: 1, padding: '4px', borderRadius: 6,
                      fontSize: sz === 'small' ? 9 : sz === 'large' ? 13 : 11,
                      background: state.textSize === sz ? 'rgba(33,150,243,0.4)' : 'rgba(255,255,255,0.07)',
                      border: `1px solid ${state.textSize === sz ? '#2196F3' : 'rgba(255,255,255,0.12)'}`,
                      color: state.textSize === sz ? '#fff' : '#aaa', cursor: 'pointer',
                    }}>
                    {sz === 'small' ? 'М' : sz === 'large' ? 'Б' : 'С'}
                  </button>
                ))}
              </div>
            </div>

            {/* §13.1 Auto-interact */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox"
                checked={state.autoInteract}
                onChange={e => { gs.autoInteract = e.target.checked; gs.autoInteractTimer = 0; }}
                style={{ accentColor: '#4CAF50', width: 14, height: 14 }}
              />
              <span style={{ fontSize: 11, color: '#aaa' }}>🖐️ Авто-взаимодействие (2 с)</span>
            </label>

            {/* §13.1 Simplified chat wheel */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox"
                checked={state.simplifiedChatWheel}
                onChange={e => { gs.simplifiedChatWheel = e.target.checked; }}
                style={{ accentColor: '#FF9800', width: 14, height: 14 }}
              />
              <span style={{ fontSize: 11, color: '#aaa' }}>💬 Простой чат-круг (6 фраз)</span>
            </label>

            {/* §13.1 High contrast mode */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox"
                checked={state.highContrastMode}
                onChange={e => { gs.highContrastMode = e.target.checked; }}
                style={{ accentColor: '#FFD700', width: 14, height: 14 }}
              />
              <span style={{ fontSize: 11, color: '#aaa' }}>🔆 Высокий контраст</span>
            </label>
          </div>
        )}
        <button
          onClick={() => setShowSettings(v => !v)}
          style={{
            width: 36, height: 36, borderRadius: 18,
            background: showSettings ? 'rgba(80,120,180,0.85)' : 'rgba(0,0,0,0.65)',
            border: '1px solid rgba(255,255,255,0.18)',
            color: '#90A4AE', fontSize: 15, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          title="Настройки"
        >
          ⚙️
        </button>
      </div>

      {/* ── §9.2 Backstab Moment toast ── */}
      {state.backstabMoment && !state.backstabMomentAcked && (
        <div style={{
          position: 'absolute', top: 70, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.93)',
          border: '2px solid #FF1744',
          borderRadius: 14, padding: '12px 16px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
          zIndex: 120, pointerEvents: 'all',
          minWidth: 240, maxWidth: 300,
          boxShadow: '0 4px 28px rgba(255,23,68,0.45)',
          animation: 'backstabPulse 0.6s ease-in-out',
        }}>
          <div style={{ fontSize: 15, fontWeight: 'bold', color: '#FF1744', letterSpacing: 1 }}>
            💥 БАКСТАБ МОМЕНТ!
          </div>
          <div style={{ fontSize: 10, color: '#bbb', textAlign: 'center' }}>
            {state.backstabMoment === 'catch_siphoner'   && 'Ты поймал Сливщика за сливом!'}
            {state.backstabMoment === 'caught_siphoning' && 'Тебя застукали во время слива!'}
            {state.backstabMoment === 'dramatic_eject'   && 'Тебя выбросили из двора!'}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {getMomentDataUrl() && (
              <button
                onClick={() => { downloadMoment(); gs.backstabMomentAcked = true; }}
                style={{
                  padding: '6px 14px', borderRadius: 8,
                  background: '#FF1744', border: 'none',
                  color: '#fff', fontSize: 11, fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                💾 Скачать момент
              </button>
            )}
            <button
              onClick={() => { gs.backstabMomentAcked = true; }}
              style={{
                padding: '6px 12px', borderRadius: 8,
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#888', fontSize: 11, cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>
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
        @keyframes backstabPulse {
          0%   { transform: translateX(-50%) scale(0.85); opacity: 0; }
          60%  { transform: translateX(-50%) scale(1.05); opacity: 1; }
          100% { transform: translateX(-50%) scale(1);    opacity: 1; }
        }
        [data-hc="1"] {
          text-shadow: 0 0 4px #000, 0 1px 3px #000 !important;
        }
        [data-hc="1"] div, [data-hc="1"] span, [data-hc="1"] button {
          letter-spacing: 0.01em;
        }
      `}</style>
    </div>
  );
}
