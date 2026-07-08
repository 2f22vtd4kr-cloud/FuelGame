## SECTION 19: AI BEHAVIOR TREES (FULL PSEUDOCODE)  
  
### 19.1 — AI Architecture Overview  
  
Each AI bot is driven by a behavior tree evaluated every 0.5 seconds. The tree returns an `Action` that the bot executes over the next 0.5 seconds (or until interrupted by a higher-priority event).  
  
**Action Types:**  
```typescript  
type Action =   
  | { type: 'move_to'; target: Vec2; speed: number }  
  | { type: 'interact'; target: string; action: string }  
  | { type: 'siphon'; car: string }  
  | { type: 'ambush'; target: string }  
  | { type: 'sabotage'; sabotage: string }  
  | { type: 'fake_task'; task: string }  
  | { type: 'follow'; target: string; duration: number }  
  | { type: 'flee'; from: Vec2 }  
  | { type: 'wait'; duration: number }  
  | { type: 'wander' };  
```  
  
### 19.2 — Сливщик AI (Full Pseudocode)  
  
```  
FUNCTION Сливщик_Tick(bot, world):  
  // Priority 1: If сходка is active, switch to meeting behavior  
  IF world.phase == 'meeting':  
    RETURN Meeting_Tick(bot, world)  
    
  // Priority 2: If being witnessed siphoning, abort and flee  
  IF bot.isSiphoning AND isWitnessed(bot, world):  
    ABORT_Siphon(bot)  
    RETURN { type: 'flee', from: bot.siphonCar.pos }  
    
  // Priority 3: If a Хозяин is alone and within 8m, consider ambush  
  alone_targets = filter(world.players, p =>   
    p.alive AND p.role == 'owner' AND   
    distance(bot.pos, p.pos) < 8 AND  
    nearestOtherPlayer(p, world) > 12  
  )  
  IF len(alone_targets) > 0 AND bot.ambushCooldown <= 0:  
    IF random() < ambushChance(difficulty):  
      target = nearest(alone_targets, bot)  
      RETURN { type: 'ambush', target: target.id }  
    
  // Priority 4: If a car is available and no witnesses, siphon  
  IF bot.siphonCooldown <= 0:  
    available_cars = filter(world.cars, c =>  
      c.fuel > 10 AND NOT c.locked AND  
      NOT isWitnessed(bot, world, c.pos)  
    )  
    IF len(available_cars) > 0:  
      IF random() < siphonChance(difficulty):  
        car = highestFuel(available_cars)  
        RETURN { type: 'siphon', car: car.id }  
    
  // Priority 5: If sabotage available, consider it  
  IF bot.sabotageCooldown <= 0 AND random() < sabotageChance(difficulty):  
    RETURN { type: 'sabotage', sabotage: pickSabotage(world) }  
    
  // Priority 6: If being observed, fake a task  
  IF isObserved(bot, world):  
    nearest_task = nearestTask(bot, world)  
    RETURN { type: 'fake_task', task: nearest_task.id }  
    
  // Priority 7: Dispose of canister if carrying one  
  IF bot.carryingCanister:  
    RETURN { type: 'move_to', target: dumpsters.pos, speed: 'walk' }  
    // On arrival, drop canister  
    
  // Priority 8: Default — wander to a task terminal and fake it  
  task = nearestIncompleteTask(bot, world)  
  IF task:  
    RETURN { type: 'move_to', target: task.pos, speed: 'walk' }  
    // On arrival, fake_task  
    
  RETURN { type: 'wander' }  
  
// Helper functions  
FUNCTION isWitnessed(bot, world, pos = bot.pos):  
  FOR each player p in world.players:  
    IF p.alive AND p.role == 'owner':  
      IF canSee(p, pos) AND distance(p.pos, pos) < 12:  
        RETURN true  
  RETURN false  
  
FUNCTION ambushChance(diff):  
  RETURN { easy: 0.20, medium: 0.30, hard: 0.50, nightmare: 0.70 }[diff]  
  
FUNCTION siphonChance(diff):  
  RETURN { easy: 0.70, medium: 0.85, hard: 0.95, nightmare: 1.00 }[diff]  
  
FUNCTION sabotageChance(diff):  
  RETURN { easy: 0.00, medium: 0.50, hard: 0.80, nightmare: 1.00 }[diff]  
  
FUNCTION pickSabotage(world):  
  // Prefer "ЖК Чат Офлайн" if a siphon is planned  
  // Prefer "Pipe burst" if Unity Meter > 80% (critical)  
  // Prefer "Grandma Cerberus" if сходка might be called soon  
  IF world.unityMeter > 80:  
    RETURN 'pipe_burst'  
  ELIF random() < 0.4:  
    RETURN 'chat_offline'  
  ELIF random() < 0.5:  
    RETURN 'grandma_cerberus'  
  ELSE:  
    RETURN 'alarm_chaos'  
```  
  
