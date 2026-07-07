---
name: Vol 1 doc alignment & bug fixes
description: Bugs fixed to align Vol 1 implementation with the design doc; key gotchas to avoid reintroducing
---

# Vol 1 Doc Alignment & Bug Fixes

## Rule
When modifying meeting, siphon, or bot logic, check all three layers: logic.ts (human + meeting), botAI.ts (bot), and renderer.ts (visual feedback).

**Why:** Several bugs stem from the same mechanic being handled in two places (e.g. siphon interrupt handled in both updateSiphoning and botAI.ts) with one path missing a side-effect.

## How to apply
- Siphon interrupt must always: (a) call stopSiphon OR set siphonCooldown=15 manually, (b) dropCanister if phase===2, (c) set isCarryingCanister=true for bots.
- Meeting start (callMeeting) must drop carried canisters to gs.canisters BEFORE clearing isCarryingCanister — single-pass, check-then-clear.
- Bot disposal at dumpster must remove the bot's canisters from gs.canisters by ownerId, not just clear the carry flag.
- Bot setTimeout votes must snapshot meetingId before the delay and validate inside the callback.

## Fixed bugs (for reference)
1. callMeeting cleared isCarryingCanister before the drop loop — evidence silently vanished at meeting start.
2. castBotVotes setTimeout had no meetingId check — votes from meeting N could land in meeting N+1.
3. isWatched early-return in updateSlivshchikBot fired before the interacting-state handler — watched interrupt never triggered cooldown or canister drop.
4. Bot interrupt in interacting block set isCarryingCanister=true but bot disposal only cleared the flag without removing the canister from gs.canisters — ghost evidence remained.
5. Renderer showed no ⚠️ during siphon setup phase 1 (doc §2.4 requires it above the siphoner's head).
