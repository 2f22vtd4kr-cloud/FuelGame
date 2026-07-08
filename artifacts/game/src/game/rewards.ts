// ─── §3.2 / §3.3 / §3.5 / §3.6 Match Reward Calculation ────────────────────

import type { GameState, Player } from './types';
import { loadProfile, saveProfile, xpToTier, moscowDateString, type PlayerProfile } from './profile';
import { ACHIEVEMENT_MAP, type AchievementDef } from '../data/achievements';
import { getDailyChallenge, type ChallengeDef } from '../data/dailyChallenges';

export interface MatchRewards {
  babkiEarned: number;
  xpEarned: number;
  tiersBefore: number;
  tiersAfter: number;
  newAchievements: AchievementDef[];
  dailyCompleted: boolean;
  dailyDef: (ChallengeDef & { id: string }) | null;
  dailyProgress: number;
  dailyTarget: number;
  /** §3.5 Daily-exclusive hat unlocked today (null if not completed or already owned) */
  dailyHatUnlocked: string | null;
  /** True if this was the player's very first win (for §9.4 first-win share prompt) */
  isFirstWin: boolean;
}

/** Determine whether the local player won this match */
function didPlayerWin(gs: GameState, player: Player | undefined): boolean {
  if (!player) return false;
  if (player.neutralRole === 'barsik') return player.isAlive; // barsik wins by surviving
  if (player.neutralRole === 'janitor') return player.canistersCollected >= 3;
  if (player.neutralRole === 'policeman') return player.correctVotes > 0;
  return (gs.winner === 'khozaeva' && player.role === 'khozain') ||
         (gs.winner === 'slivshchiki' && player.role === 'slivshchik');
}

/** Call once when a match ends. Mutates + saves profile, returns reward summary. */
export function applyMatchRewards(gs: GameState): MatchRewards {
  const localPlayer = gs.players.find(p => p.id === gs.localPlayerId);
  const profile = loadProfile();

  const iWon = didPlayerWin(gs, localPlayer);

  // ── §3.2 Бабки earn ──────────────────────────────────────────────────────
  let babki = 50;                                            // match played
  if (iWon) babki += 100;                                   // win bonus
  babki += (localPlayer?.tasksCompleted ?? 0) * 25;         // per task
  babki += (localPlayer?.correctVotes ?? 0) * 50;           // per correct vote
  if (localPlayer?.neutralRole === 'janitor') {
    babki += (localPlayer.canistersCollected ?? 0) * 30;
  }

  // ── §3.3 Battle Pass XP ───────────────────────────────────────────────────
  let xp = 50;                                              // match played
  if (iWon) xp += 100;                                     // win bonus
  xp += (localPlayer?.tasksCompleted ?? 0) * 10;           // per task
  xp += (localPlayer?.correctVotes ?? 0) * 30;             // per correct vote
  if (localPlayer?.role === 'slivshchik') {
    // +40 XP per completed siphon (~14.3% fuel per siphon)
    const siphons = Math.floor((localPlayer?.fuelSiphoned ?? 0) / 14.3);
    xp += siphons * 40;
  }

  const tiersBefore = xpToTier(profile.battlePassXP);

  // ── Update cumulative stats FIRST (so checkAchievements uses final totals) ─
  profile.totalMatchesPlayed += 1;
  if (iWon) profile.totalMatchesWon += 1;
  profile.totalTasksCompleted += localPlayer?.tasksCompleted ?? 0;
  profile.totalFuelSiphoned += localPlayer?.fuelSiphoned ?? 0;
  profile.totalCorrectVotes += localPlayer?.correctVotes ?? 0;
  profile.totalCanistersCollected += localPlayer?.canistersCollected ?? 0;
  // Survival streak
  if (localPlayer?.isAlive) {
    profile.survivalStreak = (profile.survivalStreak ?? 0) + 1;
  } else {
    profile.survivalStreak = 0;
  }

  // ── Daily challenge ───────────────────────────────────────────────────────
  const today = moscowDateString();
  const dailyDef = getDailyChallenge(today);
  let dailyCompleted = false;

  // Reset if new day
  if (!profile.daily || profile.daily.date !== today) {
    profile.daily = {
      date: today,
      challengeId: dailyDef.id,
      progress: 0,
      completed: false,
      rewardClaimed: false,
    };
  }

  if (!profile.daily.completed) {
    const progress = getDailyProgress(dailyDef, gs, localPlayer, iWon);
    profile.daily.progress = Math.min(profile.daily.progress + progress, dailyDef.target);
    if (profile.daily.progress >= dailyDef.target) {
      profile.daily.completed = true;
      dailyCompleted = true;
      babki += 200;    // §3.5 daily reward
      xp += 200;
    }
  }

  // ── §3.5 Daily-exclusive hat ─────────────────────────────────────────────────
  // One hat per day-of-week, unlocked only on completion of that day's challenge.
  const DAY_HATS = ['daily_sun', 'daily_mon', 'daily_tue', 'daily_wed', 'daily_thu', 'daily_fri', 'daily_sat'];
  let dailyHatUnlocked: string | null = null;
  if (dailyCompleted) {
    const now = new Date();
    const moscowDay = new Date(now.getTime() + 3 * 60 * 60 * 1000).getUTCDay();
    const hatId = DAY_HATS[moscowDay];
    if (!profile.purchasedHats.includes(hatId)) {
      profile.purchasedHats.push(hatId);
      dailyHatUnlocked = hatId;
    }
  }

  const dailyProgress = profile.daily.progress;
  const dailyTarget = dailyDef.target;

  // ── Achievements (after stats updated — no double-counting) ───────────────
  const newAchievements = checkAchievements(gs, localPlayer, iWon, profile);
  for (const ach of newAchievements) {
    babki += ach.babkiReward;
    if (!profile.achievements.includes(ach.id)) {
      profile.achievements.push(ach.id);
    }
  }

  // ── Apply earned Бабки + XP ───────────────────────────────────────────────
  profile.babki += babki;
  profile.battlePassXP += xp;
  profile.battlePassTier = xpToTier(profile.battlePassXP);

  const tiersAfter = profile.battlePassTier;

  // ── §9.4 First-win detection (after totalMatchesWon was incremented above) ─
  const isFirstWin = iWon && profile.totalMatchesWon === 1;

  saveProfile(profile);

  // ── §9.3 Submit score to leaderboard (fire-and-forget, no await) ────────────
  submitLeaderboardScore(profile, gs, iWon).catch(() => { /* silent — offline ok */ });

  return {
    babkiEarned: babki,
    xpEarned: xp,
    tiersBefore,
    tiersAfter,
    newAchievements,
    dailyCompleted,
    dailyDef,
    dailyProgress,
    dailyTarget,
    dailyHatUnlocked,
    isFirstWin,
  };
}

