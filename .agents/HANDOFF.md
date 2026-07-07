# Agent Session Handoff — 95-Й Бакстаб

> **Last updated:** 2026-07-07 (session 3)
> **Project health:** 🟢 HEALTHY — TypeScript clean, game workflow running

---

## How to use this file

Read this file at the start of every session. It contains the authoritative implementation
status vs. the Vol I design doc. Do not re-audit from scratch — update this file as you
complete or discover gaps.

---

## Validation commands (run before marking any task done)

```bash
pnpm --filter @workspace/game run typecheck   # must be clean
```

Workflow name (never create a duplicate): `artifacts/game: web`
Design doc (source of truth): `attached_assets/1_Game_DOC_1783436622278.md` (1992 lines)

---

## Codebase orientation

| Area | Entry point | Notes |
|------|-------------|-------|
| Game state | `artifacts/game/src/game/state.ts` | singleton `gs`, mutated at 60fps |
| Game loop / interactions | `artifacts/game/src/game/logic.ts` | ~1610 lines |
| Bot AI | `artifacts/game/src/game/botAI.ts` | Khozain + Slivshchik bots |
| Types + constants | `artifacts/game/src/game/types.ts` | all gameplay constants |
| Renderer | `artifacts/game/src/game/renderer.ts` | Canvas 2D, fog-of-war, sabotage visuals |
| Vision system | `artifacts/game/src/game/vision.ts` | raycasting fog-of-war |
| Audio | `artifacts/game/src/game/audio.ts` | Web Audio API, all 30 SFX + 3 music tracks |
| HUD | `artifacts/game/src/components/HUD.tsx` | React overlay at 10Hz |
| Meeting screen | `artifacts/game/src/components/MeetingScreen.tsx` | voting/reveal UI |
| Task mini-games | `artifacts/game/src/components/TaskMiniGame.tsx` | all 5 mini-game UIs |
| Results screen | `artifacts/game/src/components/GameResults.tsx` | stats + share card PNG |
| Lobby | `artifacts/game/src/components/Lobby.tsx` | character select, flavor text |
| Characters | `artifacts/game/src/data/characters.ts` | 10 chars, 10 voice lines each |
| Tasks | `artifacts/game/src/data/tasks.ts` | 10 task defs |
| Map | `artifacts/game/src/data/map.ts` | collision, spawns, valves, dumpsters |
| News ticker | `artifacts/game/src/data/ticker.ts` | 50 satirical headlines |
| Agent memory index | `.agents/memory/MEMORY.md` | architectural notes |

**Architecture note:** `gs` singleton (NOT Zustand). React HUD reads shallow snapshot at 10Hz.
Sprint suspicion uses module-level `_sprintTimer` Map in `botAI.ts` (outside Player type).

---

## Vol I Implementation Status — Section by Section

### §00 — Philosophy of Play
**N/A — reference doc only.** No code to implement.

---

### §01 — World Bible (~95% complete)

✅ Map zones: parking lot, entrance arch, playground, dumpsters, shawarma stand, flower beds, benches
✅ Vision blockers: cars, dumpsters, buildings all block raycasting
✅ 10 characters with names, colors, CharacterKey identifiers, 10 voice lines each
✅ 50 news ticker headlines in `ticker.ts`
✅ Fuel price ticker in HUD (static AI-95 value — 87₽)
✅ "Сегодня в ЖК" rotating flavor text on main menu — 10 lines, cycle every 6s (`Lobby.tsx`)
✅ Bot chat uses character-specific voice lines 60% of the time (`scheduleBotChatMessages`)

⚠️ Fuel price is a hardcoded constant, not fetched from the weekly-updated JSON the doc describes

---

### §02 — Core Gameplay Loop (~92% complete)

