# 95-Й Бакстаб — Session Handoff

> Design bible: `attached_assets/1_Game_DOC_1783461798879.md` (1992 lines, §00–§17, source of truth)

---

## Project overview

**95-Й Бакстаб** — Among Us-style social deduction game set in a Russian courtyard (ЖК «Цветочные Поляны»). Players are Хозяева (protecting car fuel) or Сливщики (siphoning it). React 19 + Canvas 2D, pnpm monorepo, bots with behavior trees, authoritative WebSocket server, PostgreSQL via Drizzle.

---

## §00–§17 Doc vs. Implementation: Full Comparison

### §00 — Philosophy of Play ✅
All 7 creative pillars upheld in implementation. Conceptual only — no code gaps.

---

### §01 — World Bible

| Item | Status | Notes |
|---|---|---|
| §1.1 Setting (ЖК, 2026, 85₽/litre) | ✅ | Briefing text and HUD ticker match |
| §1.2 Map — 1920×1920px (60m × 32px/m) | ⚠️ Scaled | Implemented at **1200×900px**. All zones present (parking, arch, playground, dumpsters, shawarma, benches, flowerbeds) — proportions differ from spec |
| §1.3 Cast — 10 characters + voice lines | ✅ | All 10 (Denis → Barsik), voice lines match |
| §1.4 Satire layer — fuel ticker + news + "Сегодня в ЖК" | ✅ | All three confirmed in `Lobby.tsx` and HUD |
| §1.5 News ticker — 50 headlines | ✅ | `src/data/ticker.ts` — corpus present |

---

### §02 — Core Gameplay Loop

**§2.1 Phase Architecture** ✅ Lobby → Tutorial (first-time) → Role Assignment → Briefing (5s, skippable after 2s) → Play → Сходка → Resolution → loop.

**§2.2 Movement & Camera** ✅
- Walk 3.5 m/s, Sprint 5.5 m/s (Shift toggle, 5s stamina, 8s regen) ✅
- Crouch 1.8 m/s + stealth ✅
- Emote wheel: 4 emotes (👋 🤔 🚨 😂) ✅

**§2.3 Vision System** ✅ 72 rays, 12m radius, wall/car/dumpster occlusion, teammate outlines pierce fog ✅

**§2.4 Interaction Model** ✅ Car prompt, body report, alarm, task terminals, canister, shawarma speed boost, car immunity lock ✅

**§2.5 Task System** ✅ All **20 tasks** implemented. Unity Meter, fake-task animation for Сливщики ✅

**§2.6 Siphoning System** ✅ All 4 phases, 15s siphon cooldown, 25s ambush cooldown, canister carry slows, dumpster disposal ✅

**§2.7 Сходка** ✅ All 3 triggers, 60s discussion + 30s voting, quick-chat 12 phrases, skip by majority, 20 ejection cinematics ✅

**§2.8 Win Conditions** ✅ All 5 win conditions implemented.

**§2.9 Sabotage System** ✅ All 4 doc sabotages + `lights_out` (bonus).

---

### §03 — Game Systems

| Item | Status |
|---|---|
| §3.1 Roles — Хозяева + Сливщики | ✅ |
| §3.1 Vent system | ✅ |
| §3.1.3 Neutral roles — Дворник, Участковый, Барсик | ✅ |
| §3.2 Economy — Бабки earn/spend | ✅ localStorage profile + leaderboard submission |
| §3.2 Telegram Stars purchase flow | ✅ ShopTab `openInvoice` (client-side); backend invoice creation not yet wired |
| §3.2 Талоны | ⚠️ CTA present, fuel_bot_linked flag in DB schema, no verification webhook |
| §3.3 Battle Pass (50 tiers, XP) | ✅ Full XP/tier tracking in localStorage |
| §3.4 Inventory & Cosmetics | ✅ ShopTab with babki + Stars purchase, daily hats hidden unless owned |
| §3.5 Daily Challenges | ✅ Date-based seed, 12 challenge types, 200 babki + XP reward + daily-exclusive hat |
| §3.6 Achievements (58 defined) | ✅ checkAchievements() in rewards.ts, localStorage persistence |