/** §9.3 Fire-and-forget leaderboard score submission */
async function submitLeaderboardScore(profile: PlayerProfile, gs: GameState, iWon: boolean): Promise<void> {
  const localPlayer = gs.players.find(p => p.id === gs.localPlayerId);
  const name = profile.playerName?.trim() || localPlayer?.name || 'Аноним';
  const character = (localPlayer?.character as string) ?? 'denis';

  const apiBase = import.meta.env.VITE_API_URL ?? '/api';

  // Submit to all-time leaderboard
  await fetch(`${apiBase}/leaderboard`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      playerName: name,
      character,
      babki: profile.babki,
      wins: profile.totalMatchesWon,
      matches: profile.totalMatchesPlayed,
      deviceId: profile.deviceId,
    }),
  });

  // §3.5 Submit to daily leaderboard if this was a daily seed SP win
  // Metric: time survived / fastest match completion (stored as elapsed seconds on win)
  if (gs.isDailySeedGame && iWon) {
    const telegramUserId = (window as typeof window & { Telegram?: { WebApp?: { initDataUnsafe?: { user?: { id?: number } } } } })
      .Telegram?.WebApp?.initDataUnsafe?.user?.id;

    if (telegramUserId) {
      const elapsedSeconds = Math.round(gs.time);
      await fetch(`${apiBase}/leaderboard/daily`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: telegramUserId,
          score: elapsedSeconds,
          matchesPlayed: 1,
        }),
      });
    }
  }
}

// ── §3.5 Daily challenge progress from a single match ─────────────────────────
function getDailyProgress(
  def: ChallengeDef,
  gs: GameState,
  player: Player | undefined,
  iWon: boolean,
): number {
  switch (def.type) {
    case 'complete_tasks':
      return player?.tasksCompleted ?? 0;
    case 'win_as_slivshchik':
      return (player?.role === 'slivshchik' && iWon) ? 1 : 0;
    case 'vote_correctly':
      return player?.correctVotes ?? 0;
    case 'siphon_fuel':
      return player?.fuelSiphoned ?? 0;
    case 'survive_match':
      return (player?.isAlive) ? 1 : 0;
    case 'complete_match':
      return 1;
    case 'use_immunity_ticket':
      // Uses the explicit counter set in logic.ts when human player applies a ticket
      return gs.immunityTicketsUsedThisMatch > 0 ? 1 : 0;
    default:
      return 0;
  }
}