✅ All 5 phases: lobby → briefing → play → сходка → results
✅ Briefing: 5s countdown, role reveal text, skip button after 2s
✅ Play phase: 5 min base + 30s per completed task, 600s cap
✅ Sprint toggle (Shift toggles on/off, `sprintToggleRef` in `GameCanvas.tsx`)
✅ Stamina 5s sprint / 8s regen, crouch (Ctrl)
✅ Flower bed 0.6× slow zones
✅ Virtual joystick (mobile)
✅ §2.3 Vision: raycasting fog-of-war, Сливщик teammate outlines pierce fog
✅ §2.4 ⚠️ icon over Сливщик during siphon Phase 2 setup (renderer.ts ~895)
✅ §2.4 Siphoning, body report, vent, babushka-cerberus sabotage, shawarma speed boost,
       immunity ticket, canister pickup/disposal, meeting triggers, alarm button
✅ §2.5 Tasks: 10 tasks, 5 mini-game types (tap_timing, rapid_tap, sequence, dial, letter),
       3 hold-timer; unity meter; task respawn; Сливщики interact and get 0 unity (fake)
✅ §2.6 Siphoning: 3 phases, gurgle audio (8m radius), canister drop/pickup/disposal,
       0.8× speed while carrying, 15s cooldown, alarm_chaos masks gurgle
✅ §2.6 Ambush: 1.5s charge, body left, 25s cooldown, witness → red outline on Сливщик
✅ §2.7 Сходка: 3 triggers, 60+30s timer, 12-phrase chat wheel, plurality vote,
       tie = no ejection, skip-discussion majority vote, per-character ejection flavor texts,
       role reveal, 30s meeting cooldown
✅ §2.8 Win conditions: unity 100%, all cars drained, all Сливщики ejected, count parity,
       pipe_burst critical timeout
✅ §2.9 Sabotage: all 4 (babushka_cerberus, pipe_burst, chat_offline, alarm_chaos)
       with distinct SFX, visuals, and resolution mechanics

❌ §2.4 "Проверить бак" — Хозяева have no E-press interaction on cars to see fuel level;
      they only read HUD bars. Doc says "[TAP] Проверить бак (shows fuel level)" for any car.
❌ §2.4 "Запереть бак" — Хозяин locking their own car's fuel as a direct interaction is absent.
      The Immunity Ticket item exists but the baseline own-car lock prompt is not implemented.
❌ §2.4 Persistent Бабушка NPC in play phase — doc lists "[TAP] Спросить бабушку" as a
      world interactable who might have witnessed something. Only the Cerberus sabotage
      version exists; no always-present courtyard NPC.
❌ §2.7.4 Trash-chute ejection cinematic — 5-second animation specified. Currently: instant
      text reveal screen with no animation or timed delay.
❌ Four tasks from the doc's first 10 not implemented:
      Task 06 — Walk the dog (NPC, 3 waypoints, dog named "Бакс")
      Task 07 — Buy flowers (match correct bouquet, 3 rounds)
      Task 08 — Calm the drunk (dialogue tree, 3 rounds)
      Task 10 — Order a taxi (phone UI, tap → wait → confirm)

---

### §03 — Game Systems

✅ §3.1.1 Хозяева role fully implemented
✅ §3.1.2 Сливщики: siphon, ambush, sabotage, teammate outlines, dumpster vents
✅ §3.1.3 Neutrals: all 3 roles implemented
   - Дворник Ахмет: collect 3 canisters → win; `janitorCollectCanister()` in HUD
   - Участковый: `investigateBody()` ability; win by first correct vote
   - Барсик: auto-meow within 200px of active siphon; manual meow via HUD button; survive-to-win

❌ §3.1.3 Janitor "see canisters through walls" (orange highlight in renderer) — not implemented.
      Janitor can collect canisters in normal interaction range but has no X-ray ability.
