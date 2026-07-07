import React, { useRef, useEffect, useCallback } from 'react';

interface Props {
  onMove: (dx: number, dy: number) => void;
  onInteract: (pressed: boolean) => void;
  visible: boolean;
}

const JOYSTICK_RADIUS = 52;
const KNOB_RADIUS = 26;

export default function VirtualJoystick({ onMove, onInteract, visible }: Props) {
  const baseRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const touchIdRef = useRef<number | null>(null);
  const basePositionRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    e.preventDefault();
    if (touchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    touchIdRef.current = touch.identifier;
    basePositionRef.current = { x: touch.clientX, y: touch.clientY };

    // Position the base at touch point
    if (baseRef.current) {
      baseRef.current.style.left = `${touch.clientX - JOYSTICK_RADIUS}px`;
      baseRef.current.style.top = `${touch.clientY - JOYSTICK_RADIUS}px`;
      baseRef.current.style.opacity = '1';
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

    if (baseRef.current) baseRef.current.style.opacity = '0.4';
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

      {/* Joystick visual (follows touch) */}
      <div
        ref={baseRef}
        style={{
          position: 'fixed',
          width: JOYSTICK_RADIUS * 2,
          height: JOYSTICK_RADIUS * 2,
          left: 30,
          bottom: 80,
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

      {/* Interact button (right side) */}
      <button
        onTouchStart={(e) => { e.preventDefault(); onInteract(true); }}
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