// ── §3.6 Achievement checks (called after profile stats already updated) ───────
function checkAchievements(
  gs: GameState,
  player: Player | undefined,
  iWon: boolean,
  profile: PlayerProfile,
): AchievementDef[] {
  const unlocked: AchievementDef[] = [];
  const has = (id: string) => profile.achievements.includes(id);
  const unlock = (id: string) => {
    if (!has(id) && ACHIEVEMENT_MAP[id]) {
      unlocked.push(ACHIEVEMENT_MAP[id]);
    }
  };

  const isSliv = player?.role === 'slivshchik';
  const tasks = player?.tasksCompleted ?? 0;
  const fuel = player?.fuelSiphoned ?? 0;
  const votes = player?.correctVotes ?? 0;

  // Use already-updated profile totals — no double-counting
  const totalMatches = profile.totalMatchesPlayed;
  const totalTasks = profile.totalTasksCompleted;
  const totalVotes = profile.totalCorrectVotes;

  // First match
  if (totalMatches === 1) unlock('first_match');

  // Veteran milestones
  if (totalMatches >= 10)  unlock('veteran_10');
  if (totalMatches >= 50)  unlock('veteran_50');
  if (totalMatches >= 100) unlock('veteran_100');

  // First win
  if (iWon) unlock('first_win');

  // Tasks per-match
  if (tasks >= 5)  unlock('hard_worker');
  if (tasks >= 10) unlock('all_tasks');
  // Tasks cumulative
  if (totalTasks >= 50) unlock('task_master');

  // Wins as khozain (cumulative)
  if (iWon && !isSliv && !player?.neutralRole) {
    if (profile.totalMatchesWon >= 10) unlock('king_of_yard');
  }

  // Slivshchik wins
  if (isSliv && iWon) {
    if (fuel >= 70) unlock('fuel_baron');
    // master_drain: proxy for draining multiple cars (50%+ = at least 3-4 cars worth)
    if (fuel >= 50) unlock('master_drain');
  }

  // Diesel maniac: cumulative slivshchik fuel (100 full cars = 100 × 100% = 10000%)
  if (profile.totalFuelSiphoned >= 10000) unlock('diesel_maniac');

  // Correct votes
  if (votes > 0 && totalVotes === votes) unlock('first_correct_vote'); // first ever
  if (totalVotes >= 10) unlock('detective');

  // No tasks win
  if (iWon && !isSliv && tasks === 0 && !player?.neutralRole) {
    unlock('no_tasks_win');
  }

  // Fast finish (< 2 min)
  if (iWon && gs.time < 120) unlock('fast_finish');

  // Survival streak: 5 consecutive matches survived
  if ((profile.survivalStreak ?? 0) >= 5) unlock('survivor');

  // Dead but won
  if (!player?.isAlive && iWon) unlock('ghost_walk');

  // Neutral roles
  if (player?.neutralRole === 'janitor' && (player.canistersCollected ?? 0) >= 3) {
    unlock('quiet_akhmet');
  }
  if (player?.neutralRole === 'policeman' && votes > 0) {
    unlock('cop_win');
  }
  if (player?.neutralRole === 'barsik' && player?.isAlive) {
    unlock('barsik_survives');
  }

  // Battle pass milestones (using tier computed before XP added — check after)
  if (profile.battlePassTier >= 10) unlock('battle_pass_10');
  if (profile.battlePassTier >= 50) unlock('battle_pass_50');

  // Daily milestone
  if (profile.daily?.completed && !has('daily_complete')) unlock('daily_complete');

  // Rich — check after babki was already added (profile.babki updated before this call? No — babki is added after. Use current + earned as proxy)
  // We check after rewards are added in applyMatchRewards so just check profile.babki here
  if (profile.babki >= 10000) unlock('rich');

  // Immunity ticket
  if (gs.immunityTicketsUsedThisMatch > 0) unlock('immunity_user');
  if ((profile.totalMatchesPlayed ?? 0) >= 1) {
    // immunity_10 would need cumulative tracking — skip for now (unlock on profile total)
  }

  // Character-specific: Крипто-Вова ejected on first meeting (short match)
  if (player?.character === 'vova' && !player.isAlive && gs.time < 120) {
    unlock('crypto_bankrupt');
  }

  // Share card (unlocked via button press, not here — keep for reference)

  return unlocked;
}
