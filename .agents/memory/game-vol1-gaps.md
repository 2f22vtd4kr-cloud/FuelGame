---
name: 95-Y Vol1 gap mechanics
description: All Vol1 gap features implemented; now 20 tasks total, minimap, high contrast mode
---

## Features implemented

### Match timer (§2.1)
- `matchTimeLimit: number` on GameState (default 300s)
- Counts down in tickGame play phase; Сливщики win on expiry
- Task completion adds +30s (capped at 600s); HUD shows countdown, red at <60s

### Skip discussion by majority (§2.7.4)
- `skipDiscussionVotes: string[]` on MeetingState
- `submitSkipDiscussion(voterId)` in logic.ts/gameActions.ts
- MeetingScreen shows "⏭️ К голосованию" button + progress counter

### Neutral roles (§3.1.3)
- `neutralRole`, `barsikMeowCooldown`, `canistersCollected` on Player
- Barsik auto-meows near siphon; Участковый investigates bodies; Дворник collects canisters
- HUD shows neutral role buttons + emoji on role badge

### 20 tasks total (§2.5)
Original 10: shawarma, intercom, trash, window, grandma, mailbox, pigeons, flowers, kvass, sweep
Session-3 tasks: dog_walk, flower_match, drunk_calm, taxi_order
Session-5 new tasks: help_bags, find_cat, fix_swing, water_lawn, check_meter, close_tap

**Mini-game mappings for new tasks:**
- help_bags → dog_walk (waypoints: 3 stops, 10s limit, uses DogWalk UI with 🛍️ icon)
- find_cat → dog_walk (waypoints: 3 spots, 10s limit, uses DogWalk UI with 🐱 icon)
- fix_swing → rapid_tap (8 taps, 6s)
- water_lawn → rapid_tap (12 taps, 6s)
- check_meter → sequence (4 digits, ascending order sort applied)
- close_tap → dial (2 stops instead of default 3)

**DogWalk UI is context-aware:** reads mg.defKey to show correct labels/icons for help_bags/find_cat vs dog_walk.

### Minimap (§13.1)
- `Minimap` React component in HUD.tsx, scaled to MAP_W×MAP_H
- Position: `bottom: 148, left: 12` (above settings button, clears all other controls)
- Shows: players (colored dots), local player (gold), cars, incomplete tasks (green dots), bodies (red badge), immunity tickets (gold dots)

### High contrast mode (§13.1)
- `highContrastMode: boolean` on GameState + gs init
- Toggle in settings panel
- Applied as `filter: contrast(1.15) brightness(1.05)` on HUD container + `data-hc` CSS hook

## Sync notes
- api-server types.ts/tasks.ts/map.ts/logic.ts all mirrored with same 20-task schema
- Pre-existing api-server TS error (api-zod/dist not built) is unrelated to these changes
- api-server logic.ts uses same defKey-based config for fix_swing/water_lawn/close_tap/check_meter

**Why:** Remaining Vol1 gap features needed to reach full doc alignment before moving to Vol2.
