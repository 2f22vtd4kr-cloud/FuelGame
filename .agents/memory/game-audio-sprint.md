---
name: 95-Y audio and sprint systems
description: §8.1 background music scheduler, §8.2 SFX additions, §13.1 sprint toggle wiring
---

## Music System (§8.1)

`audio.ts` — `AudioManager` class now has `playMusic(track)`, `stopMusic()`, `startRumble()`, `stopRumble()`.

**Three synthesized tracks** (no MP3 files, all Web Audio API):
- `'menu'` — lo-fi C major, 90 BPM (electric piano, kick, snare, hi-hat)
- `'play'` — tense A minor, 110 BPM (plucked bass, stab chords, kick/snare)
- `'meeting'` — dramatic tango D minor, 60 BPM (accordion chords, castanet, bass)

**Scheduler pattern** (Chris Wilson lookahead clock):
- `musicScheduler` runs every 100ms (`MUSIC_INTERVAL`)
- Schedules beats within next 0.25s (`MUSIC_LOOKAHEAD`) using `ctx.currentTime`
- `musicNextBeatTime` advances by `60/BPM` per beat
- `musicBeatIndex % N` maps to per-beat pattern functions

**Lifecycle wiring** (top of `tickGame`, before any early return):
```typescript
if (gs.phase !== _prevPhase) {
  if (gs.phase === 'play')         audio.playMusic('play');
  else if (gs.phase === 'meeting') audio.playMusic('meeting');
  else                             audio.stopMusic();
  _prevPhase = gs.phase;
}
```
- Handles briefing→play, play→meeting, meeting→play, anything→results correctly
- `_prevPhase` module-level variable in `logic.ts`
- Menu music started in `App.tsx` via `useEffect` (300ms delay) + `handlePlayAgain`

**Rumble layer**: `startRumble()` / `stopRumble()` adds a 40Hz sawtooth + lowpass layer through `musicGain` for siphon proximity atmosphere. Not auto-wired yet — connect to siphon phase 2 proximity.

## New SFX (§8.2) — 12 sounds added

All synthesized with Web Audio API. New names in `SoundName` union:
`vote_skip`, `fuel_lock`, `shawarma_buy`, `player_death`, `bot_death`,
`footstep_asphalt`, `footstep_grass`, `ui_hover`,
`car_door`, `engine_start`, `tesla_zap`, `grandma_escort`

**Wired in logic.ts**:
- `shawarma_buy` → `completeTask` when `defKey === 'shawarma'`
- `fuel_lock` → immunity ticket applied to car
- `car_door` → siphon phase 0→1 start (human player)
- `player_death` / `bot_death` → `executeAmbush`
- `vote_skip` → `submitSkipDiscussion`
- `footstep_asphalt` / `footstep_grass` → `updateHumanPlayer` (stepInterval: 0.30s sprint / 0.48s walk)

## Sprint Toggle (§13.1)

**Before**: Shift held → sprint (hold-to-sprint)
**After**: Shift press toggles sprint on/off (`sprintToggleRef` in `GameCanvas.tsx`)

Implementation:
- `sprintToggleRef = useRef(false)` in GameCanvas
- `onKeyDown`: when `e.key === 'Shift'` and key not already held, flip `sprintToggleRef.current`
- Mobile 🏃 button: `onClick={onSprint}` toggles `touchSprintRef` (was hold-to-sprint)
- `inp.sprint = sprintToggleRef.current || touchSprintRef.current`

**Why**: Doc §13.1 specifies sprint as a persistent toggle, not a held key.

## Other fixes in same batch

- **Task respawn bug**: moved tick from `updateInteractions` (gated by mini-game) into `tickGame` body — tasks now respawn even while mini-game overlay is active
- **Meeting chat bleed**: `scheduleBotChatMessages` captures `thisMeetingId` before setTimeout; guard checks `gs.meeting.meetingId !== thisMeetingId` to prevent old callbacks bleeding into new meetings
- **Bot suspicion modifiers**: `completeTask` reduces nearby khozain bots' suspicion by −0.1; `updateKhozainBot` raises suspicion +0.04/s when human loiters near task terminal without starting it
- **Bot vent escape** (Hard/Nightmare): `updateSlivshchikBot` teleports to farthest DUMPSTER_POSITION from watchers when `bot.ventCooldown <= 0` and carrying canister or fleeing
