# 95-Й БАКСТАБ — HANDOFF (Session 5, 2026-07-07)

## Current State
Core single-player gameplay loop is fully playable end-to-end. A comprehensive section-by-section audit against the Vol. I design document was performed this session. The findings below supersede all prior gap summaries — use this as the authoritative gap reference for future sessions.

---

## Vol. I Design Document — Section-by-Section Implementation Report

**Rating key:** ✅ Implemented · ⚠️ Partial · ❌ Not implemented

---

### §00 — Philosophy of Play

Qualitative pillars, not directly testable in code, but the implementation broadly honours them:
- ✅ **Pillar I** Bright World, Dark Hearts — Canvas renderer uses the spec palette, no dark vignettes
- ✅ **Pillar II** Every mechanic tells a Russian joke — shawarma, intercom, pipe burst all present
- ✅ **Pillar III** 5-minute sessions — match timer implemented, matches end cleanly
- ✅ **Pillar IV** Сходка is the game — meeting screen is the most elaborated component
- ⚠️ **Pillar V** Fuel as metaphor — in-game immunity ticket present; real-world CTA on results screen exists but lacks account-linking loop
- ⚠️ **Pillar VI** Mobile-first — virtual joystick implemented; emote wheel not confirmed as 4-sector; some desktop-only paths
- ✅ **Pillar VII** Satire without cruelty — ejection texts and headlines are character-appropriate

---

### §01 — World Bible

#### §1.1 Setting ✅
Fully flavoured — ЖК "Цветочные Поляны", summer 2026, fuel price lore all present in briefing text and HUD.

#### §1.2 Map ⚠️
- Canvas is **1200×900 px**, not the spec's 1920×1920 (60m × 32px/m). Scale is different but the proportional layout is preserved.
- Parking lot, entrance arch, playground, dumpsters, shawarma stand, benches, flower beds, building walls — **all present** in `data/map.ts` / renderer.
- Doc's exact world-coordinate spec (origin = courtyard center, meter-based) is **not followed** — code uses pixel coords origin top-left.
- Flower beds slow movement ✅ (0.6× speed). Vision blockers (cars, dumpsters, walls) ✅.
- **Missing:** broken EV charger zone is decorative in the doc; unclear if it's in the renderer.

#### §1.3 Cast ✅
All 10 characters implemented in `data/characters.ts` with the correct backstories and 10 voice lines each. Барсик is a special role, not just cosmetic.

#### §1.4 Satire Layer ⚠️
- ✅ Fuel price ticker in HUD (АИ-95 price display)
- ✅ News ticker rotating 54 headlines (spec: 50)
- ❌ "Сегодня в ЖК" main menu flavor text — not found

#### §1.5 News Ticker Corpus ✅
54 headlines in `data/ticker.ts` — exceeds the 50-headline spec requirement.

---

### §02 — Core Gameplay Loop

#### §2.1 Phase Architecture ✅
All five phases present: `lobby → briefing → play → meeting → results`.

| Spec requirement | Status |
|---|---|
| Briefing cinematic, 5s, with role-specific text | ✅ |
| Skip button appears at 2s | ✅ |
| Lobby character select + settings | ✅ |
| Host START button (enabled at 4+ players) | ✅ |
| Auto-start at 8 players after 10s | ❌ |
| Lobby via Telegram deep link | ❌ (web browser only) |
| Resolution ejection cinematic, 5s | ✅ |
| 30s cooldown between сходки | ✅ |

#### §2.2 Movement & Camera ⚠️

| Spec | Implemented |
|---|---|
| Base 3.5 m/s | ✅ (proportional equivalent) |
| Sprint 5.5 m/s (×1.55), 5s stamina, 8s regen | ✅ SPRINT_SPEED_MULT=1.55, stamina 5s |
| Crouch 0.52× speed, reduces others' vision cone 30% | ✅ |
| Camera lerp 0.15 | ✅ |
| Virtual joystick (left half of screen, appears on thumb land) | ✅ |
| Double-tap right = sprint toggle | ⚠️ implemented as Shift key (desktop); mobile double-tap unclear |
| Emote wheel — 4 emotes, right-thumb swipe up | ⚠️ quick-chat in meeting confirmed; standalone emote during play not confirmed |
| Desktop: WASD/mouse/E/F/Q/Shift/Ctrl/Space | ✅ |

