---
name: 95-Y main menu redesign
description: Status of the Canvas-driven main menu redesign — chosen style, what's graduated vs. still mockup-only
---

The user chose the "Propaganda Pop" (Soviet-retro poster) direction out of 3 Canvas mockup variants
(Noir Courtyard, Propaganda Pop, Modern Arcade) for the game's main menu / lobby screen.

**As of 2026-07-08, this is approved but NOT graduated.** The real app
(`artifacts/game/src/components/Lobby.tsx`) still runs the original plain-dark UI. The chosen design
only exists in the mockup sandbox (`artifacts/mockup-sandbox/src/components/mockups/main-menu/Propaganda.tsx`
+ `Propaganda.css`).

Full style guide (palette, typography, signature CSS effects, layout rules) is written to
`docs/design/main-menu-style-guide.md` — read that before touching Lobby.tsx or doing any new
Canvas design work on this game, so new screens stay visually consistent with the approved direction.

**Why a style guide file instead of just the mockup code:** mockup sandbox files are prototyping
scratch space, not guaranteed to survive cleanup; the durable style decision needed to live in
`docs/` so a future session (or a fresh Canvas run) can rebuild the same visual system without
re-deriving it from scratch or re-asking the user to pick a direction.

**How to apply:** When the user asks to graduate/integrate the main menu design, or to redesign any
other screen (Shop, Leaderboard, Meeting, etc.) in this game, use the style guide's tokens and CSS
patterns as the baseline direction rather than inventing a new visual language.

**Round 2 (2026-07-08):** user asked for 3 further variations built on the approved Propaganda Pop DNA
(`PropagandaConstructivist.tsx`, `PropagandaBroadsheet.tsx`, `PropagandaCinema.tsx`, all in the same
mockup-sandbox dir). User picked **Constructivist Kino-Plakat** as the favorite and asked for a
"perfection" polish pass. Found and fixed a data-modeling trap in the shared character roster content
(`CHARACTERS` object copy-pasted across these variant files): labeling the tiny roster-grid cells via
`name.split(' ')[0]` breaks for two-word names where the first word is a title/honorific, not the name
itself (e.g. "Дядя Серёжа" → "Дядя"). Also several `description`/`voiceLines[0]` pairs were near-duplicate
text shown twice in the same dossier card. Fixed in Constructivist only (per user scope) by adding an
explicit `shortName` field per character and rewriting duplicate description/voiceline pairs — the other
two variant files likely still carry the same latent bug if/when they're picked instead.
