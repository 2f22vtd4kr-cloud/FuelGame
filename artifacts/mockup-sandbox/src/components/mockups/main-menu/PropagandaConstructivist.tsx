import './PropagandaConstructivist.css';
import { useState, useEffect } from 'react';
import { Trophy, ShoppingBag, Gamepad2, Medal, ArrowRight, Info, Zap, Flame } from 'lucide-react';

type CharacterKey =
  | 'denis' | 'anya' | 'vova' | 'uncle_seryozha' | 'petrovich'
  | 'marina' | 'akhmet' | 'oleg' | 'lena' | 'barsik';

type BotDifficulty = 'easy' | 'medium' | 'hard' | 'nightmare';

interface CharacterDef {
  key: CharacterKey;
  name: string;
  shortName: string;
  emoji: string;
  color: string;
  description: string;
  voiceLines: string[];
}

const CHARACTERS: Record<CharacterKey, CharacterDef> = {
  denis: { key: 'denis', name: 'Денис', shortName: 'Денис', emoji: '🧑', color: '#E53935', description: 'Водитель такси. Всегда куда-то торопится.', voiceLines: ['Смена горит!'] },
  anya: { key: 'anya', name: 'Аня', shortName: 'Аня', emoji: '👩', color: '#8E24AA', description: 'Заядлая каршерингистка. Боится ответственности.', voiceLines: ['Это не моя тачка.'] },
  vova: { key: 'vova', name: 'Вова Крипто', shortName: 'Вова', emoji: '🤑', color: '#F4511E', description: 'Трейдер USDT. Ищет выгодные инвестиции во дворе.', voiceLines: ['To the moon, bro.'] },
  uncle_seryozha: { key: 'uncle_seryozha', name: 'Дядя Серёжа', shortName: 'Серёжа', emoji: '👴', color: '#7B1FA2', description: 'Старожил двора. Любит порядок и советскую власть.', voiceLines: ['Талоны верните!'] },
  petrovich: { key: 'petrovich', name: 'Петрович', shortName: 'Петрович', emoji: '🔧', color: '#1565C0', description: 'Мастер из гаражей. Знает каждый винтик в любой машине.', voiceLines: ['Я не чинил, я смотрел.'] },
  marina: { key: 'marina', name: 'Марина Блогерша', shortName: 'Марина', emoji: '📱', color: '#E91E63', description: 'Местная звезда соцсетей. Ищет скандальный контент.', voiceLines: ['Подписывайтесь!'] },
  akhmet: { key: 'akhmet', name: 'Ахмет Дворник', shortName: 'Ахмет', emoji: '🧹', color: '#FF8F00', description: 'Следит за чистотой. Ничего не говорит, но всё замечает.', voiceLines: ['...'] },
  oleg: { key: 'oleg', name: 'Олег Силовик', shortName: 'Олег', emoji: '🕵️', color: '#212121', description: 'Пенсионер МВД. Ведёт собственное расследование.', voiceLines: ['Гражданин, документики.'] },
  lena: { key: 'lena', name: 'Лена Эко', shortName: 'Лена', emoji: '🚲', color: '#33691E', description: 'Эко-активистка. Ненавидит двигатели внутреннего сгорания.', voiceLines: ['Бензин — это прошлый век.'] },
  barsik: { key: 'barsik', name: 'Барсик', shortName: 'Барсик', emoji: '🐱', color: '#FF7043', description: 'Хитрый дворовый кот. Гуляет сам по себе и знает секреты.', voiceLines: ['Мяу.'] },
};

const CHARACTER_KEYS = Object.keys(CHARACTERS) as CharacterKey[];

const LOBBY_FLAVOR_TEXTS = [
  'В подъезде №3 снова сломался лифт. Администрация: «Заявка в работе.»',
  'На стоянке нашли 2 пустые канистры. Очень подозрительно.',
  'Дядя Серёжа с балкона кричит про талоны. Опять.',
];

