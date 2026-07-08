---
name: 95-Y procedural sprite-sheet generation workflow
description: How directional walk-cycle sprite sheets are generated and wired in, and how to extend the pattern to more characters/assets
---

# Procedural sprite-sheet generation

Adopted to replace "external AI image + hand-written slicing code" with a single
sandboxed step: draw the sheet procedurally in Node, then write animation code
against the exact grid just generated. Denis is the reference implementation
(pilot, done); the other 9 characters + 6 cars are not yet converted.

**Full workflow, reusable building blocks, and step-by-step pattern for adding
a new character are written in `HANDOFF.md` under "Sprite-sheet generation
workflow"** — read that before starting the next character, since it's the
part meant to survive across repo re-imports/sessions.

## Detail pass (Denis v2)
- To add real detail (glasses, cap badge, jacket zipper, jeans vs. plain pants,
  boot soles) without changing the final 64×64 frame size or touching
  `sprites.ts` metadata, bump the working grid resolution and lower the scale
  proportionally (16×16×4 → 32×32×2) rather than redesigning the pipeline.
  **Why:** doubling the grid at constant final size roughly doubles addressable
  detail while staying nearest-neighbor/nostalgic-pixelated — just re-doubling
  the *old* 16×16 coordinates would only produce bigger blocks, not more detail.
- Always crop+view individual frames (ImageMagick `-crop`+`-filter point -resize`)
  at both native and actual in-game draw size (spriteSize ~42px) before calling
  a redesign done — details that read at 64px can disappear at 42px.

## Key non-obvious decisions
- Animation frame-rate is driven by actual per-frame position delta (px/sec),
  not the raw joystick vector magnitude — **why:** in this game, movement
  speed is not itself proportional to joystick tilt (direction is normalized,
  only sprint/crouch/etc. change speed), so tying animation rate to joystick
  tilt would visually desync from how fast the character actually moves.
- Direction bucketing reuses `player.facingAngle` (already set from
  input dx/dy each tick) instead of re-deriving from the joystick — one
  source of truth, avoids duplicate logic.
- Animation state lives entirely in `renderer.ts` as a module-level
  `Map<playerId, ...>`, not on the `Player` type — keeps it a pure rendering
  concern with zero changes to game logic or the client/server-mirrored
  network types.
- PNG encoding is done with a hand-rolled zero-dependency encoder (Node
  `zlib` only) rather than `node-canvas`/`sharp`/ImageMagick — avoids native
  binding/system-dependency risk entirely for future sessions.