### 19.3 — Хозяин AI (Full Pseudocode)  
  
```  
FUNCTION Хозяин_Tick(bot, world):  
  // Priority 1: Сходка  
  IF world.phase == 'meeting':  
    RETURN Meeting_Tick(bot, world)  
    
  // Priority 2: Witnessed a siphon — report immediately  
  IF bot.witnessedSiphon:  
    bot.witnessedSiphon = false  
    RETURN { type: 'move_to', target: alarmButton.pos, speed: 'sprint' }  
    // On arrival, call meeting  
    
  // Priority 3: Found a body — report  
  IF bot.foundBody:  
    bot.foundBody = false  
    RETURN { type: 'interact', target: body.id, action: 'report' }  
    
  // Priority 4: Found a drained car — report  
  IF bot.foundDrainedCar:  
    bot.foundDrainedCar = false  
    RETURN { type: 'move_to', target: alarmButton.pos, speed: 'sprint' }  
    
  // Priority 5: Suspicious player nearby — follow them  
  suspicious = getSuspiciousPlayers(bot, world)  
  IF len(suspicious) > 0 AND random() < 0.40:  
    target = nearest(suspicious, bot)  
    RETURN { type: 'follow', target: target.id, duration: 5.0 }  
    
  // Priority 6: Complete a task  
  IF bot.assignedTasks.length > 0:  
    task = nearestIncompleteTask(bot, world)  
    IF task:  
      RETURN { type: 'move_to', target: task.pos, speed: 'walk' }  
      // On arrival, interact with task  
    
  // Priority 7: Default — wander  
  RETURN { type: 'wander' }  
  
FUNCTION getSuspiciousPlayers(bot, world):  
  // Check suspicion vector for each player  
  suspects = []  
  FOR each player p in world.players:  
    IF p.alive AND p.id != bot.id:  
      IF bot.suspicion[p.id] > 0.3:  
        suspects.push({ player: p, level: bot.suspicion[p.id] })  
  RETURN suspects.sort((a, b) => b.level - a.level)  
```  
  
### 19.4 — Suspicion Update System  
  
```  
FUNCTION updateSuspicion(bot, world, dt):  
  FOR each player p in world.players:  
    IF p.id == bot.id: CONTINUE  
      
    // Saw player near a drained car  
    IF canSee(bot, p.pos) AND distanceToNearestDrainedCar(p) < 3:  
      bot.suspicion[p.id] += 0.1 * dt  
      
    // Saw player "siphoning" (caught in the act)  
    IF p.isSiphoning AND canSee(bot, p.pos):  
      bot.suspicion[p.id] += 0.5  // instant spike  
      bot.witnessedSiphon = true  
      
    // Saw player sprinting for >3 seconds  
    IF p.isSprinting AND canSee(bot, p.pos):  
      bot.sprintTimer[p.id] = (bot.sprintTimer[p.id] || 0) + dt  
      IF bot.sprintTimer[p.id] > 3:  
        bot.suspicion[p.id] += 0.05  
        bot.sprintTimer[p.id] = 0  
      
    // Saw player skip a task terminal (stood near it but didn't interact)  
    IF canSee(bot, p.pos) AND isNearTaskTerminal(p) AND NOT p.isInteracting:  
      bot.skipTimer[p.id] = (bot.skipTimer[p.id] || 0) + dt  
      IF bot.skipTimer[p.id] > 5:  
        bot.suspicion[p.id] += 0.05  
        bot.skipTimer[p.id] = 0  
      
    // Positive: player completed a task near me  
    IF p.justCompletedTask AND distance(bot.pos, p.pos) < 5:  
      bot.suspicion[p.id] -= 0.1  
      
    // Satire: ageism bias — Дядя Серёжа is less suspicious  
    IF p.character == 'sergey':  
      bot.suspicion[p.id] = max(0, bot.suspicion[p.id] - 0.02 * dt)  
      
    // Clamp  
    bot.suspicion[p.id] = clamp(bot.suspicion[p.id], 0, 1)  
```  
  
