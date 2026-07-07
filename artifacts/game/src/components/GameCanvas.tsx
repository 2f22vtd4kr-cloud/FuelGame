import React, { useRef, useEffect, useCallback, useState } from 'react';
import type { GameState, InputState } from '../game/types';
import { gs } from '../game/state';
import { tickGame } from '../game/logic';
import { renderGame } from '../game/renderer';
import VirtualJoystick from './VirtualJoystick';
import HUD from './HUD';

interface Props {
  onSnapshot: (snap: GameState) => void;
  dimCanvas: boolean;  // dim canvas during meeting
}

export default function GameCanvas({ onSnapshot, dimCanvas }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<InputState>({ dx: 0, dy: 0, interact: false, prevInteract: false });
  const lastTimeRef = useRef<number>(0);
  const snapshotTimerRef = useRef<number>(0);
  const hudRef = useRef<GameState>({ ...gs });
  const [, forceHUDUpdate] = useState(0);

  // Resize canvas to fill container
  useEffect(() => {
    function resize() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // Keyboard input
  useEffect(() => {
    const keysHeld = new Set<string>();

    function onKeyDown(e: KeyboardEvent) {
      const k = e.key.toLowerCase();
      keysHeld.add(k);
      if (k === 'e' || k === ' ') {
        e.preventDefault();
        inputRef.current.interact = true;
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      const k = e.key.toLowerCase();
      keysHeld.delete(k);
      if (k === 'e' || k === ' ') {
        inputRef.current.interact = false;
      }
    }

    const keyPollId = setInterval(() => {
      let dx = 0, dy = 0;
      if (keysHeld.has('a') || keysHeld.has('arrowleft'))  dx -= 1;
      if (keysHeld.has('d') || keysHeld.has('arrowright')) dx += 1;
      if (keysHeld.has('w') || keysHeld.has('arrowup'))    dy -= 1;
      if (keysHeld.has('s') || keysHeld.has('arrowdown'))  dy += 1;
      // Normalise diagonal
      const len = Math.sqrt(dx * dx + dy * dy);
      inputRef.current.dx = len > 0 ? dx / len : 0;
      inputRef.current.dy = len > 0 ? dy / len : 0;
    }, 16);

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      clearInterval(keyPollId);
    };
  }, []);

  // 60fps game loop + canvas renderer
  useEffect(() => {
    let rafId: number;
    lastTimeRef.current = performance.now();

    function loop(timestamp: number) {
      // Delta time, capped at 50ms to avoid spiral of death on tab-switch
      const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = timestamp;

      // Tick game logic
      tickGame(dt, inputRef.current);

      // Update prevInteract after tick so single-press detection works next frame
      inputRef.current.prevInteract = inputRef.current.interact;

      // Render canvas every frame
      const canvas = canvasRef.current;
      if (canvas) renderGame(canvas, gs);

      // Update React HUD + parent snapshot at ~10Hz
      snapshotTimerRef.current += dt;
      if (snapshotTimerRef.current >= 0.1) {
        snapshotTimerRef.current = 0;
        // Shallow-copy mutable arrays so React sees changes
        const snap: GameState = {
          ...gs,
          players: [...gs.players],
          cars: [...gs.cars],
          tasks: [...gs.tasks],
          meeting: gs.meeting
            ? { ...gs.meeting, votes: [...gs.meeting.votes], chatMessages: [...gs.meeting.chatMessages] }
            : null,
        };
        hudRef.current = snap;
        forceHUDUpdate(n => n + 1); // trigger HUD re-render
        onSnapshot(snap);          // notify App of phase changes
      }

      rafId = requestAnimationFrame(loop);
    }

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [onSnapshot]);

  // Joystick callbacks
  const handleJoystickMove = useCallback((dx: number, dy: number) => {
    // Only overwrite joystick axes; keyboard handler sets them independently
    inputRef.current.dx = dx;
    inputRef.current.dy = dy;
  }, []);

  const handleInteract = useCallback((pressed: boolean) => {
    inputRef.current.interact = pressed;
  }, []);

  const isPlaying = !dimCanvas;

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0D1B0D' }}>
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          opacity: dimCanvas ? 0.25 : 1,
          transition: 'opacity 0.3s',
          touchAction: 'none',
          userSelect: 'none',
        }}
      />

      {/* HUD overlay (only when playing, not during meeting) */}
      {isPlaying && <HUD gs={hudRef.current} />}

      {/* Virtual joystick + interact button */}
      <VirtualJoystick
        onMove={handleJoystickMove}
        onInteract={handleInteract}
        visible={isPlaying}
      />
    </div>
  );
}
