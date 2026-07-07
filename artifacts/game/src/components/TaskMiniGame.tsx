import type { MiniGameState, TaskDefKey } from '../game/types';
import { TASK_DEFS } from '../data/tasks';
import { onMiniGameTap, onMiniGameDigitTap, onMiniGameChoice, onMiniGameTaxiTap, onMiniGameWireSource, onMiniGameWireSocket, cancelMiniGame } from '../game/gameActions';

interface Props {
  mg: MiniGameState;
}

export default function TaskMiniGame({ mg }: Props) {
  const def = TASK_DEFS[mg.defKey as TaskDefKey];

  const panelStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)',
    background: 'rgba(10,14,24,0.97)',
    border: '2px solid rgba(255,255,255,0.15)',
    borderRadius: 20,
    padding: '24px 28px',
    minWidth: 320, maxWidth: 400,
    boxShadow: '0 8px 40px rgba(0,0,0,0.8)',
    zIndex: 200,
    textAlign: 'center',
    color: '#fff',
    fontFamily: 'sans-serif',
    userSelect: 'none',
  };

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={{ fontSize: 28, marginBottom: 4 }}>{def.emoji}</div>
      <div style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 18, color: def.color }}>
        {def.label}
      </div>

      {mg.type === 'tap_timing' && <TapTiming mg={mg} />}
      {mg.type === 'rapid_tap' && <RapidTap mg={mg} />}
      {mg.type === 'sequence' && <Sequence mg={mg} />}
      {mg.type === 'dial' && <Dial mg={mg} />}
      {mg.type === 'letter' && <Letter mg={mg} />}
      {mg.type === 'dog_walk' && <DogWalk mg={mg} />}
      {mg.type === 'flower_match' && <FlowerMatch mg={mg} />}
      {mg.type === 'drunk_calm' && <DrunkCalm mg={mg} />}
      {mg.type === 'taxi_order' && <TaxiOrder mg={mg} />}
      {mg.type === 'wire_drag' && <WireDrag mg={mg} />}

      {/* Cancel */}
      <button
        onClick={cancelMiniGame}
        style={{
          marginTop: 18, padding: '6px 20px',
          background: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 8, color: '#888', fontSize: 12, cursor: 'pointer',
        }}
      >
        ✕ Отмена
      </button>
    </div>
  );
}

// ─── Tap Timing ───────────────────────────────────────────────────────────────

function TapTiming({ mg }: { mg: MiniGameState }) {
  const hitDots = Array.from({ length: mg.requiredHits }).map((_, i) => i < mg.hits);
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
        {hitDots.map((hit, i) => (
          <div key={i} style={{
            width: 12, height: 12, borderRadius: '50%',
            background: hit ? '#4CAF50' : 'rgba(255,255,255,0.15)',
          }} />
        ))}
      </div>
      {/* Track */}
      <div style={{
        position: 'relative', height: 36,
        background: 'rgba(255,255,255,0.06)',
        borderRadius: 18, marginBottom: 16, overflow: 'hidden',
      }}>
        {/* Green zone */}
        <div style={{
          position: 'absolute', top: 0, bottom: 0,
          left: '40%', width: '20%',
          background: 'rgba(76,175,80,0.4)',
        }} />
        {/* Moving marker */}
        <div style={{
          position: 'absolute', top: 6, bottom: 6,
          width: 20, borderRadius: 10,
          left: `calc(${mg.markerPos * 100}% - 10px)`,
          background: mg.feedback === 'hit' ? '#4CAF50' : mg.feedback === 'miss' ? '#F44336' : '#FFD700',
          transition: 'background 0.1s',
        }} />
        <div style={{
          position: 'absolute', top: 0, bottom: 0, left: '50%',
          width: 1, background: 'rgba(76,175,80,0.5)',
        }} />
      </div>
      <button
        onClick={onMiniGameTap}
        style={{
          width: '100%', padding: '13px',
          background: mg.feedback === 'hit' ? 'rgba(76,175,80,0.3)' : mg.feedback === 'miss' ? 'rgba(244,67,54,0.3)' : 'rgba(255,215,0,0.15)',
          border: `2px solid ${mg.feedback === 'hit' ? '#4CAF50' : mg.feedback === 'miss' ? '#F44336' : 'rgba(255,215,0,0.4)'}`,
          borderRadius: 14, color: '#fff', fontSize: 15, cursor: 'pointer', fontWeight: 'bold',
        }}
      >
        {mg.feedback === 'hit' ? '✅' : mg.feedback === 'miss' ? '❌' : '[E] В зелёную зону!'}
      </button>
    </div>
  );
}

