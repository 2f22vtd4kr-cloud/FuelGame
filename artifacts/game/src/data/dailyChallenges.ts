// ─── §3.5 Daily Challenge System ─────────────────────────────────────────────

export type ChallengeType =
  | 'complete_tasks'       // complete N tasks
  | 'win_as_slivshchik'    // win as a drainer
  | 'vote_correctly'       // vote correctly N times
  | 'siphon_fuel'          // siphon N% fuel total
  | 'survive_match'        // survive to end of a match
  | 'complete_match'       // just finish a match
  | 'use_immunity_ticket'; // use immunity ticket N times

export interface ChallengeDef {
  type: ChallengeType;
  target: number;
  label: string;           // shown to player
  emoji: string;
}

const CHALLENGES: ChallengeDef[] = [
  { type: 'complete_tasks',       target: 5,  emoji: '✅', label: 'Выполни 5 задач' },
  { type: 'win_as_slivshchik',    target: 1,  emoji: '🪣', label: 'Победи как Сливщик' },
  { type: 'vote_correctly',       target: 3,  emoji: '🗳️', label: 'Правильно проголосуй 3 раза' },
  { type: 'siphon_fuel',          target: 20, emoji: '⛽', label: 'Слей 20% топлива' },
  { type: 'survive_match',        target: 1,  emoji: '🛡️', label: 'Доживи до конца матча' },
  { type: 'complete_match',       target: 3,  emoji: '🎮', label: 'Сыграй 3 матча' },
  { type: 'use_immunity_ticket',  target: 1,  emoji: '🥇', label: 'Используй Талон Иммунитета' },
  { type: 'complete_tasks',       target: 3,  emoji: '✅', label: 'Выполни 3 задачи' },
  { type: 'vote_correctly',       target: 1,  emoji: '🗳️', label: 'Правильно проголосуй 1 раз' },
  { type: 'siphon_fuel',          target: 50, emoji: '⛽', label: 'Слей 50% топлива' },
  { type: 'win_as_slivshchik',    target: 1,  emoji: '🪣', label: 'Выиграй, сливая бензин' },
  { type: 'survive_match',        target: 3,  emoji: '🛡️', label: 'Доживи до конца в 3 матчах' },
];

/** Pick today's challenge using a deterministic date-based seed (§3.5) */
export function getDailyChallenge(dateStr: string): ChallengeDef & { id: string } {
  // Simple deterministic hash of the date string
  let hash = 0;
  for (const ch of dateStr) {
    hash = ((hash << 5) - hash + ch.charCodeAt(0)) | 0;
  }
  const idx = Math.abs(hash) % CHALLENGES.length;
  const def = CHALLENGES[idx];
  return { ...def, id: `daily_${dateStr}_${def.type}` };
}
