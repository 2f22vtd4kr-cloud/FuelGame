import './HUD.css';
import { useState, useEffect } from 'react';
import type { GameState, SabotageKey } from '../game/types';
import { downloadMoment, getMomentDataUrl } from '../game/replayBuffer';
import { SPRINT_MAX, SABOTAGE_LABELS, SABOTAGE_COOLDOWNS, SABOTAGE_DURATIONS, SIPHON_AUDIO_RADIUS } from '../game/types';
import { NEWS_HEADLINES } from '../data/ticker';
import { CHARACTERS } from '../data/characters';
import { MAP_W, MAP_H } from '../data/map';
import { triggerSabotage, triggerEmote, PLAY_EMOTES, triggerBarsikMeow, investigateBody, janitorCollectCanister } from '../game/logic';
import { gs } from '../game/state';
import { audio } from '../game/audio';
import { loadProfile, saveProfile } from '../game/profile';
import TaskMiniGame from './TaskMiniGame';
import { t } from '../i18n/strings';
import { setTouchCrouch, toggleTouchSprint } from '../game/touchInput';

function saveAccessibilityToProfile(): void {
  const profile = loadProfile();
  profile.textSize         = gs.textSize;
  profile.colorblindMode   = gs.colorblindMode;
  profile.highContrastMode = gs.highContrastMode;
  profile.volumeMaster     = gs.volumeMaster;
  profile.volumeMusic      = gs.volumeMusic;
  profile.volumeSfx        = gs.volumeSfx;
  profile.autoInteract     = gs.autoInteract;
  profile.simplifiedChatWheel = gs.simplifiedChatWheel;
  profile.audioCaptions    = gs.audioCaptions;
  profile.language         = gs.language;
  saveProfile(profile);
}

// ─── §13.1 Audio captions ────────────────────────────────────────────────────
function AudioCaptions({ enabled }: { enabled: boolean }) {
  const [lines, setLines] = useState<{ id: number; text: string }[]>([]);

  useEffect(() => {
    if (!enabled) { setLines([]); return; }
    let nextId = 0;
    const unsubscribe = audio.onCaption(text => {
      const id = nextId++;
      setLines(prev => [...prev.slice(-2), { id, text }]);
      window.setTimeout(() => setLines(prev => prev.filter(l => l.id !== id)), 3000);
    });
    return unsubscribe;
  }, [enabled]);

  if (!enabled || lines.length === 0) return null;
  return (
    <div style={{
      position: 'absolute', left: '50%', bottom: '18%', transform: 'translateX(-50%)',
      display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center',
      pointerEvents: 'none', zIndex: 40,
    }}>
      {lines.map(l => (
        <div key={l.id} style={{
          background: 'rgba(0,0,0,0.82)', color: '#f4ebd0',
          fontSize: 12, fontWeight: 700,
          padding: '4px 10px',
          border: '1.5px solid rgba(244,235,208,0.2)',
          whiteSpace: 'nowrap',
        }}>
          {l.text}
        </div>
      ))}
    </div>
  );
}

// ─── Minimap ─────────────────────────────────────────────────────────────────
const MM_W = 90;
const MM_H = 68;
const MM_SX = MM_W / MAP_W;
const MM_SY = MM_H / MAP_H;

function Minimap({ state }: { state: GameState }) {
  const localPlayer = state.players.find(p => p.id === state.localPlayerId);
  return (
    <div className="pp-minimap-wrap" style={{ width: MM_W, height: MM_H, position: 'relative' }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(10,14,20,0.92)',
      }} />
      {/* Courtyard tint */}
      <div style={{
        position: 'absolute',
        left: 90 * MM_SX, top: 90 * MM_SY,
        width: (MAP_W - 180) * MM_SX, height: (MAP_H - 180) * MM_SY,
        background: 'rgba(50,80,40,0.3)',
      }} />
      {/* Cars */}
      {state.cars.map(car => (
        <div key={car.id} style={{
          position: 'absolute',
          left: car.pos.x * MM_SX - 3, top: car.pos.y * MM_SY - 2,
          width: 6, height: 4,
          background: car.fuel < 10 ? '#FF1744' : car.fuel < 30 ? '#FF9800' : car.color,
          borderRadius: 1, opacity: 0.9,
        }} />
      ))}
      {/* Tasks */}
      {state.tasks.filter(t => !t.isComplete).map(t => {
        const localP = state.players.find(p => p.id === state.localPlayerId);
        const color = localP?.role === 'slivshchik' ? '#888' : '#e5a50a';
        return (
          <div key={t.id} style={{
            position: 'absolute',
            left: t.pos.x * MM_SX - 2, top: t.pos.y * MM_SY - 2,
            width: 4, height: 4, background: color,
            borderRadius: '50%', opacity: 0.85,
          }} />
        );
      })}
      {/* Immunity tickets */}
      {state.immunityTickets.map(it => (
        <div key={it.id} style={{
          position: 'absolute',
          left: it.pos.x * MM_SX - 2, top: it.pos.y * MM_SY - 2,
          width: 4, height: 4, background: '#FFD700', borderRadius: '50%',
        }} />
      ))}
      {/* Bodies */}
      {state.bodies.map(b => (
        <div key={b.id} style={{
          position: 'absolute',
          left: b.pos.x * MM_SX - 2, top: b.pos.y * MM_SY - 2,
          width: 4, height: 4, background: '#cc2b1d', borderRadius: '50%',
        }} />
      ))}
      {/* Other players */}
      {state.players.filter(p => p.id !== state.localPlayerId && p.isAlive).map(p => {
        const charDef = CHARACTERS[p.character];
        return (
          <div key={p.id} style={{
            position: 'absolute',
            left: p.pos.x * MM_SX - 3, top: p.pos.y * MM_SY - 3,
            width: 6, height: 6, background: charDef.color,
            borderRadius: '50%', border: '1px solid rgba(255,255,255,0.4)',
          }} />
        );
      })}
      {/* Local player */}
      {localPlayer && (
        <div style={{
          position: 'absolute',
          left: localPlayer.pos.x * MM_SX - 4, top: localPlayer.pos.y * MM_SY - 4,
          width: 8, height: 8,
          background: '#e5a50a', borderRadius: '50%',
          border: '1.5px solid #fff', zIndex: 2,
        }} />
      )}
      {/* Body count badge */}
      {state.bodies.length > 0 && (
        <div style={{
          position: 'absolute', bottom: -1, right: -1,
          background: '#cc2b1d', border: '1px solid #1a1a1a',
          padding: '1px 5px',
          fontSize: 8, color: '#fff', fontWeight: 900,
          letterSpacing: '0.05em',
        }}>
          💀{state.bodies.length}
        </div>
      )}
    </div>
  );
}

