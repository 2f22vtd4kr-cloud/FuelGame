// ─── §3.6 Achievement System (50 Achievements) ───────────────────────────────

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  emoji: string;
  babkiReward: number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // ── Victories ──────────────────────────────────────────────────────────────
  { id: 'king_of_yard',    title: 'Король Двора',       emoji: '👑', babkiReward: 500,
    description: 'Победи 10 матчей как Хозяин' },
  { id: 'first_win',       title: 'Первая Победа',      emoji: '🏆', babkiReward: 100,
    description: 'Победи свой первый матч' },
  { id: 'win_streak_3',    title: 'Серия побед',        emoji: '🔥', babkiReward: 200,
    description: 'Победи 3 матча подряд' },
  { id: 'diesel_maniac',   title: 'Дизель-Маньяк',      emoji: '⛽', babkiReward: 500,
    description: 'Слей 100 машин как Сливщик' },
  { id: 'master_drain',    title: 'Мастер Слива',       emoji: '🪣', babkiReward: 200,
    description: 'Слей 5 машин в одном матче как Сливщик' },
  { id: 'fuel_baron',      title: 'Топливный Барон',    emoji: '🛢️', babkiReward: 300,
    description: 'Слей 70%+ топлива за один матч как Сливщик' },

  // ── Tasks ─────────────────────────────────────────────────────────────────
  { id: 'hard_worker',     title: 'Трудяга Двора',      emoji: '💪', babkiReward: 150,
    description: 'Выполни 5 задач за один матч' },
  { id: 'task_master',     title: 'Хозяин-Хозяин',      emoji: '🏗️', babkiReward: 400,
    description: 'Выполни 50 задач всего' },
  { id: 'no_tasks_win',    title: 'Собака-в-баке',      emoji: '🐕', babkiReward: 300,
    description: 'Победи как Хозяин, не выполнив ни одной задачи' },
  { id: 'shawarma_addict', title: 'Шаверма-Зависимость', emoji: '🌯', babkiReward: 100,
    description: 'Купи шаверму 10 раз всего' },
  { id: 'shawarma_alibi',  title: 'Шаверма-Алиби',      emoji: '🌯', babkiReward: 200,
    description: 'Победи на сходке, будучи у шавермы в момент голосования' },

  // ── Voting ────────────────────────────────────────────────────────────────
  { id: 'detective',       title: 'Детектив ЖК',        emoji: '🔍', babkiReward: 300,
    description: 'Правильно проголосуй 10 раз за сливщика на сходке' },
  { id: 'first_correct_vote', title: 'Чуйка',           emoji: '🕵️', babkiReward: 50,
    description: 'Правильно проголосуй за сливщика первый раз' },
  { id: 'alarm_victim',    title: 'Жертва Сигнализации', emoji: '🚨', babkiReward: 200,
    description: 'Тебя выкинули 5 раз, будучи невиновным' },
  { id: 'innocent_5',      title: 'Козёл Отпущения',    emoji: '🐐', babkiReward: 150,
    description: 'Тебя выкинули, хотя ты был Хозяином' },

  // ── Neutral Roles ──────────────────────────────────────────────────────────
  { id: 'barsik_witness',  title: 'Барсик-Свидетель',   emoji: '🐱', babkiReward: 1000,
    description: 'Будучи Барсиком, промяукай во время слива и добейся выброса сливщика' },
  { id: 'quiet_akhmet',    title: 'Тихий Ахмет',        emoji: '🧹', babkiReward: 400,
    description: 'Как Дворник, собери 3 канистры за один матч' },
  { id: 'cop_win',         title: 'Участковый Года',    emoji: '🕵️', babkiReward: 400,
    description: 'Как Участковый, правильно проголосуй за сливщика' },
  { id: 'barsik_survives', title: 'Кот Жив',            emoji: '😺', babkiReward: 300,
    description: 'Доживи до конца матча как Барсик' },

  // ── Sabotage ──────────────────────────────────────────────────────────────
  { id: 'grandma_sabotage_10', title: 'Бабушка-Цербер',  emoji: '👵', babkiReward: 300,
    description: 'Используй саботаж Бабушка-Цербер 10 раз как Сливщик' },
  { id: 'fix_pipe_burst',  title: 'Водопроводчик',       emoji: '🔧', babkiReward: 150,
    description: 'Исправь саботаж "Прорвало трубу" 3 раза' },
  { id: 'all_sabotages',   title: 'Хаос-Мастер',         emoji: '💣', babkiReward: 350,
    description: 'Используй все 4 вида саботажа в разных матчах' },

  // ── Specific Characters ───────────────────────────────────────────────────
  { id: 'crypto_bankrupt', title: 'Крипто-Банкрот',     emoji: '📉', babkiReward: 100,
    description: 'Будучи Вовой, тебя выкинули на первой же сходке' },
  { id: 'uncle_seryozha_win', title: 'Талоновед',        emoji: '🎫', babkiReward: 250,
    description: 'Победи 3 матча, играя за Дядю Серёжу' },
  { id: 'denis_taxi',      title: 'Смена Горит',         emoji: '🚕', babkiReward: 150,
    description: 'Победи 5 матчей, играя за Дениса' },

  // ── Survival ──────────────────────────────────────────────────────────────
  { id: 'survivor',        title: 'Выживший',            emoji: '🛡️', babkiReward: 200,
    description: 'Доживи до конца матча в 5 играх подряд' },
  { id: 'ghost_walk',      title: 'Призрак',             emoji: '👻', babkiReward: 100,
    description: 'Погибни в матче, который всё равно выиграла твоя сторона' },

  // ── Speed / Skill ──────────────────────────────────────────────────────────
  { id: 'fast_finish',     title: 'Молния',              emoji: '⚡', babkiReward: 300,
    description: 'Выиграй матч менее чем за 2 минуты' },
  { id: 'all_tasks',       title: 'Идеальный Хозяин',    emoji: '✅', babkiReward: 500,
    description: 'Выполни 10 задач в одном матче' },

  // ── Economy / Items ────────────────────────────────────────────────────────
  { id: 'immunity_user',   title: 'Золотой Талон',       emoji: '🥇', babkiReward: 200,
    description: 'Используй Талон Иммунитета первый раз' },
  { id: 'immunity_10',     title: 'Страж Бака',          emoji: '🛡️', babkiReward: 300,
    description: 'Используй Талон Иммунитета 10 раз' },
  { id: 'rich',            title: 'Богатей Двора',       emoji: '💰', babkiReward: 500,
    description: 'Накопи 10 000 бабок' },
  { id: 'fuel_linked',     title: 'Талоновед',           emoji: '⛽', babkiReward: 1000,
    description: 'Привяжи аккаунт @fuel_fuel_fuel_bot (1000 бабок + Золотой Москвич)' },

  // ── Social ────────────────────────────────────────────────────────────────
  { id: 'first_match',     title: 'Новичок Двора',       emoji: '🏡', babkiReward: 50,
    description: 'Сыграй свой первый матч' },
  { id: 'veteran_10',      title: 'Ветеран ЖК',          emoji: '🎖️', babkiReward: 200,
    description: 'Сыграй 10 матчей' },
  { id: 'veteran_50',      title: 'Завсегдатай',         emoji: '🏅', babkiReward: 400,
    description: 'Сыграй 50 матчей' },
  { id: 'veteran_100',     title: 'Легенда Двора',       emoji: '⭐', babkiReward: 1000,
    description: 'Сыграй 100 матчей' },
  { id: 'share_card',      title: 'Вирусный Момент',     emoji: '📸', babkiReward: 100,
    description: 'Скачай карточку результата матча' },

  // ── Special/Funny ─────────────────────────────────────────────────────────
  { id: 'ejected_10',      title: 'Главный Подозреваемый', emoji: '🗑️', babkiReward: 200,
    description: 'Тебя выкинули 10 раз' },
  { id: 'never_suspected', title: 'Тихий Сливщик',       emoji: '🤫', babkiReward: 400,
    description: 'Победи как Сливщик и не получи ни одного голоса' },
  { id: 'ambush_5',        title: 'Силовик Двора',       emoji: '💪', babkiReward: 300,
    description: 'Соверши 5 засад за один матч как Сливщик' },
  { id: 'canister_catch',  title: 'Поймал с Канистрой',  emoji: '🎯', babkiReward: 250,
    description: 'Увидь Сливщика с канистрой и добейся его выброса на сходке' },
  { id: 'daily_streak_3',  title: 'Постоянный Жилец',   emoji: '📅', babkiReward: 300,
    description: 'Выполни ежедневное задание 3 дня подряд' },
  { id: 'daily_complete',  title: 'Дневная Смена',      emoji: '☀️', babkiReward: 100,
    description: 'Выполни ежедневное задание первый раз' },
  { id: 'battle_pass_10',  title: 'Боевой Сезон',       emoji: '🎫', babkiReward: 500,
    description: 'Достигни 10 уровня в Боевом Пропуске' },
  { id: 'battle_pass_50',  title: 'Топливный Барон',    emoji: '👑', babkiReward: 1000,
    description: 'Достигни максимального 50 уровня в Боевом Пропуске' },
  { id: 'vent_10',         title: 'Призрак Мусорки',    emoji: '🗑️', babkiReward: 200,
    description: 'Используй вентиляцию через мусорки 10 раз как Сливщик' },
  { id: 'win_all_roles',   title: 'Многогранный',       emoji: '🎭', babkiReward: 500,
    description: 'Победи в матчах за все 3 основные роли (Хозяин, Сливщик, нейтрал)' },
  { id: 'nightmare_win',  title: 'Победа над Кошмаром', emoji: '🌑', babkiReward: 750,
    description: 'Победи на сложности Кошмар' },
  { id: 'premium_pass',   title: 'Премиум Двора',       emoji: '💎', babkiReward: 300,
    description: 'Купи Премиум Боевой Пропуск' },
];

export const ACHIEVEMENT_MAP = Object.fromEntries(
  ACHIEVEMENTS.map(a => [a.id, a])
) as Record<string, AchievementDef>;
