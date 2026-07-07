---
name: 95-Y Economy & Progression Systems
description: §3.2/§3.3/§3.5/§3.6 Бабки, Battle Pass XP, Daily Challenges, Achievements — all implemented in session 8
---

# Economy & Progression Systems

## What was built
All systems use localStorage (no DB required for single-player).

**Files:**
- `artifacts/game/src/game/profile.ts` — `PlayerProfile` interface + `loadProfile/saveProfile/moscowDateString/xpToTier`
- `artifacts/game/src/data/achievements.ts` — 50 achievement definitions with `ACHIEVEMENT_MAP`
- `artifacts/game/src/data/dailyChallenges.ts` — 12 challenge types + `getDailyChallenge(dateStr)` deterministic seed
- `artifacts/game/src/game/rewards.ts` — `applyMatchRewards(gs)` called once on mount in GameResults

## Key design decisions

**Why:** Stats must be updated to `profile` BEFORE `checkAchievements` is called — avoids double-counting. `checkAchievements` reads `profile.totalMatchesPlayed` etc directly.

**How to apply:** Always update cumulative profile stats first, then call `checkAchievements(gs, player, iWon, profile)`.

## §3.2 Бабки earn rates
- +50 match played, +100 win, +25 per task, +50 per correct vote
- `correctVotes` field added to `Player` type; incremented in `resolveMeeting()` in `logic.ts` when vote targets an actual slivshchik

## §3.3 Battle Pass XP
- +50 match, +100 win, +10 per task, +30 correct vote, +40 per siphon (~14.3% = 1 siphon), +200 daily
- `XP_PER_TIER = 500`, max tier 50

## §3.5 Daily challenges
- Moscow time date string (UTC+3) seeds challenge selection
- 12 challenge types; progress accumulates across matches on same calendar day
- `use_immunity_ticket` type reads `gs.immunityTicketsUsedThisMatch` (set in `logic.ts` when human applies ticket)

## §3.6 Achievements — key implementation notes
- `survivor` requires `profile.survivalStreak >= 5` (consecutive matches survived, tracked in profile)
- `barsik_survives` / barsik win: requires `player.isAlive` (not just having the role)
- `master_drain`: proxy condition `fuelSiphoned >= 50%` in one match
- `first_correct_vote`: checks `totalVotes === votes` (current match votes = first ever)

## UI integration
- `Lobby.tsx` shows profile header: Бабки balance, match count, BP tier progress bar, achievements badge (tap to expand all 50)
- `Lobby.tsx` shows daily challenge with progress/completion
- `GameResults.tsx` calls `applyMatchRewards` on mount (ref guard prevents double-call), shows rewards panel with earned Бабки + XP, BP progress bar, tier-up notification, unlocked achievements list
