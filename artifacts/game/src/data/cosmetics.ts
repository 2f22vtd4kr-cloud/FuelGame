// ─── §3.4 Inventory & Cosmetics Catalog ──────────────────────────────────────

export type CurrencyType = 'babki' | 'stars' | 'free' | 'fuel_linked' | 'daily';

export interface HatDef {
  id: string;
  name: string;
  emoji: string;
  description: string;
  cost: number;
  currency: CurrencyType;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  battlePassTier?: number;
  /** §3.3 True = only unlocked at this tier for players who bought Premium Боевой Пропуск */
  premiumOnly?: boolean;
}

export const HATS: HatDef[] = [
  // ── Free / Starter ──────────────────────────────────────────────────────
  { id: 'none',         name: 'Без шапки',       emoji: '😶', description: 'Голова на ветру.', cost: 0, currency: 'free', rarity: 'common' },
  { id: 'ushanka',      name: 'Ушанка',           emoji: '🐻', description: 'Классика ЖК.', cost: 0, currency: 'free', rarity: 'common' },

  // ── Бабки purchases ───────────────────────────────────────────────────────
  { id: 'cap_yellow',   name: 'Кепка Яндекс',     emoji: '🧢', description: 'Для таксистов и не только.', cost: 100, currency: 'babki', rarity: 'common' },
  { id: 'hardhat',      name: 'Строительная каска', emoji: '⛑️', description: 'Техника безопасности.', cost: 150, currency: 'babki', rarity: 'common' },
  { id: 'cowboy',       name: 'Ковбойская шляпа', emoji: '🤠', description: 'На диком Западе тоже сливают.', cost: 200, currency: 'babki', rarity: 'common' },
  { id: 'beret',        name: 'Берет',            emoji: '🎩', description: 'Французский шик в дворе.', cost: 250, currency: 'babki', rarity: 'common' },
  { id: 'traffic_cone', name: 'Конус',            emoji: '🔺', description: 'Найден на парковке.', cost: 300, currency: 'babki', rarity: 'rare' },
  { id: 'graduation',   name: 'Академическая',    emoji: '🎓', description: 'Диплом есть, работа — нет.', cost: 350, currency: 'babki', rarity: 'rare' },
  { id: 'party_hat',    name: 'Праздничный колпак', emoji: '🎉', description: 'Всегда повод.', cost: 400, currency: 'babki', rarity: 'rare' },
  { id: 'witch_hat',    name: 'Шляпа ведьмы',     emoji: '🧙', description: 'Колдуй не колдуй...', cost: 450, currency: 'babki', rarity: 'rare' },
  { id: 'crown_basic',  name: 'Корона ЖК',        emoji: '👑', description: 'Король двора.', cost: 800, currency: 'babki', rarity: 'epic' },
  { id: 'beret_red',    name: 'Красный берет',    emoji: '🎀', description: 'ОМОНовский шик.', cost: 600, currency: 'babki', rarity: 'epic' },

  // ── Telegram Stars purchases ───────────────────────────────────────────────
  { id: 'stars_lambo',  name: 'Крипто-Ламбо',     emoji: '🏎️', description: 'NFT шапки не существует. Эта — существует.', cost: 50, currency: 'stars', rarity: 'rare' },
  { id: 'stars_gold_ticket', name: 'Золотой Талон', emoji: '🎫', description: 'Цена зафиксирована навсегда.', cost: 75, currency: 'stars', rarity: 'epic' },
  { id: 'stars_crown',  name: 'Корона Барона',    emoji: '👸', description: 'Топливный Барон.', cost: 100, currency: 'stars', rarity: 'legendary' },
  { id: 'stars_santa',  name: 'Дед Мороз',        emoji: '🎅', description: 'Дед Мороз тоже сливает. По старой цене.', cost: 80, currency: 'stars', rarity: 'epic' },

  // ── Battle Pass rewards ────────────────────────────────────────────────────
  // Free track reward (available to everyone once the tier is reached)
  { id: 'bp_tier3',     name: 'Кепка Пропуска',   emoji: '🏷️', description: 'Боевой Пропуск, уровень 3 (бесплатная линия).', cost: 0, currency: 'free', rarity: 'common', battlePassTier: 3 },
  // Premium track rewards (require Premium Боевой Пропуск, in addition to reaching the tier)
  { id: 'bp_tier7',     name: 'Бейсболка БП',     emoji: '🧤', description: 'Боевой Пропуск, уровень 7 (Премиум).', cost: 0, currency: 'free', rarity: 'rare', battlePassTier: 7, premiumOnly: true },
  { id: 'bp_tier10',    name: 'Шлем Сезона',      emoji: '⚔️', description: 'Боевой Пропуск, уровень 10 (Премиум).', cost: 0, currency: 'free', rarity: 'epic', battlePassTier: 10, premiumOnly: true },

  // ── Special (fuel_linked) ──────────────────────────────────────────────────
  { id: 'golden_talono', name: 'Золотой Москвич', emoji: '🥇', description: 'За привязку @fuel_fuel_fuel_bot.', cost: 0, currency: 'fuel_linked', rarity: 'legendary' },

  // ── §3.5 Daily exclusive hats — one per day-of-week, only via daily challenge ─
  { id: 'daily_mon', name: 'Синяя кепка',      emoji: '🔵', description: 'Эксклюзив понедельника. Тяжело, но ты справился.', cost: 0, currency: 'daily', rarity: 'rare' },
  { id: 'daily_tue', name: 'Красная беретка',  emoji: '🔴', description: 'Эксклюзив вторника. Вторник — день храбрых.',        cost: 0, currency: 'daily', rarity: 'rare' },
  { id: 'daily_wed', name: 'Зелёный картуз',   emoji: '🟢', description: 'Эксклюзив среды. Экватор недели пройден.',            cost: 0, currency: 'daily', rarity: 'rare' },
  { id: 'daily_thu', name: 'Жёлтая каска',     emoji: '🟡', description: 'Эксклюзив четверга. Предпятничный энтузиазм.',        cost: 0, currency: 'daily', rarity: 'rare' },
  { id: 'daily_fri', name: 'Пятничный венец',  emoji: '🎊', description: 'Эксклюзив пятницы. Ты заслужил.',                    cost: 0, currency: 'daily', rarity: 'epic' },
  { id: 'daily_sat', name: 'Субботний цилиндр',emoji: '🎩', description: 'Эксклюзив субботы. Ленивый шик.',                    cost: 0, currency: 'daily', rarity: 'epic' },
  { id: 'daily_sun', name: 'Воскресный нимб',  emoji: '😇', description: 'Эксклюзив воскресенья. Ты почти святой.',            cost: 0, currency: 'daily', rarity: 'epic' },
];

