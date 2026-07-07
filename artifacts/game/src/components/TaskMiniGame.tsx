import type { MiniGameState, TaskDefKey } from '../game/types';
import { TASK_DEFS } from '../data/tasks';
import { onMiniGameTap, onMiniGameDigitTap, cancelMiniGame } from '../game/gameActions';

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
    minWidth: 320, maxWidth: 380,
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

function TapTiming({ mg }: Props) {
  const isHit = mg.feedback === 'hit';
  const isMiss = mg.feedback === 'miss';

  return (
    <div>
      {/* Marker bar */}
      <div style={{
        position: 'relative',
        height: 48, background: 'rgba(255,255,255,0.06)',
        borderRadius: 8, overflow: 'hidden', marginBottom: 18,
        border: '1px solid rgba(255,255,255,0.1)',
      }}>
        {/* Green zone (center 20%) */}
        <div style={{
          position: 'absolute',
          left: '40%', width: '20%', top: 0, bottom: 0,
          background: 'rgba(76,175,80,0.35)',
          borderLeft: '2px solid #4CAF50',
          borderRight: '2px solid #4CAF50',
        }} />
        {/* Moving marker */}
        <div style={{
          position: 'absolute',
          left: `${mg.markerPos * 100}%`,
          top: 6, bottom: 6,
          width: 6,
          background: isHit ? '#FFD700' : isMiss ? '#F44336' : '#fff',
          borderRadius: 3,
          transform: 'translateX(-50%)',
          boxShadow: isHit ? '0 0 10px #FFD700' : isMiss ? '0 0 10px #F44336' : '0 0 6px rgba(255,255,255,0.8)',
          transition: 'background 0.1s',
        }} />
        {/* Hit count dots */}
        <div style={{
          position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', gap: 5,
        }}>
          {Array.from({ length: mg.requiredHits }).map((_, i) => (
            <div key={i} style={{
              width: 8, height: 8, borderRadius: '50%',
              background: i < mg.hits ? '#4CAF50' : 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.3)',
            }} />
          ))}
        </div>
      </div>

      <div style={{ fontSize: 12, color: '#aaa', marginBottom: 10 }}>
        {isHit && <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>✓ Попал!</span>}
        {isMiss && <span style={{ color: '#F44336', fontWeight: 'bold' }}>✗ Мимо!</span>}
        {!isHit && !isMiss && 'Жди зелёной зоны — жми E'}
      </div>

      <TapButton label="[E] ТАП" onTap={onMiniGameTap} />
    </div>
  );
}

// ─── Rapid Tap ────────────────────────────────────────────────────────────────

function RapidTap({ mg }: Props) {
  const pct = mg.tapCount / mg.requiredTaps;
  const timePct = mg.timeLimit / mg.timeLimitMax;

  return (
    <div>
      {/* Progress */}
      <div style={{ fontSize: 32, fontWeight: 'bold', color: '#FFD700', marginBottom: 8 }}>
        {mg.tapCount} <span style={{ fontSize: 16, color: '#aaa' }}>/ {mg.requiredTaps}</span>
      </div>

      <div style={{
        height: 14, background: 'rgba(255,255,255,0.08)',
        borderRadius: 7, overflow: 'hidden', marginBottom: 6,
      }}>
        <div style={{
          height: '100%', width: `${pct * 100}%`,
          background: 'linear-gradient(90deg, #FFD700, #FF9800)',
          borderRadius: 7, transition: 'width 0.05s',
        }} />
      </div>

      {/* Timer */}
      <div style={{ fontSize: 11, color: timePct < 0.3 ? '#F44336' : '#888', marginBottom: 14 }}>
        ⏱ {mg.timeLimit.toFixed(1)}с
        <div style={{
          display: 'inline-block', width: 60, height: 4,
          background: 'rgba(255,255,255,0.08)', borderRadius: 2,
          overflow: 'hidden', marginLeft: 8, verticalAlign: 'middle',
        }}>
          <div style={{
            height: '100%', width: `${timePct * 100}%`,
            background: timePct < 0.3 ? '#F44336' : '#4CAF50',
            transition: 'width 0.1s',
          }} />
        </div>
      </div>

      <TapButton label="[E] ЖАТЬ!" onTap={onMiniGameTap} big />
    </div>
  );
}

// ─── Sequence (digit pad) ─────────────────────────────────────────────────────

