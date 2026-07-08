import { useEffect, useRef, useCallback, useState } from 'react';
import type { InputState } from '../game/types';
import { SIPHON_CLICK_RADIUS, MAP_W, MAP_H, SPRINT_SPEED_MULT, CROUCH_SPEED_MULT } from '../game/types';
import { gs } from '../game/state';
import { dist } from '../data/map';
import { tickGame, checkBackstabMoment } from '../game/logic';
import { triggerEmote } from '../game/gameActions';
import { renderGame } from '../game/renderer';
import { audio } from '../game/audio';
import { captureMoment, startFrameCapture, stopFrameCapture } from '../game/replayBuffer';
import { loadSprites } from '../game/sprites';
import type { GameNetwork } from '../game/network';
import VirtualJoystick from './VirtualJoystick';

interface GameCanvasProps {
  onStateSnapshot: (snap: typeof gs) => void;
  network?: GameNetwork | null;
  myPlayerId?: string | null;
}

const EMOTES = ['👋', '🤔', '🚨', '😂'];
const EMOTE_LABELS = ['Привет!', 'Подозрительно...', 'Тревога!', 'Хаха!'];

export default function GameCanvas({ onStateSnapshot, network, myPlayerId }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const accRef = useRef<number>(0);

  const keysRef = useRef<Set<string>>(new Set());
  const joystickRef = useRef({ dx: 0, dy: 0 });
  const inputRef = useRef<InputState>({
    dx: 0, dy: 0,
    interact: false, prevInteract: false,
    sprint: false, crouch: false,
    emoteIndex: null,
  });

  const touchInteractRef = useRef(false);
  const touchSprintRef = useRef(false);   // mobile toggle state
  const touchCrouchRef = useRef(false);
  const sprintToggleRef = useRef(false);  // keyboard sprint toggle state
  const prevBackstabMomentRef = useRef<string | null>(null); // §9.2 frame capture
  const prevPhaseRef = useRef<string>('');                   // §9.2 phase tracking for frame buffer
  // §02.6 multiplayer: track previous siphon phases to detect 0→1 transitions
  const prevCarSiphonPhaseRef = useRef<Record<string, number>>({});

  const [showEmoteWheel, setShowEmoteWheel] = useState(false);

  // ── §7.3 Pre-load character and car sprites ────────────────────────────────
  useEffect(() => { loadSprites(); }, []);

  // ── Keyboard handler ───────────────────────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',
           'w','a','s','d','W','A','S','D',' ','e','E',
           'Shift','Control','q','Q'].includes(e.key)) {
        e.preventDefault();
      }
      // Sprint toggle on Shift press (§13.1)
      if (e.key === 'Shift' && !keysRef.current.has('Shift')) {
        sprintToggleRef.current = !sprintToggleRef.current;
      }
      keysRef.current.add(e.key);
      if (e.key === 'q' || e.key === 'Q') {
        setShowEmoteWheel(v => !v);
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      keysRef.current.delete(e.key);
    }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // ── RAF game loop ─────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false })!;

    function resize() {
      canvas!.width = canvas!.clientWidth;
      canvas!.height = canvas!.clientHeight;
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    function loop(ts: number) {
      rafRef.current = requestAnimationFrame(loop);
      const raw = ts - lastTimeRef.current;
      lastTimeRef.current = ts;
      const dt = Math.min(raw / 1000, 0.05);

      const keys = keysRef.current;
      const joy = joystickRef.current;
      const inp = inputRef.current;
      inp.prevInteract = inp.interact;

      // Build input state from keyboard + joystick
      let kbDx = 0, kbDy = 0;
      if (keys.has('ArrowLeft') || keys.has('a') || keys.has('A')) kbDx -= 1;
      if (keys.has('ArrowRight') || keys.has('d') || keys.has('D')) kbDx += 1;
      if (keys.has('ArrowUp') || keys.has('w') || keys.has('W')) kbDy -= 1;
      if (keys.has('ArrowDown') || keys.has('s') || keys.has('S')) kbDy += 1;

      if (kbDx !== 0 || kbDy !== 0) { inp.dx = kbDx; inp.dy = kbDy; }
      else { inp.dx = joy.dx; inp.dy = joy.dy; }

      inp.interact = keys.has('e') || keys.has('E') || keys.has(' ') || touchInteractRef.current;
      inp.sprint = sprintToggleRef.current || touchSprintRef.current;
      inp.crouch = keys.has('Control') || touchCrouchRef.current;

      if (network) {
        // ── Multiplayer mode ──────────────────────────────────────────────
        // Set local player perspective so renderer uses the right camera + fog
        if (myPlayerId) gs.localPlayerId = myPlayerId;

        // Send our input to the server every frame
        network.sendInput(inp);

        // §5.3 Apply server state with remote-player interpolation
        // Snapshot siphon phases BEFORE applying new state to detect transitions
        const prevPhases = prevCarSiphonPhaseRef.current;
        network.applyLatestState(performance.now());

        // §5.3 Client-side prediction: immediately apply local input to local player
        // so movement feels instant instead of waiting for the next server tick (50ms).
        if (gs.phase === 'play') {
          const lp = gs.players.find(p => p.id === gs.localPlayerId);
          if (lp && lp.isAlive && lp.isHuman) {
            const len = Math.sqrt(inp.dx * inp.dx + inp.dy * inp.dy);
            if (len > 0.05) {
              const nx = inp.dx / len;
              const ny = inp.dy / len;
              const speedMult = lp.isSprinting ? SPRINT_SPEED_MULT
                : lp.isCrouching ? CROUCH_SPEED_MULT
                : 1.0;
              const speed = lp.speed * speedMult;
              lp.pos = {
                x: Math.max(14, Math.min(MAP_W - 14, lp.pos.x + nx * speed * dt)),
                y: Math.max(14, Math.min(MAP_H - 14, lp.pos.y + ny * speed * dt)),
              };
            }
          }
        }

        // After applying server state, restore our localPlayerId
        if (myPlayerId) gs.localPlayerId = myPlayerId;

        // §02.6 Detect siphon setup start (phase 0→1) for click SFX in multiplayer
        const localP = gs.players.find(p => p.id === gs.localPlayerId);
        for (const car of gs.cars) {
          const prev = prevPhases[car.id] ?? 0;
          if (prev === 0 && car.siphonPhase === 1 && localP) {
            if (dist(car.pos, localP.pos) < SIPHON_CLICK_RADIUS) {
              audio.play('siphon_click');
            }
          }
          prevPhases[car.id] = car.siphonPhase;
        }

        // §9.2 Run backstab detection on the multiplayer path too
        // (single-player path runs it inside tickGame → updateBackstabMoment)
        if (gs.phase === 'play') checkBackstabMoment();
      } else {
        // ── Single-player mode ────────────────────────────────────────────
        tickGame(dt, inp);
      }

      renderGame(ctx, gs, canvas!.width, canvas!.height);

      // §9.2 Frame buffer: start capturing on play, stop on results/end
      if (gs.phase !== prevPhaseRef.current) {
        const wasPlay = prevPhaseRef.current === 'play';
        const isPlay  = gs.phase === 'play';
        prevPhaseRef.current = gs.phase;
        if (isPlay && !wasPlay) {
          startFrameCapture(canvas!);
        } else if (wasPlay && !isPlay) {
          stopFrameCapture();
        }
      }

      // §9.2 Backstab Moment: encode GIF when a dramatic moment is first detected
      if (gs.backstabMoment && gs.backstabMoment !== prevBackstabMomentRef.current) {
        prevBackstabMomentRef.current = gs.backstabMoment;
        captureMoment(canvas!, gs.backstabMoment);
      } else if (!gs.backstabMoment && prevBackstabMomentRef.current) {
        prevBackstabMomentRef.current = null; // reset for next match
      }

      // 10Hz HUD snapshot
      accRef.current += dt;
      if (accRef.current >= 0.1) {
        accRef.current = 0;
        onStateSnapshot({
          ...gs,
          activeMiniGame: gs.activeMiniGame ? { ...gs.activeMiniGame } : null,
          activeSabotages: gs.activeSabotages.map(s => ({ ...s })),
        });
      }
    }

    lastTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [onStateSnapshot, network, myPlayerId]);

  // ── Mobile callbacks ──────────────────────────────────────────────────────
  const onJoystickMove = useCallback((dx: number, dy: number) => {
    joystickRef.current.dx = dx;
    joystickRef.current.dy = dy;
  }, []);

  const onInteract = useCallback((active: boolean) => {
    audio.init();
    touchInteractRef.current = active;
  }, []);

  const onSprint = useCallback(() => {
    touchSprintRef.current = !touchSprintRef.current;
  }, []);

  const onCrouch = useCallback((active: boolean) => {
    touchCrouchRef.current = active;
  }, []);

  const onEmote = useCallback((idx: number) => {
    const player = gs.players.find(p => p.id === gs.localPlayerId);
    if (player) {
      triggerEmote(player.id, EMOTES[idx]);
      audio.play('ui_click');
    }
    setShowEmoteWheel(false);
  }, []);

  const handleCanvasClick = useCallback(() => {
    audio.init();
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        style={{ display: 'block', width: '100%', height: '100%', touchAction: 'none' }}
      />

      <VirtualJoystick
        onMove={onJoystickMove}
        onInteract={onInteract}
        onSprintToggle={onSprint}
        onEmoteOpen={() => setShowEmoteWheel(v => !v)}
        visible={true}
      />

      {/* Mobile action buttons — z-index 22 keeps them above the swipe overlay (z:19) and E button (z:21) */}
      <div style={{
        position: 'absolute', right: 16, bottom: 110,
        display: 'flex', flexDirection: 'column', gap: 8,
        pointerEvents: 'all', zIndex: 22,
      }}>
        <button onClick={onSprint} style={mobileBtn('#FFD700')}>🏃</button>
        <button onPointerDown={() => onCrouch(true)} onPointerUp={() => onCrouch(false)} onPointerLeave={() => onCrouch(false)} style={mobileBtn('#90CAF9')}>🦆</button>
        <button onPointerDown={() => setShowEmoteWheel(v => !v)} style={mobileBtn('#FF8A65')}>😂</button>
      </div>

      {/* Emote wheel */}
      {showEmoteWheel && (
        <div style={{
          position: 'absolute', right: 80, bottom: 110,
          background: 'rgba(20,20,32,0.95)', borderRadius: 12,
          padding: 12, display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 8, zIndex: 50, boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          <div style={{ gridColumn: '1 / -1', color: '#aaa', fontSize: 10, textAlign: 'center', marginBottom: 4 }}>Q — ЭМОЦИИ</div>
          {EMOTES.map((e, i) => (
            <button key={i} onClick={() => onEmote(i)} style={{
              width: 60, height: 52, borderRadius: 8,
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#fff', cursor: 'pointer',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 2, fontSize: 20,
            }}>
              <span>{e}</span>
              <span style={{ fontSize: 7, color: '#aaa' }}>{EMOTE_LABELS[i]}</span>
            </button>
          ))}
        </div>
      )}

      {/* Desktop controls hint */}
      <div style={{
        position: 'absolute', left: 12, bottom: 12,
        color: 'rgba(255,255,255,0.4)', fontSize: 10, lineHeight: 1.5,
        pointerEvents: 'none',
      }}>
        WASD — движение &nbsp;|&nbsp; E/Пробел — взаимодействие<br />
        Shift — спринт (toggle) &nbsp;|&nbsp; Ctrl — присесть &nbsp;|&nbsp; Q — эмоции
        {network && <><br /><span style={{ color: 'rgba(0,230,118,0.6)' }}>🌐 Мультиплеер</span></>}
      </div>
    </div>
  );
}

function mobileBtn(color: string): React.CSSProperties {
  return {
    width: 52, height: 52, borderRadius: '50%',
    background: `rgba(${hexToRgb(color)},0.85)`,
    border: `2px solid ${color}`,
    fontSize: 22, cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
    userSelect: 'none',
  };
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}