export const HAT_MAP: Record<string, HatDef> = Object.fromEntries(HATS.map(h => [h.id, h]));

// ─── §3.4 Pets ────────────────────────────────────────────────────────────────

export interface PetDef {
  id: string;
  name: string;
  emoji: string;
  description: string;
  cost: number;
  currency: CurrencyType;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  battlePassTier?: number;
  /** §3.3 True = only unlocked at this tier for players who bought Premium Боевой Пропуск */
  premiumOnly?: boolean;
  animation: string; // flavour text describing the pet's idle animation
}

export const PETS: PetDef[] = [
  {
    id: 'none',
    name: 'Без питомца',
    emoji: '🚫',
    description: 'Одинокий, но свободный.',
    cost: 0, currency: 'free', rarity: 'common',
    animation: 'ничего не происходит',
  },
  {
    id: 'p5_scooter',
    name: 'P5-Самокат',
    emoji: '🛴',
    description: 'Катается вокруг тебя кругами. Притормаживает на парковке.',
    cost: 800, currency: 'babki', rarity: 'rare',
    animation: 'ездит кружками',
  },
  {
    id: 'raccoon_drunk',
    name: 'Пьяный Енот',
    emoji: '🦝',
    description: 'Ходит зигзагами. Откуда он взялся — неизвестно.',
    cost: 50, currency: 'stars', rarity: 'epic',
    animation: 'шатается',
  },
  {
    id: 'mcmuffin',
    name: 'МакМаффин',
    emoji: '🐥',
    description: 'Прыгает рядом. Жёлтый. Счастливый.',
    cost: 0, currency: 'free', rarity: 'rare',
    animation: 'прыгает',
    battlePassTier: 5,
  },
  {
    id: 'vip_husky',
    name: 'ВИП-Хаски',
    emoji: '🐺',
    description: 'Смотрит на всех свысока. Премиум-эксклюзив, уровень 8.',
    cost: 0, currency: 'free', rarity: 'epic',
    animation: 'важно вышагивает',
    battlePassTier: 8,
    premiumOnly: true,
  },
  {
    id: 'barsik_pet',
    name: 'Барсик-кот',
    emoji: '🐱',
    description: 'Настоящий дворовый кот. Виден на миникарте.',
    cost: 0, currency: 'fuel_linked', rarity: 'legendary',
    animation: 'мяукает',
  },
  {
    id: 'pigeon_drunk',
    name: 'Пьяный Голубь',
    emoji: '🕊️',
    description: 'Ежедневный эксклюзив. Приземляется и засыпает.',
    cost: 0, currency: 'daily', rarity: 'rare',
    animation: 'засыпает',
  },
  {
    id: 'cat_bag',
    name: 'Кот с Пакетом',
    emoji: '🛍️',
    description: 'Несёт пакет. Куда — не говорит.',
    cost: 70, currency: 'stars', rarity: 'rare',
    animation: 'тащит пакет',
  },
  {
    id: 'old_dog',
    name: 'Старый Пёс',
    emoji: '🐕',
    description: 'В бандане. Медленный, но верный.',
    cost: 1200, currency: 'babki', rarity: 'epic',
    animation: 'плетётся',
  },
  {
    id: 'toy_truck',
    name: 'Мусоровоз-Игрушка',
    emoji: '🚛',
    description: 'Ездит по пятам. Бибикает. Иногда.',
    cost: 1500, currency: 'babki', rarity: 'epic',
    animation: 'бибикает',
  },
  {
    id: 'drone',
    name: 'Дрон Доставки',
    emoji: '🚁',
    description: 'Летает над головой. Ждёт заказа, который никогда не придёт.',
    cost: 100, currency: 'stars', rarity: 'legendary',
    animation: 'зависает',
  },
  {
    id: 'vasya_ghost',
    name: 'Вася-Призрак',
    emoji: '👻',
    description: 'Прозрачный. Немного пугает. Боевой Пропуск, ур. 15.',
    cost: 0, currency: 'free', rarity: 'legendary',
    animation: 'проходит сквозь стены',
    battlePassTier: 15,
    premiumOnly: true,
  },
];

