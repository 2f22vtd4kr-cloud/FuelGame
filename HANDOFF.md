# 95-Й БАКСТАБ — HANDOFF DOCUMENT

> **For any new session:** Read this file FIRST. It tells you exactly what was built, what's in progress, and what to do next. Update this file continuously as you work. The game design bible is in `attached_assets/1_Game_DOC_1783414439610.md`.

---

## GAME OVERVIEW

**"95-Й" (Ninety-Fifth / Bakstab)** — social deduction mobile-first game set in 2026 Russian residential complex (ЖК "Цветочные Поляны").

- **Хозяева (Owners):** protect car fuel, complete tasks to fill Unity Meter (0→100%)
- **Сливщики (Siphoners):** drain fuel with siphon hoses, call sabotages
- **Сходка (Meeting):** climax — players vote out suspects
- **Win (Хозяева):** Unity Meter = 100% OR all Сливщики ejected
- **Win (Сливщики):** all cars at 0% fuel OR equal/fewer хозяева than сливщики

---

## CURRENT STATE — WHAT IS BUILT (Session 2)

### ✅ Completed
- [x] `HANDOFF.md` (this file)
- [x] DB schema: `lib/db/src/schema/index.ts` (users, inventory, match_history, daily_leaderboard, achievements, rooms, room_events)
- [x] Game artifact: `artifacts/game/` (react-vite, preview path `/`)
- [x] `src/game/types.ts` — all TypeScript types for the game
- [x] `src/data/characters.ts` — 10 character definitions (Денис, Аня, Вова, etc.)
- [x] `src/data/tasks.ts` — 5 task definitions (шаурма, домофон, мусор, окно, бабушка)
- [x] `src/data/map.ts` — map layout (buildings, cars, tasks, decorations, collision)
- [x] `src/data/ticker.ts` — 50 satirical news headlines (from design doc §1.5)
- [x] `src/game/state.ts` — mutable singleton game state + `startGame()` initializer
- [x] `src/game/logic.ts` — full game update: movement, task gating (FIXED), meeting timer (FIXED), win conditions, prompt system
- [x] `src/game/botAI.ts` — bot AI state machine (FIXED: distance gating, flee logic)
- [x] `src/game/renderer.ts` — Canvas 2D renderer (buildings, grass, parking, cars, players, tasks, siphon animation, decorations)
- [x] `src/components/Lobby.tsx` — character select (10 chars), player count slider, siphoner count slider, how-to-play
- [x] `src/components/GameCanvas.tsx` — canvas element + 60fps game loop + keyboard input (WASD/arrows/E)
- [x] `src/components/VirtualJoystick.tsx` — mobile touch joystick (dynamic position, interact button)
- [x] `src/components/HUD.tsx` — unity meter, car fuel bars, news ticker, role badge, interact prompt, player list
- [x] `src/components/MeetingScreen.tsx` — full meeting UI (discussion timer, voting grid, reveal, chat messages)
- [x] `src/components/GameResults.tsx` — win/lose screen with stats, role reveal, fuel bot CTA
- [x] `src/App.tsx` — phase router (lobby → play → meeting → results)
- [x] `src/index.css` — game theme CSS (dark UI, bright game)
- [x] Game workflow running at `/` — lobby confirmed working in preview

---

## FILE STRUCTURE

```
artifacts/game/src/
  game/
    types.ts        ← All TypeScript types + game constants
    state.ts        ← Mutable singleton `gs` + startGame()
    logic.ts        ← Main tick: movement, tasks, siphoning, meeting, wins
    botAI.ts        ← Bot state machine (idle→moving→interacting→fleeing)
    renderer.ts     ← Canvas 2D renderer (2D top-down courtyard)
  data/
    characters.ts   ← 10 character defs (name, emoji, color, voice lines)
    tasks.ts        ← 5 task defs (label, emoji, duration, unityReward)
    map.ts          ← Map layout (buildings, cars, tasks, decorations, collision)
    ticker.ts       ← 50 satirical news headlines
  components/
    Lobby.tsx           ← Pre-game lobby + character select
    GameCanvas.tsx      ← Canvas + 60fps loop + keyboard input
    VirtualJoystick.tsx ← Mobile joystick (dynamic position)
    HUD.tsx             ← In-game HUD overlay
    MeetingScreen.tsx   ← Сходка: discussion + voting + reveal
    GameResults.tsx     ← Win/lose screen + @fuel_fuel_fuel_bot CTA
  App.tsx           ← Phase router
  main.tsx          ← Entry point
  index.css         ← Theme CSS (dark game aesthetic)

lib/db/src/schema/index.ts  ← DB schema (ready for push when DATABASE_URL set)
```

