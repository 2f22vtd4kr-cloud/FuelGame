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
  // §3.4 Cosmetics — hats
  purchasedHats: string[];        // hat IDs owned
  equippedHat: string;            // currently equipped hat ID ('none' = bare head, 'ushanka' = default)
  // §3.4 Cosmetics — pets
  purchasedPets: string[];        // pet IDs owned
  equippedPet: string;            // currently active pet ('none' = no pet)
  // §3.4 Cosmetics — car skins
  purchasedCarSkins: string[];    // car skin IDs owned
  equippedCarSkin: string;        // active car skin ('moskvich_default')
  // §9.3 Leaderboard / device identity
  playerName: string;             // display name for leaderboard
  deviceId: string;               // stable UUID for leaderboard upsert
  // §12.4 Tutorial
  seenTutorial: boolean;          // true after first-time tutorial is dismissed
  // §13.1 Accessibility settings (persisted across sessions)
  textSize: 'small' | 'medium' | 'large';
  colorblindMode: boolean;
  highContrastMode: boolean;
  volumeMaster: number;
  volumeMusic: number;
  volumeSfx: number;
  autoInteract: boolean;
  simplifiedChatWheel: boolean;
  // §3.6 Cumulative achievement-tracking stats
  totalInnocentEjections: number;   // ejected while not slivshchik, across all matches
  totalEjections: number;           // ejected for any reason, across all matches
  winStreak: number;                // consecutive matches won
  winsByCharacter: Record<string, number>;
  sabotageUseCounts: Partial<Record<string, number>>;
  sabotageTypesEverUsed: string[];
  totalPipeBurstFixes: number;
  totalVentUses: number;
  totalImmunityTicketsUsedCum: number;
  totalShawarmaBought: number;
  fuelBotLinked: boolean;
  dailyStreak: number;
  lastDailyCompletedDate: string | null;
  winRolesAchieved: { khozain: boolean; slivshchik: boolean; neutral: boolean };
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
  purchasedHats: ['none', 'ushanka'],
  equippedHat: 'ushanka',
  purchasedPets: ['none'],
  equippedPet: 'none',
  purchasedCarSkins: ['moskvich_default'],
  equippedCarSkin: 'moskvich_default',
  playerName: '',
  deviceId: '',
  seenTutorial: false,
  textSize: 'medium',
  colorblindMode: false,
  highContrastMode: false,
  volumeMaster: 0.55,
  volumeMusic: 1.0,
  volumeSfx: 1.0,
  autoInteract: false,
  simplifiedChatWheel: false,
  totalInnocentEjections: 0,
  totalEjections: 0,
  winStreak: 0,
  winsByCharacter: {},
  sabotageUseCounts: {},
  sabotageTypesEverUsed: [],
  totalPipeBurstFixes: 0,
  totalVentUses: 0,
  totalImmunityTicketsUsedCum: 0,
  totalShawarmaBought: 0,
  fuelBotLinked: false,
  dailyStreak: 0,
  lastDailyCompletedDate: null,
  winRolesAchieved: { khozain: false, slivshchik: false, neutral: false },
};

function genDeviceId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

export function loadProfile(): PlayerProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const base: PlayerProfile = raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
    // Ensure free starter hats are always present
    if (!base.purchasedHats.includes('none')) base.purchasedHats.push('none');
    if (!base.purchasedHats.includes('ushanka')) base.purchasedHats.push('ushanka');
    // Ensure free starter pets/skins are always present (handles old profiles missing these fields)
    if (!base.purchasedPets) base.purchasedPets = ['none'];
    if (!base.equippedPet) base.equippedPet = 'none';
    if (!base.purchasedCarSkins) base.purchasedCarSkins = ['moskvich_default'];
    if (!base.equippedCarSkin) base.equippedCarSkin = 'moskvich_default';
    if (!base.purchasedPets.includes('none')) base.purchasedPets.push('none');
    if (!base.purchasedCarSkins.includes('moskvich_default')) base.purchasedCarSkins.push('moskvich_default');
    // Ensure deviceId is set
    if (!base.deviceId) {
      base.deviceId = genDeviceId();
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(base)); } catch { /* ignore */ }
    }
    return base;
  } catch {
    return { ...DEFAULTS, deviceId: genDeviceId() };
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

/** Moscow time date string for "yesterday" — used to detect consecutive daily-challenge streaks */
export function moscowYesterdayString(): string {
  const now = new Date();
  const moscowYesterday = new Date(now.getTime() + 3 * 60 * 60 * 1000 - 24 * 60 * 60 * 1000);
  return moscowYesterday.toISOString().slice(0, 10);
}
