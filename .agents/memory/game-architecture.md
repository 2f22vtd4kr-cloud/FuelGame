---
name: 95-Y Bakstab game architecture
description: Core architecture decisions for the 95-Й game (artifacts/game). Critical for any future session working on the game.
---

## Pattern: mutable singleton + React bridge
- `gs` in `src/game/state.ts` is mutated every frame by `tickGame()` — never replaced.
- React HUD reads snapshots via `useState` + `forceUpdate` at ~10Hz inside `GameCanvas.tsx`.
- `App.tsx` receives phase-change notifications via `onSnapshot` callback at 10Hz.

**Why:** Canvas renderer needs direct mutable access (no diffing overhead). React only re-renders HUD/overlays, not the canvas.

**How to apply:** Never put `gs` in React state. Always copy arrays on snapshot: `players: [...gs.players]`.

## Meeting timer rule
Meeting countdown is ticked inside `tickMeeting(dt)` called from `tickGame()` — NOT `setInterval`. This was the bug in the previous session that caused timer drift.

**Why:** `setInterval` fires independently of the game loop, causing timing inconsistency and race conditions with game state.

## Bot AI distance gating
Bots check `dist < INTERACT_RADIUS * 0.7` BEFORE claiming a task (`task.doer = bot.id`). They re-check each frame while interacting. Siphoner bots verify they are within `SIPHON_RADIUS` every frame before draining.

**Why:** Without the re-check, a bot could claim a task from across the map when lag spikes moved it away.

## MAP_W / MAP_H canonical source
These constants are defined in `src/data/map.ts` and duplicated in `src/game/types.ts` for convenience. Always import from `src/data/map.ts` in renderer and game-loop files.

**Why:** `renderer.ts` must import from `map.ts`; importing from `types.ts` would create a circular dep risk.

## Phase routing
`gs.phase` drives `App.tsx` phase state. Values: `'lobby' | 'play' | 'meeting' | 'results'`. `GameCanvas` calls `onSnapshot(snap)` at 10Hz; `App` calls `setAppPhase(snap.phase)`. The canvas stays mounted during meeting (dimmed to 25% opacity).
