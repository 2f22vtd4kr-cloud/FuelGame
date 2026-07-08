# 95-Й Бакстаб

A Russian-themed social deduction game (similar to Among Us) built with React, Vite, and Canvas 2D. Players are split into Хозяева (hosts) and Сливщики (traitors) in a courtyard setting.

## Stack

- **Frontend/Game**: React 19 + Vite 7, Canvas 2D renderer, TypeScript
- **Monorepo**: pnpm workspace (`pnpm-workspace.yaml`)
- **Packages**:
  - `artifacts/game` — main game client
  - `artifacts/api-server` — backend API server
  - `lib/api-spec` — OpenAPI spec + Orval codegen
  - `lib/api-client-react` — generated React Query hooks
  - `lib/api-zod` — generated Zod schemas

## Running the project

```bash
pnpm install          # install all workspace dependencies
```

The game runs via the managed workflow **`artifacts/game: web`**:

```bash
PORT=24631 BASE_PATH=/ pnpm --filter @workspace/game run dev
```

The game is then available at the Replit preview URL (root path `/`).

## Key game files

- `artifacts/game/src/game/state.ts` — singleton `gs`; `startGame()` initializes
- `artifacts/game/src/game/logic.ts` — `tickGame`, all interactions, win-conditions
- `artifacts/game/src/game/renderer.ts` — Canvas 2D draw loop + fog-of-war
- `artifacts/game/src/game/vision.ts` — §2.3 raycasting fog-of-war
- `artifacts/game/src/game/botAI.ts` — bot behavior trees
- `artifacts/game/src/game/audio.ts` — Web Audio API SFX
- `artifacts/game/src/data/map.ts` — zones, cars, tasks, decorations
- `artifacts/game/src/data/tasks.ts` — 20 task definitions
- `artifacts/game/src/data/characters.ts` — 10 characters with voice lines
- `artifacts/game/src/components/HUD.tsx` — React HUD overlay (10Hz snapshots)
- `artifacts/game/src/components/MeetingScreen.tsx` — vote UI
- `artifacts/game/src/components/Lobby.tsx` — character select + game settings
- `artifacts/game/src/components/GameCanvas.tsx` — mounts canvas, drives RAF loop

## Design bible

- `attached_assets/1_Game_DOC_1783421374443.md` — Volume I, 1992-line source of truth for all mechanics. **Fully implemented.**
- `docs/vol2/` — Volume II (Production Specs, Implementation & Operations), chunked one file per section (`18-task-minigames.md` … `28-final-word.md`) so it never needs to be re-read in one giant pass. **Start every Volume II session by reading `docs/vol2/PROGRESS.md`** — it tracks per-section status (done / partial / not started) and lists the next suggested gaps to close.

## Type-checking

```bash
pnpm --filter @workspace/game run typecheck
```

## Architecture notes

- Game state lives in a singleton `gs` mutated at 60fps — **no Zustand**
- React HUD reads a shallow snapshot of `gs` at 10Hz to avoid re-render overhead
- Coordinate system: 1200×900 canvas pixels (`MAP_W`, `MAP_H` in `types.ts`)
- `VISION_RADIUS=420px ≈ 12m`, `INTERACT_RADIUS=65px ≈ 1.5m`

## User preferences

- Keep the existing monorepo structure and pnpm workspace conventions
- Do not restructure or migrate the stack without asking first
