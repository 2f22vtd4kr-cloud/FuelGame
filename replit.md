# 95-Й Бакстаб

Social deduction game set in a 2026 Russian residential complex — players secretly assigned as Owners (protect cars) or Siphoners (drain fuel) — built with React + Canvas 2D, fully client-side.

## Run & Operate

- Game runs at `/` — workflow `artifacts/game: web` (port 24631)
- `pnpm --filter @workspace/game run dev` — run the game dev server
- `pnpm --filter @workspace/game run typecheck` — typecheck the game
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/db run push` — push DB schema changes (requires `DATABASE_URL`)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Game: React 19 + Canvas 2D + Vite 7 (no WebGL, no game engine)
- State: mutable singleton `gs` (no Zustand/Redux) — React HUD snapshots at 10Hz
- API: Express 5 (artifact: `artifacts/api-server`) — not yet wired to game
- DB: PostgreSQL + Drizzle ORM (schema written, not yet pushed)
- Validation: Zod (`zod/v4`), `drizzle-zod`

## Where things live

- `artifacts/game/src/` — all game code
  - `game/` — state, logic, botAI, renderer, types
  - `data/` — characters, tasks, map, ticker (news headlines)
  - `components/` — Lobby, GameCanvas, HUD, VirtualJoystick, MeetingScreen, GameResults
- `lib/db/src/schema/index.ts` — DB schema (users, rooms, match_history, leaderboard)
- `attached_assets/1_Game_DOC_1783414439610.md` — full game design bible (1992 lines)
- `HANDOFF.md` — session-by-session progress log and next steps

## Architecture decisions

- **No Zustand/Redux**: `gs` in `state.ts` is mutated every frame; React HUD gets `{ ...gs }` snapshots at 10Hz via accumulator in RAF
- **Canvas 2D not WebGL**: simpler, mobile-friendly, no dependencies
- **Game loop owns meeting timer**: `tickGame` → `tickMeeting`, not `setInterval`
- **Bot AI is a state machine**: `idle → moving → interacting → fleeing → at_meeting`
- **Roles randomized across all players** (human included): human can be Slivshchik

## Product

Phase 1 (current): single-device offline game — up to 8 players (bots), character select, WASD + virtual joystick, tasks, siphoning, meeting/vote, win conditions.

Phase 2 (planned): WebSocket multiplayer, room codes, Telegram Mini App wrapper.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- DB not set up — game works without it (Phase 1 is fully client-side)
- `api-server` and `mockup-sandbox` artifacts exist but are not used yet
- Port 24631 is fixed for the game dev server (set via `PORT` env in workflow)
- See `HANDOFF.md` for known issues and session-by-session progress

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- Full game design bible: `attached_assets/1_Game_DOC_1783414439610.md`
