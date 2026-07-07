---
name: Redis room persistence + daily leaderboard
description: How Redis-backed room state and daily leaderboard are wired into the api-server.
---

# Redis room persistence + daily leaderboard

## Rules

1. **Room persistence uses `ioredis`** — client in `artifacts/api-server/src/lib/redis.ts`; uses a Promise-based connect with a 10s hard timeout so it never blocks HTTP startup. `REDIS_URL` env var required; server degrades gracefully if absent/unreachable.

2. **Room serialization** — `artifacts/api-server/src/game/roomStore.ts`. Key `room:{code}`, TTL 2h. Serialises only non-WS parts (game state, playerMeta, settings). Called from `room.persist()` on addClient/removeClient/startGame and every 5s during active game.

3. **Restore on startup** — `restoreRoomsFromRedis()` in `wsHandler.ts` runs before HTTP listen. Creates `GameRoom.fromPersisted()` stubs (no WS clients, game loops NOT started).

4. **Game loops resume on first reconnect** — `resumeGameLoopsIfNeeded()` in `room.ts` is called from `addClient()`. Idempotent (checks if tickInterval is null). This is the correct pattern — don't start loops on restore, only when a real client reconnects.

5. **Reconnect race fix** — `removeClient(playerId, ws?)` takes an optional `ws` parameter. If the registered WS for that playerId has already been replaced by a reconnect, the old close-handler is a no-op. Always pass `ws` from the WS close handler in `wsHandler.ts`.

6. **Reconnect security** — `room.knownPlayerIds: Set<string>` tracks all playerIds that have ever been in the room. Populated from `playerMeta` on restore, and from `addClient`. The `reconnect` WS message handler validates the requested playerId against this set before allowing re-entry.

7. **Daily leaderboard** — routes in `artifacts/api-server/src/routes/leaderboard-daily.ts`. GET `/api/leaderboard/daily?date=YYYY-MM-DD`, POST `/api/leaderboard/daily`. Uses existing `daily_leaderboard` Postgres table (already in schema). Write uses `db.transaction()` with `FOR UPDATE` row-lock to be atomic.

8. **Transaction type annotation** — use `type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]` to annotate the transaction callback parameter without importing drizzle internals.

**Why:** Redis persistence prevents total game loss on server restart. Lazy loop-resume keeps idle restored rooms at zero CPU. Row-locking prevents lost score increments under concurrent requests.

**How to apply:**
- If Redis URL is Upstash or TLS-only, prefix must be `rediss://` not `redis://`
- `daily_leaderboard` table has no unique constraint on (userId, date) — the transaction + SELECT FOR UPDATE provides the serialization guarantee instead
- `knownPlayerIds` is populated from Redis `playerMeta` on restore, so reconnect validation survives server restarts