---

## KEY ARCHITECTURE DECISIONS

1. **No Zustand/Redux** — game state is a mutable singleton (`gs` in `state.ts`). Canvas reads it directly at 60fps. React HUD reads a snapshot at 10Hz via `setInterval` + `useState`.
2. **Canvas 2D** (not WebGL) — simpler, mobile-friendly, no dependencies.
3. **gameStateRef pattern** — `gs` is mutated every frame. React components get `{ ...gs }` snapshots at 10Hz.
4. **Bot AI is a state machine** — `idle → moving → interacting → fleeing → at_meeting`. Each state has clear entry/exit conditions.
5. **Task gating** — bots check `dist < INTERACT_RADIUS * 0.7` BEFORE claiming interaction. Human player also checked each frame (not just on press).
6. **Meeting timer** — ticked by the game loop (`tickGame` → `tickMeeting`), NOT `setInterval`. This was the bug in the previous session.
7. **Phase architecture** — `gs.phase` drives app state. `GameCanvas.onSnapshot` notifies `App.tsx` at 10Hz.

---

## WHAT TO DO NEXT (in priority order)

### Session 3 — Immediate issues to fix
1. **Check for TypeScript errors** — run `pnpm run typecheck` from `artifacts/game/`. Fix any type errors.
2. **Test gameplay** — open the game, click "Играть", verify:
   - Player can move with WASD/arrows
   - Task markers visible, progress bar fills when pressing E
   - Meeting can be called at the entrance arch
   - Bots are moving and interacting
   - Win screen appears when unity meter hits 100%
3. **Verify bot siphoning is visible** — should see green animated line from bot to car, car fuel bars decreasing.

### Session 3 — Missing features (Phase 1 scope)
4. **Minimap** — small map in corner showing player positions (optional but nice)
5. **Sound effects** — siphon gurgle, task complete chime, meeting horn (optional)
6. **Sabotage menu** — radial menu on long press right side (from design doc §2.9):
   - Бабушка-Цербер (60s cooldown): NPC blocks alarm button
   - ЖК Чат Офлайн (50s cooldown): disables alarm for 20s
   - Сигнализация хаос (45s cooldown): masks siphon sound for 15s
7. **Immunity ticket** — golden ticket found near dumpsters (5% spawn chance), locks car for 60s

### Session 4 — Multiplayer (Phase 2)
8. **WebSocket server** — `artifacts/api-server/src/ws/` for real-time multiplayer
9. **Room system** — lobby codes, 4-8 player rooms
10. **Telegram Mini App** — wrap in TMA (telegram-apps SDK), connect to @bakstab_bot

---

## KNOWN ISSUES / WATCH OUT FOR

- **Unused `dist` function** in `renderer.ts` — TypeScript may warn but Vite ignores it at runtime.
- **Unused `VoteRecord`, `MeetingState` type imports** in `logic.ts` — harmless with `import type`.
- **Database not set up** — `lib/db` schema is written but not pushed. Requires `DATABASE_URL` secret. Game works without DB (Phase 1 is fully client-side).
- **api-server and mockup-sandbox workflows failing** — expected since node_modules aren't installed for those. Run `pnpm install` at workspace root to fix.

---

## HOW TO RESUME IN A NEW SESSION

1. **Read this file** top to bottom.
2. **Check what's running:** `pnpm --filter @workspace/game run dev` should be live at `/`.
3. **Look for recent errors:** check browser console + workflow logs.
4. **Continue from first unchecked item** in the "What to do next" section above.
5. **Update this file** as you complete each item.

---

## DESIGN DOC REFERENCE

Full bible: `attached_assets/1_Game_DOC_1783414439610.md` (1992 lines)

Quick reference:
- §2.1–2.5: Phase architecture (lobby, play, meeting)
- §2.7: Сходка — 60s discussion + 30s voting, 12-phrase chat wheel
- §2.8: Win conditions
- §2.9: Sabotage system (4 types)
- §3.1: Role system (Хозяева, Сливщики, Neutrals, Cat)
- §6.3: SQL schema (reference for our Drizzle schema)
- §6.6: Frontend-Canvas bridge (the architecture we implemented)
- §10.2: Fuel ticket integration (@fuel_fuel_fuel_bot CTA — implemented in GameResults.tsx)

---

*Last updated: Session 2 — game built from scratch, lobby confirmed working in preview*
