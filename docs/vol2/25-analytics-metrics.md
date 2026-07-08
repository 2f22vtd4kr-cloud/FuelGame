## SECTION 25: ANALYTICS & METRICS  
  
### 25.1 — Events Tracked  
  
All events are sent to a self-hosted Plausible Analytics instance (privacy-friendly, no cookies).  
  
**Player Journey Events:**  
- `bot_start` — Player started the bot.  
- `game_open` — Player opened the game (Mini App launched).  
- `tutorial_start` — Player started the tutorial.  
- `tutorial_complete` — Player finished the tutorial.  
- `match_start` — Player started a match (single or multi).  
- `match_complete` — Player finished a match.  
- `match_abandon` — Player left mid-match.  
  
**Gameplay Events:**  
- `task_complete` — Player completed a task (with task_id).  
- `siphon_start` — Player started siphoning.  
- `siphon_complete` — Player finished siphoning.  
- `ambush` — Player ambushed someone.  
- `meeting_called` — Сходка called (with reason).  
- `vote_cast` — Vote cast (with target, correct/incorrect).  
- `sabotage_triggered` — Sabotage triggered (with type).  
- `ejection` — Player ejected (with role, correct/incorrect).  
  
**Monetization Events:**  
- `shop_open` — Player opened the shop.  
- `purchase_intent` — Player tapped "Buy" on an item.  
- `purchase_complete` — Purchase completed (with item, price, currency).  
- `battle_pass_purchased` — Player bought Battle Pass Premium.  
- `fuel_bot_cta_click` — Player clicked the fuel ticket CTA.  
- `fuel_bot_linked` — Player linked their fuel bot account.  
  
**Retention Events:**  
- `d1_return` — Player returned on day 1.  
- `d7_return` — Player returned on day 7.  
- `share` — Player shared a result card or Бакстаб Момент.  
  
### 25.2 — Dashboard (Internal)  
  
A simple admin page (protected by admin secret) at `/admin` shows:  
  
- **Today:** DAU, matches played, new users, revenue.  
- **Retention:** D1, D7, D30 (rolling).  
- **Funnel:** bot_start → game_open → tutorial_complete → match_start → match_complete → share.  
- **Balance:** Win rate by role, average match duration, eject accuracy.  
- **Top 5 crashes:** From Sentry.  
- **Top 5 requested features:** From feedback spreadsheet.  
  
### 25.3 — A/B Testing  
  
For launch, no A/B testing (we're too small). But we prepare the infrastructure:  
  
```typescript  
// Feature flag system  
function getFeatureFlag(userId: bigint, flag: string): boolean {  
  // Hash userId + flag name, mod 100, < percentage  
  const hash = simpleHash(`${userId}:${flag}`);  
  return hash % 100 < (flagConfig[flag]?.percentage || 0);  
}  
```  
  
Future A/B tests:  
- Tutorial: skip vs. mandatory.  
- Сливщик count: 1 vs. 2 (in 6-player lobbies).  
- CTA placement: end-game vs. mid-game.  
- Fuel ticket CTA text: humorous vs. direct.  
  
---  
  