// ─── Rapid Tap ────────────────────────────────────────────────────────────────

function RapidTap({ mg }: { mg: MiniGameState }) {
  const pct = (mg.tapCount / mg.requiredTaps) * 100;
  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <div style={{
          height: 18, background: 'rgba(255,255,255,0.08)',
          borderRadius: 9, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', width: `${pct}%`,
            background: 'linear-gradient(90deg, #FF9800, #FF5722)',
            borderRadius: 9, transition: 'width 0.05s',
          }} />
        </div>
        <div style={{ fontSize: 10, color: '#aaa', marginTop: 6 }}>
          {mg.tapCount} / {mg.requiredTaps} нажатий
        </div>
      </div>
      <div style={{ fontSize: 10, color: mg.timeLimit < 2 ? '#F44336' : '#888', marginBottom: 12 }}>
        ⏱ {Math.ceil(mg.timeLimit)}с
      </div>
      <button
        onClick={onMiniGameTap}
        style={{
          width: '100%', padding: '16px',
          background: mg.feedback === 'miss' ? 'rgba(244,67,54,0.3)' : 'rgba(255,152,0,0.2)',
          border: `2px solid ${mg.feedback === 'miss' ? '#F44336' : '#FF9800'}`,
          borderRadius: 14, color: '#fff', fontSize: 16, cursor: 'pointer',
          fontWeight: 'bold',
        }}
      >
        {mg.feedback === 'miss' ? '⏱ Сначала!' : '[E] БЫМ!'}
      </button>
    </div>
  );
}

// ─── Sequence ─────────────────────────────────────────────────────────────────

