import { useEffect, useRef, useCallback, useState } from 'react';
import type { InputState } from '../game/types';
import { gs } from '../game/state';
import { tickGame } from '../game/logic';
import { triggerEmote } from '../game/gameActions';
import { renderGame } from '../game/renderer';
import { audio } from '../game/audio';
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
  const touchSprintRef = useRef(false);
  const touchCrouchRef = useRef(false);

  const [showEmoteWheel, setShowEmoteWheel] = useState(false);

  // ── Keyboard handler ───────────────────────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',
           'w','a','s','d','W','A','S','D',' ','e','E',
           'Shift','Control','q','Q'].includes(e.key)) {
        e.preventDefault();
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
      inp.sprint = keys.has('Shift') || touchSprintRef.current;
      inp.crouch = keys.has('Control') || touchCrouchRef.current;

      if (network) {
        // ── Multiplayer mode ──────────────────────────────────────────────
        // Set local player perspective so renderer uses the right camera + fog
        if (myPlayerId) gs.localPlayerId = myPlayerId;

        // Send our input to the server every frame
        network.sendInput(inp);

        // Apply latest server state to gs (if a new one arrived)
        network.applyLatestState();

        // After applying server state, restore our localPlayerId
        if (myPlayerId) gs.localPlayerId = myPlayerId;
      } else {
        // ── Single-player mode ────────────────────────────────────────────
        tickGame(dt, inp);
      }

      renderGame(ctx, gs, canvas!.width, canvas!.height);

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

  const onSprint = useCallback((active: boolean) => {
    touchSprintRef.current = active;
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

      <VirtualJoystick onMove={onJoystickMove} onInteract={onInteract} visible={true} />

      {/* Mobile action buttons */}
      <div style={{
        position: 'absolute', right: 16, bottom: 110,
        display: 'flex', flexDirection: 'column', gap: 8,
        pointerEvents: 'all',
      }}>
        <button onPointerDown={() => onSprint(true)} onPointerUp={() => onSprint(false)} onPointerLeave={() => onSprint(false)} style={mobileBtn('#FFD700')}>🏃</button>
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
        Shift — спринт &nbsp;|&nbsp; Ctrl — присесть &nbsp;|&nbsp; Q — эмоции
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
