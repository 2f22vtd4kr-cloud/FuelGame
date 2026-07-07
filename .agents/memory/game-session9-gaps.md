---
name: Session 9 gap fixes
description: Gaps closed in session 9 — §5.3 interpolation, §10.3 Stars invoice, §2.2 camera lerp, §2.1 multiplayer match timer, §2.6 low-fuel warning
---

# §5.3 Remote player interpolation
**Rule:** network.ts maintains a StateSnapshot ring buffer (MAX_HISTORY=12, ~600ms at 20Hz). `applyLatestState(nowMs)` renders remote players at 100ms delay, lerping between the two bracketing snapshots. Angle uses shortest-arc wraparound. `stateHistory` is cleared on `room_created`, `room_joined`, `game_started` to avoid cross-match artifacts.

**Edge cases fixed:** targetTime before first snapshot → snap to first pair; targetTime after last → snap to last pair (t clamps to 1, giving latest state).

**How to apply:** GameCanvas.tsx passes `performance.now()` to `applyLatestState`. Single-player path passes nothing (undefined → snap to latest, skips interpolation).

# §10.3 Stars backend invoice
**Rule:** `POST /api/stars/invoice` calls Telegram Bot API `createInvoiceLink` with XTR currency. Returns 503 when `BOT_TOKEN` env var absent. ShopTab.tsx `buyWithStars()` calls backend first, calls `openInvoice(invoiceLink)`, falls back to client-side slug pattern `hat_{id}_{cost}`.

**Why:** Telegram's `openInvoice` accepts proper invoice links returned by `createInvoiceLink`, not arbitrary strings. Slug fallback is for when BOT_TOKEN is not yet configured.

# §2.2 Camera lerp smoothing
**Rule:** renderer.ts module-level `_camSmoothX`/`_camSmoothY` initialized to -1 (sentinel). `CAM_LERP=0.15` per frame. Snaps on first frame (`_camSmoothX === -1`) and during `briefing` phase. No React state involved.

# §2.1 Multiplayer match timer extension
**Rule:** `api-server/src/game/logic.ts completeTask()` was missing the `+30s` extension. Added `gs.matchTimeLimit = Math.min(gs.matchTimeLimit + 30, 600)` for `khozain` completions. Was already present in single-player `artifacts/game` logic.ts.

# §2.6 Low-fuel warning
**Rule:** Added `Car.lowFuelWarned: boolean` field to both `types.ts` files (client + server), defaulting to `false` in both `state.ts` files. In `updateSiphoning()` (both logic files), when fuel crosses below 10% for the first time, set `car.lowFuelWarned = true`, show `setPrompt()` to the local Хозяин player, play `alarm_button` SFX. One-shot per car per match.

**Note:** `alarm_start` is not a valid SoundName — use `alarm_button` for warning SFX.
