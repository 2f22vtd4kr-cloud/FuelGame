import './_group.css';
import './Arcade.css';
import { useState, useEffect } from 'react';
import { 
  Coins, 
  Trophy, 
  ShoppingBag, 
  Gamepad2, 
  Medal, 
  Users, 
  Skull, 
  ShieldAlert, 
  ChevronRight,
  Info,
  Calendar,
  Zap,
  Ticket
} from 'lucide-react';

type CharacterKey =
  | 'denis' | 'anya' | 'vova' | 'uncle_seryozha' | 'petrovich'
  | 'marina' | 'akhmet' | 'oleg' | 'lena' | 'barsik';

type BotDifficulty = 'easy' | 'medium' | 'hard' | 'nightmare';

interface CharacterDef {
  key: CharacterKey;
  name: string;
  emoji: string;
  color: string;
  description: string;
  voiceLines: string[];
}

const CHARACTERS: Record<CharacterKey, CharacterDef> = {
  denis: { key: 'denis', name: 'Денис', emoji: '🧑', color: '#FF4D4D', description: 'Водитель Яндекс Такси. Смена горит.', voiceLines: ['Смена горит.'] },
  anya: { key: 'anya', name: 'Аня', emoji: '👩', color: '#D44DFF', description: 'Каршерингист. «Это не моя тачка».', voiceLines: ['Это не моя тачка.'] },
  vova: { key: 'vova', name: 'Вова Крипто', emoji: '🤑', color: '#FF7D4D', description: 'Трейдер USDT. Всё переводит в крипту.', voiceLines: ['To the moon, bro.'] },
  uncle_seryozha: { key: 'uncle_seryozha', name: 'Дядя Серёжа', emoji: '👴', color: '#A34DFF', description: 'Ветеран двора. Кричит про талоны.', voiceLines: ['Талоны верните!'] },
  petrovich: { key: 'petrovich', name: 'Петрович', emoji: '🔧', color: '#4D94FF', description: 'Гаражный мастер. Чинит всё подряд.', voiceLines: ['Я не чинил, я смотрел.'] },
  marina: { key: 'marina', name: 'Марина Блогерша', emoji: '📱', color: '#FF4D8C', description: 'Снимает двор на сторис.', voiceLines: ['Подписывайтесь!'] },
  akhmet: { key: 'akhmet', name: 'Ахмет Дворник', emoji: '🧹', color: '#FFB84D', description: 'Подметает двор и молчит.', voiceLines: ['...'] },
  oleg: { key: 'oleg', name: 'Олег Силовик', emoji: '🕵️', color: '#4D4D4D', description: 'Бывший силовик. Всех подозревает.', voiceLines: ['Документы.'] },
  lena: { key: 'lena', name: 'Лена Эко', emoji: '🚲', color: '#4DFF4D', description: 'За экологию и раздельный сбор.', voiceLines: ['Бензин — это прошлый век.'] },
  barsik: { key: 'barsik', name: 'Барсик', emoji: '🐱', color: '#FF8F66', description: 'Дворовой кот. Видел всё.', voiceLines: ['Мяу.'] },
};
const CHARACTER_KEYS = Object.keys(CHARACTERS) as CharacterKey[];

const LOBBY_FLAVOR_TEXTS = [
  'В подъезде №3 снова сломался лифт. Администрация: «Заявка в работе.»',
  'На стоянке нашли 2 пустые канистры. Очень подозрительно.',
  'Дядя Серёжа с балкона кричит про талоны. Опять.',
];

const DIFFICULTY_LABELS: Record<BotDifficulty, { label: string; emoji: string; desc: string; color: string; gradient: string }> = {
  easy: { label: 'Лёгкий', emoji: '🟢', desc: 'Боты ленятся', color: '#4CAF50', gradient: 'from-green-400 to-green-600' },
  medium: { label: 'Средний', emoji: '🟡', desc: 'Стандарт', color: '#FF9800', gradient: 'from-orange-400 to-orange-600' },
  hard: { label: 'Сложный', emoji: '🔴', desc: 'Боты хитрят', color: '#F44336', gradient: 'from-red-400 to-red-600' },
  nightmare: { label: 'Кошмар', emoji: '💀', desc: 'Нереально', color: '#9C27B0', gradient: 'from-purple-500 to-purple-800' },
};

