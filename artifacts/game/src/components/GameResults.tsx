import React, { useRef, useState, useEffect } from 'react';
import type { GameState, Player } from '../game/types';
import { CHARACTERS } from '../data/characters';
import { applyMatchRewards, unlockAchievementNow, type MatchRewards } from '../game/rewards';
import { loadProfile } from '../game/profile';
import { t } from '../i18n/strings';

// ── Propaganda design tokens ──────────────────────────────────────────────────
const P_RED     = '#cc2b1d';
const P_MUSTARD = '#e5a50a';
const P_CREAM   = '#f4ebd0';
const P_BLACK   = '#1a1a1a';

interface Props {
  gs: GameState;
  onPlayAgain: () => void;
}

// ─── §9.1 Per-match title generation ─────────────────────────────────────────
function getMatchTitle(
  player: Player | undefined,
  winner: string | null,
  unityMeter: number,
  winReason: string,
): string {
  if (!player) return '👀 Наблюдатель';

  const iWon = (winner === 'khozaeva' && player.role === 'khozain') ||
               (winner === 'slivshchiki' && player.role === 'slivshchik');

  if (player.neutralRole === 'barsik') return '🐱 Котик Двора';
  if (player.neutralRole === 'janitor') {
    return player.canistersCollected >= 3 ? '🧹 Чемпион Чистоты' : '🧹 Дворник Года';
  }
  if (player.neutralRole === 'policeman') return '🕵️ Участковый Года';

  if (player.role === 'slivshchik') {
    if (iWon) {
      if (player.fuelSiphoned >= 70) return '⛽ Топливный Барон';
      if (!player.isAlive) return '🪣 Мученик Слива';
      return '🪣 Мастер Слива';
    } else {
      if (!player.isAlive) return '🪤 Попался с Канистрой';
      return '🚨 Жертва Сходки';
    }
  }

  // khozain
  if (iWon) {
    if (unityMeter >= 99) return '🏗️ Строитель Двора';
    if (player.tasksCompleted >= 5) return '💪 Трудяга Двора';
    if (winReason.includes('Сливщик') || winReason.includes('выкинул')) return '🔍 Детектив ЖК';
    return '🏠 Страж Двора';
  } else {
    if (!player.isAlive) return '💀 Жертва Слива';
    return '⛽ Пустой Бак';
  }
}

// ── Propaganda stat card ─────────────────────────────────────────────────────
function StatCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={{
      background: '#fff', border: `3px solid ${P_BLACK}`,
      boxShadow: `3px 3px 0 ${accent ?? P_BLACK}`,
      padding: '8px 10px',
    }}>
      <div style={{ fontSize: 18, fontWeight: 900, color: accent ?? P_RED, fontFamily: 'Oswald, sans-serif', lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 9, fontWeight: 700, color: P_BLACK, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 }}>
        {label}
      </div>
    </div>
  );
}

function RewardStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 20, fontWeight: 900, color, fontFamily: 'Oswald, sans-serif' }}>{value}</div>
      <div style={{ fontSize: 9, color: P_BLACK, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>{label}</div>
    </div>
  );
}

