## SECTION 22: AUDIO ASSET MANIFEST  
  
### 22.1 — Music Tracks  
  
| Track | Duration | File | Source |  
|-------|----------|------|--------|  
| Menu (lo-fi ironic) | 2:00 loop | `music_menu.mp3` | Commission / Pixabay |  
| Play phase (tense upbeat) | 3:00 loop | `music_play.mp3` | Commission / Pixabay |  
| Сходка (dramatic tango) | 1:30 | `music_meeting.mp3` | Commission / Pixabay |  
| Win (Хозяева) | 0:05 | `music_win_owners.mp3` | Synthesized |  
| Lose (Сливщики win) | 0:05 | `music_win_drainers.mp3` | Synthesized |  
  
### 22.2 — SFX Library (30 sounds)  
  
Full list in Volume I §8.2. All sounds stored as `/public/sounds/[name].mp3`.  
  
**Source Strategy:**  
- Synthesized via Web Audio API: `siphon_gurgle`, `alarm`, `kill`, `task_complete`, `ui_click`, `tesla_zap`, `trap_trigger`, `vote`, `vote_skip`, `canister_pickup`, `canister_drop`, `fuel_lock`.  
- Pixabay CC0 (real recordings): `footstep_asphalt`, `footstep_grass`, `car_door`, `engine_start`, `pipe_burst`, `alarm_chaos`, `meeting_horn`.  
- Voice clips (commissioned or AI-generated): `grandma_block` ("А ну-ка, собрались!"), `grandma_escort` ("Спасибо, внучек.").  
  
### 22.3 — Audio File Specs  
  
- Format: MP3, 128kbps, 44.1kHz, mono (for SFX) / stereo (for music).  
- SFX duration: 0.1s–2.0s.  
- Music duration: 1:30–3:00, looped seamlessly.  
- Total audio size: ~5MB (lazy-loaded).  
  
---  
  
