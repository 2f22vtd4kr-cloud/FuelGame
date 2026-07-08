# GAME DOC 2  
  
# 📋 95-Й — GAME DESIGN & ARCHITECTURE BIBLE  
## Volume II: Production Specs, Implementation & Operations  
### Internal Document — Confidential — v2.0  
  
---  
  
## SECTION 18: TASK MINI-GAME SPECIFICATIONS (COMPLETE)  
  
Each task is specified to implementation-ready detail: input model, state machine, completion logic, failure states, visual layout, audio cues, and satirical flavor text.  
  
### 18.1 — Task Framework Architecture  
  
All 20 tasks share a common framework:  
  
```typescript  
interface Task {  
  id: string;                    // 'shawarma', 'grandma', etc.  
  name: string;                  // "Купить шаверму"  
  location: { x: number; y: number };  
  radius: number;                // interaction radius, default 1.5m  
  baseDuration: number;          // estimated seconds  
  difficulty: 'trivial' | 'easy' | 'medium';  
  // Called when player taps the prompt. Opens the mini-game overlay.  
  onStart(player: Player): MiniGameState;  
  // Called every frame while mini-game is open. Returns true when complete.  
  onUpdate(dt: number, input: InputState, state: MiniGameState): TaskResult;  
  // Called on completion. Awards XP, updates Unity Meter.  
  onComplete(player: Player): void;  
  // Called on cancel (player moves away or taps X).  
  onCancel(state: MiniGameState): void;  
  // Render the mini-game overlay on the 2D canvas.  
  render(ctx: CanvasRenderingContext2D, state: MiniGameState): void;  
}  
  
type TaskResult =   
  | { status: 'ongoing' }  
  | { status: 'complete' }  
  | { status: 'failed'; reason: string };  
```  
  
**Common UX rules across all tasks:**  
- Mini-game opens as a semi-transparent overlay (60% opacity dark backdrop) centered on screen.  
- A small "X" close button appears top-right after 1 second (prevents accidental dismissal).  
- Progress bar at the top of the overlay.  
- "Cancel" text at bottom: "Уйти" — tap to abort.  
- On completion: green flash, "ka-ching" sound, +1 to Unity Meter progress visible.  
- On failure: red flash, "aww" sound, mini-game resets to start (not closed).  
- Сливщики see identical UI. Their `onComplete` is a no-op (Unity Meter unchanged), but the animation plays.  
  
### 18.2 — Task 01: "Купить шаверму" (Buy Shawarma)  
  
**Location:** Shawarma Stand (-22, -12).  
**Duration:** ~5 seconds.  
**Difficulty:** Trivial.  
  
**Mini-game Layout (top-down view of the shawarma stand counter):**  
  
```  
┌────────────────────────────────┐  
│  ШАВЕРМА — 180₽        [X]     │  
│  ████████░░░░░░░  53%          │  
│                                │  
│       ┌──────────────┐         │  
│       │   ▓▓▓▓▓▓▓▓   │         │  ← vertical bar, marker moves up/down  
│       │   ▓▓▓▓▓▓▓▓   │         │  
│       │   ▓▓[████]▓▓ │         │  ← green zone (center 20%)  
│       │   ▓▓▓▓▓▓▓▓   │         │  
│       │   ▓▓▓▓▓▓▓▓   │         │  
│       └──────────────┘         │  
│                                │  
│       [  ТАП  ]                │  ← tap when marker is in green  
│                                │  
│  Очередь: 2/3                  │  
│  "Остренький?"                 │  
│         Уйти                   │  
└────────────────────────────────┘  
```  
  