#### §2.3 Vision System ✅
- 72 rays cast (spec says 36 minimum — more is fine)
- 140° FOV for Хозяева, 160° for Сливщики ✅
- Raycasting fog-of-war polygon via `vision.ts` ✅
- Players/bodies/drained cars hidden behind blockers ✅
- Teammate outlines pierce fog ✅
- Dumpster stealth zone (invisible inside, see out) ✅

#### §2.4 Interaction Model ⚠️
- ✅ 1.5m/65px interaction radius with contextual prompts
- ✅ Siphon, ambush, task, alarm button, body report, canister pickup
- ⚠️ "Спросить бабушку" NPC interaction (Babushka Cerberus exists as a sabotage NPC but not as a general witness-query interaction)
- ⚠️ Shawarma stand — present as a task location; "buy shawarma to feed grandma" sabotage resolution ✅; standalone shawarma speed boost for Хозяева unclear
- ❌ "Запереть бак" (fuel lock for own car as a free Хозяин action) — Immunity Ticket handles locking but not a free tap action

#### §2.5 Task System ✅ (mostly)

| Requirement | Status |
|---|---|
| 20 tasks defined | ✅ all 20 in `data/tasks.ts` |
| 10 mini-game types | ✅ tap_timing, rapid_tap, sequence, dial, letter, dog_walk, flower_match, drunk_calm, taxi_order, wire_drag |
| Unity meter shared, visible in HUD | ✅ |
| Task progress bar visible to nearby players | ⚠️ progress bar shown above task terminals; whether proximity-gated is unclear |
| Сливщик fake-task animation (adds 0% to meter) | ⚠️ bots wander to terminals and "fake"; human Сливщик fake-task animation noted as a gap |

**Tasks 11–20 implementation mapping** (doc spec → code):
- Tasks 1–10 fully specified; Tasks 11–20 abbreviated in doc. All 20 are present in code with appropriate mini-game types.

#### §2.6 Siphoning System ✅

| Spec | Status |
|---|---|
| Phase 1 approach prompt | ✅ |
| Phase 2 setup 3s hold, faint click sound within 3m, cancel with no evidence | ✅ |
| Phase 3 active drain: gurgle (8m), green liquid stream, progress bar, immobile | ✅ |
| Phase 4 complete: canister on ground, pickup slows 20%, dispose at dumpsters | ✅ |
| Drain rate 14.3%/sec (7s full drain) | ✅ |
| Car <10% → low fuel warning to owner | ✅ |
| 15s siphon cooldown | ✅ |
| Ambush mechanic: 1.5s hold, 25s cooldown, 8m "alone" check, interruption | ✅ |
| Interrupted ambush → red outline on Сливщик for 5s | ✅ |
| Canister left as evidence if siphon cancelled mid-drain | ✅ |

#### §2.7 Сходка System ✅ (mostly)

| Spec | Status |
|---|---|
| Triggers: body, drained car, alarm button | ✅ |
| All players teleport to Entrance Arch | ✅ |
| Meeting horn audio cue | ✅ |
| 60s discussion + 30s voting timer | ✅ |
| Skip discussion by majority vote | ✅ |
| 12-phrase quick-chat wheel | ✅ (6 simplified for new players) |
| Hidden votes revealed on close, plurality wins, tie = no ejection | ✅ |
| 20 satirical ejection texts with role reveal | ✅ |
| 5s ejection cinematic (trash chute animation) | ⚠️ text overlay confirmed; graphical trash-chute animation unclear |

#### §2.8 Win Conditions ✅
All win conditions implemented: Unity Meter 100%, all Сливщики ejected, all cars drained, Хозяева count ≤ Сливщики count, Pipe Burst unresolved 60s.

#### §2.9 Sabotage System ✅
All 4 sabotages implemented:

| Sabotage | Cooldown | Status |
|---|---|---|
| Бабушка-Цербер — blocks alarm button | 60s | ✅ |
| Прорвало трубу — critical, blocks car interaction, 2-player valve fix | 75s | ✅ |
| ЖК Чат Офлайн — disables alarm/reports 20s | 50s | ✅ |
| Сигнализация хаос — masks gurgle sound 15s | 45s | ✅ |

---

### §03 — Game Systems

#### §3.1 Roles ⚠️
- ✅ Хозяева and Сливщики with correct abilities
- ✅ Сливщики see each other via red outline
- ✅ Three neutral roles: Дворник (collect canisters ×3), Участковый (correct vote win), Барсик (survive + meow)
- ❌ **Vent usage for Сливщики** (dumpster-to-dumpster fast travel at Hard/Nightmare) — confirmed not found in code