### 19.5 — Meeting AI (Full Pseudocode)  
  
```  
FUNCTION Meeting_Tick(bot, world):  
  // AI says 1-3 phrases during discussion (60 seconds)  
  IF bot.meetingPhrasesSaid < 3 AND random() < 0.3:  
    phrase = pickMeetingPhrase(bot, world)  
    sendChat(bot, phrase)  
    bot.meetingPhrasesSaid++  
    RETURN { type: 'wait', duration: random(5, 15) }  
    
  // On voting phase  
  IF world.meetingPhase == 'voting':  
    target = decideVote(bot, world)  
    RETURN { type: 'vote', target: target }  
    
  RETURN { type: 'wait', duration: 1.0 }  
  
FUNCTION pickMeetingPhrase(bot, world):  
  IF bot.role == 'drainer':  
    // Deflect: accuse the most-suspected innocent  
    suspects = filter(world.players, p =>   
      p.alive AND p.id != bot.id AND p.role != 'drainer'  
    )  
    IF len(suspects) > 0:  
      target = suspects.sort((a, b) =>   
        world.suspicionGlobal[b.id] - world.suspicionGlobal[a.id]  
      )[0]  
      RETURN pickFromCharacter(bot.character, 'accuse', target)  
    ELSE:  
      RETURN pickFromCharacter(bot.character, 'defend_self')  
    
  ELIF bot.role == 'owner':  
    // Report witnesses, accuse based on suspicion  
    IF bot.witnessedSiphon:  
      RETURN pickFromCharacter(bot.character, 'report_witness')  
    suspects = getSuspiciousPlayers(bot, world)  
    IF len(suspects) > 0:  
      RETURN pickFromCharacter(bot.character, 'accuse', suspects[0])  
    ELSE:  
      RETURN pickFromCharacter(bot.character, 'no_info')  
    
  RETURN pickFromCharacter(bot.character, 'generic')  
  
FUNCTION decideVote(bot, world):  
  IF bot.role == 'drainer':  
    // Vote for the most-suspected innocent (to eliminate a Хозяин)  
    innocents = filter(world.players, p =>  
      p.alive AND p.id != bot.id AND p.role != 'drainer'  
    )  
    IF len(innocents) > 0:  
      RETURN innocents.sort((a, b) =>  
        world.suspicionGlobal[b.id] - world.suspicionGlobal[a.id]  
      )[0].id  
    RETURN null  // skip  
    
  ELIF bot.role == 'owner':  
    suspects = getSuspiciousPlayers(bot, world)  
    IF len(suspects) > 0 AND suspects[0].level > 0.3:  
      RETURN suspects[0].player.id  
    RETURN null  // skip  
```  
  
### 19.6 — Character Voice Line Banks  
  
Each character has 20 voice lines organized by context:  
  
**Денис (Таксист) — Voice Line Bank:**  
```  
accuse: [  
  "Я видел его у моей тачки! Смена горит, а он бак резервирует!",  
  "Это он! Я по глазам вижу. Я 12 часов в день людей смотрю.",  
  "Братан, ты слил с моей Весты. Я точно знаю."  
],  
defend_self: [  
  "Я был на смене! Спросите у Яндекс GO!",  
  "Смена горит, я на заказе был. Какие талоны?",  
  "Я в жизни не сифонил. У меня рейтинг 4.97."  
],  
report_witness: [  
  "Вижу сифон! Сектор 4! Точно вижу!",  
  "Гляньте, кто-то у бака копошится! Не моё авто!",  
  "Сливают! Точно сливают! Я глазами вижу!"  
],  
no_info: [  
  "Не видел ничего. На телефоне был.",  
  "Я между заказами. Некогда смотреть.",  
  "Шаверму покупал. Ничего не знаю."  
],  
generic: [  
  "Смена горит.",  
  "Яндекс жмёт по 25%.",  
  "Соляра опять дороже.",  
  "У меня рейтинг 4.97."  
]  
```  
  
(Similar banks for Аня, Вова, Серёжа, Петрович, Марина, Ахмет, Олег, Лена — each with 20 lines. Total: 200 voice lines across 10 characters.)  
  
