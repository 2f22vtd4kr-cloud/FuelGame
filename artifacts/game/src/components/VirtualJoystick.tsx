import React, { useRef, useEffect, useCallback } from 'react';

interface Props {
  onMove: (dx: number, dy: number) => void;
  onInteract: (pressed: boolean) => void;
  onSprintToggle?: () => void;   // §2.2 double-tap right = sprint toggle
  onEmoteOpen?: () => void;      // §2.2 right swipe up = emote wheel
  visible: boolean;
}

const JOYSTICK_RADIUS = 52;
const KNOB_RADIUS = 26;
const JOYSTICK_LEFT = 24;   // fixed left offset from viewport edge
const JOYSTICK_BOTTOM = 100; // fixed bottom offset from viewport edge

export default function VirtualJoystick({ onMove, onInteract, onSprintToggle, onEmoteOpen, visible }: Props) {
  const baseRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const touchIdRef = useRef<number | null>(null);
  const basePositionRef = useRef<{ x: number; y: number } | null>(null);
  // §2.2 Double-tap sprint + swipe-up emote tracking
  const lastInteractTapRef = useRef<number>(0);
  const rightTouchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    e.preventDefault();
    if (touchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    touchIdRef.current = touch.identifier;

    // Fixed joystick: always anchored at bottom-left, knob tracks within it
    const centerX = JOYSTICK_LEFT + JOYSTICK_RADIUS;
    const centerY = window.innerHeight - JOYSTICK_BOTTOM - JOYSTICK_RADIUS;
    basePositionRef.current = { x: centerX, y: centerY };

    if (baseRef.current) {
      baseRef.current.style.opacity = '0.92';
    }
    if (knobRef.current) {
      knobRef.current.style.transform = 'translate(-50%, -50%)';
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault();
    if (touchIdRef.current === null || !basePositionRef.current) return;

    let touch: Touch | null = null;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchIdRef.current) {
        touch = e.changedTouches[i];
        break;
      }
    }
    if (!touch) return;

    const dx = touch.clientX - basePositionRef.current.x;
    const dy = touch.clientY - basePositionRef.current.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const maxLen = JOYSTICK_RADIUS;

    const clampedLen = Math.min(len, maxLen);
    const nx = len > 0 ? dx / len : 0;
    const ny = len > 0 ? dy / len : 0;

    // Move knob
    if (knobRef.current) {
      knobRef.current.style.transform = `translate(calc(-50% + ${nx * clampedLen}px), calc(-50% + ${ny * clampedLen}px))`;
    }

    onMove(nx * (clampedLen / maxLen), ny * (clampedLen / maxLen));
  }, [onMove]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    e.preventDefault();
    let found = false;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchIdRef.current) {
        found = true;
        break;
      }
    }
    if (!found) return;

    touchIdRef.current = null;
    basePositionRef.current = null;

    if (baseRef.current) baseRef.current.style.opacity = '0.45';
    if (knobRef.current) knobRef.current.style.transform = 'translate(-50%, -50%)';
    onMove(0, 0);
  }, [onMove]);

  useEffect(() => {
    const base = baseRef.current;
    if (!base) return;
    // Attach to the left half of the screen (the joystick zone)
    const zone = document.getElementById('joystick-zone');
    if (!zone) return;
    zone.addEventListener('touchstart', handleTouchStart, { passive: false });
    zone.addEventListener('touchmove', handleTouchMove, { passive: false });
    zone.addEventListener('touchend', handleTouchEnd, { passive: false });
    zone.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    return () => {
      zone.removeEventListener('touchstart', handleTouchStart);
      zone.removeEventListener('touchmove', handleTouchMove);
      zone.removeEventListener('touchend', handleTouchEnd);
      zone.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  if (!visible) return null;

  return (
    <>
      {/* Joystick zone (left half of screen) */}
      <div
        id="joystick-zone"
        style={{
          position: 'fixed',
          left: 0,
          bottom: 0,
          width: '55%',
          height: '45%',
          touchAction: 'none',
          userSelect: 'none',
          zIndex: 20,
        }}
      />

      {/* Joystick visual — static, anchored at bottom-left */}
      <div
        ref={baseRef}
        style={{
          position: 'fixed',
          width: JOYSTICK_RADIUS * 2,
          height: JOYSTICK_RADIUS * 2,
          left: JOYSTICK_LEFT,
          bottom: JOYSTICK_BOTTOM,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.12)',
          border: '2px solid rgba(255,255,255,0.3)',
          opacity: 0.4,
          pointerEvents: 'none',
          zIndex: 21,
          transition: 'opacity 0.15s',
        }}
      >
        <div
          ref={knobRef}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: KNOB_RADIUS * 2,
            height: KNOB_RADIUS * 2,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.5)',
            border: '2px solid rgba(255,255,255,0.8)',
            transform: 'translate(-50%, -50%)',
            transition: 'transform 0.05s',
          }}
        />
      </div>

      {/* §2.2 Right-zone overlay: swipe-up = emote wheel */}
      <div
        style={{
          position: 'fixed', right: 0, bottom: 0,
          width: '45%', height: '55%',
          touchAction: 'none', userSelect: 'none',
          zIndex: 19,
        }}
        onTouchStart={(e) => {
          const t = e.changedTouches[0];
          rightTouchStartRef.current = { x: t.clientX, y: t.clientY, time: Date.now() };
        }}
        onTouchEnd={(e) => {
          if (!rightTouchStartRef.current) return;
          const t = e.changedTouches[0];
          const swipeUp = rightTouchStartRef.current.y - t.clientY;
          const swipeHoriz = Math.abs(t.clientX - rightTouchStartRef.current.x);
          const elapsed = Date.now() - rightTouchStartRef.current.time;
          if (swipeUp >= 40 && elapsed < 400 && swipeHoriz < swipeUp) {
            onEmoteOpen?.();
          }
          rightTouchStartRef.current = null;
        }}
      />

      {/* Interact / E button (right side) */}
      <button
        onTouchStart={(e) => {
          e.preventDefault();
          // §2.2 Double-tap right = sprint toggle
          const now = Date.now();
          if (now - lastInteractTapRef.current < 300) {
            onSprintToggle?.();
            lastInteractTapRef.current = 0;
          } else {
            lastInteractTapRef.current = now;
          }
          onInteract(true);
        }}
        onTouchEnd={(e) => { e.preventDefault(); onInteract(false); }}
        onMouseDown={() => onInteract(true)}
        onMouseUp={() => onInteract(false)}
        style={{
          position: 'fixed',
          right: 28,
          bottom: 90,
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'rgba(255,200,50,0.85)',
          border: '3px solid rgba(255,220,80,0.9)',
          fontSize: 22,
          fontWeight: 'bold',
          color: '#1A1A1A',
          cursor: 'pointer',
          touchAction: 'none',
          userSelect: 'none',
          zIndex: 21,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}
      >
        E
      </button>
    </>
  );
}