const DIFFICULTY_LABELS: Record<BotDifficulty, { label: string; emoji: string; desc: string; color: string }> = {
  easy: { label: 'Лёгкий', emoji: '🟢', desc: 'Боты ленятся', color: '#4CAF50' },
  medium: { label: 'Средний', emoji: '🟡', desc: 'Стандартная игра', color: '#FF9800' },
  hard: { label: 'Сложный', emoji: '🔴', desc: 'Боты хитрят', color: '#F44336' },
  nightmare: { label: 'Кошмар', emoji: '💀', desc: 'Почти нереально', color: '#9C27B0' },
};

type LobbyTab = 'game' | 'shop' | 'leaderboard';
const TABS: { id: LobbyTab; label: string; icon: any }[] = [
  { id: 'game', label: 'Игра', icon: Gamepad2 },
  { id: 'shop', label: 'Магазин', icon: ShoppingBag },
  { id: 'leaderboard', label: 'Рейтинг', icon: Trophy },
];

const MOCK_PROFILE = {
  babki: 4250,
  totalMatchesPlayed: 37,
  battlePassXP: 1830,
};
const MOCK_ACH_UNLOCKED = 14;
const MOCK_ACH_TOTAL = 50;

export function PropagandaConstructivist() {
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
    <div className="pk-constructivist-root flex flex-col items-center">
      <div className="constructivist-bg"></div>
      <div className="constructivist-beams"></div>

      <div className="w-full max-w-[420px] relative z-10 flex flex-col min-h-screen">
        
        {/* Dynamic Header Composition */}
        <header className="relative w-full pt-14 pb-8 px-5">
          <div className="absolute top-[-20%] left-[-10%] w-[120%] h-[120%] bg-[#cc2b1d] -skew-y-6 z-0 border-b-8 border-[#1a1a1a] shadow-[0_8px_0_rgba(0,0,0,0.1)]"></div>
          <div className="absolute top-[-10%] right-[-10%] w-[55%] h-[90%] bg-[#e5a50a] rotate-[12deg] z-0 border-4 border-[#1a1a1a] shadow-[8px_8px_0_#1a1a1a]"></div>
          
          <div className="relative z-10 flex flex-col">
            <div className="flex items-end justify-between">
              <div className="flex flex-col">
                <span className="text-[110px] sm:text-[130px] leading-[0.75] tracking-tighter russo-font text-[#f4ebd0] drop-shadow-[4px_4px_0_#1a1a1a]">95</span>
                <span className="text-[36px] sm:text-[42px] leading-none tracking-tight text-[#1a1a1a] font-black uppercase mt-[-5px] ml-2 bg-[#e5a50a] px-2 py-0.5 w-max border-4 border-[#1a1a1a] rotate-[-3deg] shadow-[4px_4px_0_#cc2b1d]">бакстаб</span>
              </div>
              <div className="text-[70px] sm:text-[85px] drop-shadow-[4px_4px_0_#1a1a1a] rotate-[15deg] hover:rotate-[25deg] transition-transform duration-500 cursor-default">🏘️</div>
            </div>
            
            <div className="bg-[#1a1a1a] text-[#f4ebd0] p-2 sm:p-3 mt-6 rotate-[2deg] shadow-[6px_6px_0_#e5a50a] border-2 border-[#1a1a1a] w-max max-w-full hover:rotate-0 transition-transform">
              <span className="font-black text-sm sm:text-base uppercase tracking-widest block text-center">ЖК «Цветочные Поляны»</span>
            </div>
            <p className="mt-4 text-[#f4ebd0] font-black text-sm sm:text-base uppercase tracking-wider pl-3 border-l-8 border-[#e5a50a] drop-shadow-[1px_1px_0_#1a1a1a]">
              КТО СЛИВАЕТ БЕНЗИН?
            </p>
          </div>
        </header>

        {/* Profile Stats - Angled Block */}
        <div className="px-4 mb-10">
          <div className="bg-white border-4 border-[#1a1a1a] p-1.5 flex shadow-[8px_8px_0_#cc2b1d] -skew-x-6 relative group hover:-translate-y-1 hover:translate-x-1 hover:shadow-[4px_4px_0_#cc2b1d] transition-all">
            {/* Inner diagonal panel */}
            <div className="flex-1 bg-[#f4ebd0] p-3 sm:p-4 flex flex-col justify-center border-r-4 border-[#1a1a1a]">
              <div className="flex items-center gap-3 mb-3">
                <span className="font-black text-3xl uppercase tracking-tighter skew-x-6 text-[#1a1a1a]">💰 {MOCK_PROFILE.babki}</span>
                <span className="text-[10px] sm:text-xs font-black text-[#1a1a1a] uppercase bg-[#e5a50a] px-2 py-0.5 skew-x-6 border-2 border-[#1a1a1a]">МАТЧЕЙ: {MOCK_PROFILE.totalMatchesPlayed}</span>
              </div>
              <div className="relative h-5 bg-[#1a1a1a] overflow-hidden skew-x-6 border-2 border-[#1a1a1a]">
                <div 
                  className="h-full bg-[#cc2b1d] relative" 
                  style={{ width: `${tierPct}%` }}
                >
                   {/* Diagonal stripes on the progress bar for texture */}
                   <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, #1a1a1a 4px, #1a1a1a 8px)' }}></div>
                </div>
                <span className="absolute inset-0 flex items-center pl-3 text-[11px] font-black text-white mix-blend-difference tracking-widest">
                  УР {tier} — {tierPct}%
                </span>
              </div>
            </div>
            {/* Medals Button */}
            <button 
              onClick={() => setShowAchievements(!showAchievements)}
              className="bg-[#1a1a1a] text-[#f4ebd0] px-5 sm:px-6 flex flex-col items-center justify-center hover:bg-[#cc2b1d] transition-colors active:bg-[#a01c10]"
            >
              <div className="skew-x-6 flex flex-col items-center group-hover:scale-110 transition-transform">
                <Medal size={32} strokeWidth={2.5} />
                <span className="font-black text-sm mt-1">{MOCK_ACH_UNLOCKED}/{MOCK_ACH_TOTAL}</span>
              </div>
            </button>
          </div>
        </div>

        {/* Diagonal Navigation */}
        <nav className="px-4 mb-10 flex flex-col gap-3 relative">
          <div className="absolute left-7 top-0 bottom-0 w-1.5 bg-[#1a1a1a] z-0"></div>
          {TABS.map((tab, idx) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            // staggered constructivist alignment
            const ml = idx === 1 ? 'ml-10' : idx === 2 ? 'ml-4' : 'ml-14';
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`z-10 ${ml} py-3 px-6 flex items-center gap-3 border-4 border-[#1a1a1a] transition-all duration-300
                  ${isActive 
                    ? 'bg-[#cc2b1d] text-[#f4ebd0] shadow-[6px_6px_0_#1a1a1a] translate-x-3 scale-[1.02]' 
                    : 'bg-white text-[#1a1a1a] hover:bg-[#e5a50a] hover:translate-x-2 hover:shadow-[4px_4px_0_#1a1a1a]'}`}
              >
                <Icon size={28} className={isActive ? 'rotate-[15deg] scale-110' : 'opacity-80'} strokeWidth={isActive ? 2.5 : 2} />
                <span className="font-black text-xl uppercase tracking-widest russo-font">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <main className="px-4 flex-1 pb-12 z-10">
          
          {showAchievements && (
            <div className="bg-[#cc2b1d] text-[#f4ebd0] border-4 border-[#1a1a1a] p-5 mb-8 -skew-y-2 shadow-[8px_8px_0_#1a1a1a] relative overflow-hidden animate-in fade-in slide-in-from-top-4">
              <div className="absolute top-0 right-0 p-4 opacity-20 rotate-12 scale-150 pointer-events-none">
                <Medal size={100} />
              </div>
              <h3 className="font-black uppercase text-2xl mb-2 skew-y-2 russo-font relative z-10">СТАХАНОВСКИЕ ДОСТИЖЕНИЯ</h3>
              <p className="text-sm font-bold uppercase bg-[#1a1a1a] text-[#f4ebd0] px-2 py-1 skew-y-2 inline-block relative z-10">
                Список достижений загружается. Труд во благо двора!
              </p>
            </div>
          )}

          {activeTab === 'shop' && (
            <div className="bg-white border-4 border-[#1a1a1a] p-10 text-center relative overflow-hidden shadow-[8px_8px_0_#cc2b1d] group hover:-translate-y-1 transition-transform">
              <div className="absolute top-0 right-0 w-48 h-48 bg-[#cc2b1d] mix-blend-multiply opacity-20 -translate-y-1/2 translate-x-1/4 rotate-45 border-[16px] border-[#1a1a1a]"></div>
              <ShoppingBag size={80} className="mx-auto mb-6 text-[#1a1a1a] group-hover:scale-110 transition-transform" strokeWidth={1.5} />
              <h2 className="font-black text-5xl uppercase mb-4 russo-font tracking-tighter">СНАБЖЕНИЕ</h2>
              <p className="text-base font-black uppercase bg-[#e5a50a] inline-block px-4 py-1 border-4 border-[#1a1a1a] rotate-[-3deg] shadow-[4px_4px_0_#1a1a1a]">
                Шапки, скины, питомцы
              </p>
            </div>
          )}

          {activeTab === 'leaderboard' && (
            <div className="bg-[#1a1a1a] border-4 border-[#1a1a1a] p-10 text-center relative overflow-hidden shadow-[8px_8px_0_#e5a50a] text-[#f4ebd0] group hover:-translate-y-1 transition-transform">
              <div className="absolute bottom-0 left-0 w-0 h-0 border-l-[150px] border-l-transparent border-b-[150px] border-b-[#e5a50a] opacity-30"></div>
              <Trophy size={80} className="mx-auto mb-6 text-[#e5a50a] group-hover:scale-110 transition-transform" strokeWidth={1.5} />
              <h2 className="font-black text-5xl uppercase mb-4 russo-font tracking-tighter text-[#e5a50a]">ДОСКА ПОЧЁТА</h2>
              <p className="text-base font-black uppercase bg-[#cc2b1d] text-[#f4ebd0] inline-block px-4 py-1 border-4 border-[#f4ebd0] rotate-[3deg] shadow-[4px_4px_0_#f4ebd0]">
                Лучшие люди нашего ЖК
              </p>
            </div>
          )}

          {activeTab === 'game' && (
            <div className="space-y-10">
              
              {/* Daily Challenge - Diagonal Ribbon */}
              <div className="relative group cursor-pointer">
                <div className="absolute inset-0 bg-[#e5a50a] rotate-[3deg] border-4 border-[#1a1a1a] shadow-[6px_6px_0_#1a1a1a] z-0 transition-transform group-hover:rotate-[4deg]"></div>
                <div className="bg-[#1a1a1a] text-[#f4ebd0] border-4 border-[#1a1a1a] p-4 sm:p-5 relative z-10 rotate-[-1deg] flex items-center justify-between transition-transform group-hover:translate-x-1 group-hover:-translate-y-1">
                  <div>
                    <span className="block text-[10px] sm:text-xs font-black uppercase tracking-widest text-[#e5a50a] mb-1">ЗАДАЧА ДНЯ</span>
                    <span className="text-xl sm:text-2xl font-black uppercase russo-font leading-none block">Выполни 3 задачи</span>
                  </div>
                  <div className="flex flex-col items-end shrink-0 ml-4">
                    <span className="text-4xl sm:text-5xl font-black text-[#cc2b1d] russo-font drop-shadow-[2px_2px_0_#f4ebd0] leading-none mb-1">1/3</span>
                    <span className="text-[10px] sm:text-xs font-black bg-[#f4ebd0] text-[#1a1a1a] px-1.5 py-0.5 border-2 border-[#1a1a1a] -skew-x-12">+200 БАБОК</span>
                  </div>
                </div>
              </div>

              {/* Character Roster */}
              <section>
                <div className="bg-[#cc2b1d] text-[#f4ebd0] inline-block px-4 py-2 border-4 border-[#1a1a1a] mb-6 -skew-x-12 shadow-[4px_4px_0_#1a1a1a]">
                  <h3 className="font-black uppercase text-2xl skew-x-12 russo-font tracking-widest">БРИГАДА</h3>
                </div>
                
                <div className="grid grid-cols-5 gap-1.5 bg-[#1a1a1a] p-1.5 border-4 border-[#1a1a1a] mb-6 shadow-[6px_6px_0_#cc2b1d]">
                  {CHARACTER_KEYS.map(key => {
                    const c = CHARACTERS[key];
                    const isSelected = key === selected;
                    return (
                      <button
                        key={key}
                        onClick={() => setSelected(key)}
                        className={`aspect-square flex flex-col items-center justify-center transition-all relative overflow-hidden group border-2
                          ${isSelected ? 'bg-[#cc2b1d] border-[#f4ebd0] scale-105 z-10 shadow-[2px_2px_0_#1a1a1a]' : 'bg-[#f4ebd0] border-transparent hover:bg-white hover:border-[#1a1a1a] hover:-translate-y-0.5'}
                        `}
                      >
                        <span className="text-2xl sm:text-3xl z-10 drop-shadow-md group-hover:scale-110 transition-transform">{c.emoji}</span>
                        <span className={`text-[8.5px] sm:text-[10px] font-black uppercase text-center leading-none mt-1 z-10 px-0.5 ${isSelected ? 'text-[#f4ebd0]' : 'text-[#1a1a1a]'}`}>
                          {c.shortName}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Character Dossier - Photomontage Style */}
                <div className="border-4 border-[#1a1a1a] bg-[#f4ebd0] relative group hover:shadow-[8px_8px_0_#1a1a1a] transition-shadow duration-300 mb-2">
                  <div className="absolute top-0 right-0 w-[120px] sm:w-[150px] h-full bg-[#e5a50a] z-0 pointer-events-none" style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}></div>
                  
                  <div className="relative z-10 flex p-3 pr-2 sm:p-4">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 bg-[#cc2b1d] border-4 border-[#1a1a1a] rounded-none flex items-center justify-center text-5xl sm:text-6xl shadow-[4px_4px_0_#1a1a1a] shrink-0 -translate-x-2 -translate-y-2 rotate-[-4deg] group-hover:rotate-0 transition-transform duration-300">
                      {charDef.emoji}
                    </div>
                    <div className="ml-2 sm:ml-4 flex flex-col justify-center flex-1 min-w-0">
                      <div className="flex flex-wrap gap-1.5 mb-2 relative z-10">
                        {charDef.name.split(' ').map((word, i) => (
                          <span key={i} className="font-black text-xl sm:text-2xl uppercase leading-none russo-font bg-[#1a1a1a] text-[#f4ebd0] px-2 py-1 -skew-x-6 border-2 border-[#1a1a1a] shadow-[2px_2px_0_#cc2b1d]">
                            {word}
                          </span>
                        ))}
                      </div>
                      <p className="text-[11px] sm:text-xs font-bold text-[#1a1a1a] uppercase bg-white/95 p-1.5 border-l-4 border-[#cc2b1d] leading-tight relative z-10 shadow-[2px_2px_0_rgba(0,0,0,0.1)] text-balance">
                        {charDef.description}
                      </p>
                    </div>
                  </div>
                  <div className="bg-[#1a1a1a] text-[#f4ebd0] p-3 sm:p-4 text-center border-t-4 border-[#1a1a1a]">
                    <span className="font-black text-sm sm:text-base uppercase tracking-widest text-balance leading-tight block">«{charDef.voiceLines[0]}»</span>
                  </div>
                </div>
              </section>

              {/* Sliders / Settings */}
              <section>
                <div className="bg-[#1a1a1a] text-[#f4ebd0] inline-block px-4 py-2 border-4 border-[#1a1a1a] mb-6 rotate-[2deg] shadow-[4px_4px_0_#e5a50a]">
                  <h3 className="font-black uppercase text-2xl russo-font tracking-widest">ПЛАН РАБОТ</h3>
                </div>

                <div className="border-4 border-[#1a1a1a] bg-white p-5 sm:p-6 space-y-8 shadow-[8px_8px_0_#cc2b1d]">
                  
                  <div className="relative group">
                    <div className="flex justify-between items-end mb-3 border-b-4 border-[#1a1a1a] pb-2">
                      <span className="text-base font-black uppercase tracking-wider">ЧИСЛЕННОСТЬ</span>
                      <span className="text-4xl font-black text-[#cc2b1d] russo-font drop-shadow-[2px_2px_0_#1a1a1a] leading-none">{playerCount}</span>
                    </div>
                    <input 
                      type="range" min={4} max={10} value={playerCount}
                      onChange={e => {
                        const n = +e.target.value;
                        setPlayerCount(n);
                        const maxSiphoners = Math.floor((n - 1) / 2);
                        if (siphonersCount > maxSiphoners) {
                          setSiphonersCount(Math.max(1, maxSiphoners));
                        }
                      }}
                    />
                  </div>

                  <div className="relative group">
                    <div className="flex justify-between items-end mb-3 border-b-4 border-[#1a1a1a] pb-2">
                      <span className="text-base font-black uppercase tracking-wider">ВРАГИ (СЛИВЩИКИ)</span>
                      <span className="text-4xl font-black text-[#1a1a1a] russo-font drop-shadow-[2px_2px_0_#e5a50a] leading-none">{siphonersCount}</span>
                    </div>
                    <input 
                      type="range" min={1} max={Math.floor((playerCount - 1) / 2)}
                      value={siphonersCount}
                      onChange={e => setSiphonersCount(+e.target.value)}
                    />
                  </div>

                  <div className="bg-[#e5a50a] border-4 border-[#1a1a1a] p-3 flex justify-center gap-6 text-sm sm:text-base font-black uppercase skew-x-[-5deg] shadow-[4px_4px_0_#1a1a1a]">
                    <span className="skew-x-[5deg]">🏠 {playerCount - siphonersCount} ХОЗЯЕВ</span>
                    <span className="skew-x-[5deg] text-[#cc2b1d]">VS</span>
                    <span className="skew-x-[5deg]">🪣 {siphonersCount} ВРЕДИТ.</span>
                  </div>

                  <div>
                    <span className="text-sm font-black uppercase mb-4 block bg-[#1a1a1a] text-[#f4ebd0] w-max px-3 py-1 shadow-[4px_4px_0_#cc2b1d] -skew-x-6 tracking-wider">УРОВЕНЬ БОТОВ</span>
                    <div className="grid grid-cols-2 gap-3">
                      {(Object.keys(DIFFICULTY_LABELS) as BotDifficulty[]).map(key => {
                        const d = DIFFICULTY_LABELS[key];
                        const isSelected = key === difficulty;
                        return (
                          <button 
                            key={key} 
                            onClick={() => setDifficulty(key)}
                            className={`border-4 border-[#1a1a1a] p-3 flex flex-col sm:flex-row items-center sm:items-start gap-2 text-center sm:text-left transition-all relative overflow-hidden group
                              ${isSelected ? 'bg-[#cc2b1d] text-[#f4ebd0] shadow-[4px_4px_0_#1a1a1a] -translate-y-1' : 'bg-[#f4ebd0] text-[#1a1a1a] hover:bg-white hover:-translate-y-0.5 hover:shadow-[2px_2px_0_#1a1a1a]'}
                            `}
                          >
                            <span className="text-3xl group-hover:scale-110 transition-transform z-10">{d.emoji}</span>
                            <div className="flex flex-col flex-1 z-10">
                              <span className="text-xs sm:text-sm font-black uppercase leading-tight russo-font">{d.label}</span>
                              <span className={`text-[9px] sm:text-[10px] font-bold uppercase mt-1 ${isSelected ? 'text-[#f4ebd0]/90' : 'text-[#1a1a1a]/70'}`}>{d.desc}</span>
                            </div>
                            {isSelected && (
                               <div className="absolute -right-2 -bottom-2 opacity-20 pointer-events-none">
                                 <Zap size={50} fill="currentColor" />
                               </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </section>

              {/* Instructions - Constructivist list */}
              <section className="bg-[#cc2b1d] border-4 border-[#1a1a1a] p-5 sm:p-6 text-[#f4ebd0] relative overflow-hidden shadow-[8px_8px_0_#1a1a1a]">
                <div className="absolute -right-12 -bottom-12 opacity-10 pointer-events-none">
                  <Info size={160} strokeWidth={3} />
                </div>
                <h3 className="font-black text-4xl uppercase mb-6 border-b-8 border-[#f4ebd0] pb-2 russo-font tracking-tight">ПРАВИЛА</h3>
                <div className="space-y-4 relative z-10">
                  {[
                    "🕹️ Двигайся джойстиком / WASD",
                    "🅴 Кнопка E — взаимодействие",
                    "🌯 Выполняй задачи → копи единство",
                    "🔔 У арки нажми E → созвать сходку",
                    "🗳️ На сходке голосуй за врагов",
                    "🪣 Сливщики сливают баки скрытно"
                  ].map((text, i) => (
                    <div key={i} className="flex items-center gap-4 group">
                      <div className="w-8 h-8 bg-[#1a1a1a] text-[#f4ebd0] flex items-center justify-center font-black text-base shrink-0 -skew-x-12 border-2 border-transparent group-hover:border-[#f4ebd0] transition-colors">
                        <span className="skew-x-12">{i + 1}</span>
                      </div>
                      <span className="text-xs sm:text-sm font-black uppercase tracking-wider leading-tight text-balance group-hover:text-white transition-colors">{text}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* CTA Banners */}
              <div className="space-y-6">
                
                {/* Promo CTA */}
                <button className="w-full border-4 border-[#1a1a1a] bg-[#e5a50a] flex items-stretch hover:shadow-[6px_6px_0_#cc2b1d] hover:-translate-y-1 transition-all group active:translate-y-0 active:shadow-[2px_2px_0_#cc2b1d]">
                  <div className="bg-[#1a1a1a] text-[#e5a50a] p-4 sm:p-5 flex items-center justify-center w-20 group-hover:bg-[#cc2b1d] group-hover:text-[#1a1a1a] transition-colors border-r-4 border-[#1a1a1a]">
                    <Flame size={40} className="group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="p-4 text-left flex flex-col justify-center flex-1">
                    <div className="text-base sm:text-xl font-black uppercase russo-font text-[#1a1a1a] tracking-wider">ТАЛОНЫ НА БЕНЗИН</div>
                    <div className="text-[10px] sm:text-xs font-bold uppercase border-t-4 border-[#1a1a1a] pt-1 mt-1 text-[#1a1a1a]">
                      Бот @fuel_fuel_fuel_bot
                    </div>
                  </div>
                </button>

                {/* Daily CTA */}
                <button className="w-full border-4 border-[#1a1a1a] bg-[#1a1a1a] text-[#f4ebd0] p-5 sm:p-6 flex items-center justify-between group hover:bg-[#cc2b1d] hover:shadow-[6px_6px_0_#e5a50a] hover:-translate-y-1 transition-all relative overflow-hidden active:translate-y-0 active:shadow-[2px_2px_0_#e5a50a]">
                  <div className="absolute right-[-20px] top-1/2 -translate-y-1/2 opacity-20 group-hover:opacity-40 transition-opacity">
                    <Zap size={120} />
                  </div>
                  <div className="text-left relative z-10">
                    <span className="block text-2xl sm:text-3xl font-black uppercase russo-font tracking-widest group-hover:drop-shadow-[2px_2px_0_#1a1a1a] transition-all">ВЫЗОВ ДНЯ</span>
                    <span className="text-xs sm:text-sm font-bold uppercase opacity-90 border-l-4 border-[#e5a50a] pl-2 mt-1 block">Все в равных условиях</span>
                  </div>
                  <ArrowRight size={40} className="relative z-10 text-[#e5a50a] group-hover:translate-x-4 group-hover:scale-110 group-hover:text-[#f4ebd0] transition-all" strokeWidth={3} />
                </button>

                {/* Primary Game CTA */}
                <button className="w-full border-4 border-[#1a1a1a] bg-[#cc2b1d] text-[#f4ebd0] p-6 text-center shadow-[12px_12px_0_#1a1a1a] hover:shadow-[4px_4px_0_#1a1a1a] hover:translate-y-2 hover:translate-x-2 transition-all relative group active:shadow-none active:translate-y-3 active:translate-x-3">
                  <div className="absolute inset-2 border-2 border-[#f4ebd0] border-dashed pointer-events-none opacity-50 group-hover:opacity-100 group-hover:scale-[0.98] transition-all"></div>
                  <span className="text-5xl font-black uppercase tracking-widest russo-font drop-shadow-[3px_3px_0_#1a1a1a] group-hover:drop-shadow-[1px_1px_0_#1a1a1a] transition-all">ИГРАТЬ</span>
                  <span className="block text-sm font-black uppercase mt-3 bg-[#1a1a1a] px-3 py-1 w-max mx-auto -skew-x-12 border-2 border-transparent group-hover:border-[#f4ebd0] transition-colors">
                    ОДИНОЧНАЯ
                  </span>
                </button>

                {/* Multiplayer CTA */}
                <button className="w-full border-4 border-[#1a1a1a] bg-white text-[#1a1a1a] p-5 text-center hover:bg-[#e5a50a] transition-colors shadow-[6px_6px_0_#1a1a1a] hover:translate-y-1 hover:translate-x-1 hover:shadow-[2px_2px_0_#1a1a1a] active:translate-y-2 active:translate-x-2 active:shadow-none font-black text-2xl uppercase tracking-widest russo-font">
                  МУЛЬТИПЛЕЕР
                </button>

              </div>

              {/* Ticker Bottom */}
              <div className="border-y-8 border-[#1a1a1a] bg-[#1a1a1a] text-[#f4ebd0] py-3 flex items-center relative overflow-hidden mb-8 shadow-[0_8px_0_rgba(0,0,0,0.1)]">
                <div className="bg-[#cc2b1d] px-4 py-2 font-black uppercase text-sm sm:text-base z-10 shrink-0 border-r-4 border-[#1a1a1a] shadow-[4px_0_0_rgba(0,0,0,0.3)] tracking-wider">
                  МОЛНИЯ
                </div>
                <div className="ticker-wrap flex-1 px-4">
                  <div className="ticker-content text-xs sm:text-sm font-bold uppercase tracking-widest text-[#e5a50a]">
                    {LOBBY_FLAVOR_TEXTS[flavorIdx]}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        <footer className="w-full px-4 text-center mt-auto pt-4 pb-10 z-10 relative">
          <div className="border-t-8 border-[#1a1a1a] pt-6 flex flex-col items-center">
            <div className="w-24 h-6 bg-[#cc2b1d] border-4 border-[#1a1a1a] mb-4 skew-x-12 shadow-[4px_4px_0_#1a1a1a]"></div>
            <p className="text-xs font-black uppercase tracking-widest text-[#1a1a1a] bg-white/50 p-2 border-2 border-[#1a1a1a]">
              ГЛАВК ЖК «ЦВЕТОЧНЫЕ ПОЛЯНЫ» © 2026<br/>
              РАЗРАБОТКА: @bakstab_bot
            </p>
          </div>
        </footer>

      </div>
    </div>
  );
}