#### §3.2–§3.6 Economy & Progression ❌
**None of the following are implemented:**
- Бабки currency
- Telegram Stars / real money purchases
- Талоны economy linkage (account linking webhook)
- Battle Pass ("Бакстаб Премиум") — no tiers, XP, or progression
- Inventory & cosmetics (hats, pets, car skins, premium skins)
- Daily challenge system
- Achievement system (50 achievements)
- Daily leaderboard seed

---

### §04 — AI Architecture

#### §4.1–§4.4 Behavior Tree ✅ (mostly)

| Spec | Status |
|---|---|
| Сливщик AI: siphon, ambush, sabotage, fake-task, wander | ✅ |
| Хозяин AI: task completion, body report, drained car report, follow suspicious player | ✅ |
| Suspicion vector per-player | ✅ |
| Suspicion modifier: seen near drained car +0.1 | ✅ |
| Suspicion modifier: caught siphoning +0.2 | ✅ |
| Suspicion modifier: running >3s +0.05 | ✅ |
| Suspicion modifier: task-skip +0.05 | ❌ |
| Suspicion modifier: task-completion −0.1 | ❌ |
| Suspicion modifier: Дядя Серёжа −0.05 (ageism bias) | ✅ |
| Vote if suspicion >0.3, else skip | ✅ |
| AI chat personality (character voice lines in meeting) | ✅ |
| Difficulty tiers Easy/Medium/Hard/Nightmare | ✅ |
| Vent usage at Hard/Nightmare | ❌ |

#### §4.5 Pathfinding ⚠️
- Spec calls for **A\* on a navmesh** with 1s replan.
- Actual implementation uses **direct movement with obstacle avoidance** — no true A* navmesh. Bots sometimes clip through obstacles in practice. Distant bots simplified at 5Hz ✅.

---

### §05 — Multiplayer Architecture

#### §5.1 Authoritative Server ⚠️
- WebSocket server exists in `artifacts/api-server` with room management.
- Architecture is **client-authoritative with server relay**, not a fully authoritative server. Game logic (`tickGame`) runs client-side and the host broadcasts state — not validated server-side. This means the anti-cheat requirements of §5.6 are not met.

#### §5.2 Network Protocol ⚠️
- ✅ WebSocket implemented, custom packet types present
- ❌ MessagePack — packets appear to be JSON, not binary MessagePack
- ✅ 20Hz tick rate design (the 3-phase `tickGameMulti` avoids N× timer bugs)
- ⚠️ State broadcast shape is close to spec but not identical

#### §5.3 Lag Compensation ❌
Client-side prediction, interpolation of remote players, and rewind for сходка sync — none implemented.

#### §5.4 Reconnection ⚠️
- ✅ Host reassignment on disconnect
- ⚠️ Mid-match disconnect → AI takeover exists; 60s rejoin window — unclear if fully implemented

#### §5.5 Matchmaking ⚠️
- ✅ Custom room (code sharing)
- ❌ Quick Play queue (no matchmaking server)

#### §5.6 Anti-Cheat ❌
All validation (speed clamp, distance checks, cooldown enforcement) is client-side. No server-side validation.

---

### §06 — Technical Architecture

#### §6.1 Tech Stack ⚠️

| Component | Spec | Actual |
|---|---|---|
| Frontend | React 18 | React 19 ✅ |
| Rendering | Canvas 2D | Canvas 2D ✅ |
| State management | Zustand | **No Zustand** — singleton `gs` mutated at 60fps ⚠️ |
| Backend | Node.js + ws | Node.js + ws ✅ |
| Database | PostgreSQL 16 | ❌ None |
| Cache | Redis 7 | ❌ None |

#### §6.3–§6.4 Database & Redis ❌
No PostgreSQL schema, no Redis. All state is in-memory per session — ephemeral, lost on restart.

#### §6.6 Frontend-Canvas Bridge ✅
Implemented as documented: singleton `gs` read by Canvas at 60fps, React HUD reads shallow snapshots at 10Hz. Matches the described architecture (without Zustand, but the bridge pattern is identical).

---

### §07 — Art Direction

