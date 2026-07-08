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
  emoji: string;
  color: string;
  description: string;
  voiceLines: string[];
}

const CHARACTERS: Record<CharacterKey, CharacterDef> = {
  denis: { key: 'denis', name: 'Денис', emoji: '🧑', color: '#E53935', description: 'Водитель Яндекс Такси. Смена горит.', voiceLines: ['Смена горит.'] },
  anya: { key: 'anya', name: 'Аня', emoji: '👩', color: '#8E24AA', description: 'Каршерингист. «Это не моя тачка».', voiceLines: ['Это не моя тачка.'] },
  vova: { key: 'vova', name: 'Вова Крипто', emoji: '🤑', color: '#F4511E', description: 'Трейдер USDT. Всё переводит в крипту.', voiceLines: ['To the moon, bro.'] },
  uncle_seryozha: { key: 'uncle_seryozha', name: 'Дядя Серёжа', emoji: '👴', color: '#7B1FA2', description: 'Ветеран двора. Кричит про талоны.', voiceLines: ['Талоны верните!'] },
  petrovich: { key: 'petrovich', name: 'Петрович', emoji: '🔧', color: '#1565C0', description: 'Гаражный мастер. Чинит всё подряд.', voiceLines: ['Я не чинил, я смотрел.'] },
  marina: { key: 'marina', name: 'Марина Блогерша', emoji: '📱', color: '#E91E63', description: 'Снимает двор на сторис.', voiceLines: ['Подписывайтесь!'] },
  akhmet: { key: 'akhmet', name: 'Ахмет Дворник', emoji: '🧹', color: '#FF8F00', description: 'Подметает двор и молчит.', voiceLines: ['...'] },
  oleg: { key: 'oleg', name: 'Олег Силовик', emoji: '🕵️', color: '#212121', description: 'Бывший силовик. Всех подозревает.', voiceLines: ['Документы.'] },
  lena: { key: 'lena', name: 'Лена Эко', emoji: '🚲', color: '#33691E', description: 'За экологию и раздельный сбор.', voiceLines: ['Бензин — это прошлый век.'] },
  barsik: { key: 'barsik', name: 'Барсик', emoji: '🐱', color: '#FF7043', description: 'Дворовой кот. Видел всё.', voiceLines: ['Мяу.'] },
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
        <header className="relative w-full pt-12 pb-6 px-4">
          <div className="absolute top-[-20%] left-[-10%] w-[120%] h-[120%] bg-[#cc2b1d] -skew-y-6 z-0 border-b-8 border-[#1a1a1a]"></div>
          <div className="absolute top-0 right-[-10%] w-[50%] h-[80%] bg-[#e5a50a] rotate-[15deg] z-0 border-4 border-[#1a1a1a] shadow-[8px_8px_0_#1a1a1a]"></div>
          
          <div className="relative z-10 flex flex-col">
            <div className="flex items-end justify-between">
              <div className="flex flex-col">
                <span className="text-[120px] leading-[0.8] tracking-tighter russo-font text-[#f4ebd0] drop-shadow-[4px_4px_0_#1a1a1a]">95</span>
                <span className="text-[40px] leading-none tracking-tight text-[#1a1a1a] font-black uppercase mt-[-10px] ml-2 bg-[#e5a50a] px-2 w-max border-2 border-[#1a1a1a] rotate-[-3deg]">бакстаб</span>
              </div>
              <div className="text-[80px] drop-shadow-[4px_4px_0_#1a1a1a] rotate-[15deg]">🏘️</div>
            </div>
            
            <div className="bg-[#1a1a1a] text-[#f4ebd0] p-2 mt-4 rotate-[2deg] shadow-[4px_4px_0_#e5a50a] w-max max-w-full">
              <span className="font-black text-sm uppercase tracking-widest block text-center">ЖК «Цветочные Поляны»</span>
            </div>
            <p className="mt-2 text-[#f4ebd0] font-bold text-xs uppercase tracking-wider pl-2 border-l-4 border-[#e5a50a]">
              КТО СЛИВАЕТ БЕНЗИН?
            </p>
          </div>
        </header>

        {/* Profile Stats - Angled Block */}
        <div className="px-4 mb-8">
          <div className="bg-white border-4 border-[#1a1a1a] p-1 flex shadow-[6px_6px_0_#cc2b1d] -skew-x-6 relative">
            {/* Inner diagonal panel */}
            <div className="flex-1 bg-[#f4ebd0] p-3 flex flex-col justify-center border-r-4 border-[#1a1a1a]">
              <div className="flex items-center gap-4 mb-2">
                <span className="font-black text-2xl uppercase tracking-tighter skew-x-6">💰 {MOCK_PROFILE.babki}</span>
                <span className="text-[10px] font-bold text-[#1a1a1a] uppercase bg-[#e5a50a] px-1 skew-x-6">МАТЧЕЙ: {MOCK_PROFILE.totalMatchesPlayed}</span>
              </div>
              <div className="relative h-4 bg-[#1a1a1a] overflow-hidden skew-x-6">
                <div 
                  className="h-full bg-[#cc2b1d]" 
                  style={{ width: `${tierPct}%` }}
                ></div>
                <span className="absolute inset-0 flex items-center pl-2 text-[10px] font-black text-white mix-blend-difference">
                  УР {tier} — {tierPct}%
                </span>
              </div>
            </div>
            {/* Medals Button */}
            <button 
              onClick={() => setShowAchievements(!showAchievements)}
              className="bg-[#1a1a1a] text-[#f4ebd0] px-4 flex flex-col items-center justify-center hover:bg-[#cc2b1d] transition-colors"
            >
              <div className="skew-x-6 flex flex-col items-center">
                <Medal size={28} />
                <span className="font-black text-sm mt-1">{MOCK_ACH_UNLOCKED}/{MOCK_ACH_TOTAL}</span>
              </div>
            </button>
          </div>
        </div>

        {/* Diagonal Navigation */}
        <nav className="px-4 mb-8 flex flex-col gap-2 relative">
          <div className="absolute left-6 top-0 bottom-0 w-1 bg-[#cc2b1d] z-0"></div>
          {TABS.map((tab, idx) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            // stagger alignment
            const ml = idx === 1 ? 'ml-8' : idx === 2 ? 'ml-4' : 'ml-12';
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`z-10 ${ml} py-2 px-6 flex items-center gap-3 border-4 border-[#1a1a1a] transition-all
                  ${isActive 
                    ? 'bg-[#cc2b1d] text-[#f4ebd0] shadow-[4px_4px_0_#1a1a1a] translate-x-2' 
                    : 'bg-white text-[#1a1a1a] hover:bg-[#f4ebd0]'}`}
              >
                <Icon size={24} className={isActive ? 'rotate-[15deg]' : ''} />
                <span className="font-black text-lg uppercase tracking-widest russo-font">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <main className="px-4 flex-1 pb-12 z-10">
          
          {showAchievements && (
            <div className="bg-[#1a1a1a] text-[#f4ebd0] border-l-8 border-[#e5a50a] p-4 mb-8 -skew-y-2">
              <h3 className="font-black uppercase text-xl mb-2 skew-y-2">СТАХАНОВСКИЕ ДОСТИЖЕНИЯ</h3>
              <p className="text-xs font-bold uppercase opacity-80 skew-y-2">
                Список достижений загружается. Труд во благо двора!
              </p>
            </div>
          )}

          {activeTab === 'shop' && (
            <div className="bg-white border-4 border-[#1a1a1a] p-8 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#cc2b1d] rounded-full mix-blend-multiply opacity-20 -translate-y-1/2 translate-x-1/4"></div>
              <ShoppingBag size={64} className="mx-auto mb-6 text-[#1a1a1a]" />
              <h2 className="font-black text-4xl uppercase mb-4 russo-font">СНАБЖЕНИЕ</h2>
              <p className="text-sm font-bold uppercase bg-[#e5a50a] inline-block px-2 border-2 border-[#1a1a1a] rotate-[-2deg]">
                Шапки, скины, питомцы
              </p>
            </div>
          )}

          {activeTab === 'leaderboard' && (
            <div className="bg-white border-4 border-[#1a1a1a] p-8 text-center relative overflow-hidden">
              <div className="absolute bottom-0 left-0 w-0 h-0 border-l-[100px] border-l-transparent border-b-[100px] border-b-[#e5a50a] opacity-50"></div>
              <Trophy size={64} className="mx-auto mb-6 text-[#1a1a1a]" />
              <h2 className="font-black text-4xl uppercase mb-4 russo-font">ДОСКА ПОЧЁТА</h2>
              <p className="text-sm font-bold uppercase bg-[#cc2b1d] text-[#f4ebd0] inline-block px-2 border-2 border-[#1a1a1a] rotate-[2deg]">
                Лучшие люди нашего ЖК
              </p>
            </div>
          )}

          {activeTab === 'game' && (
            <div className="space-y-10">
              
              {/* Daily Challenge - Diagonal Ribbon */}
              <div className="relative">
                <div className="absolute inset-0 bg-[#e5a50a] rotate-[2deg] border-4 border-[#1a1a1a] shadow-[6px_6px_0_rgba(204,43,29,0.3)] z-0"></div>
                <div className="bg-[#1a1a1a] text-[#f4ebd0] border-4 border-[#1a1a1a] p-4 relative z-10 rotate-[-1deg] flex items-center justify-between">
                  <div>
                    <span className="block text-[10px] font-black uppercase tracking-widest text-[#e5a50a] mb-1">ЗАДАЧА ДНЯ</span>
                    <span className="text-lg font-black uppercase russo-font">Выполни 3 задачи</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-3xl font-black text-[#cc2b1d] russo-font drop-shadow-[2px_2px_0_#f4ebd0]">1/3</span>
                    <span className="text-[10px] font-black bg-[#f4ebd0] text-[#1a1a1a] px-1">+200 БАБОК</span>
                  </div>
                </div>
              </div>

              {/* Character Roster */}
              <section>
                <div className="bg-[#cc2b1d] text-[#f4ebd0] inline-block px-3 py-1 border-4 border-[#1a1a1a] mb-4 -skew-x-12">
                  <h3 className="font-black uppercase text-xl skew-x-12 russo-font">БРИГАДА</h3>
                </div>
                
                <div className="grid grid-cols-5 gap-1 bg-[#1a1a1a] p-1 border-4 border-[#1a1a1a] mb-4">
                  {CHARACTER_KEYS.map(key => {
                    const c = CHARACTERS[key];
                    const isSelected = key === selected;
                    return (
                      <button
                        key={key}
                        onClick={() => setSelected(key)}
                        className={`aspect-square flex flex-col items-center justify-center transition-all relative overflow-hidden
                          ${isSelected ? 'bg-[#cc2b1d]' : 'bg-[#f4ebd0] hover:bg-white'}
                        `}
                      >
                        {isSelected && <div className="absolute inset-0 border-4 border-[#1a1a1a]"></div>}
                        <span className="text-2xl z-10">{c.emoji}</span>
                        <span className={`text-[8px] font-black uppercase text-center leading-none mt-1 z-10 ${isSelected ? 'text-[#f4ebd0]' : 'text-[#1a1a1a]'}`}>
                          {c.name.split(' ')[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Character Dossier - Photomontage Style */}
                <div className="border-4 border-[#1a1a1a] bg-white relative">
                  <div className="absolute top-0 right-0 w-[40%] h-full bg-[#e5a50a] clip-path-polygon-[100%_0,100%_100%,0_100%] z-0"></div>
                  
                  <div className="relative z-10 flex p-4">
                    <div className="w-24 h-24 bg-[#cc2b1d] border-4 border-[#1a1a1a] rounded-full flex items-center justify-center text-6xl shadow-[4px_4px_0_#1a1a1a] shrink-0 -translate-x-2 -translate-y-2 rotate-[-10deg]">
                      {charDef.emoji}
                    </div>
                    <div className="ml-2 flex flex-col justify-center">
                      <h4 className="font-black text-3xl uppercase leading-none mb-1 russo-font bg-white w-max px-1 -skew-x-6 border-b-4 border-[#1a1a1a]">{charDef.name}</h4>
                      <p className="text-[11px] font-bold text-[#1a1a1a] uppercase bg-white/90 p-1 border-l-4 border-[#cc2b1d]">
                        {charDef.description}
                      </p>
                    </div>
                  </div>
                  <div className="bg-[#1a1a1a] text-[#f4ebd0] p-3 text-center">
                    <span className="font-black text-sm uppercase tracking-widest">«{charDef.voiceLines[0]}»</span>
                  </div>
                </div>
              </section>

              {/* Sliders / Settings */}
              <section>
                <div className="bg-[#1a1a1a] text-[#f4ebd0] inline-block px-3 py-1 border-4 border-[#1a1a1a] mb-4 rotate-[2deg]">
                  <h3 className="font-black uppercase text-xl russo-font">ПЛАН РАБОТ</h3>
                </div>

                <div className="border-4 border-[#1a1a1a] bg-white p-4 space-y-6 shadow-[8px_8px_0_#cc2b1d]">
                  
                  <div className="relative">
                    <div className="flex justify-between items-end mb-2 border-b-2 border-[#1a1a1a] pb-1">
                      <span className="text-sm font-black uppercase">ЧИСЛЕННОСТЬ</span>
                      <span className="text-3xl font-black text-[#cc2b1d] russo-font">{playerCount}</span>
                    </div>
                    <input 
                      type="range" min={4} max={10} value={playerCount}
                      onChange={e => {
                        const n = +e.target.value;
                        setPlayerCount(n);
                        if (siphonersCount >= n - 1) setSiphonersCount(Math.max(1, n - 2));
                      }}
                    />
                  </div>

                  <div className="relative">
                    <div className="flex justify-between items-end mb-2 border-b-2 border-[#1a1a1a] pb-1">
                      <span className="text-sm font-black uppercase">ВРАГИ (СЛИВЩИКИ)</span>
                      <span className="text-3xl font-black text-[#1a1a1a] russo-font">{siphonersCount}</span>
                    </div>
                    <input 
                      type="range" min={1} max={Math.floor((playerCount - 1) / 2)}
                      value={siphonersCount}
                      onChange={e => setSiphonersCount(+e.target.value)}
                    />
                  </div>

                  <div className="bg-[#e5a50a] border-4 border-[#1a1a1a] p-3 flex justify-center gap-4 text-sm font-black uppercase skew-x-[-5deg]">
                    <span className="skew-x-[5deg]">🏠 {playerCount - siphonersCount} ХОЗЯЕВ</span>
                    <span className="skew-x-[5deg]">VS</span>
                    <span className="skew-x-[5deg]">🪣 {siphonersCount} ВРЕДИТ.</span>
                  </div>

                  <div>
                    <span className="text-sm font-black uppercase mb-3 block bg-[#1a1a1a] text-[#f4ebd0] w-max px-2 py-1">УРОВЕНЬ БОТОВ</span>
                    <div className="grid grid-cols-2 gap-2">
                      {(Object.keys(DIFFICULTY_LABELS) as BotDifficulty[]).map(key => {
                        const d = DIFFICULTY_LABELS[key];
                        const isSelected = key === difficulty;
                        return (
                          <button 
                            key={key} 
                            onClick={() => setDifficulty(key)}
                            className={`border-4 border-[#1a1a1a] p-2 flex items-center gap-2 text-left transition-all
                              ${isSelected ? 'bg-[#cc2b1d] text-[#f4ebd0] scale-105 shadow-[4px_4px_0_#1a1a1a]' : 'bg-[#f4ebd0] text-[#1a1a1a]'}
                            `}
                          >
                            <span className="text-2xl">{d.emoji}</span>
                            <div className="flex flex-col">
                              <span className="text-[11px] font-black uppercase leading-none">{d.label}</span>
                              <span className="text-[8px] font-bold uppercase mt-1 opacity-80">{d.desc}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </section>

              {/* Instructions - Constructivist list */}
              <section className="bg-[#cc2b1d] border-4 border-[#1a1a1a] p-4 text-[#f4ebd0] relative overflow-hidden">
                <div className="absolute -right-10 -bottom-10 opacity-20">
                  <Info size={120} strokeWidth={3} />
                </div>
                <h3 className="font-black text-3xl uppercase mb-4 border-b-4 border-[#f4ebd0] pb-2 russo-font">ПРАВИЛА</h3>
                <div className="space-y-3 relative z-10">
                  {[
                    "🕹️ Двигайся джойстиком / WASD",
                    "🅴 Кнопка E — взаимодействие",
                    "🌯 Выполняй задачи → копи единство",
                    "🔔 У арки нажми E → созвать сходку",
                    "🗳️ На сходке голосуй за врагов",
                    "🪣 Сливщики сливают баки скрытно"
                  ].map((text, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-[#1a1a1a] text-[#f4ebd0] flex items-center justify-center font-black text-sm shrink-0 -skew-x-12">
                        <span className="skew-x-12">{i + 1}</span>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider leading-tight">{text}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* CTA Banners */}
              <div className="space-y-6">
                
                {/* Promo CTA */}
                <button className="w-full border-4 border-[#1a1a1a] bg-[#e5a50a] flex items-stretch hover:shadow-[6px_6px_0_#cc2b1d] transition-all group">
                  <div className="bg-[#1a1a1a] text-[#e5a50a] p-4 flex items-center justify-center w-16 group-hover:scale-110 transition-transform">
                    <Flame size={32} />
                  </div>
                  <div className="p-3 text-left flex flex-col justify-center">
                    <div className="text-sm font-black uppercase russo-font">ТАЛОНЫ НА БЕНЗИН</div>
                    <div className="text-[9px] font-bold uppercase border-t-2 border-[#1a1a1a] pt-1 mt-1">
                      Бот @fuel_fuel_fuel_bot
                    </div>
                  </div>
                </button>

                {/* Daily CTA */}
                <button className="w-full border-4 border-[#1a1a1a] bg-[#1a1a1a] text-[#f4ebd0] p-4 flex items-center justify-between group hover:bg-[#cc2b1d] transition-colors relative overflow-hidden">
                  <div className="absolute right-[-20px] top-1/2 -translate-y-1/2 opacity-20">
                    <Zap size={100} />
                  </div>
                  <div className="text-left relative z-10">
                    <span className="block text-xl font-black uppercase russo-font tracking-widest">ВЫЗОВ ДНЯ</span>
                    <span className="text-[10px] font-bold uppercase opacity-80 border-l-2 border-[#e5a50a] pl-2">Все в равных условиях</span>
                  </div>
                  <ArrowRight size={32} className="relative z-10 text-[#e5a50a] group-hover:translate-x-2 transition-transform" />
                </button>

                {/* Primary Game CTA */}
                <button className="w-full border-4 border-[#1a1a1a] bg-[#cc2b1d] text-[#f4ebd0] p-6 text-center shadow-[12px_12px_0_#1a1a1a] hover:shadow-[4px_4px_0_#1a1a1a] hover:translate-y-2 hover:translate-x-2 transition-all relative">
                  <div className="absolute inset-2 border-2 border-[#f4ebd0] border-dashed pointer-events-none"></div>
                  <span className="text-4xl font-black uppercase tracking-widest russo-font drop-shadow-[2px_2px_0_#1a1a1a]">ИГРАТЬ</span>
                  <span className="block text-sm font-bold uppercase mt-2 bg-[#1a1a1a] px-2 w-max mx-auto -skew-x-12">
                    ОДИНОЧНАЯ
                  </span>
                </button>

                {/* Multiplayer CTA */}
                <button className="w-full border-4 border-[#1a1a1a] bg-white text-[#1a1a1a] p-4 text-center hover:bg-[#f4ebd0] transition-colors">
                  <span className="text-2xl font-black uppercase tracking-widest russo-font">МУЛЬТИПЛЕЕР</span>
                </button>

              </div>

              {/* Ticker Bottom */}
              <div className="border-y-8 border-[#1a1a1a] bg-[#1a1a1a] text-[#f4ebd0] py-2 flex items-center relative overflow-hidden mb-8">
                <div className="bg-[#cc2b1d] px-4 py-2 font-black uppercase text-sm z-10 shrink-0 border-r-4 border-[#1a1a1a]">
                  МОЛНИЯ
                </div>
                <div className="ticker-wrap flex-1 px-4">
                  <div className="ticker-content text-xs font-bold uppercase tracking-wider">
                    {LOBBY_FLAVOR_TEXTS[flavorIdx]}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        <footer className="w-full px-4 text-center mt-auto pb-8 z-10">
          <div className="border-t-4 border-[#1a1a1a] pt-4 flex flex-col items-center">
            <div className="w-16 h-4 bg-[#cc2b1d] border-2 border-[#1a1a1a] mb-2 skew-x-12"></div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">
              ГЛАВК ЖК «ЦВЕТОЧНЫЕ ПОЛЯНЫ» © 2026<br/>
              РАЗРАБОТКА: @bakstab_bot
            </p>
          </div>
        </footer>

      </div>
    </div>
  );
}