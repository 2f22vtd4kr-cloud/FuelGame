---
name: 95-Y Vol1 gaps (sessions 5–8)
description: match timer, neutral roles, bot fixes, skip-discussion, per-player stats, share card, Барсик, briefing, getMatchTitle, replayBuffer, backstabMoment, session 8 items
---

## Session 5 gaps
- Match timer, neutral roles (barsik/cop/janitor), bot pipe-burst fix, skip-discussion majority vote
- Per-player stats tracked and shown on results screen
- Share card PNG generated on results screen

## Session 6
- Барсик drawn as smaller circle (radius reduced)

## Session 7
- briefing atmospheric text + skip button
- getMatchTitle §9.1 — per-match Russian title based on role/outcome/stats
- replayBuffer.ts §9.2 — **animated GIF** (not JPEG): rolling 8fps ring buffer (3s = 24 frames), gifenc encoding, watermark per frame, blob URL. Triggers: catch_siphoner / caught_siphoning / dramatic_eject
- backstabMoment on GameState

## Session 8
- Lobby "Получить талоны" button §10.2
- Clickable GameResults CTA
- §2.2 double-tap sprint + swipe-up emote
- z-index fix for action buttons

## §9.2 GIF implementation notes
- `startFrameCapture(canvas)` called from GameCanvas when `gs.phase` transitions to `'play'`
- `stopFrameCapture()` called when phase leaves `'play'`
- `captureMoment(canvas, type)` freezes buffer, encodes GIF with gifenc, stores blob URL
- `clearMoment()` revokes blob URL (no leak)
- gifenc installed as dependency; types in `src/types/gifenc.d.ts`
- `gif.bytes().buffer as ArrayBuffer` needed for Blob constructor (TS strict mode)

## §9.4 Friend invite deep link auto-join
- `MultiplayerLobby` receives `initialJoinCode` prop (extracted from `Telegram.WebApp.initDataUnsafe.start_param` in App.tsx)
- Auto-join `useEffect` fires once on mount if `initialJoinCode` is set; delays 80ms then calls `handleJoin()` if `networkRef.current` is null (guards against race with manual join or reconnect)
- `autoJoinFiredRef` prevents double-fire on strict-mode double-mount