#### §7.1–§7.2 Visual Pillars & Palette ⚠️
- ✅ Bright, saturated, cartoonish — Canvas 2D draws with spec-matching colors
- ✅ Top-down readable player/car representations
- ❌ **No sprite sheet assets** — all characters and cars are drawn procedurally in `renderer.ts` (colored circles, blobs, geometric shapes). The spec calls for 320 character sprites + 48 car sprites + 80 prop sprites (~2.7MB total).
- ❌ Satirically specific cars (yellow Yandex Lada, electric-blue Zeekr, white Tesla) are distinguishable by color but not by illustrated silhouette

#### §7.4 Animation Specs ⚠️
- ⚠️ Walk animation: basic bob/wobble present; not the 4-frame directional sprite system specified
- ⚠️ Siphoning: crouch + canister fill animation present; not sprite-based
- ❌ Full 5s ejection animation (trash chute drop) — text overlay only

---

### §08 — Audio Direction

#### §8.1 Music ✅
All 3 synthesized tracks implemented via Web Audio API: menu (lo-fi), play (tense), meeting (dramatic tango). Dynamic siphon intensity layer ✅.

#### §8.2 SFX Library ⚠️
**18 of 30 sounds implemented.** Missing 12:

| Missing SFX | Trigger |
|---|---|
| footstep_asphalt / footstep_grass | Walking |
| bot_death | AI bot ambushed |
| player_death | Player ambushed |
| shawarma_buy | Shawarma purchased |
| grandma_escort | Grandma escorted |
| car_door | Enter/exit car |
| engine_start | Car engine |
| tesla_zap | Siphoning Tesla |
| trap_trigger | Trap springs |
| alarm_chaos | Alarm chaos sabotage |
| ui_hover | Desktop hover |
| fuel_lock | Immunity ticket used |

#### §8.3 Audio Manager ✅
`AudioContext` with master/music/sfx gain nodes, gurgle loop, phase-transition lifecycle — all present.

---

### §09 — Viral Mechanics & Retention

#### §9.1 Share Card ✅
Client-side 1080×1080 PNG generation via Canvas API. Shows role, stats, match title, CTA for fuel bot, game link. Matches spec closely.

#### §9.2 Replay Buffer ("Бакстаб Момент") ✅
`replayBuffer.ts` implements circular frame buffer at 10fps, GIF export, watermark. Triggers: `catch_siphoner`, `caught_siphoning`, `dramatic_eject`. Implemented per spec.

#### §9.3 Leaderboards ❌
No daily or all-time leaderboard — requires database.

#### §9.4 Social Hooks ⚠️
- ✅ Share card on match end
- ❌ Daily challenge share, first-win share, friend invite deep link — all require backend infrastructure

---

### §10 — Monetization & Fuel Ticket Integration

#### §10.2 Fuel Ticket Integration ⚠️
- ✅ Immunity Ticket power-up in-game (spawns near dumpsters, golden shield visual, 60s fuel lock)
- ✅ End-game CTA on results screen (`@fuel_fuel_bot` link)
- ❌ Account linking flow (manual screenshot verification, webhook)
- ❌ `/play` command in fuel bot

#### §10.3 Telegram Stars ❌
No purchase flow, no `openInvoice` call, no inventory crediting.

#### §10.4 Battle Pass ❌
Not implemented.

---

### §11–§12 — LiveOps & Launch Strategy
Design/business sections — not applicable to code review.

---

### §13 — Accessibility

| Spec | Status |
|---|---|
| Colorblind mode (green→blue fuel) | ✅ Toggle present |
| Text size: 3 levels | ✅ S/M/L selector in settings |
| High contrast mode | ❌ |
| Minimap | ✅ |
| Sprint as toggle (not hold) | ✅ |
| Auto-interact (2s proximity) | ✅ Optional toggle in settings |
| Subtitles for voice lines | ✅ MeetingScreen subtitle strip |
| Visual ⚠️ indicator for siphon sound | ✅ |
| Volume controls (master/music/sfx) | ✅ |
| Tutorial mode (first-time player) | ✅ 3-step shawarma tutorial via localStorage |
| Simplified chat wheel (6 phrases) | ✅ Toggle in settings |
| "Что делать?" objective button | ❌ |

---

### §14–§17 — Ethical Design, Standards, Team, Final Word
Design/philosophy sections. §15.2 QA checklist is partially achievable in current state (functional items largely met, network/performance/monetization items not).

---

## Summary Scorecard

