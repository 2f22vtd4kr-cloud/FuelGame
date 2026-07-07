// ─── §3.2/§3.3/§3.5/§3.6 Player Profile (localStorage persistence) ────────────

const STORAGE_KEY = '95y_profile_v1';

export interface DailyChallengeState {
  date: string;       // YYYY-MM-DD in Moscow time
  challengeId: string;
  progress: number;
  completed: boolean;
  rewardClaimed: boolean;
}

export interface PlayerProfile {
  babki: number;
  battlePassXP: number;
  battlePassTier: number;
  battlePassPremium: boolean;
  achievements: string[];         // unlocked achievement IDs
  daily: DailyChallengeState | null;
  totalMatchesPlayed: number;
  totalMatchesWon: number;
  totalTasksCompleted: number;
  totalFuelSiphoned: number;      // cumulative % across all matches
  totalCorrectVotes: number;
  totalCanistersCollected: number;
  survivalStreak: number;         // consecutive matches survived (for survivor achievement)
}

const DEFAULTS: PlayerProfile = {
  babki: 0,
  battlePassXP: 0,
  battlePassTier: 0,
  battlePassPremium: false,
  achievements: [],
  daily: null,
  totalMatchesPlayed: 0,
  totalMatchesWon: 0,
  totalTasksCompleted: 0,
  totalFuelSiphoned: 0,
  totalCorrectVotes: 0,
  totalCanistersCollected: 0,
  survivalStreak: 0,
};

export function loadProfile(): PlayerProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveProfile(p: PlayerProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch { /* storage might be blocked */ }
}

/** §3.3 Battle pass XP threshold per tier */
export const XP_PER_TIER = 500;

/** Compute battle pass tier from raw XP */
export function xpToTier(xp: number): number {
  return Math.min(50, Math.floor(xp / XP_PER_TIER));
}

/** Moscow time date string YYYY-MM-DD */
export function moscowDateString(): string {
  const now = new Date();
  // Moscow is UTC+3
  const moscow = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  return moscow.toISOString().slice(0, 10);
}