export default function GameResults({ gs, onPlayAgain }: Props) {
  const localPlayer = gs.players.find(p => p.id === gs.localPlayerId);
  const myRole = localPlayer?.role ?? 'khozain';
  const iWon = (gs.winner === 'khozaeva' && myRole === 'khozain') ||
               (gs.winner === 'slivshchiki' && myRole === 'slivshchik');
  const matchTitle = getMatchTitle(localPlayer, gs.winner, gs.unityMeter, gs.winReason);

  const slivshchiki = gs.players.filter(p => p.role === 'slivshchik');

  const totalFuelStolen = gs.cars.reduce((acc, c) => acc + (100 - c.fuel), 0);
  const totalTasksDone = gs.tasks.filter(t => t.isComplete).length;
  const aliveTime = Math.floor(gs.time);

  // ── §3.2/§3.3/§3.6 Apply rewards once on mount ────────────────────────────
  const [rewards, setRewards] = useState<MatchRewards | null>(null);
  const rewardsApplied = useRef(false);
  useEffect(() => {
    if (!rewardsApplied.current) {
      rewardsApplied.current = true;
      const r = applyMatchRewards(gs);
      setRewards(r);
    }
  }, []); // eslint-disable-line

  const profile = loadProfile();

  const XP_PER_TIER = 500;
  const xpInTier = profile.battlePassXP % XP_PER_TIER;
  const tierPct = Math.round((xpInTier / XP_PER_TIER) * 100);

  // ── §9.1 Share card ────────────────────────────────────────────────────────
  function generateShareCard() {
    const canvas = document.createElement('canvas');
    canvas.width = 1080; canvas.height = 1080;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createLinearGradient(0, 0, 0, 1080);
    grad.addColorStop(0, iWon ? '#1B5E20' : '#B71C1C');
    grad.addColorStop(1, '#0A0A0A');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1080, 1080);

    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 72px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('95-Й БАКСТАБ', 540, 120);

    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 96px sans-serif';
    ctx.fillText(iWon ? '🏆 ПОБЕДА!' : '💀 ПОРАЖЕНИЕ', 540, 240);

    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '36px sans-serif';
    ctx.fillText(gs.winReason, 540, 320);

    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.roundRect(80, 370, 920, 200, 20);
    ctx.fill();

    const statPairs = [
      ['Время игры', `${Math.floor(aliveTime / 60)}:${(aliveTime % 60).toString().padStart(2, '0')}`],
      ['Единство', `${Math.round(gs.unityMeter)}%`],
      ['Задач', `${totalTasksDone}`],
      ['Слито топлива', `${Math.round(totalFuelStolen)}%`],
    ];
    statPairs.forEach(([label, val], i) => {
      const x = 180 + i * 220;
      ctx.fillStyle = '#FFF';
      ctx.font = 'bold 48px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(val, x, 460);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '28px sans-serif';
      ctx.fillText(label, x, 510);
    });

    if (localPlayer) {
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.beginPath();
      ctx.roundRect(80, 570, 920, 200, 20);
      ctx.fill();

      ctx.fillStyle = iWon ? '#FFD700' : '#FF8A80';
      ctx.font = 'bold 44px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(matchTitle, 540, 630);

      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 30px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${localPlayer.name} — ${localPlayer.role === 'slivshchik' ? '🪣 Сливщик' : '🏠 Хозяин'}`, 120, 695);
      ctx.fillStyle = '#ccc';
      ctx.font = '26px sans-serif';
      ctx.fillText(`Топлива слито: ${Math.round(localPlayer.fuelSiphoned)}% | Задач: ${localPlayer.tasksCompleted}`, 120, 740);

      if (rewards) {
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 28px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`+${rewards.babkiEarned} бабок  |  +${rewards.xpEarned} XP`, 540, 790);
      }
    }

    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('→ @fuel_fuel_fuel_bot', 540, 890);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '30px sans-serif';
    ctx.fillText('Играй в 95-Й Бакстаб | АИ-95 уже 87₽', 540, 945);

    const link = document.createElement('a');
    link.download = '95-backstab-result.png';
    link.href = canvas.toDataURL('image/png');
    link.click();

    unlockAchievementNow('share_card');
  }

  const fmtTime = `${Math.floor(aliveTime / 60)}:${(aliveTime % 60).toString().padStart(2, '0')}`;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 60,
      background: P_CREAM,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      overflowY: 'auto', fontFamily: 'Oswald, sans-serif',
    }}>
      {/* ── Hero banner ── */}
      <div style={{
        width: '100%',
        background: iWon ? P_MUSTARD : P_RED,
        borderBottom: `8px solid ${P_BLACK}`,
        padding: '24px 16px 20px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Diagonal accent */}
        <div style={{
          position: 'absolute', inset: 0,
          background: `repeating-linear-gradient(135deg, transparent, transparent 12px, rgba(0,0,0,0.06) 12px, rgba(0,0,0,0.06) 14px)`,
          pointerEvents: 'none',
        }} />
        <div style={{ fontSize: 52, marginBottom: 4 }}>{iWon ? '🏆' : '💀'}</div>
        <div style={{
          fontSize: 36, fontWeight: 900, color: iWon ? P_BLACK : P_CREAM,
          letterSpacing: 2, textTransform: 'uppercase',
          textShadow: iWon ? `3px 3px 0 ${P_RED}` : `3px 3px 0 ${P_BLACK}`,
        }}>
          {iWon ? t('result_win', gs.language) : t('result_lose', gs.language)}
        </div>
        <div style={{
          display: 'inline-block',
          marginTop: 8, padding: '4px 14px',
          background: P_BLACK, color: iWon ? P_MUSTARD : P_CREAM,
          fontSize: 14, fontWeight: 900, textTransform: 'uppercase',
          letterSpacing: 1, boxShadow: `3px 3px 0 ${iWon ? P_RED : P_MUSTARD}`,
        }}>
          {matchTitle}
        </div>
        <div style={{ fontSize: 12, color: iWon ? P_BLACK : 'rgba(255,255,255,0.8)', marginTop: 8, fontWeight: 700, textTransform: 'uppercase' }}>
          {gs.winReason}
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: 420, padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* ── §3.2/§3.3 Rewards panel ── */}
        {rewards && (
          <div style={{
            background: '#fff',
            border: `4px solid ${P_BLACK}`,
            boxShadow: `6px 6px 0 ${P_MUSTARD}`,
          }}>
            <div style={{
              background: P_BLACK, color: P_MUSTARD,
              padding: '6px 12px', fontSize: 11, fontWeight: 900,
              textTransform: 'uppercase', letterSpacing: 1,
            }}>
              💰 НАГРАДЫ ЗА МАТЧ
            </div>
            <div style={{ padding: '12px 14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 12 }}>
                <RewardStat label="Бабки" value={`+${rewards.babkiEarned}`} color={P_RED} />
                <RewardStat label="Опыт BP" value={`+${rewards.xpEarned} XP`} color="#1565C0" />
              </div>

              {/* BP bar */}
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 9, color: '#666', fontWeight: 700, textTransform: 'uppercase' }}>
                    Боевой Пропуск — Ур. {profile.battlePassTier}
                  </span>
                  <span style={{ fontSize: 9, color: '#1565C0', fontWeight: 900 }}>{tierPct}%</span>
                </div>
                <div style={{ height: 10, background: P_BLACK, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${tierPct}%`,
                    background: `linear-gradient(90deg, ${P_RED}, ${P_MUSTARD})`,
                    transition: 'width 1s ease',
                  }} />
                </div>
                {rewards.tiersAfter > rewards.tiersBefore && (
                  <div style={{ fontSize: 11, color: P_RED, textAlign: 'center', marginTop: 6, fontWeight: 900, textTransform: 'uppercase' }}>
                    🎉 Уровень {rewards.tiersAfter}!
                  </div>
                )}
              </div>

              <div style={{ textAlign: 'center', fontSize: 11, color: '#666', fontWeight: 700 }}>
                Баланс: <span style={{ color: P_RED, fontWeight: 900 }}>{profile.babki} 💰</span>
              </div>
            </div>
          </div>
        )}

        {/* ── §3.5 Daily challenge ── */}
        {rewards?.dailyDef && (
          <div style={{
            background: rewards.dailyCompleted ? P_MUSTARD : '#fff',
            border: `4px solid ${P_BLACK}`,
            boxShadow: `4px 4px 0 ${rewards.dailyCompleted ? P_RED : P_BLACK}`,
          }}>
            <div style={{
              background: P_BLACK, color: P_CREAM,
              padding: '6px 12px', fontSize: 10, fontWeight: 900,
              textTransform: 'uppercase', letterSpacing: 1,
            }}>
              ☀️ ЕЖЕДНЕВНОЕ ЗАДАНИЕ
            </div>
            <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ fontSize: 12, color: P_BLACK, fontWeight: 700 }}>
                {rewards.dailyDef.emoji} {rewards.dailyDef.label}
              </div>
              <div style={{ fontSize: 14, color: rewards.dailyCompleted ? P_BLACK : P_RED, fontWeight: 900, flexShrink: 0 }}>
                {rewards.dailyCompleted ? '✅ +200' : `${rewards.dailyProgress}/${rewards.dailyTarget}`}
              </div>
            </div>
          </div>
        )}

        {/* ── §3.6 New achievements ── */}
        {rewards && rewards.newAchievements.length > 0 && (
          <div style={{
            background: '#fff', border: `4px solid ${P_BLACK}`, boxShadow: `4px 4px 0 ${P_MUSTARD}`,
          }}>
            <div style={{
              background: P_MUSTARD, color: P_BLACK,
              padding: '6px 12px', fontSize: 10, fontWeight: 900,
              textTransform: 'uppercase', letterSpacing: 1,
            }}>
              🏅 НОВЫЕ ДОСТИЖЕНИЯ
            </div>
            <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {rewards.newAchievements.map(ach => (
                <div key={ach.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '6px 0', borderBottom: `1px solid ${P_BLACK}22`,
                }}>
                  <div style={{ fontSize: 22, flexShrink: 0 }}>{ach.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 900, color: P_BLACK, textTransform: 'uppercase' }}>{ach.title}</div>
                    <div style={{ fontSize: 9, color: '#666', fontWeight: 700 }}>{ach.description}</div>
                  </div>
                  <div style={{ fontSize: 12, color: P_RED, fontWeight: 900, flexShrink: 0 }}>+{ach.babkiReward}💰</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Match stats ── */}
        <div>
          <div style={{
            background: P_BLACK, color: P_CREAM,
            padding: '6px 12px', fontSize: 10, fontWeight: 900,
            textTransform: 'uppercase', letterSpacing: 1,
            borderBottom: 'none',
          }}>
            📊 СТАТИСТИКА МАТЧА
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, background: P_BLACK }}>
            <StatCard label="Время игры" value={fmtTime} accent={P_RED} />
            <StatCard label="Единство" value={`${Math.round(gs.unityMeter)}%`} accent={P_MUSTARD} />
            <StatCard label="Задач" value={`${totalTasksDone}`} accent="#4CAF50" />
            <StatCard label="Слито топлива" value={`${Math.round(totalFuelStolen)}%`} accent={P_RED} />
          </div>
        </div>

        {/* ── Per-player breakdown ── */}
        <div style={{ background: '#fff', border: `4px solid ${P_BLACK}`, boxShadow: `4px 4px 0 ${P_BLACK}` }}>
          <div style={{
            background: P_BLACK, color: P_CREAM,
            padding: '6px 12px', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1,
          }}>
            ИГРОКИ
          </div>
          <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 0 }}>
            {gs.players.map(p => {
              const charDef = CHARACTERS[p.character];
              const isSlivy = p.role === 'slivshchik';
              const isMe = p.id === gs.localPlayerId;
              return (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 0', borderBottom: `1px solid ${P_BLACK}18`,
                  opacity: p.isAlive ? 1 : 0.55,
                }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%', background: charDef.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
                    border: isMe ? `2px solid ${P_MUSTARD}` : `1px solid ${P_BLACK}`,
                    flexShrink: 0,
                  }}>
                    {charDef.emoji}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: isMe ? 900 : 700, color: isMe ? P_RED : P_BLACK, textTransform: 'uppercase' }}>
                      {p.name} {isSlivy ? '🪣' : '🏠'}
                      {p.neutralRole === 'barsik' ? '😺' : p.neutralRole === 'policeman' ? '🕵️' : p.neutralRole === 'janitor' ? '🧹' : ''}
                      {!p.isAlive && ' 💀'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 10, fontWeight: 900, color: isSlivy ? P_RED : '#2e7d32' }}>
                    {isSlivy ? `⛽${Math.round(p.fuelSiphoned)}%` : `✅${p.tasksCompleted}`}
                    {isMe && p.correctVotes > 0 && <><br/><span style={{ color: '#1565C0' }}>🗳️{p.correctVotes}</span></>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Role reveal ── */}
        <div style={{ background: '#fff', border: `4px solid ${P_BLACK}`, boxShadow: `4px 4px 0 ${P_RED}` }}>
          <div style={{
            background: P_RED, color: P_CREAM,
            padding: '6px 12px', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1,
          }}>
            🪣 СЛИВЩИКИ БЫЛИ:
          </div>
          <div style={{ padding: '12px', display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
            {slivshchiki.map(p => (
              <div key={p.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <div style={{ fontSize: 28 }}>{CHARACTERS[p.character].emoji}</div>
                <div style={{ fontSize: 10, color: P_RED, fontWeight: 900, textTransform: 'uppercase' }}>{p.name}</div>
                <div style={{ fontSize: 9, color: '#666', fontWeight: 700 }}>{p.isAlive ? '(выжил)' : '(выброшен)'}</div>
                <div style={{ fontSize: 9, color: P_RED, fontWeight: 700 }}>слито: {Math.round(p.fuelSiphoned)}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── CTA: viral / share ── */}
        {(() => {
          const tg = (window as any).Telegram?.WebApp;
          const shareUrl = `https://t.me/bakstab_bot?startapp=invite_${loadProfile().deviceId}`;
          const shareText = iWon
            ? `🏆 Вычислил сливщика! АИ-95 в безопасности. Играй: 95-Й Бакстаб`
            : `🪣 Меня поймали на сливе! Попробуй сам: 95-Й Бакстаб`;
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                onClick={() => {
                  if (tg?.openTelegramLink) tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`);
                  else if (navigator.share) navigator.share({ text: shareText, url: shareUrl });
                  else generateShareCard();
                }}
                style={{
                  width: '100%', padding: '14px',
                  background: P_MUSTARD, border: `4px solid ${P_BLACK}`,
                  boxShadow: `6px 6px 0 ${P_BLACK}`,
                  fontSize: 15, fontWeight: 900, color: P_BLACK,
                  cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 1,
                  fontFamily: 'Oswald, sans-serif',
                }}
              >
                📣 Поделиться результатом
              </button>
              <button
                onClick={generateShareCard}
                style={{
                  width: '100%', padding: '10px',
                  background: '#fff', border: `3px solid ${P_BLACK}`,
                  boxShadow: `3px 3px 0 ${P_BLACK}`,
                  fontSize: 12, fontWeight: 900, color: P_BLACK,
                  cursor: 'pointer', textTransform: 'uppercase',
                  fontFamily: 'Oswald, sans-serif',
                }}
              >
                💾 Скачать карточку
              </button>
              <button
                onClick={() => {
                  if (tg?.openTelegramLink) tg.openTelegramLink('https://t.me/fuel_fuel_fuel_bot');
                  else window.open('https://t.me/fuel_fuel_fuel_bot', '_blank');
                }}
                style={{
                  width: '100%', padding: '10px',
                  background: '#fff', border: `3px solid ${P_BLACK}`,
                  boxShadow: `3px 3px 0 ${P_MUSTARD}`,
                  fontSize: 12, fontWeight: 900, color: P_BLACK,
                  cursor: 'pointer', textTransform: 'uppercase',
                  fontFamily: 'Oswald, sans-serif',
                }}
              >
                ⛽ Получить талоны на АИ-95 → @fuel_fuel_fuel_bot
              </button>
            </div>
          );
        })()}

        {/* ── Play Again ── */}
        <button
          onClick={onPlayAgain}
          style={{
            width: '100%', padding: '18px',
            background: P_RED, border: `4px solid ${P_BLACK}`,
            boxShadow: `8px 8px 0 ${P_BLACK}`,
            fontSize: 20, fontWeight: 900, color: P_CREAM,
            cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 2,
            fontFamily: 'Oswald, sans-serif',
            marginBottom: 32,
          }}
        >
          🎮 {t('result_play_again', gs.language)}
        </button>

      </div>
    </div>
  );
}