❌ §3.1.3 Барсик "knock over canisters" to trigger alarm — only meow is implemented.
      The proximity-based canister-knock mechanic (§3.1.3: "knock over canisters, triggering
      an alarm") has no code in logic.ts.
❌ §3.2 Economy (Бабки, Telegram Stars, Талоны) — no currency, no persistence
❌ §3.3 Battle Pass — no tier system, no XP tracking
❌ §3.4 Inventory & Cosmetics — no hats/pets/skins; characters are fixed colored circles
❌ §3.5 Daily Challenge System — no daily seed, no challenges
❌ §3.6 Achievements (50) — no tracking or display

---

### §04 — AI Architecture (~88% complete)

✅ §4.1 Behavior tree: dead → meeting → role branch → fallback wander
✅ §4.2 Сливщик AI: siphon, ambush (+ victim death sounds), sabotage, fake-task
✅ Difficulty tiers: Easy / Medium / Hard / Nightmare (probability gates per action)
✅ Hard/Nightmare: bot dumpster-vent escape when watched + carrying or fleeing
✅ Bot valve-fixing during pipe_burst (highest-priority khozain behavior)
✅ §4.3 Suspicion system (all six modifiers implemented):
   - +0.25 one-shot if caught actively siphoning (phase 2) within 280px
   - +0.08/dt if near drained car (<20% fuel) within 200px
   - +0.04 one-shot after 3s continuous sprint within 300px (via _sprintTimer Map)
   - +0.04/dt if human loiters near task terminal without starting it (task-skip proxy)
   - −0.1 if human player completes a task within 220px of bot
   - −0.05/dt for uncle_seryozha character (ageism bias satire)
✅ §4.4 Meeting: vote for highest suspicion > 0.3 threshold; send character-specific chat lines
✅ §4.5 Pathfinding: direct movement + wall avoidance (not A*, acceptable for single-player)

---

### §05 — Multiplayer Architecture (~30% complete)

✅ WebSocket room system in `artifacts/api-server/`
✅ Room code creation and joining
✅ Host reassignment on disconnect

⚠️ NOT truly authoritative — game logic runs client-side. Clients can diverge.
❌ Lag compensation (client-side prediction, interpolation, rewind) — not implemented
❌ Reconnection → AI bot takeover — disconnected player just disappears
❌ Quick Play matchmaking queue — room-code only, no global queue
❌ Server-side anti-cheat validation (movement speed, distance, cooldowns)

---

### §06 — Technical Architecture

✅ React 18 + TypeScript, Canvas 2D, Vite, Node.js WebSocket server
✅ Canvas at 60fps, React HUD at 10Hz, singleton gs
✅ pnpm monorepo

⚠️ Tailwind not used (inline styles throughout)
❌ PostgreSQL — no database; all state in-memory per session
❌ Redis — not implemented

---

### §07 — Art Direction (~60% complete)

✅ Bright, saturated cartoon style; color palette matches doc spec
✅ No dark vignettes, film grain, or desaturation
✅ Characters top-down readable as colored circles with emoji overlays
✅ Basic walk bob animation, sprint visual feedback

⚠️ No actual sprite PNG files — characters/cars drawn as Canvas 2D primitives
⚠️ No 4-frame walk cycle animation per character

---

### §08 — Audio Direction (100% complete ✅)

✅ Background music: 3 synthesized tracks (menu lo-fi, play tense A-minor, сходка D-minor tango)
✅ Music lifecycle: lobby/results → menu, play → play track, meeting → tango, briefing → silence
✅ Dynamic rumble layer: `startRumble()`/`stopRumble()` — low 40Hz sawtooth during siphon proximity
✅ All 30 SFX implemented in Web Audio API:
   siphon_gurgle, siphon_complete, alarm_button, ambush, body_found, meeting_horn,
   vote_cast, vote_skip, ejection, task_complete, ui_click, ui_hover,
   canister_drop, canister_pickup, win_owners, win_slivshchiki,
   pipe_burst_sfx, chat_offline_sfx, alarm_chaos_sfx, babushka_cerberus_sfx,
   fuel_lock, shawarma_buy, player_death, bot_death,
   footstep_asphalt, footstep_grass, car_door, engine_start, tesla_zap,
   grandma_escort, trap_trigger

---

### §09 — Viral Mechanics (~20% complete)

✅ §9.1 Share card: client-side PNG generation via Canvas API; stats + @fuel_fuel_fuel_bot CTA

❌ §9.2 Replay buffer ("Бакстаб Момент") — no circular frame buffer, no GIF export
❌ §9.3 Leaderboards (daily, all-time, friends) — not implemented
❌ §9.4 Social hooks (challenge share, friend invite deep links) — not implemented

---

### §10 — Monetization (~15% complete)

✅ §10.2 Immunity Ticket power-up: found in courtyard, 60s fuel lock, golden shield visual,
       "@fuel_fuel_fuel_bot" prompt on use
✅ §10.2 @fuel_fuel_fuel_bot CTA on results screen and share card PNG

❌ Telegram Stars purchasing flow — not implemented
❌ Battle Pass commerce — not implemented
❌ Fuel ticket account linking — not implemented

---

### §11–12 — LiveOps & Launch Strategy
**N/A — operations/business docs. No implementation scope.**

---

### §13 — Accessibility (~45% complete)

✅ Minimap (always visible top-right)
✅ Siphon audio visual indicator (⚠️ pulsing panel in HUD when gurgle audible within 8m)
✅ Tap zones appropriately sized
✅ Sprint as toggle (Shift key toggles; mobile 🏃 button toggles — `GameCanvas.tsx`)
✅ "Что делать?" current objective button in HUD — role-specific objective popup (§13.1)

❌ Colorblind mode (fuel liquid green → blue toggle) — not implemented
❌ Text size options (3 levels) — not implemented
❌ High contrast mode — not implemented
❌ Auto-interact (2s proximity auto-trigger, optional) — not implemented
❌ Subtitles for voice lines during сходка — not implemented
❌ Volume controls (master / music / SFX sliders) — not implemented
❌ Simplified chat wheel for new players (6 phrases) — not implemented

**§13.2 Localization:** Russian throughout ✅. English UI not implemented ❌.

---

### §14–17 — Ethical Design / QA / Team / Final Word
**N/A — manifesto, QA checklist, production planning, mission statement.**

---

## Verified gap list — full audit as of 2026-07-07

This replaces the old priority list. All items below were confirmed by reading the current
codebase (not inferred). Items marked DONE have been verified present in code.

---

### 🔴 Single-player gameplay gaps (no backend required)

**1. Janitor orange canister highlight through walls** (§3.1.3)
Дворник Ахмет neutral's special ability: "Can see canisters through walls (highlighted in
orange)." Zero code in `renderer.ts` for this — no janitor-specific canister draw pass.
Janitor collects canisters in normal interaction range but cannot locate them through obstacles.