---

### §04 — AI Architecture ✅

Behavior tree, Сливщик AI (siphon/ambush/sabotage/fake-task), Хозяин AI (suspicion vector, witness report), 4 difficulty tiers, Кошмар stalking, role-aware meeting chat — all implemented.

---

### §05 — Multiplayer Architecture

| Item | Status |
|---|---|
| §5.1 Authoritative server | ✅ |
| §5.2 WebSocket protocol, 20Hz tick | ✅ |
| §5.3 Client-side prediction + server correction | ✅ |
| §5.4 Reconnection → AI takeover, host reassign | ✅ |
| §5.5 Custom Room (room code) | ✅ |
| §5.5 Quick Play matchmaking | ✅ |
| §5.6 Server-side anti-cheat | ✅ |

---

### §06 — Technical Architecture

| Item | Status | Notes |
|---|---|---|
| React 19, Canvas 2D | ✅ | |
| Zustand | ⚠️ Replaced | Singleton `gs` mutated at 60fps — intentional |
| PostgreSQL + Drizzle | ✅ | Schema pushed |
| Redis 7 | ❌ | In-memory `Map` — rooms lost on server restart |
| `ws` library | ✅ | |
| pnpm monorepo | ✅ | |

---

### §07 — Art Direction

| Item | Status |
|---|---|
| Color palette (#87CEEB sky, #4CAF50 grass, Telegram panels) | ✅ |
| Sprite sheets (320 character sprites, 48 car sprites) | ❌ Using **emoji circles** — single largest visual gap |
| Walk/siphon animation | ✅ (simplified) |
| Ejection cinematic | ⚠️ Text overlay only (no sprite animation) |

---

### §08 — Audio Direction

| Item | Status |
|---|---|
| §8.1 Music (menu/play/meeting, dynamic intensity) | ✅ Web Audio API synthesis |
| §8.2 SFX — all 30 synthesized | ✅ All SFX implemented including footsteps, car_door, engine_start, tesla_zap, etc. |

---

### §09 — Viral Mechanics

| Item | Status |
|---|---|
| §9.1 Share card PNG (1080×1080) | ✅ |
| §9.2 Replay buffer "Бакстаб Момент" | ✅ `replayBuffer.ts` — 10s circular buffer |
| §9.3 Leaderboards | ✅ LeaderboardTab + `/api/leaderboard` GET+POST (requires DB) |
| §9.4 First-win share prompt | ✅ Shows after first-ever win in GameResults |
| §9.4 Daily challenge share prompt | ✅ Shows after daily completion in GameResults |
| §9.4 Friend invite deep link | ✅ "Пригласить друзей" button in multiplayer waiting room |

---

### §10 — Monetization

| Item | Status |
|---|---|
| §10.2 Дядя Серёжа CTA (`@fuel_fuel_fuel_bot`) | ✅ Win/lose screen CTA present |
| §10.2 Immunity Ticket in-game power-up | ✅ Spawn near dumpsters, locks fuel 60s |
| §10.2 Account-linking flow | ❌ Manual only (no webhook) |
| §10.3 Telegram Stars purchase flow (client) | ✅ ShopTab openInvoice |
| §10.3 Telegram Stars purchase flow (backend invoice) | ❌ Backend invoice creation endpoint missing |
| §10.4 Battle Pass economics | ✅ Free (10 tiers) + Premium (50 tiers) tracked |

---

### §11–§17

| Section | Status |
|---|---|
| §11 LiveOps (daily challenge rotation, seasonal events) | ⚠️ Daily challenges ✅; seasonal events ❌ |
| §12 Launch Strategy | N/A |
| §12.4 First-time tutorial | ✅ 4-step Tutorial.tsx, shows once, skippable |
| §13 Accessibility (colorblind, text size, volume, subtitles, auto-interact) | ✅ All implemented in HUD.tsx |
| §14 Ethical Design | ✅ Upheld |
| §15 QA Standards | ⚠️ Manual only |
| §16–§17 Team / Final Word | N/A |

---

## Priority gap list (current)

| Priority | Gap | Section |
|---|---|---|
| 🔴 High | No sprite art — emoji circles only | §7.3 |
| 🔴 High | No Redis — rooms lost on server restart | §6.4 |
| 🟡 Medium | Fuel ticket bot webhook / account-linking automation | §10.2 |
| 🟡 Medium | Telegram Stars entitlement not server-verified (client-trusted onPaid) | §10.3 |
| 🟢 Low | Seasonal events (New Year, 1 Sept, Масленица map reskins) | §11.2 |
| 🟢 Low | Ejection cinematic — text overlay, not sprite animation | §7.4 |

## Recently closed gaps (this session)

| Fixed | What | Section |
|---|---|---|
| ✅ | §5.3 Remote player interpolation — 100ms delay ring buffer + lerp in `network.ts` | §5.3 |
| ✅ | §10.3 Telegram Stars backend invoice endpoint — `POST /api/stars/invoice` calls Bot API `createInvoiceLink`; ShopTab calls backend first, falls back to client slug | §10.3 |
| ✅ | §2.1 Multiplayer match timer `+30s` per task (was missing in `api-server/logic.ts::completeTask`) | §2.1 |
| ✅ | §2.2 Camera lerp smoothing at 0.15/frame in `renderer.ts` (was hard-snap) | §2.2 |
| ✅ | §2.6 Low-fuel warning — one-shot `⛽ <Color> машина почти пуста!` prompt + alarm SFX when any car drops below 10% fuel; `Car.lowFuelWarned` flag prevents repeat; Хозяева only | §2.6 |

---

## Key commands

```bash
# TypeCheck
pnpm --filter @workspace/game run typecheck

# Workflows (never create duplicates)
# "artifacts/game: web"        → PORT=24631
# "artifacts/api-server: api"  → PORT=3000
```

---

## Key files

| File | Purpose |
|------|---------|
| `artifacts/game/src/game/logic.ts` | Game loop, all interactions |
| `artifacts/game/src/game/botAI.ts` | Bot behavior trees |
| `artifacts/game/src/game/audio.ts` | Web Audio SFX |
| `artifacts/game/src/game/types.ts` | All types + constants |
| `artifacts/game/src/game/vision.ts` | §2.3 raycasting fog-of-war |
| `artifacts/game/src/game/renderer.ts` | Canvas 2D draw calls |
| `artifacts/game/src/game/network.ts` | WS client; `GameNetwork` class |
| `artifacts/game/src/game/rewards.ts` | §3.2/§3.3/§3.5/§3.6 match reward calc |
| `artifacts/game/src/game/profile.ts` | localStorage profile (babki, XP, achievements, seenTutorial) |
| `artifacts/game/src/components/HUD.tsx` | React HUD overlay (settings, minimap, objective btn) |
| `artifacts/game/src/components/Lobby.tsx` | Main lobby + single-player start |
| `artifacts/game/src/components/Tutorial.tsx` | §12.4 4-step first-time tutorial |
| `artifacts/game/src/components/MultiplayerLobby.tsx` | Multiplayer: Quick Play + Custom Room + invite link |
| `artifacts/game/src/components/MeetingScreen.tsx` | Vote UI |
| `artifacts/game/src/components/GameResults.tsx` | Results + share card + first-win/daily share prompts |
| `artifacts/game/src/components/ShopTab.tsx` | Hat shop (babki + Stars + daily hats) |
| `artifacts/game/src/data/tasks.ts` | 20 task definitions |
| `artifacts/game/src/data/ticker.ts` | 50 news headlines |
| `artifacts/game/src/data/cosmetics.ts` | Hats catalog incl. 7 daily-exclusive hats |
| `artifacts/api-server/src/game/wsHandler.ts` | WS server: create/join/quick-join/input |
| `artifacts/api-server/src/game/room.ts` | `GameRoom` — tick/broadcast/auto-start |
| `lib/db/src/schema/index.ts` | Drizzle schema |
| `.agents/memory/MEMORY.md` | Architectural memory index |