type LobbyTab = 'game' | 'shop' | 'leaderboard';
const TABS: { id: LobbyTab; label: string; icon: any; color: string }[] = [
  { id: 'game', label: 'Игра', icon: Gamepad2, color: 'orange' },
  { id: 'shop', label: 'Магазин', icon: ShoppingBag, color: 'blue' },
  { id: 'leaderboard', label: 'Рейтинг', icon: Trophy, color: 'yellow' },
];

const MOCK_PROFILE = {
  babki: 4250,
  totalMatchesPlayed: 37,
  battlePassXP: 1830,
};
const MOCK_ACH_UNLOCKED = 14;
const MOCK_ACH_TOTAL = 50;

export function Arcade() {
  const [activeTab, setActiveTab] = useState<LobbyTab>('game');
  const [selected, setSelected] = useState<CharacterKey>('denis');
  const [playerCount, setPlayerCount] = useState(6);
  const [siphonersCount, setSiphonersCount] = useState(2);
  const [difficulty, setDifficulty] = useState<BotDifficulty>('medium');
  const [flavorIdx, setFlavorIdx] = useState(0);
  const [showAchievements, setShowAchievements] = useState(false);
  const charDef = CHARACTERS[selected];

  const XP_PER_TIER = 500;
  const tier = Math.floor(MOCK_PROFILE.battlePassXP / XP_PER_TIER) + 1;
  const xpInTier = MOCK_PROFILE.battlePassXP % XP_PER_TIER;
  const tierPct = Math.round((xpInTier / XP_PER_TIER) * 100);

  useEffect(() => {
    const id = setInterval(() => {
      setFlavorIdx(i => (i + 1) % LOBBY_FLAVOR_TEXTS.length);
    }, 6000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen bg-arcade-gradient text-white flex flex-col items-center p-6 font-sans overflow-x-hidden">
      {/* Header */}
      <header className="w-full max-w-[400px] mb-6 flex flex-col items-center gap-1">
        <div className="text-5xl mb-2 filter drop-shadow-[0_0_15px_rgba(255,255,255,0.4)] animate-[float_4s_infinite_ease-in-out]">🏘️</div>
        <h1 className="text-6xl font-black italic tracking-tighter text-orange-500 text-glow-orange leading-none">
          95-Й
        </h1>
        <p className="text-xs uppercase font-bold tracking-[0.2em] text-orange-300/60 mt-1">ЖК «Цветочные Поляны»</p>
        <p className="text-[10px] text-slate-400 font-medium italic">Кто из соседей сливает бензин?</p>
      </header>

      {/* Profile Bar */}
      <section className="w-full max-w-[400px] arcade-glass rounded-3xl p-4 mb-6 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-40 transition-opacity">
          <Zap size={40} className="text-yellow-400" />
        </div>
        
        <div className="flex items-center gap-4 relative z-10">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center gap-1 bg-yellow-500/20 px-3 py-1 rounded-full border border-yellow-500/30">
                <Coins size={14} className="text-yellow-400" />
                <span className="text-sm font-black text-yellow-400">{MOCK_PROFILE.babki}</span>
              </div>
              <div className="text-[10px] font-bold text-slate-400 bg-slate-800/50 px-2 py-1 rounded-full uppercase tracking-wider">
                {MOCK_PROFILE.totalMatchesPlayed} игр
              </div>
            </div>
            
            <div className="space-y-1.5">
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Пропуск • Ур. {tier}</span>
                <span className="text-[10px] font-black text-blue-300">{tierPct}%</span>
              </div>
              <div className="h-3 w-full bg-slate-900/50 rounded-full border border-white/5 overflow-hidden p-[2px]">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-blue-600 via-blue-400 to-cyan-400 shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-1000"
                  style={{ width: `${tierPct}%` }}
                />
              </div>
            </div>
          </div>

          <button 
            onClick={() => setShowAchievements(!showAchievements)}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 active:scale-95 transition-all shadow-inner"
          >
            <Medal size={28} className="text-orange-400 mb-1" />
            <span className="text-[10px] font-black text-slate-300">{MOCK_ACH_UNLOCKED}/{MOCK_ACH_TOTAL}</span>
          </button>
        </div>
      </section>

      {/* Tabs */}
      <nav className="w-full max-w-[400px] flex gap-3 mb-6">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex-1 flex flex-col items-center gap-2 py-4 rounded-3xl transition-all duration-300 relative overflow-hidden
                ${isActive 
                  ? 'bg-gradient-to-br from-orange-500 to-red-600 shadow-[0_10px_20px_rgba(239,68,68,0.3)] scale-105 z-10' 
                  : 'arcade-glass opacity-70 hover:opacity-100'}
              `}
            >
              {isActive && <div className="absolute inset-0 bg-white/20 animate-pulse" />}
              <Icon size={isActive ? 28 : 22} className={isActive ? 'text-white' : 'text-slate-400'} />
              <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-white' : 'text-slate-500'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Conditional Content */}
      <div className="w-full max-w-[400px]">
        {showAchievements && (
          <div className="arcade-glass rounded-3xl p-5 mb-6 border-orange-500/30 animate-in fade-in slide-in-from-top-4 duration-300">
            <h3 className="text-xs font-black uppercase tracking-widest text-orange-400 mb-2 flex items-center gap-2">
              <Medal size={14} /> Достижения
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed opacity-80">
              Список ваших подвигов в ЖК. Разблокируйте уникальные значки и валюту!
            </p>
          </div>
        )}

        {activeTab === 'shop' && (
          <div className="flex flex-col items-center justify-center py-20 arcade-glass rounded-[40px] gap-4">
            <ShoppingBag size={64} className="text-blue-400 animate-bounce" />
            <p className="text-sm font-black text-blue-300/70 uppercase tracking-widest">Магазин закрыт на переучет</p>
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="flex flex-col items-center justify-center py-20 arcade-glass rounded-[40px] gap-4">
            <Trophy size={64} className="text-yellow-400 animate-pulse" />
            <p className="text-sm font-black text-yellow-300/70 uppercase tracking-widest">Рейтинг скоро обновится</p>
          </div>
        )}

        {activeTab === 'game' && (
          <>
            {/* Daily Task */}
            <div className="bg-gradient-to-r from-purple-900/40 to-indigo-900/40 arcade-glass rounded-3xl p-5 mb-6 border-l-4 border-l-purple-500 shadow-xl flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                  <Calendar size={12} /> Ежедневное задание
                </p>
                <h4 className="text-sm font-black text-white">Выполни 3 задачи</h4>
              </div>
              <div className="text-right">
                <div className="text-xl font-black text-purple-300">1/3</div>
                <div className="text-[10px] font-bold text-yellow-400">+200 БАБОК</div>
              </div>
            </div>

            {/* Character Selection */}
            <div className="mb-8">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 mb-4 px-2">Твой герой</h3>
              <div className="grid grid-cols-5 gap-3 mb-5">
                {CHARACTER_KEYS.map(key => {
                  const c = CHARACTERS[key];
                  const isSelected = key === selected;
                  return (
                    <button
                      key={key}
                      onClick={() => setSelected(key)}
                      className={`
                        flex flex-col items-center justify-center p-2 rounded-2xl arcade-character-card
                        ${isSelected 
                          ? 'bg-gradient-to-b from-white/20 to-transparent border-2 border-white shadow-[0_0_15px_rgba(255,255,255,0.3)] z-10' 
                          : 'arcade-glass border-white/5 opacity-50 grayscale hover:grayscale-0 hover:opacity-100'}
                      `}
                      style={{ borderColor: isSelected ? c.color : undefined }}
                    >
                      <span className="text-3xl mb-1">{c.emoji}</span>
                      <span className={`text-[8px] font-black uppercase truncate w-full text-center ${isSelected ? 'text-white' : 'text-slate-500'}`}>
                        {c.name.split(' ')[0]}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Character Details */}
              <div className="arcade-glass rounded-[32px] p-6 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
                <div className="flex gap-6 items-center relative z-10">
                  <div className="w-20 h-20 rounded-[28px] arcade-glass flex items-center justify-center text-5xl shadow-inner animate-[float_3s_infinite_ease-in-out]">
                    {charDef.emoji}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xl font-black mb-1 flex items-center gap-2">
                      {charDef.name}
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: charDef.color }} />
                    </h4>
                    <p className="text-xs text-slate-400 font-medium leading-relaxed mb-2 italic">
                      {charDef.description}
                    </p>
                    <div className="inline-block bg-slate-900/50 rounded-xl px-3 py-1.5 border border-white/5">
                      <span className="text-[10px] font-black italic text-white/60" style={{ color: charDef.color }}>
                        «{charDef.voiceLines[0]}»
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Game Settings */}
            <div className="arcade-glass rounded-[40px] p-8 mb-8 shadow-inner border-white/10">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 mb-8 flex items-center gap-2">
                <Zap size={14} /> Параметры катки
              </h3>

              <div className="space-y-8">
                <div className="space-y-4">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-sm font-black text-slate-300 flex items-center gap-2">
                      <Users size={16} className="text-blue-400" /> Игроки
                    </span>
                    <span className="text-2xl font-black text-white bg-blue-600/30 px-3 py-1 rounded-2xl border border-blue-500/30">
                      {playerCount}
                    </span>
                  </div>
                  <div className="relative h-2 flex items-center">
                    <div className="absolute w-full h-2 bg-slate-900 rounded-full" />
                    <input 
                      type="range" min={4} max={10} value={playerCount}
                      onChange={e => {
                        const n = +e.target.value;
                        setPlayerCount(n);
                        if (siphonersCount >= n - 1) setSiphonersCount(Math.max(1, n - 2));
                      }}
                      className="w-full h-2 absolute opacity-0 cursor-pointer z-20"
                    />
                    <div 
                      className="h-2 bg-gradient-to-r from-blue-600 to-blue-400 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" 
                      style={{ width: `${((playerCount - 4) / 6) * 100}%` }}
                    />
                    <div 
                      className="absolute w-6 h-6 bg-white rounded-full border-4 border-blue-500 shadow-xl z-10 pointer-events-none"
                      style={{ left: `calc(${((playerCount - 4) / 6) * 100}% - 12px)` }}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-sm font-black text-slate-300 flex items-center gap-2">
                      <ShieldAlert size={16} className="text-red-400" /> Сливщики
                    </span>
                    <span className="text-2xl font-black text-white bg-red-600/30 px-3 py-1 rounded-2xl border border-red-500/30">
                      {siphonersCount}
                    </span>
                  </div>
                  <div className="relative h-2 flex items-center">
                    <div className="absolute w-full h-2 bg-slate-900 rounded-full" />
                    <input 
                      type="range" min={1} max={Math.floor((playerCount - 1) / 2)}
                      value={siphonersCount}
                      onChange={e => setSiphonersCount(+e.target.value)}
                      className="w-full h-2 absolute opacity-0 cursor-pointer z-20"
                    />
                    <div 
                      className="h-2 bg-gradient-to-r from-red-600 to-red-400 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)]" 
                      style={{ width: `${((siphonersCount - 1) / (Math.floor((playerCount - 1) / 2) - 1)) * 100}%` }}
                    />
                    <div 
                      className="absolute w-6 h-6 bg-white rounded-full border-4 border-red-500 shadow-xl z-10 pointer-events-none"
                      style={{ left: `calc(${((siphonersCount - 1) / (Math.floor((playerCount - 1) / 2) - 1)) * 100}% - 12px)` }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8 bg-slate-900/40 rounded-3xl p-4 border border-white/5">
                <p className="text-[10px] text-slate-400 font-bold leading-loose">
                   🏘️ <span className="text-white">{playerCount - siphonersCount} хозяев</span> vs <span className="text-red-400">🪣 {siphonersCount} сливщик{siphonersCount === 1 ? '' : 'а'}</span>
                  <br/>
                  <span className="opacity-60">Цель: Единство 100% или депортация всех подозрительных.</span>
                </p>
              </div>

              <div className="mt-10">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 mb-4 px-1">ИИ Ботов</h3>
                <div className="grid grid-cols-4 gap-2">
                  {(Object.keys(DIFFICULTY_LABELS) as BotDifficulty[]).map(key => {
                    const d = DIFFICULTY_LABELS[key];
                    const isSelected = key === difficulty;
                    return (
                      <button
                        key={key}
                        onClick={() => setDifficulty(key)}
                        className={`
                          flex flex-col items-center gap-1 py-4 rounded-3xl transition-all
                          ${isSelected 
                            ? `bg-gradient-to-b ${d.gradient} shadow-lg ring-2 ring-white/20` 
                            : 'arcade-glass border-white/5 opacity-50 hover:opacity-100'}
                        `}
                      >
                        <span className="text-xl">{d.emoji}</span>
                        <span className="text-[9px] font-black uppercase">{d.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* How to play */}
            <div className="arcade-glass rounded-[40px] p-8 mb-8 border-dashed border-white/10 relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-50" />
               <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 mb-6 flex items-center gap-2">
                 <Info size={14} /> Школа выживания
               </h3>
               <ul className="space-y-4">
                 {[
                   ['🕹️', 'Двигайся джойстиком / WASD'],
                   ['🅴', 'Кнопка E — взаимодействие'],
                   ['🌯', 'Выполняй задачи → Единство'],
                   ['🔔', 'Сходка у арки (кнопка E)'],
                   ['🗳️', 'Голосуй за подозреваемых'],
                   ['🪣', 'Сливщики: не попадайся!'],
                 ].map(([icon, text], idx) => (
                   <li key={idx} className="flex items-center gap-4 text-xs font-black text-slate-300">
                     <span className="w-8 h-8 rounded-xl arcade-glass flex items-center justify-center text-sm shadow-inner shrink-0">{icon}</span>
                     <span>{text}</span>
                   </li>
                 ))}
               </ul>
            </div>

            {/* CTAs */}
            <div className="space-y-4 mb-8">
              <button className="w-full arcade-button-primary bg-gradient-to-r from-amber-400 to-orange-500 p-5 rounded-[28px] shadow-2xl shadow-orange-500/40 border-t-4 border-t-white/30 group">
                <div className="flex items-center justify-center gap-3">
                  <Calendar className="text-white drop-shadow-md" size={24} />
                  <div className="text-left">
                    <p className="text-lg font-black text-white leading-none uppercase tracking-tighter">Ежедневный вызов</p>
                    <p className="text-[9px] font-black text-orange-100 opacity-80 uppercase tracking-widest mt-1">Топ-100 получит призы</p>
                  </div>
                </div>
              </button>

              <button className="w-full arcade-button-primary bg-gradient-to-r from-red-500 to-pink-600 p-7 rounded-[32px] shadow-2xl shadow-red-500/50 border-t-4 border-t-white/30 flex items-center justify-center gap-3 active:translate-y-1">
                <Gamepad2 size={32} className="text-white drop-shadow-md" />
                <span className="text-2xl font-black text-white uppercase italic tracking-tighter">Играть</span>
              </button>

              <button className="w-full arcade-button-primary arcade-glass p-5 rounded-[28px] border-2 border-blue-500/30 flex items-center justify-center gap-3 group">
                <Users size={20} className="text-blue-400 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-black text-blue-300 uppercase tracking-widest italic">Мультиплеер</span>
              </button>

              {/* Promo Banner */}
              <button className="w-full arcade-glass rounded-[32px] p-5 flex items-center justify-between group border-amber-500/20 hover:border-amber-500/40 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center shadow-inner">
                    <Ticket className="text-amber-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-black text-amber-400 uppercase tracking-tighter">Талоны на бензин</p>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">@fuel_fuel_fuel_bot</p>
                  </div>
                </div>
                <ChevronRight className="text-slate-600 group-hover:text-amber-400 transition-colors" />
              </button>
            </div>

            {/* News Ticker */}
            <div className="w-full arcade-glass rounded-3xl p-4 mb-8 border-orange-500/20 relative overflow-hidden">
               <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest mb-1.5 px-1">Новости ЖК</p>
               <div className="bg-black/20 rounded-xl p-3 border border-white/5 h-12 flex items-center overflow-hidden">
                 <div className="whitespace-nowrap animate-[slide-ticker_15s_linear_infinite] text-xs font-bold text-slate-300 italic opacity-90">
                   {LOBBY_FLAVOR_TEXTS[flavorIdx]} • {LOBBY_FLAVOR_TEXTS[(flavorIdx + 1) % LOBBY_FLAVOR_TEXTS.length]}
                 </div>
               </div>
            </div>
          </>
        )}
      </div>

      <footer className="w-full py-8 text-center opacity-30">
        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-500">
          ЖК «Цветочные Поляны» • 2026 • @bakstab_bot
        </p>
      </footer>
    </div>
  );
}