**2. Барсик canister knock** (§3.1.3)
Doc says Барсик "can knock over canisters, triggering an alarm." Only the auto-meow on nearby
siphons is in `logic.ts` (lines 445–455). No proximity-based canister-knock mechanic exists.

**3. "Проверить бак" — Хозяева checking any car's fuel level** (§2.4)
Doc interaction table: Хозяева get `[TAP] Проверить бак (shows fuel level)` when near any car.
No such prompt in `updateInteractions` — Хозяева have zero car interactions; they only read
fuel from the HUD bars. Сливщики get the siphon prompt; Хозяева get nothing.

**4. "Запереть бак" — Хозяин locking their own car** (§2.4)
Doc: `[TAP] Запереть бак` on a Хозяин's *own* car as a baseline mechanic (distinct from the
Immunity Ticket item). No own-car locking prompt in `updateInteractions`.

**5. Persistent Бабушка NPC during play phase** (§2.4)
Doc: `[TAP] Спросить бабушку (she might have seen something)` as a world interactable.
Only the Cerberus sabotage babushka exists. No always-present courtyard NPC to query.

**6. Four tasks from the doc's first 10** (§2.5)
Current 10 tasks: shawarma, intercom, trash, window, grandma, mailbox, pigeons, flowers,
kvass, sweep. Missing from the doc's specified Tasks 1–10:
- **Task 06 — Walk the dog** — NPC with 3 waypoints; dog named "Бакс"; ~15s
- **Task 07 — Buy flowers** — match correct bouquet out of 3 (3 rounds); ~5s
- **Task 08 — Calm the drunk** — 3-round dialogue tree; "Вася из 2 подъезда"; ~10s
- **Task 10 — Order a taxi** — phone UI: tap Заказать → 3s wait → Подтвердить; ~5s
*(Tasks 11–20 are explicitly "full specs in Volume II" — correctly absent.)*