function Sequence({ mg }: { mg: MiniGameState }) {
  return (
    <div>
      <div style={{
        display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 16,
      }}>
        {mg.sequence.map((digit, i) => (
          <div key={i} style={{
            width: 34, height: 34, borderRadius: 8,
            background: i < mg.seqIndex ? 'rgba(76,175,80,0.4)' : 'rgba(255,255,255,0.07)',
            border: `2px solid ${i < mg.seqIndex ? '#4CAF50' : i === mg.seqIndex ? '#FFD700' : 'rgba(255,255,255,0.1)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 'bold',
            color: i < mg.seqIndex ? '#4CAF50' : '#fff',
          }}>
            {i < mg.seqIndex ? '✓' : digit}
          </div>
        ))}
      </div>
      {mg.seqWrong && (
        <div style={{ color: '#F44336', fontSize: 12, marginBottom: 10 }}>
          ❌ Неверно — сначала!
        </div>
      )}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        gap: 8, marginBottom: 8,
      }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => (
          <button
            key={d}
            onClick={() => onMiniGameDigitTap(d)}
            style={{
              padding: '12px', fontSize: 18, fontWeight: 'bold',
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 10, color: '#fff', cursor: 'pointer',
            }}
          >
            {d}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Dial ─────────────────────────────────────────────────────────────────────

function Dial({ mg }: { mg: MiniGameState }) {
  const stopDots = Array.from({ length: mg.dialRequiredStops }).map((_, i) => i < mg.dialStops);
  const needleDeg = mg.dialAngle;
  const targetDeg = mg.dialTarget;
  const diff = Math.abs(((needleDeg - targetDeg + 540) % 360) - 180);
  const inZone = diff <= mg.dialGreenWidth;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 14 }}>
        {stopDots.map((done, i) => (
          <div key={i} style={{
            width: 10, height: 10, borderRadius: '50%',
            background: done ? '#4CAF50' : 'rgba(255,255,255,0.2)',
          }} />
        ))}
      </div>
      {/* Circular dial */}
      <div style={{
        position: 'relative', width: 120, height: 120,
        margin: '0 auto 16px', borderRadius: '50%',
        background: 'rgba(255,255,255,0.06)',
        border: `3px solid ${inZone ? '#4CAF50' : 'rgba(255,255,255,0.15)'}`,
      }}>
        {/* Target zone arc (simplified as a colored segment label) */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: `translate(-50%, -50%) rotate(${targetDeg}deg)`,
          transformOrigin: 'center',
          width: 4, height: 50,
          background: 'rgba(76,175,80,0.6)',
          borderRadius: 2,
        }} />
        {/* Needle */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: `translate(-50%, -100%) rotate(${needleDeg}deg)`,
          transformOrigin: 'bottom center',
          width: 3, height: 46,
          background: inZone ? '#4CAF50' : '#FFD700',
          borderRadius: 2,
        }} />
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 10, height: 10, borderRadius: '50%',
          background: '#aaa',
        }} />
      </div>
      <div style={{ fontSize: 11, color: '#aaa', marginBottom: 12 }}>
        {inZone ? '🟢 В зелёной зоне!' : 'Удерживай E → крути, отпусти в зелёной зоне'}
      </div>
      <div style={{ fontSize: 10, color: '#666' }}>
        {mg.feedback === 'hit' ? '✅ Стоп!' : mg.feedback === 'miss' ? '❌ Мимо!' : `Позиция: ${Math.round(mg.dialAngle)}°`}
      </div>
    </div>
  );
}

// ─── Letter ───────────────────────────────────────────────────────────────────

function Letter({ mg }: { mg: MiniGameState }) {
  return (
    <div>
      <div style={{
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12, padding: '14px 16px', marginBottom: 16,
        textAlign: 'left', fontSize: 12, color: '#ccc', lineHeight: 1.7,
        whiteSpace: 'pre-line',
      }}>
        {mg.letterText}
      </div>
      <button
        onClick={onMiniGameTap}
        style={{
          width: '100%', padding: '12px',
          background: 'rgba(33,150,243,0.2)',
          border: '1px solid rgba(33,150,243,0.4)',
          borderRadius: 12, color: '#90CAF9', fontSize: 13, cursor: 'pointer',
        }}
      >
        📜 Прочитал, понял, закрыть
      </button>
    </div>
  );
}

// ─── §2.5 Dog Walk ────────────────────────────────────────────────────────────

function DogWalk({ mg }: { mg: MiniGameState }) {
  // Labels and icons differ by task
  const isHelpBags = mg.defKey === 'help_bags';
  const isFindCat  = mg.defKey === 'find_cat';
  const waypoints = isHelpBags
    ? ['К лифту', 'К выходу', 'До двери 🚪']
    : isFindCat
      ? ['У мусорок', 'За скамейкой', 'В кустах 🌿']
      : ['Детская площадка', 'Мусорки', 'Домой 🏠'];
  const icon = isHelpBags ? '🛍️' : isFindCat ? '🐱' : '🐕';
  const actionLabel = isHelpBags ? 'Держим сумки!' : isFindCat ? 'Ищем Барсика!' : 'Держать поводок!';
  const progressLabel = isHelpBags ? 'несём сумки' : isFindCat ? 'ищем кота' : 'держим поводок';
  const doneLabel = isHelpBags ? '✅ Сумки доставлены!' : isFindCat ? '✅ Барсик найден!' : '✅ Прогулка завершена!';

  const tapProgress = mg.requiredTaps > 0 ? (mg.tapCount / mg.requiredTaps) * 100 : 0;

  return (
    <div>
      {/* Waypoint dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginBottom: 18 }}>
        {waypoints.map((name, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: i < mg.dogWaypoint ? '#4CAF50' : i === mg.dogWaypoint ? 'rgba(255,152,0,0.3)' : 'rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, margin: '0 auto 6px',
              border: `2px solid ${i < mg.dogWaypoint ? '#4CAF50' : i === mg.dogWaypoint ? '#FF9800' : 'rgba(255,255,255,0.12)'}`,
              transition: 'all 0.2s',
            }}>
              {i < mg.dogWaypoint ? '✓' : i === mg.dogWaypoint ? icon : '·'}
            </div>
            <div style={{ fontSize: 8, color: i === mg.dogWaypoint ? '#FFB74D' : '#666', maxWidth: 60 }}>
              {name}
            </div>
          </div>
        ))}
      </div>

      {mg.dogWaypoint < mg.dogRequired ? (
        <>
          <div style={{ fontSize: 12, color: '#FFB74D', marginBottom: 10 }}>
            {icon} {isFindCat ? 'Ищем у: ' : isHelpBags ? 'Несём к: ' : 'Бакс тянет к '}{waypoints[mg.dogWaypoint]}
          </div>
          {/* Tap progress bar */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ height: 10, background: 'rgba(255,255,255,0.08)', borderRadius: 5, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${tapProgress}%`,
                background: '#FF9800', borderRadius: 5, transition: 'width 0.08s',
              }} />
            </div>
            <div style={{ fontSize: 10, color: '#aaa', marginTop: 4 }}>
              {mg.tapCount}/{mg.requiredTaps} — {progressLabel}
            </div>
          </div>
          <div style={{ fontSize: 10, color: mg.timeLimit < 2 ? '#F44336' : '#888', marginBottom: 12 }}>
            ⏱ {Math.ceil(mg.timeLimit)}с
          </div>
          <button
            onClick={onMiniGameTap}
            style={{
              width: '100%', padding: '15px',
              background: mg.feedback === 'hit' ? 'rgba(76,175,80,0.25)' : mg.feedback === 'miss' ? 'rgba(244,67,54,0.25)' : 'rgba(255,152,0,0.2)',
              border: `2px solid ${mg.feedback === 'hit' ? '#4CAF50' : mg.feedback === 'miss' ? '#F44336' : '#FF9800'}`,
              borderRadius: 14, color: '#fff', fontSize: 16, cursor: 'pointer', fontWeight: 'bold',
            }}
          >
            {icon} {actionLabel}
          </button>
        </>
      ) : (
        <div style={{ color: '#4CAF50', fontSize: 14, padding: '16px 0' }}>{doneLabel}</div>
      )}
    </div>
  );
}

// ─── §2.5 Flower Match ────────────────────────────────────────────────────────

function FlowerMatch({ mg }: { mg: MiniGameState }) {
  const isWaiting = mg.feedbackTimer > 0;

  return (
    <div>
      {/* Round progress */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 14 }}>
        {Array.from({ length: mg.choiceRequired }).map((_, i) => (
          <div key={i} style={{
            width: 9, height: 9, borderRadius: '50%',
            background: i < mg.hits ? '#E91E63' : 'rgba(255,255,255,0.18)',
          }} />
        ))}
      </div>

      <div style={{ fontSize: 12, color: '#F48FB1', marginBottom: 16 }}>
        Раунд {Math.min(mg.choiceRound + 1, mg.choiceRequired)}/{mg.choiceRequired} —
        выберите правильный букет!
      </div>

      {/* Bouquet options */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 12 }}>
        {mg.choiceOptions.map((opt, i) => {
          const isSelected = mg.choiceSelected === i;
          const isCorrect = i === mg.choiceCorrect;
          let bg = 'rgba(255,255,255,0.06)';
          let border = 'rgba(255,255,255,0.14)';
          if (isSelected && mg.feedbackTimer > 0) {
            bg = isCorrect ? 'rgba(76,175,80,0.3)' : 'rgba(244,67,54,0.3)';
            border = isCorrect ? '#4CAF50' : '#F44336';
          }
          return (
            <button
              key={i}
              onClick={() => !isWaiting && onMiniGameChoice(i)}
              disabled={isWaiting}
              style={{
                flex: 1, padding: '18px 8px', fontSize: 30,
                background: bg, border: `2px solid ${border}`,
                borderRadius: 14, cursor: isWaiting ? 'default' : 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {mg.feedback === 'hit' && <div style={{ color: '#4CAF50', fontSize: 12 }}>💐 Правильный букет!</div>}
      {mg.feedback === 'miss' && <div style={{ color: '#F44336', fontSize: 12 }}>🥀 Не тот букет!</div>}
    </div>
  );
}

// ─── §2.5 Drunk Calm ─────────────────────────────────────────────────────────

function DrunkCalm({ mg }: { mg: MiniGameState }) {
  const isWaiting = mg.feedbackTimer > 0;

  return (
    <div>
      {/* Round progress */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
        {Array.from({ length: mg.choiceRequired }).map((_, i) => (
          <div key={i} style={{
            width: 9, height: 9, borderRadius: '50%',
            background: i < mg.hits ? '#FF9800' : 'rgba(255,255,255,0.18)',
          }} />
        ))}
      </div>

      {/* Drunk's dialogue */}
      <div style={{
        background: 'rgba(255,152,0,0.12)',
        border: '1px solid rgba(255,152,0,0.3)',
        borderRadius: 12, padding: '10px 14px', marginBottom: 16,
        fontSize: 12, color: '#FFB74D', textAlign: 'left', fontStyle: 'italic',
        lineHeight: 1.5,
      }}>
        🍻 Вася: {mg.letterText}
      </div>

      {/* Response options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {mg.choiceOptions.map((opt, i) => {
          const isSelected = mg.choiceSelected === i;
          const isCorrect = i === mg.choiceCorrect;
          let bg = 'rgba(255,255,255,0.06)';
          let border = 'rgba(255,255,255,0.12)';
          if (isSelected && mg.feedbackTimer > 0) {
            bg = isCorrect ? 'rgba(76,175,80,0.22)' : 'rgba(244,67,54,0.22)';
            border = isCorrect ? '#4CAF50' : '#F44336';
          }
          return (
            <button
              key={i}
              onClick={() => !isWaiting && onMiniGameChoice(i)}
              disabled={isWaiting}
              style={{
                padding: '10px 14px', textAlign: 'left',
                background: bg, border: `1px solid ${border}`,
                borderRadius: 10, color: '#ddd', fontSize: 12,
                cursor: isWaiting ? 'default' : 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {mg.feedback === 'hit' && <div style={{ color: '#4CAF50', fontSize: 12, marginTop: 10 }}>✅ Вася немного успокоился</div>}
      {mg.feedback === 'miss' && <div style={{ color: '#F44336', fontSize: 12, marginTop: 10 }}>😤 Вася расстроился</div>}
    </div>
  );
}

// ─── §2.5 Taxi Order ─────────────────────────────────────────────────────────

function TaxiOrder({ mg }: { mg: MiniGameState }) {
  const waitPct = Math.min(100, (mg.taxiWaitTimer / 3) * 100);

  return (
    <div style={{ padding: '4px 0' }}>
      {/* Phone mockup */}
      <div style={{
        background: 'rgba(0,0,0,0.55)', border: '2px solid rgba(255,214,0,0.25)',
        borderRadius: 20, padding: '20px 24px', marginBottom: 18,
        minHeight: 110, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>
        {mg.taxiPhase === 'order' && (
          <>
            <div style={{ fontSize: 30 }}>📱</div>
            <div style={{ fontSize: 11, color: '#aaa' }}>Яндекс.Бак 2.0</div>
            <div style={{ fontSize: 11, color: '#ccc' }}>📍 ул. Дворовая, 95</div>
          </>
        )}
        {mg.taxiPhase === 'wait' && (
          <>
            <div style={{ fontSize: 30 }}>🚗</div>
            <div style={{ fontSize: 12, color: '#FFD700', fontWeight: 'bold' }}>Ищем машину...</div>
            <div style={{ width: '100%', height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${waitPct}%`,
                background: '#FFD600', borderRadius: 4, transition: 'width 0.3s',
              }} />
            </div>
            <div style={{ fontSize: 10, color: '#aaa' }}>{Math.max(0, Math.ceil(3 - mg.taxiWaitTimer))}с...</div>
          </>
        )}
        {mg.taxiPhase === 'confirm' && (
          <>
            <div style={{ fontSize: 30 }}>🚕</div>
            <div style={{ fontSize: 13, color: '#4CAF50', fontWeight: 'bold' }}>Машина прибыла!</div>
            <div style={{ fontSize: 10, color: '#aaa' }}>Водитель: Мурат ⭐ 4.9</div>
          </>
        )}
      </div>

      {mg.taxiPhase === 'order' && (
        <button
          onClick={onMiniGameTaxiTap}
          style={{
            width: '100%', padding: '14px',
            background: 'rgba(255,214,0,0.22)', border: '2px solid #FFD600',
            borderRadius: 14, color: '#FFD600', fontSize: 15, fontWeight: 'bold', cursor: 'pointer',
          }}
        >
          📱 Заказать такси
        </button>
      )}
      {mg.taxiPhase === 'wait' && (
        <div style={{ fontSize: 11, color: '#888', textAlign: 'center', padding: '10px 0' }}>
          Ожидайте подачи машины...
        </div>
      )}
      {mg.taxiPhase === 'confirm' && (
        <button
          onClick={onMiniGameTaxiTap}
          style={{
            width: '100%', padding: '14px',
            background: 'rgba(76,175,80,0.22)', border: '2px solid #4CAF50',
            borderRadius: 14, color: '#4CAF50', fontSize: 15, fontWeight: 'bold', cursor: 'pointer',
          }}
        >
          ✅ Сесть в машину
        </button>
      )}
    </div>
  );
}

// ─── §2.5 Wire Drag (Починить турникет) ──────────────────────────────────────
// Tap a source wire to select it, then tap the matching colored socket to connect.
// 3 correct pairs = complete.

const WIRE_COLORS = [
  { name: 'red',   label: 'Красный', hex: '#F44336' },
  { name: 'blue',  label: 'Синий',   hex: '#2196F3' },
  { name: 'green', label: 'Зелёный', hex: '#4CAF50' },
];

function WireDrag({ mg }: { mg: MiniGameState }) {
  const connected = mg.wireConnected ?? [false, false, false];
  const sockets = mg.wireSockets ?? [0, 1, 2];
  const dragging = mg.wireDragging ?? -1;
  const doneCount = connected.filter(Boolean).length;

  const circleStyle = (colorHex: string, active: boolean, done: boolean): React.CSSProperties => ({
    width: 44, height: 44, borderRadius: 22,
    background: done ? colorHex : active ? colorHex : 'rgba(255,255,255,0.08)',
    border: `3px solid ${colorHex}`,
    boxShadow: active ? `0 0 14px ${colorHex}` : done ? `0 0 8px ${colorHex}66` : 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 18, cursor: done ? 'default' : 'pointer',
    transition: 'all 0.2s',
    opacity: done ? 0.6 : 1,
  });

  return (
    <div style={{ padding: '4px 0' }}>
      {/* Progress */}
      <div style={{ fontSize: 12, color: '#aaa', marginBottom: 14 }}>
        Соединено: {doneCount} / 3
      </div>

      {/* Step hint */}
      {dragging < 0 && doneCount < 3 && (
        <div style={{ fontSize: 11, color: '#FFD700', marginBottom: 10 }}>
          Выбери провод слева →
        </div>
      )}
      {dragging >= 0 && (
        <div style={{ fontSize: 11, color: WIRE_COLORS[dragging].hex, marginBottom: 10 }}>
          Подключи к розетке того же цвета →
        </div>
      )}

      {/* Main layout: sources left, sockets right */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        {/* Sources (left) — colored wires, fixed order: red, blue, green */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>ПРОВОДА</div>
          {WIRE_COLORS.map((c, idx) => (
            <div
              key={c.name}
              style={circleStyle(c.hex, dragging === idx, connected[idx])}
              onClick={() => !connected[idx] && onMiniGameWireSource(idx)}
            >
              {connected[idx] ? '✓' : dragging === idx ? '●' : '○'}
            </div>
          ))}
        </div>

        {/* Dashed connection lines indicator */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
          {WIRE_COLORS.map((c, idx) => (
            <div key={c.name} style={{
              height: 3, width: '100%', borderRadius: 2,
              background: connected[idx]
                ? c.hex
                : 'repeating-linear-gradient(90deg,rgba(255,255,255,0.15) 0,rgba(255,255,255,0.15) 6px,transparent 6px,transparent 12px)',
              transition: 'background 0.3s',
              marginTop: 20,
            }} />
          ))}
        </div>

        {/* Sockets (right) — shuffled positions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>РОЗЕТКИ</div>
          {sockets.map((colorIdx, socketPos) => {
            const c = WIRE_COLORS[colorIdx];
            const isDone = connected[colorIdx];
            return (
              <div
                key={socketPos}
                style={{
                  ...circleStyle(c.hex, dragging >= 0 && !isDone, isDone),
                  border: `3px dashed ${c.hex}`,
                }}
                onClick={() => !isDone && onMiniGameWireSocket(socketPos)}
              >
                {isDone ? '✓' : '?'}
              </div>
            );
          })}
        </div>
      </div>

      {/* Feedback */}
      {mg.feedback === 'hit' && (
        <div style={{ color: '#4CAF50', fontSize: 12, marginTop: 14 }}>⚡ Контакт!</div>
      )}
      {mg.feedback === 'miss' && (
        <div style={{ color: '#F44336', fontSize: 12, marginTop: 14 }}>💥 Неверный цвет!</div>
      )}
    </div>
  );
}
