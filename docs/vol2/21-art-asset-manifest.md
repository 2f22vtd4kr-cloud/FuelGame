## SECTION 21: ART ASSET MANIFEST  
  
### 21.1 — Sprite List (Complete)  
  
**Characters (10 base × 8 directions × 4 frames = 320 sprites):**  
  
| Character | Base Color | Accessory | File |  
|-----------|-----------|-----------|------|  
| Денис | Yellow cap, dark jacket | Yandex cap | `char_denis.png` |  
| Аня | Pink hoodie | Ponytail, AirPods | `char_anya.png` |  
| Вова | All black | Sunglasses, gold chain | `char_vova.png` |  
| Серёжа | Green vest | Mustache, glasses | `char_sergey.png` |  
| Петрович | Blue overalls | Wrench, oil stain | `char_petrovich.png` |  
| Марина | Crop top | Phone on stick, ring light | `char_marina.png` |  
| Ахмет | Orange vest | Broom, squint | `char_ahmet.png` |  
| Олег | Black suit | Earpiece, sunglasses | `char_oleg.png` |  
| Лена | Linen clothes | Tote bag, helmet | `char_lena.png` |  
| Барсик | Orange fur | Tail | `char_barsik.png` |  
  
Each character sprite sheet: 64×64px per frame, 8 directions × 4 frames = 2048×256px sheet.  
  
**Cars (6 types × 8 directions = 48 sprites):**  
  
| Car | Color | Special | File |  
|-----|-------|---------|------|  
| Москвич-3 | Cherry red #FF3B30 | White circle on door | `car_moskvich.png` |  
| Zeekr 001 | Electric blue #007AFF | Gold trim | `car_zeekr.png` |  
| Tesla Model 3 | White #F5F5F5 | Red racing stripes | `car_tesla.png` |  
| Haval Jolion | Orange #FF9500 | — | `car_haval.png` |  
| Lada Vesta NG | Purple #AF52DE | — | `car_vesta.png` |  
| Yandex Lada | Yellow #FFD700 | Black checker stripe | `car_yandex.png` |  
  
Each car sprite: 128×128px per direction, 8 directions = 1024×128px sheet.  
  
**Props (20 props × 1-4 directions):**  
  
| Prop | Size (px) | File |  
|------|-----------|------|  
| Fire hydrant | 32×48 | `prop_hydrant.png` |  
| Mailbox | 32×64 | `prop_mailbox.png` |  
| Dumpster | 64×48 | `prop_dumpster.png` |  
| Bench | 96×32 | `prop_bench.png` |  
| Streetlight | 16×96 | `prop_streetlight.png` |  
| Scooter (P5) | 32×64 | `prop_scooter.png` |  
| Bush | 48×48 | `prop_bush.png` |  
| Flower pot | 24×32 | `prop_flowerpot.png` |  
| Water barrel | 32×48 | `prop_barrel.png` |  
| Shawarma stand | 96×64 | `prop_shawarma_stand.png` |  
| EV charger | 32×64 | `prop_ev_charger.png` |  
| Playground swing | 64×64 | `prop_swing.png` |  
| Playground slide | 96×64 | `prop_slide.png` |  
| Trash can | 24×32 | `prop_trashcan.png` |  
| Kvass barrel | 32×48 | `prop_kvass.png` |  
| Canister (full) | 24×32 | `prop_canister_full.png` |  
| Canister (empty) | 24×32 | `prop_canister_empty.png` |  
| Fuel ticket (power-up) | 24×24 | `prop_ticket.png` |  
| Grandma NPC | 32×48 | `npc_grandma.png` |  
| Dog (Бакс) NPC | 32×32 | `npc_dog.png` |  
  
**UI Elements:**  
  
| Element | Size | File |  
|---------|------|------|  
| Virtual joystick base | 128×128 | `ui_joystick_base.png` |  
| Virtual joystick thumb | 64×64 | `ui_joystick_thumb.png` |  
| Fuel meter background | 200×24 | `ui_fuel_bg.png` |  
| Fuel meter fill | 200×24 | `ui_fuel_fill.png` |  
| HP bar background | 100×12 | `ui_hp_bg.png` |  
| HP bar fill | 100×12 | `ui_hp_fill.png` |  
| Minimap frame | 128×128 | `ui_minimap.png` |  
| Unity meter | 200×24 | `ui_unity_meter.png` |  
| Interaction prompt | 256×48 | `ui_prompt.png` |  
| Сходка timer ring | 256×256 | `ui_timer.png` |  
| Vote button | 64×64 | `ui_vote.png` |  
| Skip vote button | 64×32 | `ui_skip.png` |  
| Chat wheel bg | 512×512 | `ui_chatwheel.png` |  
  
**Total sprites: ~400 files, ~3MB.**  
  
### 21.2 — Texture Atlas  
  
All sprites are packed into 4 texture atlases (2048×2048 each):  
- `atlas_chars.png` — All character sprites.  
- `atlas_cars.png` — All car sprites.  
- `atlas_props.png` — All prop sprites.  
- `atlas_ui.png` — All UI sprites.  
  
Atlas packing via TexturePacker (free tier) or `spritesheet-js` (npm).  
  
### 21.3 — Tilemap  
  
The courtyard map is a 60×60 tile grid, 32px per tile = 1920×1920px.  
- `tilemap.json` — Tiled map format (open-source Tiled editor).  
- `tileset.png` — 256×256 tileset (8×8 tiles, 32px each).  
  
Tile types:  
- 0: Grass (walkable, 0.6× speed)  
- 1: Concrete (walkable, 1.0× speed)  
- 2: Asphalt (walkable, 1.0× speed)  
- 3: Flower bed (walkable, 0.6× speed)  
- 4: Building wall (impassable)  
- 5: Car (impassable, vision blocker)  
- 6: Dumpster (impassable, vision blocker, stealth zone)  
- 7: Bench (impassable)  
- 8: Playground structure (impassable, vision blocker)  
- 9: Water/flood (impassable during pipe burst sabotage)  
  
---  
  
