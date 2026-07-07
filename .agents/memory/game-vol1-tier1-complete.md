---
name: 95-Y Vol1 Tier 1 Completion
description: Session 6 audit results — all HANDOFF Tier 1 items confirmed done in code; two final gaps implemented
---

## Status after Session 6 (2026-07-07)

All HANDOFF Tier 1 items are implemented in the codebase. Several listed as "missing" were already done before this session:

| Feature | Status | Location |
|---|---|---|
| All 30 SFX (footsteps, death, etc.) | ✅ Already done | audio.ts — full switch dispatcher |
| Bot suspicion modifiers (task-skip +0.05, task-completion −0.1) | ✅ Already done | botAI.ts lines ~175/186 |
| "Сегодня в ЖК" flavor text | ✅ Already done | Lobby.tsx — rotates every 6s |
| "Что делать?" objective button | ✅ Already done | HUD.tsx lines 411–459 |
| Standalone emote wheel during play | ✅ Already done | HUD.tsx lines 764–807, PLAY_EMOTES = ['👋','🤔','🚨','😂'] |
| Vent usage for Сливщики (Hard/Nightmare) | ✅ Already done | Fixed in prior session (memory: game-vent-price.md) |
| Human Сливщик fake-task animation | ✅ Already done | logic.ts isFakingTask at line ~1490, fakeCompleteTask |
| Graphical ejection cinematic (§2.7.4) | ✅ Already done | EjectionCinematic component in MeetingScreen.tsx; 7s reveal timer at logic.ts ~1865 |
| High contrast mode (§13.1) | ✅ Already done | HUD.tsx lines 192–196, settings toggle at ~910 |
| Запереть бак free action for Хозяин (§2.4) | ✅ Already done | logic.ts ~1350: KHOZAIN_LOCK_HOLD_TIME = 2s |
| Shawarma speed boost for Хозяин (§2.4) | ✅ Already done | logic.ts speedBoostTimer; SHAWARMA_SPEED_BOOST_DURATION = 10s |
| Babushka NPC witness (§2.4) | ✅ Already done | logic.ts ~1338: getBabushkaHint(), BABUSHKA_NPC_POS |

## Session 6 Additions

### 1. Role-specific Babushka hints (§2.4)
- `getBabushkaHint()` now takes `role: string`
- Сливщики get cover stories (6 lie phrases: alibi cover, "I didn't see anyone")
- Хозяева get honest witness hints (fuel-state-aware hints + 7 fallback phrases)
- Called as `getBabushkaHint(player.role)` at logic.ts ~1342

### 2. Multiplayer auto-start at 8 players (§2.1) — MultiplayerLobby.tsx
- `networkRef` added alongside `network` state to avoid stale closures in interval callbacks
- Two useEffects: one for start/cancel logic (no return cleanup), one for unmount-only cleanup
- When `amHost && lobbyPlayers.length >= 8 && screen === 'waiting'`: starts 10s setInterval countdown
- If player count drops below 8 or loses host: cancels countdown
- UI: green→red countdown banner with progress bar, start button shows "⏱ Xs — Начать сейчас"

**Why:** The critical pattern insight is that the conditions-based effect must NOT return a cleanup function — returning cleanup from a deps effect causes it to fire on every dependency change (including 8→9 players), resetting the countdown.

## Next Tier (Tier 2 — requires backend)
- PostgreSQL persistence (cosmetics, battle pass, leaderboards)
- Server-authoritative tick (currently client-authoritative with trust)
- Telegram Stars payment flow
- Daily challenge rotation