| Section | Coverage |
|---|---|
| §00 Philosophy | ✅ Honoured in design |
| §01 World Bible | ✅ Characters/lore · ⚠️ map scale/coords · ❌ main-menu flavor |
| §02 Core Loop | ✅ Phase flow · ✅ Siphon · ✅ Сходка · ⚠️ movement edge cases |
| §03 Game Systems | ✅ Roles · ❌ Economy/BattlePass/Achievements entirely |
| §04 AI | ✅ Behavior trees · ⚠️ 2 suspicion modifiers missing · ❌ A*/vents |
| §05 Multiplayer | ⚠️ WS rooms working · ❌ Authoritative server · ❌ Anti-cheat · ❌ Matchmaking |
| §06 Tech Architecture | ✅ React+Canvas bridge · ❌ DB · ❌ Redis |
| §07 Art | ⚠️ Palette correct · ❌ Sprite assets (procedural drawing only) |
| §08 Audio | ✅ Music · ⚠️ 18/30 SFX (12 missing) |
| §09 Viral | ✅ Share card · ✅ Replay buffer · ❌ Leaderboards |
| §10 Monetization | ⚠️ Immunity ticket · ❌ Stars/BattlePass/Economy |
| §13 Accessibility | ✅ Most settings implemented · ❌ High contrast · ❌ "Что делать?" |

**Overall: the core gameplay loop (§01–§02, §04, §08) is ~85% complete. Everything requiring a persistent backend (§03 economy, §05 authoritative server, §06 DB/Redis, §09 leaderboards, §10 monetization) is 0% implemented. The biggest single gap for a shippable game is the absence of real sprite art; everything else is playable with the current procedural renderer.**

---

## Prioritised Remaining Gaps (for next sessions)

### Tier 1 — Offline / no-backend required (implement next)
1. **12 missing SFX** (§8.2) — footsteps, player_death, bot_death, shawarma_buy, grandma_escort, car_door, engine_start, tesla_zap, trap_trigger, alarm_chaos, ui_hover, fuel_lock. All synthesizable via Web Audio API, no assets needed.
2. **Human Сливщик fake-task animation** (§2.5) — when a human Сливщик enters a task terminal, show the task UI but don't increment the Unity Meter. Bots already do this; human path missing.
3. **Vent usage for Сливщики at Hard/Nightmare** (§3.1.2, §4.2) — dumpster-to-dumpster fast travel. Requires adding a vent teleport action in `logic.ts` and gating it by difficulty in `botAI.ts`.
4. **2 missing bot suspicion modifiers** (§4.3) — task-skip +0.05 and task-completion −0.1 not applied in `botAI.ts`.
5. **Auto-start lobby at 8 players after 10s** (§2.1) — small Lobby.tsx addition.
6. **"Сегодня в ЖК" main menu flavor text** (§1.4) — rotating atmospheric text on main menu, static array, no backend needed.
7. **Standalone emote wheel during play** (§2.2) — 4-emote wheel on right-thumb swipe up during play phase (separate from meeting quick-chat).
8. **"Что делать?" objective button in HUD** (§13.1) — shows current objective text based on role and phase.
9. **Graphical trash-chute ejection animation** (§2.7.4) — 5s Canvas animation for ejection; currently text-only overlay.

### Tier 2 — Requires backend infrastructure
10. **PostgreSQL schema** (§6.3) — users, inventory, match_history, achievements, daily_leaderboard tables.
11. **Redis cache** (§6.4) — active rooms, session reconnect tokens, leaderboard sorted sets.
12. **Authoritative server** (§5.1) — move `tickGame` server-side; clients send inputs, server validates and broadcasts.
13. **Economy: Бабки currency** (§3.2) — earn/spend flow, stored in DB.
14. **Battle Pass** (§3.3) — 50-tier progression, XP sources, free/premium tracks.
15. **Daily challenge system** (§3.5) — daily seed, challenge types, 200 Бабки reward.
16. **Achievement system** (§3.6) — 50 achievements with Бабки rewards.
17. **Leaderboards** (§9.3) — daily (Redis sorted set) + all-time (PostgreSQL).
18. **Telegram Stars purchase flow** (§10.3) — `openInvoice`, inventory crediting.
19. **Fuel ticket account linking** (§10.2) — webhook from @fuel_fuel_fuel_bot.
20. **Quick Play matchmaking queue** (§5.5) — server-side queue, 4–8 player grouping.
21. **Lag compensation** (§5.3) — client-side prediction, remote player interpolation.