**State Machine:**  
```typescript  
interface ShawarmaState {  
  markerY: number;       // 0 to 1, position in bar  
  markerDir: number;     // 1 (down) or -1 (up)  
  markerSpeed: number;   // 0.8 (units per second)  
  greenZone: { start: number; end: number };  // {0.4, 0.6}  
  hits: number;          // 0 to 3 (need 3 to complete)  
  cooldown: number;      // 0.3s after each tap (prevent double-tap)  
  queuePosition: number; // 1, 2, 3 (cosmetic — "you're 2nd in line")  
}  
  
function onStart(player): MiniGameState {  
  return {  
    markerY: 0,  
    markerDir: 1,  
    markerSpeed: 0.8,  
    greenZone: { start: 0.4, end: 0.6 },  
    hits: 0,  
    cooldown: 0,  
    queuePosition: 1 + Math.floor(Math.random() * 3),  
  };  
}  
  
function onUpdate(dt, input, state): TaskResult {  
  // Move marker  
  state.markerY += state.markerDir * state.markerSpeed * dt;  
  if (state.markerY >= 1) { state.markerY = 1; state.markerDir = -1; }  
  if (state.markerY <= 0) { state.markerY = 0; state.markerDir = 1; }  
    
  // Cooldown  
  if (state.cooldown > 0) state.cooldown -= dt;  
    
  // Check tap  
  if (input.tapped && state.cooldown <= 0) {  
    if (state.markerY >= state.greenZone.start && state.markerY <= state.greenZone.end) {  
      state.hits++;  
      state.cooldown = 0.3;  
      playSound('task_hit');  
      if (state.hits >= 3) return { status: 'complete' };  
    } else {  
      state.cooldown = 0.3;  
      playSound('task_miss');  
      // Marker speeds up slightly (punishment)  
      state.markerSpeed = Math.min(1.5, state.markerSpeed + 0.05);  
    }  
  }  
    
  return { status: 'ongoing' };  
}  
```  
  
**Flavor text variants (shown randomly on start):**  
- "Шаверма — 180₽. С остреньким?"  
- "Шаверма — 200₽. Без острого."  
- "Шаверма — 170₽. Соус чесночный?"  
- "Очередь: 3 человека. Шавермщик на телефоне."  
  
**Completion text:** "Шаверма готова. Приятного."  
**Failure text:** "Слишком поздно, шаверма остыла. Заново."  
  
---  
  
### 18.3 — Task 02: "Перевести бабушку" (Escort Grandma)  
  
**Location:** Benches (12, 20).  
**Duration:** ~10 seconds.  
**Difficulty:** Easy.  
  