export const PET_MAP: Record<string, PetDef> = Object.fromEntries(PETS.map(p => [p.id, p]));

// ─── §7.2 Car Skins ───────────────────────────────────────────────────────────

export interface CarSkinDef {
  id: string;
  name: string;
  emoji: string;
  description: string;
  cost: number;
  currency: CurrencyType;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  color: string; // top-down car color shown in renderer
}

export const CAR_SKINS: CarSkinDef[] = [
  { id: 'moskvich_default', name: 'Москвич-3',      emoji: '🚗', description: 'Базовый. Отечественный. Надёжный.', cost: 0, currency: 'free', rarity: 'common', color: '#8B9DC3' },
  { id: 'lada_vesta',      name: 'Lada Vesta',       emoji: '🚙', description: 'Классика двора. Поставил — и порядок.', cost: 600, currency: 'babki', rarity: 'common', color: '#78909C' },
  { id: 'uaz_patriot',     name: 'UAZ Patriot',      emoji: '🛻', description: 'Проходимость 100%. Стиль 10%.', cost: 700, currency: 'babki', rarity: 'common', color: '#5D7A5D' },
  { id: 'haval',           name: 'Haval H6',         emoji: '🚗', description: 'Привезли из Китая. Не спрашивай цену.', cost: 800, currency: 'babki', rarity: 'rare', color: '#4A5568' },
  { id: 'zeekr',           name: 'Zeekr 001',        emoji: '🚘', description: 'Электро. Тихий. Подозрительный.', cost: 1000, currency: 'babki', rarity: 'rare', color: '#2D3748' },
  { id: 'yandex_lada',     name: 'Яндекс.Такси',     emoji: '🟡', description: 'Смена горит. Машина в деле.', cost: 50, currency: 'stars', rarity: 'rare', color: '#ECC94B' },
  { id: 'tesla_model_y',   name: 'Tesla Model Y',    emoji: '⚡', description: 'Маск разрешил. Сосед — нет.', cost: 80, currency: 'stars', rarity: 'epic', color: '#E2E8F0' },
  { id: 'cybertruck',      name: 'Кибертрак-Пародия',emoji: '🔺', description: 'Угловатый. Громкий. Не влезает.', cost: 120, currency: 'stars', rarity: 'legendary', color: '#C0C0C0' },
  { id: 'golden_moskvich', name: 'Золотой Москвич',  emoji: '🥇', description: 'За привязку @fuel_fuel_fuel_bot.', cost: 0, currency: 'fuel_linked', rarity: 'legendary', color: '#D4AF37' },
];

export const CAR_SKIN_MAP: Record<string, CarSkinDef> = Object.fromEntries(CAR_SKINS.map(s => [s.id, s]));

export const RARITY_COLORS: Record<HatDef['rarity'], string> = {
  common: '#9E9E9E',
  rare: '#2196F3',
  epic: '#9C27B0',
  legendary: '#FFD700',
};
