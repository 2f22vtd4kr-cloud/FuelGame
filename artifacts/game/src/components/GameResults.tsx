import React, { useRef, useState, useEffect } from 'react';
import type { GameState, Player } from '../game/types';
import { CHARACTERS } from '../data/characters';
import { applyMatchRewards, type MatchRewards } from '../game/rewards';
import { loadProfile } from '../game/profile';

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

  // ── §3.3 Battle pass progress bar ─────────────────────────────────────────
  const XP_PER_TIER = 500;
  const xpInTier = profile.battlePassXP % XP_PER_TIER;
  const tierPct = Math.round((xpInTier / XP_PER_TIER) * 100);

  // ── §9.1 Share card generation ─────────────────────────────────────────────
  function generateShareCard() {
    const canvas = document.createElement('canvas');
    canvas.width = 1080; canvas.height = 1080;
    const ctx = canvas.getContext('2d')!;

    // Background gradient
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
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 60,
      background: iWon
        ? 'linear-gradient(180deg, #1B5E20 0%, #0A0A0A 100%)'
        : 'linear-gradient(180deg, #B71C1C 0%, #0A0A0A 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      overflowY: 'auto', fontFamily: 'sans-serif', padding: '24px 16px',
    }}>
      {/* Result headline */}
      <div style={{ fontSize: 56, marginBottom: 6 }}>
        {iWon ? '🏆' : '💀'}
      </div>
      <div style={{
        fontSize: 26, fontWeight: 'bold', color: '#FFF',
        letterSpacing: 2, textAlign: 'center', marginBottom: 4,
      }}>
        {iWon ? 'ПОБЕДА!' : 'ПОРАЖЕНИЕ'}
      </div>

      {/* §9.1 Per-match title */}
      <div style={{
        fontSize: 18, fontWeight: 'bold',
        color: iWon ? '#FFD700' : '#FF8A80',
        textAlign: 'center', marginBottom: 4,
        letterSpacing: 1,
        textShadow: iWon ? '0 0 16px rgba(255,215,0,0.5)' : '0 0 16px rgba(255,100,50,0.4)',
      }}>
        {matchTitle}
      </div>

      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginBottom: 4 }}>
        {gs.winner === 'khozaeva' ? '🏠 Хозяева победили' : '🪣 Сливщики победили'}
      </div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: 20, fontStyle: 'italic' }}>
        {gs.winReason}
      </div>

      {/* ── §3.2/§3.3 Rewards panel ── */}
      {rewards && (
        <div style={{
          width: '100%', maxWidth: 340,
          background: 'rgba(255,215,0,0.1)',
          border: '1.5px solid rgba(255,215,0,0.35)',
          borderRadius: 14, padding: '14px 16px', marginBottom: 16,
        }}>
          <div style={{ fontSize: 11, color: '#FFD700', marginBottom: 10, letterSpacing: 1, textAlign: 'center' }}>
            💰 НАГРАДЫ ЗА МАТЧ
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <RewardStat label="Бабки" value={`+${rewards.babkiEarned}`} color="#FFD700" />
            <RewardStat label="Опыт BP" value={`+${rewards.xpEarned} XP`} color="#64B5F6" />
          </div>

          {/* Battle Pass progress */}
          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 10, color: '#9E9E9E' }}>Боевой Пропуск — Ур. {profile.battlePassTier}</span>
              <span style={{ fontSize: 10, color: '#64B5F6' }}>{tierPct}%</span>
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 3,
                background: 'linear-gradient(90deg, #1565C0, #64B5F6)',
                width: `${tierPct}%`,
                transition: 'width 1s ease',
              }} />
            </div>
            {rewards.tiersAfter > rewards.tiersBefore && (
              <div style={{ fontSize: 11, color: '#FFD700', textAlign: 'center', marginTop: 6, fontWeight: 'bold' }}>
                🎉 Уровень {rewards.tiersAfter}!
              </div>
            )}
          </div>

          {/* Babki balance */}
          <div style={{ marginTop: 10, textAlign: 'center', fontSize: 12, color: '#9E9E9E' }}>
            Баланс: <span style={{ color: '#FFD700', fontWeight: 'bold' }}>{profile.babki} 💰</span>
          </div>
        </div>
      )}

      {/* ── §3.5 Daily challenge progress ── */}
      {rewards?.dailyDef && (
        <div style={{
          width: '100%', maxWidth: 340,
          background: rewards.dailyCompleted ? 'rgba(76,175,80,0.15)' : 'rgba(255,255,255,0.05)',
          border: `1.5px solid ${rewards.dailyCompleted ? 'rgba(76,175,80,0.5)' : 'rgba(255,255,255,0.12)'}`,
          borderRadius: 14, padding: '12px 16px', marginBottom: 16,
        }}>
          <div style={{ fontSize: 11, color: '#9E9E9E', marginBottom: 6, letterSpacing: 1 }}>
            ☀️ ЕЖЕДНЕВНОЕ ЗАДАНИЕ
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ fontSize: 13, color: '#FFF' }}>
              {rewards.dailyDef.emoji} {rewards.dailyDef.label}
            </div>
            <div style={{ fontSize: 12, color: rewards.dailyCompleted ? '#4CAF50' : '#FFD700', fontWeight: 'bold', flexShrink: 0 }}>
              {rewards.dailyCompleted ? '✅ +200' : `${rewards.dailyProgress}/${rewards.dailyTarget}`}
            </div>
          </div>
        </div>
      )}

      {/* ── §3.6 Newly unlocked achievements ── */}
      {rewards && rewards.newAchievements.length > 0 && (
        <div style={{
          width: '100%', maxWidth: 340,
          background: 'rgba(255,255,255,0.05)',
          borderRadius: 14, padding: '12px 16px', marginBottom: 16,
        }}>
          <div style={{ fontSize: 11, color: '#9E9E9E', marginBottom: 8, letterSpacing: 1 }}>
            🏅 НОВЫЕ ДОСТИЖЕНИЯ
          </div>
          {rewards.newAchievements.map(ach => (
            <div key={ach.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '6px 0',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}>
              <div style={{ fontSize: 24, flexShrink: 0 }}>{ach.emoji}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 'bold', color: '#FFD700' }}>{ach.title}</div>
                <div style={{ fontSize: 10, color: '#9E9E9E' }}>{ach.description}</div>
              </div>
              <div style={{ fontSize: 11, color: '#FFD700', fontWeight: 'bold', flexShrink: 0 }}>
                +{ach.babkiReward}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Match stats */}
      <div style={{
        width: '100%', maxWidth: 340,
        background: 'rgba(255,255,255,0.08)', borderRadius: 14,
        padding: '14px 16px', marginBottom: 16,
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
      }}>
        <Stat label="Время игры" value={`${Math.floor(aliveTime / 60)}:${(aliveTime % 60).toString().padStart(2, '0')}`} />
        <Stat label="Единство" value={`${Math.round(gs.unityMeter)}%`} />
        <Stat label="Задач выполнено" value={`${totalTasksDone}`} />
        <Stat label="Топлива слито" value={`${Math.round(totalFuelStolen)}%`} />
      </div>

      {/* §9.1 Per-player breakdown */}
      <div style={{
        width: '100%', maxWidth: 340,
        background: 'rgba(255,255,255,0.05)', borderRadius: 14,
        padding: '12px 14px', marginBottom: 16,
      }}>
        <div style={{ fontSize: 11, color: '#9E9E9E', marginBottom: 10, textAlign: 'center', letterSpacing: 1 }}>
          СТАТИСТИКА ИГРОКОВ
        </div>
        {gs.players.map(p => {
          const charDef = CHARACTERS[p.character];
          const isSlivy = p.role === 'slivshchik';
          const isMe = p.id === gs.localPlayerId;
          return (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '5px 0',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              opacity: p.isAlive ? 1 : 0.6,
            }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%',
                background: charDef.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, flexShrink: 0,
                border: isMe ? '2px solid #FFD700' : '1px solid rgba(255,255,255,0.2)',
              }}>
                {charDef.emoji}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: 11, fontWeight: isMe ? 'bold' : 'normal',
                  color: isMe ? '#FFD700' : '#ddd',
                }}>
                  {p.name} {isSlivy ? '🪣' : '🏠'}
                  {p.neutralRole === 'barsik' ? '😺' : p.neutralRole === 'policeman' ? '🕵️' : p.neutralRole === 'janitor' ? '🧹' : ''}
                  {!p.isAlive && ' 💀'}
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: 9, color: '#999', lineHeight: 1.5 }}>
                {isSlivy
                  ? <span style={{ color: '#EF9A9A' }}>⛽{Math.round(p.fuelSiphoned)}%</span>
                  : <span style={{ color: '#A5D6A7' }}>✅{p.tasksCompleted}</span>
                }
                {isMe && p.correctVotes > 0 && (
                  <><br/><span style={{ color: '#64B5F6' }}>🗳️{p.correctVotes}</span></>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Role reveal */}
      <div style={{
        width: '100%', maxWidth: 340,
        background: 'rgba(255,255,255,0.05)', borderRadius: 14,
        padding: '14px 16px', marginBottom: 16,
      }}>
        <div style={{ fontSize: 11, color: '#9E9E9E', marginBottom: 10, textAlign: 'center' }}>
          СЛИВЩИКИ БЫЛИ:
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
          {slivshchiki.map(p => (
            <div key={p.id} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            }}>
              <div style={{ fontSize: 28 }}>{CHARACTERS[p.character].emoji}</div>
              <div style={{ fontSize: 10, color: '#EF5350', fontWeight: 'bold' }}>
                {p.name}
              </div>
              <div style={{ fontSize: 9, color: '#9E9E9E' }}>
                {p.isAlive ? '(выжил)' : '(выброшен)'}
              </div>
              <div style={{ fontSize: 9, color: '#FF8A80' }}>
                слито: {Math.round(p.fuelSiphoned)}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{
        width: '100%', maxWidth: 340,
        background: iWon
          ? 'rgba(76,175,80,0.15)'
          : 'rgba(244,67,54,0.15)',
        border: `1.5px solid ${iWon ? 'rgba(76,175,80,0.4)' : 'rgba(244,67,54,0.4)'}`,
        borderRadius: 14, padding: '14px 16px', marginBottom: 16, textAlign: 'center',
      }}>
        <div style={{ fontSize: 12, color: '#FFF', lineHeight: 1.5, marginBottom: 6 }}>
          {iWon
            ? '🛡️ Вы защитили двор! А в реальности?\nАИ-95 уже 87₽. Зафиксируй цену на 3 месяца:'
            : '⛽ Ваш бак пуст. Не будь жертвой сифонеров — купи талоны по старой цене:'}
        </div>
        <div style={{
          fontSize: 15, fontWeight: 'bold', color: '#FFD700',
          fontFamily: 'monospace', letterSpacing: 1,
        }}>
          → @fuel_fuel_fuel_bot
        </div>
      </div>

      {/* §9.1 Share card button */}
      <button
        onClick={generateShareCard}
        style={{
          width: '100%', maxWidth: 340, marginBottom: 12,
          padding: '12px',
          background: 'rgba(255,215,0,0.15)',
          border: '1.5px solid rgba(255,215,0,0.5)',
          borderRadius: 14, fontSize: 13, fontWeight: 'bold',
          color: '#FFD700', cursor: 'pointer',
        }}
      >
        📸 Скачать карточку результата (PNG)
      </button>

      {/* Play again */}
      <button
        onClick={onPlayAgain}
        style={{
          width: '100%', maxWidth: 340,
          padding: '16px',
          background: 'linear-gradient(135deg, #FF5722, #FF8A65)',
          border: 'none', borderRadius: 14,
          fontSize: 16, fontWeight: 'bold', color: '#FFF',
          cursor: 'pointer', letterSpacing: 1,
          boxShadow: '0 4px 20px rgba(255,87,34,0.4)',
        }}
      >
        🎮 СЫГРАТЬ ЕЩЁ
      </button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 18, fontWeight: 'bold', color: '#FFF' }}>{value}</div>
      <div style={{ fontSize: 9, color: '#9E9E9E', marginTop: 2 }}>{label}</div>
    </div>
  );
}

function RewardStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 20, fontWeight: 'bold', color }}>{value}</div>
      <div style={{ fontSize: 9, color: '#9E9E9E', marginTop: 2 }}>{label}</div>
    </div>
  );
}