---

### 🟡 Polish gaps (frontend only, no backend)

**7. Trash-chute ejection cinematic** (§2.7.4)
Doc: "5-second animation of the ejected player being placed in a trash chute. Satirical text
overlay." Currently `MeetingScreen.tsx` shows an instant text reveal — no animation, no
timed delay, no chute visual.

**8. Volume controls UI** (§13.1)
Doc: separate sliders for master, music, SFX. `AudioManager` in `audio.ts` exposes gain
nodes internally but no settings screen surfaces them. Only the browser controls volume.

**9. Colorblind mode** (§13.1)
Toggle that flips fuel liquid color from green → blue (deuteranopia-friendly). Not in the
renderer or any settings screen.

---

### 🔵 Backend/infrastructure gaps (blocked on server, out of scope for offline build)

| Gap | Doc section | Blocker |
|-----|------------|---------|
| Бабки economy (earn, persist, spend) | §3.2 | PostgreSQL |
| Telegram Stars purchases | §3.2 | Telegram Payments API |
| Battle Pass (50 tiers, XP, seasonal) | §3.3 | PostgreSQL + backend logic |
| Achievement system (50 achievements) | §3.6 | PostgreSQL |
| Daily challenge system + daily seed | §3.5 | Server clock + PostgreSQL |
| Daily/weekly/all-time leaderboard | §9.3 | Redis sorted sets |
| Multiplayer authoritative server + anti-cheat | §5.1, §5.6 | Task #4 proposed |
| Reconnection → AI bot takeover | §5.4 | Multiplayer server |
| Replay buffer / "Бакстаб Момент" GIF export | §9.2 | Canvas frame capture |
| Telegram deep links + native share action | §1.4, §9.4 | Telegram WebApp SDK |
| Live fuel price JSON fetch | §1.4 | Weekly-updated static JSON endpoint |

---

## Recent session changes (session 3 — 2026-07-07)

**Implemented this session:**
- `logic.ts` — Fixed lobby/results music: phases now play `'menu'` track instead of silence.
  Phase routing: lobby/results → menu, play → play, meeting → tango, briefing → stop.
- `audio.ts` — Added `'trap_trigger'` to `SoundName` type; implemented `_trapTrigger()`
  (thud + sputtering noise burst). Wired to alarm_chaos sabotage activation in `logic.ts`.
- `botAI.ts` — Bot ambush now plays `player_death` or `bot_death` for the victim
  (was: only played `ambush` hit sound, missing victim cue).
- `Lobby.tsx` — "Сегодня в ЖК" rotating flavor text ticker (§1.4): 10 lines, cycle every 6s.
- `HUD.tsx` — "Что делать?" objective button (§13.1): role-specific popup for Хозяева/Сливщики.

**Confirmed DONE (were marked as gaps in old handoff, now verified in code):**
- Sprint toggle: `sprintToggleRef` in `GameCanvas.tsx` — was already implemented.
- Bot vent usage: `updateSlivshchikBot` Hard/Nightmare teleport — was already implemented.
- All 30 SFX including the "12 missing": all in `SoundName` type and `AudioManager.play()`.
- Bot suspicion task-completion −0.1: in `completeTask()` lines ~605–612.
- Bot suspicion task-skip: loitering raise (+0.04/dt) in `updateKhozainBot` lines ~162–172.
- Сливщик fake-task for human player: `completeTask()` handles slivshchik role (0% unity).
- @fuel_fuel_fuel_bot CTA: in `GameResults.tsx` share card and results screen.
