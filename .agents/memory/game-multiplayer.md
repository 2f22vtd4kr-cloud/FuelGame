---
name: 95-Y Multiplayer Architecture
description: Online multiplayer design — server-authoritative WS protocol, room management, tickGameMulti design
---

## Architecture

- **Transport**: `ws` library, `noServer: true`, attached to HTTP server `upgrade` event at `/api/ws`
- **URL (client)**: `wss://${location.host}/api/ws` — Replit proxy routes `/api` to api-server port 8080
- **Room code**: 4-char alphanumeric (unambiguous charset), stored in `Map<string, GameRoom>` in `wsHandler.ts`
- **Authority**: server runs `tickGameMulti` at 60fps; broadcasts full `GameState` JSON at 20Hz; clients send `InputState` each frame

## tickGameMulti design (critical)

Three-phase per tick to avoid N× timer bugs:
1. **Movement phase**: `updateHumanPlayer(dt, input)` per player (safe — no shared timer side-effects)
2. **Interaction phase**: `updateInteractions(dt, input)` per player (edge-triggered events — body reports, meeting calls, siphon start)
3. **Shared world phase (once)**: `updateMiniGame(dt, NOOP_INPUT)`, `updateSabotages(dt, NOOP_INPUT)`, `updateBots`, `updateSiphoning`, `updateImmunity`, `updatePrompt`, `updateTicker`, `updateEmotes`, `checkWinConditions`

**Why**: Running updateMiniGame/updateSabotages per player causes N× timer speed-up. Mini-game tap events arrive via `room.handleAction → onMiniGameTap()` separately, not through the input loop.

## Per-room state isolation

`setGs(this.state)` is called before each tick to point the module singleton at this room's state. Node.js is single-threaded so no interleaving risk. `this.state = gs` saves back after tick.

## Key file locations

- Server: `artifacts/api-server/src/game/wsHandler.ts` — WS upgrade, room registry, message routing
- Server: `artifacts/api-server/src/game/room.ts` — GameRoom class (tick, addClient, removeClient, handleAction)
- Server: `artifacts/api-server/src/game/logic.ts` — tickGameMulti appended at end
- Server: `artifacts/api-server/src/game/state.ts` — setGs(), startGameMultiplayer(), makePlayer()
- Client: `artifacts/game/src/game/network.ts` — GameNetwork class (WS client, sendInput, applyLatestState)
- Client: `artifacts/game/src/game/gameActions.ts` — proxy layer; calls WS in multi, logic directly in single
- Client: `artifacts/game/src/components/MultiplayerLobby.tsx` — create/join UI + waiting room

## Protocol messages

Client→Server: `create | join | start | input | vote | action`
Server→Client: `room_created | room_joined | lobby_update | game_started | state | player_disconnected | host_changed | error`

## Disconnect handling

- `removeClient`: removes from clients map + inputs map
- If game started: sets `p.isAlive = false`, `p.isHuman = false` on disconnected player in gs
- If in lobby and host disconnects: reassigns hostPlayerId to next client, broadcasts `host_changed`

## Input validation (security)

`wsHandler.ts` sanitizes all ingress before use:
- `character`: validated against VALID_CHARACTERS set (10 known keys), defaults to 'denis'
- `numPlayers`: clamped to [2, 10]
- `numSlivshchiki`: clamped to [1, floor((numPlayers-1)/2)]
- `playerName`: sliced to 20 chars, trimmed, defaults to 'Игрок'
- `roomCode`: uppercased + sliced to 4 chars

## Known limitations (first version)

- Meeting quick-chat/emotes not synchronized to other clients (overwritten by next state broadcast)
- Sabotage fix interactions that bypass `updateInteractions` may not work in multiplayer (uses NOOP_INPUT in shared phase)
- Mini-game visual feedback is local-optimistic; server applies logic via handleAction