// ─── Settings panel ───────────────────────────────────────────────────────────
function SettingsPanel({ state }: { state: GameState }) {
  return (
    <div className="pp-settings-panel" style={{ position: 'absolute', bottom: 42, left: 0 }}>
      <div style={{ fontSize: 10, color: '#cc2b1d', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        ★ {t('hud_settings', state.language)}
      </div>

      {[
        { label: `🔊 Мастер: ${Math.round(state.volumeMaster * 100)}%`, val: state.volumeMaster, accent: '#e5a50a', onChange: (v: number) => { gs.volumeMaster = v; audio.setMasterVolume(v); saveAccessibilityToProfile(); } },
        { label: `🎵 Музыка: ${Math.round(state.volumeMusic * 100)}%`, val: state.volumeMusic, accent: '#4CAF50', onChange: (v: number) => { gs.volumeMusic = v; audio.setMusicVolume(v); saveAccessibilityToProfile(); } },
        { label: `💥 Эффекты: ${Math.round(state.volumeSfx * 100)}%`, val: state.volumeSfx, accent: '#cc2b1d', onChange: (v: number) => { gs.volumeSfx = v; audio.setSfxVolume(v); saveAccessibilityToProfile(); } },
      ].map(({ label, val, accent, onChange }) => (
        <label key={label} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span className="pp-settings-label">{label}</span>
          <input type="range" min={0} max={1} step={0.05} defaultValue={val}
            onChange={e => onChange(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: accent }}
          />
        </label>
      ))}

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
        <input type="checkbox" defaultChecked={state.colorblindMode}
          onChange={e => { gs.colorblindMode = e.target.checked; saveAccessibilityToProfile(); }}
          style={{ accentColor: '#2196F3', width: 14, height: 14 }}
        />
        <span style={{ fontSize: 11, color: '#f4ebd0', opacity: 0.7 }}>🎨 Режим для дальтоников</span>
      </label>

      <div>
        <div className="pp-settings-label">📐 Размер текста</div>
        <div style={{ display: 'flex', gap: 4, marginTop: 3 }}>
          {(['small', 'medium', 'large'] as const).map(sz => (
            <button key={sz} className="pp-btn"
              onClick={() => { gs.textSize = sz; saveAccessibilityToProfile(); }}
              style={{
                flex: 1, padding: '3px', fontSize: sz === 'small' ? 9 : sz === 'large' ? 13 : 11,
                background: state.textSize === sz ? '#cc2b1d' : 'rgba(255,255,255,0.07)',
                color: state.textSize === sz ? '#fff' : '#aaa',
                border: `1.5px solid ${state.textSize === sz ? '#1a1a1a' : 'rgba(255,255,255,0.12)'}`,
                borderRadius: 2, boxShadow: state.textSize === sz ? '2px 2px 0 #1a1a1a' : 'none',
              }}>
              {sz === 'small' ? 'М' : sz === 'large' ? 'Б' : 'С'}
            </button>
          ))}
        </div>
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
        <input type="checkbox" checked={state.autoInteract}
          onChange={e => { gs.autoInteract = e.target.checked; gs.autoInteractTimer = 0; saveAccessibilityToProfile(); }}
          style={{ accentColor: '#4CAF50', width: 14, height: 14 }}
        />
        <span style={{ fontSize: 11, color: '#f4ebd0', opacity: 0.7 }}>🖐️ Авто-взаимодействие (2 с)</span>
      </label>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
        <input type="checkbox" checked={state.simplifiedChatWheel}
          onChange={e => { gs.simplifiedChatWheel = e.target.checked; saveAccessibilityToProfile(); }}
          style={{ accentColor: '#FF9800', width: 14, height: 14 }}
        />
        <span style={{ fontSize: 11, color: '#f4ebd0', opacity: 0.7 }}>💬 Простой чат-круг</span>
      </label>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
        <input type="checkbox" checked={state.audioCaptions}
          onChange={e => { gs.audioCaptions = e.target.checked; saveAccessibilityToProfile(); }}
          style={{ accentColor: '#9C27B0', width: 14, height: 14 }}
        />
        <span style={{ fontSize: 11, color: '#f4ebd0', opacity: 0.7 }}>💬 Субтитры звуков</span>
      </label>

      <div>
        <div className="pp-settings-label">🌐 {t('settings_language', state.language)}</div>
        <div style={{ display: 'flex', gap: 4, marginTop: 3 }}>
          {(['ru', 'en'] as const).map(lng => (
            <button key={lng} className="pp-btn"
              onClick={() => { gs.language = lng; saveAccessibilityToProfile(); }}
              style={{
                flex: 1, padding: '3px', fontSize: 11,
                background: state.language === lng ? '#cc2b1d' : 'rgba(255,255,255,0.07)',
                color: state.language === lng ? '#fff' : '#aaa',
                border: `1.5px solid ${state.language === lng ? '#1a1a1a' : 'rgba(255,255,255,0.12)'}`,
                borderRadius: 2, boxShadow: state.language === lng ? '2px 2px 0 #1a1a1a' : 'none',
              }}>
              {lng === 'ru' ? 'RU' : 'EN'}
            </button>
          ))}
        </div>
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
        <input type="checkbox" checked={state.highContrastMode}
          onChange={e => { gs.highContrastMode = e.target.checked; saveAccessibilityToProfile(); }}
          style={{ accentColor: '#e5a50a', width: 14, height: 14 }}
        />
        <span style={{ fontSize: 11, color: '#f4ebd0', opacity: 0.7 }}>🔆 Высокий контраст</span>
      </label>
    </div>
  );
}

// ─── Main HUD ─────────────────────────────────────────────────────────────────
interface HUDProps { state: GameState }

const SABOTAGE_KEYS: SabotageKey[] = ['alarm_chaos', 'chat_offline', 'babushka_cerberus', 'pipe_burst'];

export default function HUD({ state }: HUDProps) {
  const [showSabotageMenu, setShowSabotageMenu] = useState(false);
  const [showObjective, setShowObjective]       = useState(false);
  const [showSettings, setShowSettings]         = useState(false);
  const [showPlayerList, setShowPlayerList]     = useState(false);
  const [showFuelDetail, setShowFuelDetail]     = useState(false);
  // Emote wheel lives on gs (not local state) since it can also be opened
  // from the "Q" key or the mobile swipe-up gesture inside <GameCanvas>.
  const showEmoteWheel = state.emoteWheelOpen;
  const setShowEmoteWheel = (v: boolean | ((prev: boolean) => boolean)) => {
    gs.emoteWheelOpen = typeof v === 'function' ? v(gs.emoteWheelOpen) : v;
  };
  const [isCrouchHeld, setIsCrouchHeld] = useState(false);

  const localPlayer = state.players.find(p => p.id === state.localPlayerId);
  if (!localPlayer) return null;

  const textScale = state.textSize === 'small' ? 0.82 : state.textSize === 'large' ? 1.22 : 1.0;
  const isSlivshchik = localPlayer.role === 'slivshchik';
  const aliveSlivshchiki = state.players.filter(p => p.isAlive && p.role === 'slivshchik').length;
  const aliveKhozaeva    = state.players.filter(p => p.isAlive && p.role === 'khozain').length;
  const staminaPct = (localPlayer.stamina / SPRINT_MAX) * 100;
  const sabotageCooldown = localPlayer.sabotageCooldown;
  const minFuel = state.cars.length > 0 ? Math.min(...state.cars.map(c => c.fuel)) : 100;
  const anySiphoning = state.cars.some(c => c.siphonPhase === 2);
  const fuelAlertColor = minFuel < 20 ? '#FF1744' : minFuel < 40 ? '#FF9800' : '#4CAF50';

  const nearAudioSiphon = state.cars.some(c =>
    c.siphonPhase === 2 &&
    Math.hypot(c.pos.x - localPlayer.pos.x, c.pos.y - localPlayer.pos.y) <= SIPHON_AUDIO_RADIUS,
  );

  const tleft = state.matchTimeLimit;
  const mins = Math.floor(tleft / 60).toString().padStart(2, '0');
  const secs = Math.floor(tleft % 60).toString().padStart(2, '0');
  const timerUrgent = tleft < 60;

  // §12.4 Tutorial triggers
  useEffect(() => {
    if (state.phase === 'play' && gs.tutorialStep === 0) {
      const lsDone = localStorage.getItem('95Y_tutorial') === 'done';
      const profileDone = loadProfile().seenTutorial;
      if (!lsDone && !profileDone) gs.tutorialStep = 1;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase]);

  useEffect(() => {
    if (state.tutorialStep !== 3) return;
    const timer = window.setTimeout(() => {
      gs.tutorialStep = 0;
      localStorage.setItem('95Y_tutorial', 'done');
      const profile = loadProfile(); profile.seenTutorial = true; saveProfile(profile);
    }, 3000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.tutorialStep]);

  const dismissTutorial = () => {
    gs.tutorialStep = 0;
    localStorage.setItem('95Y_tutorial', 'done');
    const prof = loadProfile(); prof.seenTutorial = true; saveProfile(prof);
  };

  return (
    <div
      data-hc={state.highContrastMode ? '1' : undefined}
      style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        pointerEvents: 'none', zIndex: 10,
        filter: state.highContrastMode ? 'contrast(1.15) brightness(1.05)' : undefined,
      }}
    >
      <AudioCaptions enabled={state.audioCaptions} />

      {/* ── §2.5 Task mini-game ── */}
      {state.activeMiniGame && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'all', zIndex: 100,
        }}>
          <TaskMiniGame mg={state.activeMiniGame} />
        </div>
      )}

      {/* ── §2.9 Active sabotage banners ── */}
      {state.activeSabotages.length > 0 && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, pointerEvents: 'none' }}>
          {state.activeSabotages.map(sab => {
            const isPipeBurst = sab.key === 'pipe_burst';
            const urgency = sab.timer < 15 ? '#FF1744' : isPipeBurst ? '#FF5722' : '#FF9800';
            const v1Pct = Math.min(100, (sab.valve1Progress / 3) * 100);
            const v2Pct = Math.min(100, (sab.valve2Progress / 3) * 100);
            return (
              <div key={sab.id} className="pp-sabotage-banner">
                <span>{SABOTAGE_LABELS[sab.key]}</span>
                {isPipeBurst && (
                  <span style={{ fontSize: 9, fontWeight: 600, opacity: 0.85 }}>
                    Вент.1: {Math.round(v1Pct)}% · Вент.2: {Math.round(v2Pct)}%
                  </span>
                )}
                <span style={{ color: urgency, fontWeight: 900 }}>⏱ {Math.ceil(sab.timer)}с</span>
              </div>
            );
          })}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          TOP STRIP — black bar: unity meter · role badge · timer · fuel
          ════════════════════════════════════════════════════════════════════ */}
      <div className="pp-topstrip" style={{
        marginTop: state.activeSabotages.length > 0 ? state.activeSabotages.length * 27 : 0,
      }}>

        {/* Unity meter — left */}
        <div style={{ flex: 1, maxWidth: 180 }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 3,
          }}>
            <span style={{ fontSize: 8, fontWeight: 800, textTransform: 'uppercase',
              letterSpacing: '0.1em', color: 'rgba(244,235,208,0.55)' }}>
              🤝 {t('hud_unity', state.language)}
            </span>
            <span style={{ fontSize: 8, fontWeight: 800, color: '#e5a50a' }}>
              {Math.round(state.unityMeter)}%
            </span>
          </div>
          <div className="pp-unity-track">
            <div className="pp-unity-fill" style={{ width: `${state.unityMeter}%` }} />
          </div>
        </div>

        {/* Role badge + timer — center */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flexShrink: 0 }}>
          <div className={isSlivshchik ? 'pp-role-slivshchik' : 'pp-role-khozain'}>
            {isSlivshchik ? t('role_slivshchik', state.language) : t('role_khozain', state.language)}
            {localPlayer.neutralRole === 'barsik'     && ' 😺'}
            {localPlayer.neutralRole === 'policeman'  && ' 🕵️'}
            {localPlayer.neutralRole === 'janitor'    && ' 🧹'}
          </div>
          <div style={{
            fontSize: 11, fontWeight: 900, letterSpacing: '0.04em',
            color: timerUrgent ? '#FF5252' : '#f4ebd0',
            fontVariantNumeric: 'tabular-nums',
          }}>
            ⏱ {mins}:{secs}
          </div>
        </div>

        {/* Fuel + alive — right */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, pointerEvents: 'all', position: 'relative', flexShrink: 0 }}>
          {/* Fuel badge */}
          <button
            onClick={() => setShowFuelDetail(v => !v)}
            style={{
              background: 'transparent', border: `1.5px solid ${fuelAlertColor}66`,
              borderRadius: 2, padding: '2px 7px',
              fontSize: 10, fontWeight: 800, color: fuelAlertColor,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
              textTransform: 'uppercase', letterSpacing: '0.04em',
            }}
          >
            🚗 {Math.round(minFuel)}%{anySiphoning ? ' 🪣' : ''}
          </button>
          {/* Alive count — compact */}
          <button
            onClick={() => setShowPlayerList(v => !v)}
            style={{
              background: 'transparent', border: 'none',
              fontSize: 10, fontWeight: 800, color: 'rgba(244,235,208,0.6)',
              cursor: 'pointer', letterSpacing: '0.04em',
              padding: '0 2px',
              display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            🏠 {aliveKhozaeva}
            {isSlivshchik && <span style={{ color: '#FF5252' }}>🪣 {aliveSlivshchiki}</span>}
            {!isSlivshchik && <span style={{ opacity: 0.4 }}>/{state.players.length}</span>}
          </button>

          {/* Fuel detail dropdown */}
          {showFuelDetail && (
            <div className="pp-dropdown" style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, zIndex: 60, minWidth: 120 }}>
              {state.cars.map(car => {
                const col = state.colorblindMode
                  ? car.fuel > 40 ? '#2196F3' : car.fuel > 20 ? '#FF9800' : '#FF5722'
                  : car.fuel > 40 ? '#4CAF50' : car.fuel > 20 ? '#FF9800' : '#F44336';
                return (
                  <div key={car.id} style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end', marginBottom: 4 }}>
                    <span style={{ fontSize: 9, color: '#f4ebd0', opacity: 0.6, minWidth: 28 }}>{Math.round(car.fuel)}%</span>
                    <div style={{ width: 64, height: 6, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${car.fuel}%`, background: col }} />
                    </div>
                    {car.siphonPhase === 2 && <span style={{ fontSize: 9, color: '#FF1744' }}>🪣</span>}
                  </div>
                );
              })}
            </div>
          )}

          {/* Player list dropdown */}
          {showPlayerList && (
            <div className="pp-dropdown" style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, zIndex: 60, minWidth: 150, maxHeight: 200, overflowY: 'auto' }}>
              {state.players.map(p => {
                const charDef = CHARACTERS[p.character];
                const isLocal = p.id === state.localPlayerId;
                const showAsSlivshchik = isLocal || (isSlivshchik && p.role === 'slivshchik');
                return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 5, opacity: p.isAlive ? 1 : 0.35, marginBottom: 3 }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%', background: charDef.color,
                      border: isLocal ? '2px solid #e5a50a' : '1px solid rgba(255,255,255,0.3)',
                      flexShrink: 0,
                    }} />
                    <div style={{
                      fontSize: 10, color: p.isAlive ? (isLocal ? '#e5a50a' : '#f4ebd0') : '#666',
                      textDecoration: p.isAlive ? 'none' : 'line-through', whiteSpace: 'nowrap',
                      fontWeight: isLocal ? 800 : 500,
                    }}>
                      {p.name}{!p.isAlive && ' 💀'}
                      {showAsSlivshchik && p.role === 'slivshchik' && <span style={{ color: '#FF5252', marginLeft: 3 }}>🪣</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Stamina bar (only when active) ── */}
      {(localPlayer.isSprinting || localPlayer.stamina < SPRINT_MAX - 0.1) && (
        <div style={{
          padding: '3px 10px',
          background: 'rgba(26,26,26,0.75)',
          borderBottom: '2px solid rgba(229,165,10,0.4)',
          display: 'flex', alignItems: 'center', gap: 7,
        }}>
          <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase',
            letterSpacing: '0.08em', color: localPlayer.isSprinting ? '#e5a50a' : 'rgba(244,235,208,0.45)', flexShrink: 0 }}>
            {localPlayer.isSprinting ? '🏃 СПРИНТ' : '😮‍💨 УСТАЛОСТЬ'}
          </span>
          <div style={{
            flex: 1, maxWidth: 110, height: 5,
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.12)',
          }}>
            <div style={{
              height: '100%', width: `${staminaPct}%`,
              background: localPlayer.isSprinting ? '#e5a50a' : '#81D4FA',
              transition: 'width 0.1s',
            }} />
          </div>
        </div>
      )}

      {/* ── Interaction prompt ── */}
      {state.promptText && !state.activeMiniGame && (
        <div style={{ textAlign: 'center', padding: '5px 0', pointerEvents: 'none' }}>
          <span className="pp-prompt" style={{ fontSize: Math.round(12 * textScale) }}>
            {state.promptText}
          </span>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          RIGHT COLUMN — one compact stack of same-size action buttons.
          Consolidates what used to be two separate button clusters (this
          HUD's own row plus a duplicate sprint/crouch/emote row rendered by
          <GameCanvas>) into a single 40px-button column so it stops eating
          into the play area.
          ════════════════════════════════════════════════════════════════════ */}
      <div className="pp-action-stack">

        {/* ── Sabotage (slivshchik only) ── */}
        {isSlivshchik && localPlayer.isAlive && (
          <div style={{ position: 'relative' }}>
            {showSabotageMenu && (
              <div className="pp-dropdown" style={{ position: 'absolute', bottom: 48, right: 0, minWidth: 220, zIndex: 55 }}>
                <div style={{ fontSize: 10, color: '#cc2b1d', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
                  ★ ДИВЕРСИИ
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {SABOTAGE_KEYS.map(key => {
                    const isActive = state.activeSabotages.some(s => s.key === key && !s.isResolved);
                    const onCooldown = sabotageCooldown > 0;
                    const blocked = isActive || onCooldown;
                    return (
                      <button key={key}
                        className="pp-btn"
                        disabled={blocked}
                        onClick={() => { triggerSabotage(key); setShowSabotageMenu(false); }}
                        style={{
                          padding: '7px 10px', textAlign: 'left',
                          background: blocked ? 'rgba(255,255,255,0.04)' : 'rgba(204,43,29,0.18)',
                          border: `1.5px solid ${blocked ? 'rgba(255,255,255,0.1)' : 'rgba(204,43,29,0.5)'}`,
                          borderRadius: 2, color: blocked ? '#555' : '#f4ebd0',
                          fontSize: 10, cursor: blocked ? 'not-allowed' : 'pointer',
                          display: 'flex', flexDirection: 'column', gap: 2,
                          boxShadow: blocked ? 'none' : '2px 2px 0 rgba(0,0,0,0.7)',
                          textTransform: 'none', letterSpacing: 'normal', fontWeight: 600,
                        }}
                      >
                        <span>{SABOTAGE_LABELS[key]}</span>
                        <span style={{ fontSize: 8, color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          {isActive ? '⚡ Уже активно' : onCooldown ? `⏱ ${Math.ceil(sabotageCooldown)}с` : `Кд ${SABOTAGE_COOLDOWNS[key]}с`}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <button onClick={() => setShowSabotageMenu(false)}
                  style={{ marginTop: 6, width: '100%', background: 'transparent', border: 'none',
                    color: 'rgba(244,235,208,0.3)', fontSize: 9, cursor: 'pointer',
                    textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800 }}>
                  ЗАКРЫТЬ
                </button>
              </div>
            )}
            <button
              className={`pp-action-btn${sabotageCooldown > 0 ? ' cooldown' : ''}`}
              onClick={() => setShowSabotageMenu(v => !v)}
              title="Диверсии"
              style={{ position: 'relative', background: 'var(--pp-red)' }}
            >
              🔧
              {sabotageCooldown > 0 && (
                <div style={{
                  position: 'absolute', bottom: -14, left: '50%', transform: 'translateX(-50%)',
                  fontSize: 8, color: '#888', whiteSpace: 'nowrap', fontWeight: 800,
                }}>
                  {Math.ceil(sabotageCooldown)}с
                </div>
              )}
            </button>
          </div>
        )}

        {/* ── Sprint toggle ── */}
        {localPlayer.isAlive && (
          <button
            className={`pp-action-btn${localPlayer.isSprinting ? ' active' : ''}`}
            onClick={() => { audio.init(); toggleTouchSprint(); }}
            title="Спринт (или двойное нажатие E)"
          >
            🏃
          </button>
        )}

        {/* ── Crouch (hold) ── */}
        {localPlayer.isAlive && (
          <button
            className={`pp-action-btn${isCrouchHeld ? ' active' : ''}`}
            onPointerDown={() => { audio.init(); setIsCrouchHeld(true); setTouchCrouch(true); }}
            onPointerUp={() => { setIsCrouchHeld(false); setTouchCrouch(false); }}
            onPointerLeave={() => { setIsCrouchHeld(false); setTouchCrouch(false); }}
            title="Пригнуться (удерживать)"
          >
            🦆
          </button>
        )}

        {/* ── Emote wheel ── */}
        {localPlayer.isAlive && (
          <div style={{ position: 'relative' }}>
            {showEmoteWheel && (
              <div style={{
                position: 'absolute', bottom: 48, right: 0,
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5,
              }}>
                {PLAY_EMOTES.map((emote, i) => (
                  <button key={i} className="pp-emote-btn"
                    onClick={() => { triggerEmote(gs.localPlayerId, emote); setShowEmoteWheel(false); }}
                  >{emote}</button>
                ))}
              </div>
            )}
            <button
              className={`pp-action-btn${showEmoteWheel ? ' active' : ''}`}
              onClick={() => setShowEmoteWheel(v => !v)}
              title="Эмоция (Q)"
            >
              😊
            </button>
          </div>
        )}

        {/* ── "Что делать?" button ── */}
        {localPlayer.isAlive && (
          <div style={{ position: 'relative' }}>
            <button
              className={`pp-action-btn${showObjective ? ' active' : ''}`}
              onClick={() => setShowObjective(o => !o)}
              title="Что делать?"
            >
              ❓
            </button>
            {showObjective && (
              <div className="pp-dropdown" style={{ position: 'absolute', bottom: 48, right: 0, width: 220, zIndex: 50 }}>
                {isSlivshchik ? (
                  <>
                    <div style={{ color: '#cc2b1d', fontWeight: 900, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>★ Ты — Сливщик</div>
                    {['Подойди к машине [E] → сливай бензин', 'Подними канистру после слива', 'Выброси канистру у мусорки', 'Делай вид, что выполняешь задачи', 'Вызывай диверсии через кнопку 🔧', 'Устраивай засаду в одиночестве'].map((s, i) => (
                      <div key={i} style={{ fontSize: 10, color: '#f4ebd0', opacity: 0.75, marginBottom: 3 }}>• {s}</div>
                    ))}
                  </>
                ) : (
                  <>
                    <div style={{ color: '#e5a50a', fontWeight: 900, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>★ Ты — Хозяин</div>
                    {['Выполняй задачи → метр единства', 'Следи за уровнем бензина в машинах', 'У арки [E] → вызвать сходку', 'На сходке голосуй за подозреваемых', 'Выгони сливщиков или доведи метр до 100%'].map((s, i) => (
                      <div key={i} style={{ fontSize: 10, color: '#f4ebd0', opacity: 0.75, marginBottom: 3 }}>• {s}</div>
                    ))}
                  </>
                )}
                <div style={{ marginTop: 6, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 5, fontSize: 8, color: 'rgba(244,235,208,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Нажми снова чтобы закрыть
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          LEFT COLUMN — minimap + settings, bottom-left
          ════════════════════════════════════════════════════════════════════ */}
      <div style={{
        position: 'absolute', bottom: 30, left: 10,
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8,
        pointerEvents: 'all',
      }}>
        {/* Minimap */}
        <div style={{ pointerEvents: 'none' }}>
          <Minimap state={state} />
        </div>

        {/* Settings */}
        <div style={{ position: 'relative', pointerEvents: 'all' }}>
          {showSettings && <SettingsPanel state={state} />}
          <button
            className={`pp-corner-btn${showSettings ? ' active' : ''}`}
            onClick={() => setShowSettings(v => !v)}
            title={t('hud_settings', state.language)}
            style={{ width: 36, height: 36 }}
          >
            ⚙️
          </button>
        </div>
      </div>

      {/* ── §3.1.3 Neutral role ability buttons ── */}
      {localPlayer.isAlive && localPlayer.neutralRole && (
        <div style={{
          position: 'absolute', bottom: 155, left: '50%', transform: 'translateX(-50%)',
          pointerEvents: 'all', display: 'flex', gap: 8,
        }}>
          {localPlayer.neutralRole === 'barsik' && (
            <button
              className="pp-btn"
              onClick={() => triggerBarsikMeow(gs.localPlayerId)}
              disabled={localPlayer.barsikMeowCooldown > 0}
              style={{
                padding: '6px 14px', borderRadius: 2, fontSize: 11,
                background: localPlayer.barsikMeowCooldown > 0 ? 'rgba(80,80,80,0.7)' : 'rgba(229,165,10,0.9)',
                border: '2px solid #1a1a1a',
                color: '#fff', boxShadow: localPlayer.barsikMeowCooldown > 0 ? 'none' : '3px 3px 0 #1a1a1a',
              }}
            >
              😺 МЯУ!{localPlayer.barsikMeowCooldown > 0 ? ` ${Math.ceil(localPlayer.barsikMeowCooldown)}с` : ''}
            </button>
          )}
          {localPlayer.neutralRole === 'policeman' && (
            <button
              className="pp-btn"
              onClick={() => investigateBody(gs.localPlayerId)}
              style={{
                padding: '6px 14px', borderRadius: 2, fontSize: 11,
                background: 'rgba(0,100,200,0.9)',
                border: '2px solid #1a1a1a', color: '#fff',
                boxShadow: '3px 3px 0 #1a1a1a',
              }}
            >
              🕵️ Расследовать тело
            </button>
          )}
          {localPlayer.neutralRole === 'janitor' && (
            <button
              className="pp-btn"
              onClick={() => janitorCollectCanister(gs.localPlayerId)}
              style={{
                padding: '6px 14px', borderRadius: 2, fontSize: 11,
                background: 'rgba(0,140,50,0.9)',
                border: '2px solid #1a1a1a', color: '#fff',
                boxShadow: '3px 3px 0 #1a1a1a',
              }}
            >
              🧹 Подобрать канистру ({localPlayer.canistersCollected}/3)
            </button>
          )}
        </div>
      )}

      {/* ── §10.2 Immunity ticket badge ── */}
      {localPlayer.hasImmunityTicket && (
        <div style={{ position: 'absolute', top: 80, right: 12, pointerEvents: 'none' }}>
          <div className="pp-ticket-badge">
            🎟️ ТАЛОН В РУКАХ
            <span style={{ fontSize: 8, fontWeight: 600, opacity: 0.7 }}>Подойди к баку [E]</span>
          </div>
        </div>
      )}

      {/* ── Siphon audio alert ── */}
      {nearAudioSiphon && (
        <div style={{
          position: 'absolute', top: '50%', left: 14, transform: 'translateY(-50%)',
          pointerEvents: 'none',
        }}>
          <div className="pp-siphon-alert">
            <span style={{ fontSize: 18 }}>⚠️</span>
            <div>
              <div style={{ fontSize: 9, fontWeight: 900, color: '#cc2b1d', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                СЛЫШЕН СЛИВ
              </div>
              <div style={{ fontSize: 8, color: '#f4ebd0', opacity: 0.6 }}>где-то рядом...</div>
            </div>
          </div>
        </div>
      )}

      {/* ── §12.4 Tutorial overlay — propaganda poster style.
          Anchored below the top strip (not above the joystick/action
          buttons) so it never overlaps mobile controls and its Skip
          button stays reachable regardless of screen size. ── */}
      {state.tutorialStep >= 1 && state.tutorialStep <= 3 && state.phase === 'play' && (
        <div style={{
          position: 'fixed', top: 74, left: '50%', transform: 'translateX(-50%)',
          pointerEvents: 'all', zIndex: 200,
        }}>
          <div className="pp-tutorial">
            {state.tutorialStep === 1 && (
              <>
                <div style={{ fontSize: 26, marginBottom: 6 }}>🌯</div>
                <div className="pp-tutorial-title" style={{ fontSize: Math.round(14 * textScale) }}>
                  Добро пожаловать!
                </div>
                <div className="pp-tutorial-body" style={{ fontSize: Math.round(11 * textScale) }}>
                  Подойди к ларьку с шавермой ↗<br />
                  <span style={{ fontSize: Math.round(9 * textScale), opacity: 0.5 }}>Смотри на метки на миникарте</span>
                </div>
              </>
            )}
            {state.tutorialStep === 2 && (
              <>
                <div style={{ fontSize: 26, marginBottom: 6 }}>🌯</div>
                <div className="pp-tutorial-title" style={{ fontSize: Math.round(14 * textScale) }}>
                  Ты у ларька!
                </div>
                <div className="pp-tutorial-body" style={{ fontSize: Math.round(11 * textScale) }}>
                  Нажми [E] чтобы купить шаверму<br />
                  <span style={{ fontSize: Math.round(9 * textScale), opacity: 0.5 }}>Задачи пополняют метр единства</span>
                </div>
              </>
            )}
            {state.tutorialStep === 3 && (
              <>
                <div style={{ fontSize: 26, marginBottom: 6 }}>✅</div>
                <div className="pp-tutorial-title" style={{ fontSize: Math.round(14 * textScale), color: '#2e7d32' }}>
                  Молодец!
                </div>
                <div className="pp-tutorial-body" style={{ fontSize: Math.round(11 * textScale) }}>
                  Выполняй задачи, следи за баками.<br />Удачи в ЖК!
                </div>
              </>
            )}
            <button className="pp-tutorial-skip" onClick={dismissTutorial}>
              Пропустить обучение
            </button>
          </div>
        </div>
      )}

      {/* ── §9.2 Backstab Moment toast ── */}
      {state.backstabMoment && !state.backstabMomentAcked && (
        <div style={{
          position: 'absolute', top: 70, left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 120, pointerEvents: 'all',
          animation: 'pp-backstab-in 0.6s ease-in-out',
        }}>
          <div className="pp-backstab">
            <div style={{
              fontSize: 14, fontWeight: 900, color: '#cc2b1d',
              textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
              💥 БАКСТАБ МОМЕНТ!
            </div>
            <div style={{ fontSize: 10, color: '#1a1a1a', opacity: 0.65, textAlign: 'center' }}>
              {state.backstabMoment === 'catch_siphoner'   && 'Ты поймал Сливщика за сливом!'}
              {state.backstabMoment === 'caught_siphoning' && 'Тебя застукали во время слива!'}
              {state.backstabMoment === 'dramatic_eject'   && 'Тебя выбросили из двора!'}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {getMomentDataUrl() && (
                <button
                  className="pp-btn"
                  onClick={() => { downloadMoment(); gs.backstabMomentAcked = true; }}
                  style={{
                    padding: '5px 12px', borderRadius: 2, fontSize: 10,
                    background: '#cc2b1d', border: '2px solid #1a1a1a',
                    color: '#fff', boxShadow: '3px 3px 0 #1a1a1a',
                  }}
                >
                  💾 Скачать момент
                </button>
              )}
              <button
                onClick={() => { gs.backstabMomentAcked = true; }}
                style={{
                  padding: '5px 10px', borderRadius: 2,
                  background: 'transparent', border: '1.5px solid rgba(26,26,26,0.25)',
                  color: 'rgba(26,26,26,0.45)', fontSize: 10, cursor: 'pointer',
                  fontWeight: 800,
                }}
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Meeting cooldown ── */}
      {state.meetingCooldown > 0 && (
        <div style={{ position: 'absolute', bottom: 26, right: 10, pointerEvents: 'none' }}>
          <span className="pp-meeting-cd">
            🔔 сходка {Math.ceil(state.meetingCooldown)}с
          </span>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          NEWS TICKER — propaganda strip at the very bottom
          ════════════════════════════════════════════════════════════════════ */}
      <div className="pp-ticker-bar" style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
        <div className="pp-ticker-label">АИ-95 ₽{state.ai95Price}/л</div>
        <div className="pp-ticker-scroll">
          <span className="pp-ticker-text">
            {NEWS_HEADLINES[state.tickerIndex]}
          </span>
        </div>
      </div>
    </div>
  );
}
