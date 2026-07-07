---
name: 95-Y Mini-Games and Sabotage
description: §2.5 task mini-games and §2.9 sabotage system implementation details and key design decisions
---

## §2.5 Task Mini-Games

### Architecture
- `TASK_MINIGAME_MAP` in `types.ts` maps `TaskDefKey → MiniGameType`
- Mapped tasks: `shawarma→tap_timing`, `kvass→tap_timing`, `intercom→sequence`, `pigeons→rapid_tap`, `sweep→rapid_tap`, `window→dial`, `mailbox→letter`
- Unmapped tasks (`trash`, `grandma`, `flowers`) keep hold-timer behavior
- `gs.activeMiniGame: MiniGameState | null` on the singleton — one mini-game at a time (human only)
- Mini-game UI: `TaskMiniGame.tsx` React overlay, rendered in `HUD.tsx` with full-screen pointer-events backdrop
- HUD snapshot at 10Hz shallow-copies `activeMiniGame: { ...gs.activeMiniGame }` and `activeSabotages.map(s => ({...s}))` to trigger React re-renders

### Interaction flow
- Single E press near task → `startMiniGame()` → overlay opens
- `updateMiniGame(dt, input)` runs first in `tickGame` before `updateInteractions`
- While mini-game active: `updateInteractions` returns early (mini-game owns all input)
- Player moving > `INTERACT_RADIUS * 1.6` → auto-cancel
- React tap actions (`onMiniGameTap`, `onMiniGameDigitTap`) also enforce proximity guard — prevents remote completion
- `cancelMiniGame()` exported; called by React cancel button and by `callMeeting()`

### Mini-game types
- `tap_timing`: oscillating marker (0.65 units/sec), green zone 40-60%, tap in zone → hit, miss → lose a hit. shawarma=3 hits, kvass=2 hits.
- `rapid_tap`: mash E or UI button N times within time limit; fail = reset (not game over). pigeons=15/7s, sweep=12/5s.
- `sequence`: 4-digit code shown on numpad buttons, tap in order; wrong press resets seqIndex.
- `dial`: hold E rotates 90°/sec; release in green zone (±22°) = stop; 3 stops = complete.
- `letter`: show satirical ЖКХ letter text; tap once to confirm.

## §2.9 Sabotage System

### Types
- `SabotageKey`: `babushka_cerberus | pipe_burst | chat_offline | alarm_chaos`
- Constants `SABOTAGE_COOLDOWNS` and `SABOTAGE_DURATIONS` in `types.ts`
- `VALVE_POSITIONS` and `BABUSHKA_CERBERUS_POS` added to `map.ts`
- `Player.sabotageCooldown: number` — global cooldown between sabotages (not per-type)

### Game logic
- `triggerSabotage(key)` — human player only, checks localPlayerId role + cooldown
- `triggerBotSabotage(botId, key)` — separate export for bot AI, bypasses localPlayerId
- `updateSabotages(dt, input)` — ticks timers, handles valve/babushka interactions, decays all player sabotageCooldowns
- `isSabotageActive(key)` — exported; used by renderer, logic, botAI

### Sabotage effects (all globally enforced)
- `chat_offline`: blocks `callMeeting()` for ALL callers (humans and bots) — guard is at the authoritative entrypoint
- `babushka_cerberus`: blocks `callMeeting()` when reason==='alarm'; also blocked in human alarm-button interaction prompt
- `pipe_burst`: `updateSiphoning()` checks at the top and suspends ALL siphons when active; bot also checks `isSabotageActive('pipe_burst')` before seeking a car
- `alarm_chaos`: suppresses `audio.startGurgle()` in siphon phase-2 transition

### Valve fixing (pipe_burst)
- Two valve positions; player holds E at each for `VALVE_FIX_TIME=3s`
- Progress tracked in `SabotageInstance.valve1Progress / valve2Progress`
- Both at 3s → resolved; timer expiry → slivshchiki win immediately

### Renderer
- `drawSabotageFlood`: blue animated flood overlay on parking+garden when pipe_burst active; urgency increases as timer drops
- `drawValveMarkers`: progress rings at VALVE_POSITIONS when pipe_burst active
- `drawBabushkaNPC`: animated grandma sprite at BABUSHKA_CERBERUS_POS when cerberus active

### HUD
- Active sabotages shown as warning banners at top (all players see them)
- Slivshchik gets 🔧 sabotage menu button (bottom-right); opens panel with 4 options + cooldown display
- Top-bar padding adjusts dynamically based on active sabotage banner count

### Bot AI
- Bot tries sabotage with ~0.003 probability per frame (≈ once per ~5min on average)
- Preference order: alarm_chaos → chat_offline → babushka_cerberus → pipe_burst (least aggressive first)

### SFX (§8.2)
- Each sabotage key maps to a distinct synthesized sound in `spawnSabotage()`: `pipe_burst_sfx` (water rush+thud), `chat_offline_sfx` (modem chirp), `alarm_chaos_sfx` (overlapping car alarms), `babushka_cerberus_sfx` (sawtooth yell stabs)
- `canister_pickup` sound added at human canister pickup interaction (metallic clink)
- All new entries added to the `SoundName` union; switch statement in `audio.play()` exhausts them

### §4.3 Bot suspicion additions
- **Sprint suspicion**: module-level `_sprintTimer: Map<string, number>` tracks per-bot-per-target sprint duration; only raises suspicion after 3s continuous sprinting within 300px range (one-shot 0.04 bump then reset). This avoids immediate suspicion on normal movement.
- **Дядя Серёжа bias**: bots slowly reduce suspicion on players with `character === 'uncle_seryozha'` (satire of ageism). Uses `dt`-scaled decay.

**Why:** Enforcement at `callMeeting()` entrypoint (not just at the UI layer) ensures sabotages work for bots too. Pipe burst enforcement in `updateSiphoning()` prevents state divergence between human and bot siphoning. Sprint suspicion requires accumulation map outside `Player` type to avoid changing the shared data structure.