function Sequence({ mg }: Props) {
  const nextDigit = mg.sequence[mg.seqIndex];

  return (
    <div>
      {/* Code display */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>КОД ДОМОФОНА:</div>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 8 }}>
          {mg.sequence.map((d, i) => (
            <div key={i} style={{
              width: 36, height: 40,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: i < mg.seqIndex
                ? 'rgba(76,175,80,0.3)'
                : i === mg.seqIndex
                  ? (mg.seqWrong ? 'rgba(244,67,54,0.3)' : 'rgba(255,193,7,0.3)')
                  : 'rgba(255,255,255,0.05)',
              border: `1px solid ${i < mg.seqIndex ? '#4CAF50' : i === mg.seqIndex ? (mg.seqWrong ? '#F44336' : '#FFC107') : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 8,
              fontSize: 18, fontWeight: 'bold',
              color: i < mg.seqIndex ? '#4CAF50' : '#fff',
              transition: 'all 0.15s',
            }}>
              {d}
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11, color: '#aaa' }}>
          {mg.seqWrong
            ? <span style={{ color: '#F44336' }}>✗ Неверно — начни сначала</span>
            : <span>Следующий: <strong style={{ color: '#FFC107' }}>{nextDigit}</strong></span>}
        </div>
      </div>

      {/* Numpad */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6,
        maxWidth: 220, margin: '0 auto',
      }}>
        {[1,2,3,4,5,6,7,8,9,0].map(d => (
          <button
            key={d}
            onClick={() => onMiniGameDigitTap(d)}
            style={{
              gridColumn: d === 0 ? '2' : undefined,
              padding: '12px 0',
              background: nextDigit === d
                ? 'rgba(255,193,7,0.25)'
                : 'rgba(255,255,255,0.07)',
              border: `1px solid ${nextDigit === d ? '#FFC107' : 'rgba(255,255,255,0.12)'}`,
              borderRadius: 8, color: '#fff',
              fontSize: 18, fontWeight: 'bold', cursor: 'pointer',
              transition: 'background 0.1s',
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

function Dial({ mg }: Props) {
  const isHit = mg.feedback === 'hit';
  const isMiss = mg.feedback === 'miss';

  // Compute angular difference
  const diff = ((mg.dialAngle - mg.dialTarget + 540) % 360) - 180;
  const inZone = Math.abs(diff) <= mg.dialGreenWidth;

  return (
    <div>
      {/* Circular dial visualisation */}
      <div style={{ position: 'relative', width: 150, height: 150, margin: '0 auto 16px' }}>
        <svg width={150} height={150} viewBox="0 0 150 150">
          {/* Dial background */}
          <circle cx={75} cy={75} r={65} fill="rgba(255,255,255,0.04)"
            stroke="rgba(255,255,255,0.1)" strokeWidth={2} />
          {/* Green zone arc */}
          <GreenArc target={mg.dialTarget} half={mg.dialGreenWidth} />
          {/* Needle */}
          <line
            x1={75} y1={75}
            x2={75 + 55 * Math.cos((mg.dialAngle - 90) * Math.PI / 180)}
            y2={75 + 55 * Math.sin((mg.dialAngle - 90) * Math.PI / 180)}
            stroke={isHit ? '#FFD700' : isMiss ? '#F44336' : inZone ? '#4CAF50' : '#fff'}
            strokeWidth={3} strokeLinecap="round"
          />
          <circle cx={75} cy={75} r={5}
            fill={isHit ? '#FFD700' : isMiss ? '#F44336' : '#fff'} />
        </svg>

        {/* Stops indicator */}
        <div style={{
          position: 'absolute', bottom: -8, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', gap: 5,
        }}>
          {Array.from({ length: mg.dialRequiredStops }).map((_, i) => (
            <div key={i} style={{
              width: 10, height: 10, borderRadius: '50%',
              background: i < mg.dialStops ? '#4CAF50' : 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.3)',
            }} />
          ))}
        </div>
      </div>

      <div style={{ fontSize: 12, color: '#aaa', marginBottom: 10 }}>
        {isHit && <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>✓ Зафиксировано!</span>}
        {isMiss && <span style={{ color: '#F44336', fontWeight: 'bold' }}>✗ Мимо зоны</span>}
        {!isHit && !isMiss && (inZone
          ? <span style={{ color: '#4CAF50' }}>✓ В зоне — отпусти E!</span>
          : 'Удерживай E для вращения'
        )}
      </div>

      <div style={{ fontSize: 11, color: '#888' }}>
        Поворотов: {mg.dialStops} / {mg.dialRequiredStops}
      </div>
    </div>
  );
}

function GreenArc({ target, half }: { target: number; half: number }) {
  const toRad = (deg: number) => (deg - 90) * Math.PI / 180;
  const start = toRad(target - half);
  const end = toRad(target + half);
  const r = 65;
  const cx = 75, cy = 75;
  const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start);
  const x2 = cx + r * Math.cos(end), y2 = cy + r * Math.sin(end);
  const largeArc = half * 2 > 180 ? 1 : 0;
  return (
    <path
      d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`}
      fill="rgba(76,175,80,0.3)"
      stroke="#4CAF50"
      strokeWidth={2}
    />
  );
}

// ─── Letter ───────────────────────────────────────────────────────────────────

function Letter({ mg }: Props) {
  return (
    <div>
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 10, padding: '16px 18px',
        fontSize: 13, lineHeight: 1.6, color: '#ddd',
        textAlign: 'left', marginBottom: 16,
        fontFamily: 'serif',
      }}>
        {mg.letterText}
      </div>
      <TapButton label="[E] Понял(а)" onTap={onMiniGameTap} />
    </div>
  );
}

// ─── Shared tap button ────────────────────────────────────────────────────────

function TapButton({ label, onTap, big }: { label: string; onTap: () => void; big?: boolean }) {
  return (
    <button
      onPointerDown={(e) => { e.preventDefault(); onTap(); }}
      style={{
        padding: big ? '14px 40px' : '10px 32px',
        background: 'rgba(255,193,7,0.2)',
        border: '2px solid #FFC107',
        borderRadius: 12,
        color: '#FFC107',
        fontSize: big ? 18 : 14,
        fontWeight: 'bold',
        cursor: 'pointer',
        transition: 'background 0.1s',
        userSelect: 'none',
        touchAction: 'none',
      }}
    >
      {label}
    </button>
  );
}