**Mechanic:** A babushka NPC spawns at the bench. The player taps to take her hand. The player must walk to the Entrance Arch (15 meters north). The babushka follows at 1.5 m/s (slower than the player's 3.5 m/s). If the player moves more than 3 meters away from the babushka, she stops and complains. The player must return to her to resume.  
  
**State Machine:**  
```typescript  
interface GrandmaState {  
  phase: 'offer' | 'walking' | 'talking' | 'done';  
  grandma: { x: number; y: number };  
  destination: { x: number; y: number };  // Entrance Arch (0, -22)  
  distanceFromPlayer: number;  
  talkTimer: number;  // 0 to 3 seconds (talking at destination)  
  complaintLine: string;  
}  
  
function onUpdate(dt, input, state): TaskResult {  
  const player = getPlayer();  
  state.distanceFromPlayer = distance(player.pos, state.grandma);  
    
  switch (state.phase) {  
    case 'offer':  
      // Wait for player to tap  
      if (input.tapped) {  
        state.phase = 'walking';  
        playSound('grandma_escort');  
      }  
      break;  
        
    case 'walking':  
      // Grandma follows player, capped at 1.5 m/s  
      const dir = normalize(subtract(player.pos, state.grandma));  
      const moveDist = Math.min(1.5 * dt, state.distanceFromPlayer - 1.0);  
      if (state.distanceFromPlayer > 1.5) {  
        state.grandma = add(state.grandma, multiply(dir, moveDist));  
      }  
        
      // Check if player ran away  
      if (state.distanceFromPlayer > 4.0) {  
        state.phase = 'talking';  
        state.talkTimer = 1.5;  
        state.complaintLine = pick([  
          "Ты куда убежал?! Я тут одна стоять буду?",  
          "Молодёжь пошла, никакого уважения!",  
          "Подожди бабушку, торопишься так!",  
        ]);  
        showToast(state.complaintLine);  
      }  
        
      // Check if reached destination  
      if (distance(state.grandma, state.destination) < 2.0) {  
        state.phase = 'talking';  
        state.talkTimer = 3.0;  
        showToast(pick([  
          "Спасибо, внучек. Дай бог здоровья.",  
          "А ты хороший мальчик. Не то что мой внук.",  
          "Вот тебе конфетка. (даёт «Коровку»)",  
        ]));  
      }  
      break;  
        
    case 'talking':  
      state.talkTimer -= dt;  
      if (state.talkTimer <= 0) {  
        if (distance(state.grandma, state.destination) < 2.0) {  
          return { status: 'complete' };  
        } else {  
          state.phase = 'walking';  
        }  
      }  
      break;  
  }  
    
  return { status: 'ongoing' };  
}  
```  
  
**Render:** No overlay. The mini-game happens in the world (babushka NPC follows the player). A small UI element at the top shows: "Бабушка следует за вами. Доведите до входа."  
  
---  
  
### 18.4 — Task 03: "Починить турникет" (Fix the Turnstile)  
  
**Location:** Playground entrance (-20, 8).  
**Duration:** ~6 seconds.  
**Difficulty:** Easy.  
  
**Mini-game Layout:**  
```  
┌────────────────────────────────┐  
│  ПОЧИНИТЬ ТУРНИКЕТ      [X]     │  
│  ██████░░░░░░░░░░░  33%        │  
│                                │  
│  Провода:                      │  
│  🔴 ─────    ───── 🔴          │  
│  🔵 ─────    ───── 🔵          │  ← drag from left to matching right  
│  🟢 ─────    ───── 🟢          │  
│                                │  
│  Соединений: 1/3               │  
│  "Кто-то опять спёр медь."     │  
│         Уйти                   │  
└────────────────────────────────┘  
```  
  
**Mechanic:** Three colored wires on the left, three sockets on the right (shuffled order). Player drags from a left wire to the matching right socket. On correct match, the wire "connects" (line stays). On wrong match, the wire snaps back with a "buzz" sound. Three correct matches = complete.  
  
**State Machine:**  
```typescript  
interface TurnstileState {  
  wires: { color: 'red' | 'blue' | 'green'; leftY: number; rightY: number; connected: boolean }[];  
  dragging: { color: string; currentX: number; currentY: number } | null;  
  connections: number;  
}  
  
function onUpdate(dt, input, state): TaskResult {  
  if (input.touchStart) {  
    // Check if touch is near a left-side wire  
    const wire = state.wires.find(w => !w.connected && near(input.touchStart, { x: 100, y: w.leftY }));  
    if (wire) {  
      state.dragging = { color: wire.color, currentX: input.x, currentY: input.y };  
    }  
  }  
    
  if (input.touchMove && state.dragging) {  
    state.dragging.currentX = input.x;  
    state.dragging.currentY = input.y;  
  }  
    
  if (input.touchEnd && state.dragging) {  
    // Check if released near matching socket on right  
    const wire = state.wires.find(w => w.color === state.dragging!.color);  
    if (wire && near(input.touchEnd, { x: 300, y: wire.rightY })) {  
      wire.connected = true;  
      state.connections++;  
      playSound('task_hit');  
      if (state.connections >= 3) return { status: 'complete' };  
    } else {  
      playSound('task_miss');  
    }  
    state.dragging = null;  
  }  
    
  return { status: 'ongoing' };  
}  
```  
  
---  
  
### 18.5 — Task 04: "Разобрать роутер" (Reboot the Router)  
  
**Location:** Entrance Arch utility box (2, -22).  
**Duration:** ~8 seconds.  
**Difficulty:** Medium.  
  
**Mechanic:** A circular dial (like a compass). The player must rotate it to stop in the green zone. The green zone is randomized (30° wide). Three successful stops = complete. Each round, the green zone moves and the dial rotation speed increases.  
  
**State Machine:**  
```typescript  
interface RouterState {  
  dialAngle: number;       // current rotation (radians)  
  dialSpeed: number;       // rotation speed (rad/s)  
  dialDir: number;         // 1 or -1  
  greenZone: { start: number; end: number };  // radians  
  hits: number;  
  rounds: number;  
}  
  
function onStart(): MiniGameState {  
  return {  
    dialAngle: 0,  
    dialSpeed: 1.5,  // rad/s  
    dialDir: 1,  
    greenZone: randomGreenZone(),  
    hits: 0,  
    rounds: 0,  
  };  
}  
  
function onUpdate(dt, input, state): TaskResult {  
  state.dialAngle += state.dialDir * state.dialSpeed * dt;  
  if (state.dialAngle > Math.PI * 2) state.dialAngle -= Math.PI * 2;  
    
  if (input.tapped) {  
    if (state.dialAngle >= state.greenZone.start && state.dialAngle <= state.greenZone.end) {  
      state.hits++;  
      playSound('task_hit');  
      if (state.hits >= 3) return { status: 'complete' };  
      // Next round: new green zone, faster speed  
      state.rounds++;  
      state.dialSpeed = 1.5 + state.rounds * 0.5;  
      state.dialDir = Math.random() < 0.5 ? 1 : -1;  
      state.greenZone = randomGreenZone();  
    } else {  
      playSound('task_miss');  
      state.dialSpeed += 0.2;  // penalty: gets faster  
    }  
  }  
    
  return { status: 'ongoing' };  
}  
```  
  
---  
  
### 18.6 — Task 05: "Полить цветы" (Water the Flowers)  
  
**Location:** Flower bed (varies).  
**Duration:** ~4 seconds.  
**Difficulty:** Trivial.  
  
**Mechanic:** The player must draw a figure-8 pattern on the screen. A watering can icon follows the player's finger. A "coverage" meter fills as the player covers the flower bed area. At 100% coverage = complete. The pattern must be continuous (if the player lifts their finger for >0.5s, coverage decays at 5%/s).  
  
**State Machine:**  
```typescript  
interface WaterFlowersState {  
  coverage: number;       // 0 to 1  
  lastTouchTime: number;  
  coveredPixels: Set<string>;  // "x,y" grid cells  
  canX: number; canY: number;  
}  
  
function onUpdate(dt, input, state): TaskResult {  
  if (input.touchActive) {  
    state.canX = input.x;  
    state.canY = input.y;  
    state.lastTouchTime = getTime();  
    // Mark covered cells  
    const cellX = Math.floor(input.x / 20);  
    const cellY = Math.floor(input.y / 20);  
    state.coveredPixels.add(`${cellX},${cellY}`);  
    state.coverage = state.coveredPixels.size / 50;  // 50 cells total  
    if (state.coverage >= 1.0) return { status: 'complete' };  
  } else {  
    // Decay if not touching  
    if (getTime() - state.lastTouchTime > 0.5) {  
      state.coverage = Math.max(0, state.coverage - 0.05 * dt);  
    }  
  }  
  return { status: 'ongoing' };  
}  
```  
  
---  
  
### 18.7–18.20 — Remaining Tasks (Specifications)  
  
**Task 06: "Выгулять собаку" (Walk the Dog)**  
- **Location:** Benches (12, 20).  
- **Duration:** ~15 seconds.  
- **Mechanic:** A dog NPC (named "Бакс") spawns. Player taps to attach leash. Player walks to 3 random waypoints (each ~10m apart). Dog follows at 2.5 m/s. At each waypoint, dog stops for 1.5s ("sniffing"). Player must wait. Reach all 3 = complete.  
- **Failure:** If player moves >5m from dog, leash "detaches" (dog runs back to bench). Restart.  
- **Flavor:** "Собаку зовут Бакс. Конечно."  
- **Completion:** "Бакс доволен. (Бакс всегда доволен, если есть что понюхать.)"  
  
**Task 07: "Купить цветы" (Buy Flowers)**  
- **Location:** Flower vendor (-3, -22).  
- **Duration:** ~5 seconds.  
- **Mechanic:** Three bouquets displayed. A prompt flashes "Тёте Любе!" with a brief highlight of the correct bouquet (ромашки). Player must tap the correct one. Three rounds, each faster.  
- **Failure:** Wrong tap = "Это не ромашки. Тётя Люба обидится." Restart round.  
- **Completion:** "Тётя Люба любит ромашки. Все это знают."  
  
**Task 08: "Успокоить алкаша" (Calm the Drunk)**  
- **Location:** Behind dumpsters (22, 18).  
- **Duration:** ~10 seconds.  
- **Mechanic:** Dialogue tree. Вася (the drunk) says something slurred. Player picks from 3 responses (empathetic, dismissive, confusing). Empathetic = progress. Dismissive = restart. Confusing = Вася laughs, progress. Three rounds.  
- **Flavor:** "Вася из 2 подъезда. Опять."  
- **Completion:** "Вася ушёл спать. До завтра."  
  
**Task 09: "Проверить почту" (Check the Mail)**  
- **Location:** Mailboxes (-15, -22).  
- **Duration:** ~5 seconds.  
- **Mechanic:** Row of 8 mailboxes. Player taps theirs (highlighted with a subtle glow). A letter unfolds. Player taps to "read" (auto-scrolls over 2 seconds).  
- **Letter text (randomized):**   
  - "Уважаемый жилец! С 1 августа тариф на ЖКХ повышается на 14%."  
  - "Уважаемый жилец! Просим не оставлять мусор на лестничной клетке."  
  - "Уважаемый жилец! Лифт в подъезде №3 будет отключён 15 августа."  
- **Completion:** "Почта проверена. Настроение испорчено."  
  
**Task 10: "Заказать такси" (Order a Taxi)**  
- **Location:** Anywhere (mobile task — can be done standing still).  
- **Duration:** ~5 seconds.  
- **Mechanic:** Phone UI overlay. Tap "Заказать". Wait 3 seconds (taxi arriving — progress bar). Tap "Подтвердить" when it arrives.  
- **Flavor:** "Яндекс GO. Подача 3 минуты. (Сюрприз: 8 минут.)"  
- **Completion:** "Такси приедет через 8 минут. (Было 3.)"  
  
**Task 11: "Вынести мусор" (Take Out Trash)**  
- **Location:** Player's car trunk (start) → Dumpsters (22, 18) (end).  
- **Duration:** ~7 seconds.  
- **Mechanic:** Player picks up a trash bag from their car trunk. Carrying it slows movement by 20%. Walk to dumpsters. Tap dumpster to throw. Complete.  
- **Completion:** "Мусор вынесен. Экология спасена. (Нет.)"  
  
**Task 12: "Помочь донести сумки" (Help Carry Bags)**  
- **Location:** Entrance Arch (0, -22).  
- **Duration:** ~12 seconds.  
- **Mechanic:** An NPC (тётя Люба) is struggling with bags at the entrance. Player taps to help. Player walks with тётя Люба to her building entrance (random building, ~15m). She walks at 1.8 m/s. Reach entrance = complete.  
- **Completion:** "Тётя Люба: «Спасибо, милок. Вот тебе яблоко.»"  
  
**Task 13: "Покормить голубей" (Feed Pigeons)**  
- **Location:** Benches (12, 20).  
- **Duration:** ~5 seconds.  
- **Mechanic:** Tap rapidly to scatter seeds (10 taps in 5 seconds). Pigeons visually flock.  
- **Completion:** "Голуби довольны. Памятник благодарен."  
  
**Task 14: "Найти кота" (Find the Cat)**  
- **Location:** 3 random hiding spots (behind dumpsters, under cars, in bushes).  
- **Duration:** ~10 seconds.  
- **Mechanic:** Барсик (the cat) is hiding. Player must walk to 3 possible hiding spots (highlighted on minimap). At each, tap to "search". 60% chance Барсик is there. If found, complete.  
- **Completion:** "Барсик нашёлся. Барсик недоволен."  
- **Failure:** "Барсика тут нет. Ищите дальше."  
  
**Task 15: "Починить качели" (Fix the Swing)**  
- **Location:** Playground (-22, 8).  
- **Duration:** ~6 seconds.  
- **Mechanic:** Rhythm tap. 4 beats play (audio cue). Player must tap on each beat (±100ms window). 4 successful taps = complete.  
- **Completion:** "Качели починены. Дети (двое) радуются."  
  
**Task 16: "Подмести крыльцо" (Sweep the Porch)**  
- **Location:** Building entrance (-25, 0).  
- **Duration:** ~5 seconds.  
- **Mechanic:** Drag finger in zigzag pattern across the screen. A "dust" texture clears as the player sweeps. At 80% cleared = complete.  
- **Completion:** "Крыльцо чистое. До завтра."  
  
**Task 17: "Полить газон" (Water the Lawn)**  
- **Location:** Lawn area (varies).  
- **Duration:** ~6 seconds.  
- **Mechanic:** Drag finger in a spiral pattern. Similar to flower watering but spiral-shaped coverage area.  
- **Completion:** "Газон полит. (Газон всё равно засохнет к августу.)"  
  
**Task 18: "Проверить счётчик" (Check the Meter)**  
- **Location:** Building utility room (-20, -20).  
- **Duration:** ~5 seconds.  
- **Mechanic:** A meter display shows 4 numbers (e.g., "8 2 4 9"). Player must tap them in ascending order ("2 4 8 9"). Time limit: 5 seconds.  
- **Completion:** "Счётчик проверен. 247 кВт·ч. Дорого."  
- **Failure:** "Неправильный порядок. Сначала маленькие."  
  
**Task 19: "Купить квас" (Buy Kvass)**  
- **Location:** Kvass barrel near Entrance (-5, -22).  
- **Duration:** ~4 seconds.  
- **Mechanic:** Same as shawarma (timing bar), but simpler (2 hits, wider green zone).  
- **Completion:** "Квас за 60₽. Живой."  
  
**Task 20: "Закрыть кран" (Close the Tap)**  
- **Location:** Building utility room (-20, -20).  
- **Duration:** ~4 seconds.  
- **Mechanic:** Rotate a circular dial 720° (two full turns). Drag in a circular motion. Progress tracked as total rotation.  
- **Completion:** "Кран закрыт. Вода перестала капать. (Нет, не перестала.)"  
  
---  
