# Volume II — Implementation Progress Tracker

Source: `attached_assets/GAME_DOC_2_*.md` (1902 lines), permanently chunked into
`docs/vol2/18-*.md` … `docs/vol2/28-*.md` (one file per section) so future
cold-start imports never need to re-read the original 1902-line upload.

**How to resume in a new session:** read this file first. It tells you which
sections are done, which are gaps, and which are reference-only (no code
required). Then open only the chunk file(s) relevant to the next gap.

| # | Section | Chunk file | Status | Notes |
|---|---------|-----------|--------|-------|
| 18 | Task mini-game specs (20 tasks) | `18-task-minigames.md` | ✅ Done (built during Vol 1) | All 20 tasks exist in `data/tasks.ts` + `components/TaskMiniGame.tsx` with matching mechanics (tap-timing, rapid-tap, sequence, dial, wire-drag, dog-walk, flower-match, drunk-calm, taxi-order, letter). |
| 19 | AI behavior trees (Сливщик/Хозяин/Meeting) | `19-ai-behavior-trees.md` | ✅ Done (built during Vol 1) | Priority-based decision logic + suspicion vector + meeting/vote AI live in `game/botAI.ts`. Character voice-line banks (200 lines/10 chars) exist in `data/characters.ts`. |
| 20 | Server implementation (rooms, WS protocol, DB schema) | `20-server-implementation.md` | ✅ Mostly done | `artifacts/api-server` has WS room manager (`wsHandler.ts`), msgpack protocol, Redis persistence, Postgres-backed leaderboard/profile routes. Doc's exact schema names are illustrative, not literal — current schema is intentionally different (see `redis-persistence.md`, `game-leaderboard-shop.md` memory). |
| 21 | Art asset manifest (sprites/atlases/tilemap) | `21-art-asset-manifest.md` | 🟡 Partial | 10 character + 6 car sprites exist (`public/sprites/`, `game-sprite-art.md` memory). No texture atlases or Tiled tilemap — current renderer draws map procedurally from `data/map.ts`, not a tile grid. Low priority unless perf becomes an issue. |
| 22 | Audio asset manifest | `22-audio-asset-manifest.md` | 🟡 Partial | Music system + 12+ SFX implemented via Web Audio API (`game/audio.ts`, `game-audio-sprint.md` memory), synthesized rather than MP3 file-based as the doc assumes. Functionally equivalent. |
| 23 | Marketing copy (bot description, channel posts, ads) | `23-marketing-copy.md` | ⬜ Not started | Content/ops only, no code. Use verbatim when setting up the Telegram bot listing. |
| 24 | Community management playbook | `24-community-management.md` | ⬜ Not started | Ops process, not code. Reference when the game has real players. |
| 25 | Analytics & metrics | `25-analytics-metrics.md` | ⬜ Not started | No analytics events are currently tracked in the client or server. Would need an events pipeline (self-hosted Plausible or similar) — real gap if analytics is prioritized. |
| 26 | Legal & compliance (ToS, Privacy Policy, satire disclaimer) | `26-legal-compliance.md` | ⬜ Not started | Copy is ready to paste into in-game screens/routes whenever needed. |
| 27 | Post-launch roadmap (Seasons 2-4) | `27-post-launch-roadmap.md` | ⬜ Future work | Not in scope until Season 1 ships. |
| 28 | Closing remarks | `28-final-word.md` | 📖 Reference only | No action needed. |

## Suggested next gaps to tackle (in order)
1. **Analytics events (§25)** — no tracking exists yet; needed before any real
   marketing push (§23-24) makes sense to measure.
2. **Legal pages (§26)** — quick win, paste ToS/Privacy/satire disclaimer into
   a settings/credits screen.
3. **Art/audio polish (§21-22)** — only if visual/audio fidelity becomes a
   priority; current procedural approach works fine for now.
4. **Marketing & community ops (§23-24)** — activate at actual launch time,
   not before.

## Last updated
2026-07-08 — initial chunking + gap assessment after Volume I completion.
