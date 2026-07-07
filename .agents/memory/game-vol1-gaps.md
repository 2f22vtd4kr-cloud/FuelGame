---
name: 95-Y Vol1 gap mechanics
description: 5 missing mechanics implemented after the main build — briefing, flowerbeds, dumpster vent, siphon audio, crouch stealth
---

## Briefing phase (§2.1)
- `gs.phase = 'briefing'` + `gs.briefingTimer = 5` set in `startGame()`
- `tickGame()` counts briefingTimer down; when ≤ 0, sets `gs.phase = 'play'`
- App.tsx drives AppPhase entirely from `snap.phase` — NO duplicate React timer
- `GameCanvas` is mounted during 'briefing' so the game loop ticks the countdown
- Briefing overlay shows `Math.ceil(snapshot.briefingTimer)` as countdown (single source of truth)

## Flower-bed slow zones (§1.2)
- `FLOWERBED_RECTS: Rect[]` in `map.ts` (3 rects centred on decoration positions)
- `isInFlowerBed(pos)` helper exported from `map.ts`
- Applied as `speedMult *= FLOWERBED_SLOW_MULT` (0.6) in `updateHumanPlayer` (logic.ts)
- Applied in `moveBot` as `const fbMult = isInFlowerBed(bot.pos) ? FLOWERBED_SLOW_MULT : 1`

## Dumpster vent mechanic (§3.1.2)
- `ventCooldown: number` field on `Player` (decay in updateHumanPlayer + updateBots)
- Interaction block 4b in `updateInteractions`: Сливщик + !isCarryingCanister + near dumpster
- **Key UX rule**: on cooldown → show prompt but NO early return (fall through to other interactions)
- Only blocks + returns when vent is ready AND E is pressed

## Siphon audio indicator (§13.1)
- `SIPHON_AUDIO_RADIUS = 280` px (8m × 35 px/m)
- Computed in HUD: `state.cars.some(c => c.siphonPhase === 2 && hypot(…) <= SIPHON_AUDIO_RADIUS)`
- Renders pulsing ⚠️ "СЛЫШЕН СЛИВ" panel on left side when true

## Crouch stealth (§2.2)
- In `renderGame`: if any crouching enemy exists, compute `crouchCheckPoly` at 70% FOV
- `crouchCheckPoly` passed to `drawPlayers` as optional 4th arg
- Crouching enemy in full cone but NOT crouch cone → drawn at 0.35 alpha (ghostly)
- `ctx.globalAlpha = 1` reset at bottom of the player-draw loop (was missing before)
