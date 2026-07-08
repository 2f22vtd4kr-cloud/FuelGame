---
name: Import setup quirks
description: Non-obvious things to check after re-importing this project (95-Й Бакстаб) from GitHub.
---

- After import, all workflows fail until `pnpm install` is run at the workspace root (node_modules is not committed).
- The artifact system auto-creates an `artifacts/api-server: API Server` workflow (port 8080) that duplicates the pre-existing `artifacts/api-server: dev` workflow (port 3001). It cannot be removed via `removeWorkflow` ("managed by an artifact") — just restart it alongside the others; it's harmless, just redundant.
- `REDIS_URL` is optional: without it the api-server logs a warning and disables room persistence / daily leaderboard, but still starts fine.