### Tier 3 — Art assets (requires artist or AI generation pipeline)
22. **Sprite sheets** (§7.3) — 320 character sprites (10 chars × 8 dirs × 4 frames), 48 car sprites, 80 prop sprites. Currently all drawn procedurally in `renderer.ts`.
23. **Directional walk animation** (§7.4) — 4-frame per direction; replace current blob-with-bob.
24. **Full ejection cinematic sprite animation** (§7.4) — player sprite drops into trash chute.

---

## Session History

### Session 4 (2026-07-07) — Accessibility & Tutorial
1. **Auto-interact** — 2-second proximity timer, optional toggle in settings. `gs.autoInteractTimer` in `logic.ts`, `triggerInteract` flag in `updateInteractions`. Does NOT auto-trigger siphon, ambush, khozain lock-hold, meeting calls, vent teleport.
2. **Text size** — S/M/L selector; `textScale` (0.82/1.0/1.22) applied to prompt and tutorial text.
3. **Simplified chat wheel** — Toggle in settings; 6 of 12 phrases. `gs.simplifiedChatWheel`.
4. **Subtitles** — MeetingScreen subtitle strip at bottom, color-coded by character.
5. **Tutorial** — `gs.tutorialStep` 0→3, shawarma walk-through, localStorage `95Y_tutorial = 'done'`, skip button.

### Sessions 1–3 — Core Gameplay
- All 20 tasks + 10 mini-game types
- All 4 sabotages
- Siphon phases 0→1→2→complete with gurgle audio
- Ambush system with charge timer + interrupt
- Meeting/voting/ejection with cinematic text
- 3 neutral roles (Барсик/Дворник/Участковый) with full abilities
- Janitor canister X-ray highlight (orange glow through fog)
- Барсик canister knock (cancels siphon, creates evidence)
- Проверить бак + Запереть бак (Хозяин car interactions)
- Persistent Бабушка NPC witness hints
- Fog-of-war raycasting (§2.3, 72 rays)
- Immunity Ticket power-up (§10.2)
- Bot AI with Easy/Medium/Hard/Nightmare difficulty tiers
- Bot vent usage + all suspicion modifiers (note: 2 still confirmed missing per §4.3 audit)
- 18/30 SFX + 3 music tracks (§8.1–§8.2)
- Sprint toggle (Shift), crouch-stealth
- Share card PNG (§9.1)
- Replay buffer / Бакстаб Момент GIF (§9.2)
- Per-player stats tracking
- Volume controls (master/music/sfx sliders)
- Colorblind mode toggle
- 20 satirical ejection texts with role reveal

---

## File Map

| File | Purpose |
|------|---------|
| `artifacts/game/src/game/logic.ts` | Core game loop (~1900 lines); all game mechanics |
| `artifacts/game/src/game/types.ts` | All types including full GameState |
| `artifacts/game/src/game/state.ts` | Singleton `gs` + startGame() |
| `artifacts/game/src/game/renderer.ts` | Canvas 2D rendering (~1000 lines) |
| `artifacts/game/src/game/audio.ts` | AudioManager with 18 SFX + 3 music tracks |
| `artifacts/game/src/game/botAI.ts` | Bot behavior trees, difficulty tiers |
| `artifacts/game/src/game/vision.ts` | Raycasting fog-of-war, 72 rays, 140°/160° FOV |
| `artifacts/game/src/game/network.ts` | WebSocket client, multiplayer state relay |
| `artifacts/game/src/game/replayBuffer.ts` | Circular frame buffer, GIF export (§9.2) |
| `artifacts/game/src/components/HUD.tsx` | React HUD overlay (10Hz snapshots) |
| `artifacts/game/src/components/MeetingScreen.tsx` | Сходка/voting UI, 12-phrase quick-chat |
| `artifacts/game/src/components/TaskMiniGame.tsx` | All 10 task mini-game types |
| `artifacts/game/src/components/Lobby.tsx` | Character select, settings, START |
| `artifacts/game/src/components/GameResults.tsx` | Results, share card, CTA |
| `artifacts/game/src/data/tasks.ts` | 20 task definitions |
| `artifacts/game/src/data/map.ts` | Map zones, spawn points (pixel coords, 1200×900) |
| `artifacts/game/src/data/characters.ts` | 10 character definitions + voice lines |
| `artifacts/game/src/data/ticker.ts` | 54 satirical news headlines |
| `artifacts/api-server/` | Node.js WS server — room management, host relay |
| `attached_assets/1_Game_DOC_1783448276693.md` | Source-of-truth design doc (1992 lines) |
