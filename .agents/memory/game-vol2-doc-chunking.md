---
name: Volume II design doc chunking
description: Where the 1902-line Volume II design bible lives and how progress is tracked across cold starts
---

The Volume II design doc (Production Specs, Implementation & Operations, sections 18-28) is too large to read in one pass (~25k token limit). It has been split into `docs/vol2/18-*.md` … `docs/vol2/28-*.md`, one file per section, committed to the repo (not `attached_assets`, which gets cleared/renamed on re-upload).

`docs/vol2/PROGRESS.md` is the index — always read it first in a new session before touching Volume II work. It records per-section status (done/partial/not-started) against the actual codebase and lists suggested next gaps, so a cold-start import doesn't need to re-derive what's already implemented.

**Why:** Volume I's task mini-games, AI behavior trees, and server/WS architecture (sections 18-20) turned out to already be implemented during Volume I work under different names/schemas than the doc's illustrative code — the tracker exists to avoid re-implementing or confusing "spec text" with "gap."

**How to apply:** Any time a new session picks up "Volume II" work, read `docs/vol2/PROGRESS.md` first, update its status table and "last updated" line when a section's status changes, and only open the specific chunk file(s) needed for the current gap.
