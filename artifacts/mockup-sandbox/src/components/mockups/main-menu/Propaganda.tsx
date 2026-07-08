import './_group.css';
import './Propaganda.css';
import { useState, useEffect } from 'react';
import { Trophy, ShoppingBag, Gamepad2, Medal, Users, User, Flame, ArrowRight, Info, Zap } from 'lucide-react';

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

export function Propaganda() {
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
    <div className="propaganda-root min-h-screen pb-12 flex flex-col items-center relative overflow-x-hidden">
      <div className="halftone-overlay absolute inset-0 z-0"></div>
      
      {/* Header */}
      <header className="relative w-full py-8 mb-6 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[#cc2b1d] propaganda-diagonal -z-10"></div>
        <div className="relative z-10 flex flex-col items-center px-4">
          <div className="text-6xl mb-2 drop-shadow-[4px_4px_0px_rgba(0,0,0,1)]">🏘️</div>
          <h1 className="propaganda-heading text-7xl text-[#f4ebd0] drop-shadow-[6px_6px_0px_rgba(0,0,0,1)]">
            95-Й
          </h1>
          <div className="mt-4 bg-[#e5a50a] border-4 border-black px-4 py-1 rotate-[-2deg] shadow-[4px_4px_0px_black]">
            <span className="text-black font-black uppercase text-sm tracking-widest">
              ЖК «Цветочные Поляны»
            </span>
          </div>
          <p className="mt-4 text-[#f4ebd0] font-bold text-xs uppercase tracking-tighter max-w-[200px] text-center italic drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]">
            Кто из соседей сливает бензин?
          </p>
        </div>
      </header>

      {/* Profile Bar */}
      <div className="w-full max-w-[380px] px-4 mb-6 z-10">
        <div className="propaganda-poster-edge bg-white p-4 flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="font-black text-xl uppercase italic">💰 {MOCK_PROFILE.babki}</span>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                Матчей: {MOCK_PROFILE.totalMatchesPlayed}
              </span>
            </div>
            <div className="relative h-6 bg-gray-200 border-2 border-black">
              <div 
                className="h-full bg-[#e5a50a] transition-all duration-500" 
                style={{ width: `${tierPct}%` }}
              ></div>
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black uppercase tracking-widest">
                Ур. {tier} ({tierPct}%)
              </span>
            </div>
          </div>
          <button 
            onClick={() => setShowAchievements(!showAchievements)}
            className="propaganda-button bg-[#cc2b1d] p-2 flex flex-col items-center justify-center min-w-[60px]"
          >
            <Medal className="text-[#f4ebd0]" size={24} />
            <span className="text-[10px] font-black text-[#f4ebd0] mt-1">{MOCK_ACH_UNLOCKED}/{MOCK_ACH_TOTAL}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <nav className="w-full max-w-[380px] px-4 flex gap-2 mb-8 z-10">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 propaganda-button py-3 flex flex-col items-center gap-1 transition-colors ${
                isActive ? 'bg-[#cc2b1d] text-[#f4ebd0]' : 'bg-white text-black'
              }`}
            >
              <Icon size={20} />
              <span className="text-[10px] font-black tracking-widest">{tab.label.toUpperCase()}</span>
            </button>
          );
        })}
      </nav>

      <main className="w-full max-w-[380px] px-4 z-10">
        {showAchievements && (
          <div className="propaganda-poster-edge bg-[#f4ebd0] p-4 mb-6 border-dashed border-red-800">
            <h3 className="font-black uppercase text-sm mb-2 border-b-4 border-black pb-1">Достижения</h3>
            <p className="text-xs font-bold leading-tight uppercase opacity-70">
              Список достижений отображается здесь. Продолжайте служить двору!
            </p>
          </div>
        )}

        {activeTab === 'shop' && (
          <div className="propaganda-poster-edge bg-white p-12 text-center">
            <ShoppingBag size={48} className="mx-auto mb-4 text-[#cc2b1d]" />
            <h2 className="font-black text-2xl uppercase mb-2">МАГАЗИН</h2>
            <p className="text-sm font-bold opacity-60 uppercase">Шапки, скины машин, питомцы — всё для солидного соседа!</p>
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="propaganda-poster-edge bg-white p-12 text-center">
            <Trophy size={48} className="mx-auto mb-4 text-[#e5a50a]" />
            <h2 className="font-black text-2xl uppercase mb-2">РЕЙТИНГ</h2>
            <p className="text-sm font-bold opacity-60 uppercase">Лучшие стахановцы нашего ЖК.</p>
          </div>
        )}

        {activeTab === 'game' && (
          <>
            {/* Daily Challenge Mini Card */}
            <div className="propaganda-poster-edge bg-[#e5a50a] p-3 mb-6 flex items-center justify-between border-4 border-black relative overflow-hidden">
               <div className="absolute top-[-10px] left-[-10px] w-12 h-12 bg-black rotate-45 opacity-10"></div>
               <div>
                 <span className="block text-[10px] font-black uppercase tracking-wider mb-1">☀️ ЕЖЕДНЕВНОЕ ЗАДАНИЕ</span>
                 <span className="text-sm font-black uppercase">🚗 Выполни 3 задачи</span>
               </div>
               <div className="text-right">
                 <div className="text-lg font-black italic">1/3</div>
                 <div className="text-[9px] font-black uppercase text-white bg-black px-1">+200 БАБОК</div>
               </div>
            </div>

            {/* Character Selection */}
            <section className="mb-8">
              <h3 className="font-black uppercase text-sm mb-3 border-l-8 border-[#cc2b1d] pl-2">ВЫБЕРИ ПЕРСОНАЖА</h3>
              <div className="grid grid-cols-5 gap-2 mb-4">
                {CHARACTER_KEYS.map(key => {
                  const c = CHARACTERS[key];
                  const isSelected = key === selected;
                  return (
                    <button
                      key={key}
                      onClick={() => setSelected(key)}
                      className={`propaganda-button aspect-square p-1 flex flex-col items-center justify-center transition-all ${
                        isSelected ? 'bg-[#cc2b1d] scale-105 z-20 shadow-[6px_6px_0px_black]' : 'bg-white'
                      }`}
                    >
                      <span className="text-2xl mb-1">{c.emoji}</span>
                      <span className={`text-[7px] font-black uppercase text-center leading-none ${isSelected ? 'text-white' : 'text-black'}`}>
                        {c.name.split(' ')[0]}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Character Detail Card */}
              <div className="propaganda-poster-edge bg-white overflow-hidden relative">
                <div className="absolute top-0 right-0 w-16 h-16 bg-[#cc2b1d] clip-path-star opacity-10 -rotate-12 translate-x-4 -translate-y-4"></div>
                <div className="flex gap-4 p-4 items-start border-b-4 border-black">
                  <div className="text-5xl drop-shadow-[2px_2px_0px_black]">{charDef.emoji}</div>
                  <div>
                    <h4 className="font-black text-xl uppercase leading-none mb-1">{charDef.name}</h4>
                    <p className="text-[10px] font-bold text-gray-600 leading-tight uppercase tracking-tight">
                      {charDef.description}
                    </p>
                  </div>
                </div>
                <div className="bg-black text-[#f4ebd0] p-2 text-center italic font-bold text-xs">
                  «{charDef.voiceLines[0]}»
                </div>
              </div>
            </section>

            {/* Game Settings */}
            <section className="mb-8">
               <h3 className="font-black uppercase text-sm mb-3 border-l-8 border-[#e5a50a] pl-2">НАСТРОЙКИ ИГРЫ</h3>
               <div className="propaganda-poster-edge bg-white p-5 space-y-6">
                 <div>
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-[10px] font-black uppercase">Игроков</span>
                      <span className="text-2xl font-black italic text-[#cc2b1d]">{playerCount}</span>
                    </div>
                    <input 
                      type="range" min={4} max={10} value={playerCount}
                      onChange={e => {
                        const n = +e.target.value;
                        setPlayerCount(n);
                        if (siphonersCount >= n - 1) setSiphonersCount(Math.max(1, n - 2));
                      }}
                      className="w-full h-4 bg-gray-200 border-2 border-black appearance-none cursor-pointer accent-[#cc2b1d]"
                    />
                 </div>

                 <div>
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-[10px] font-black uppercase">Сливщиков</span>
                      <span className="text-2xl font-black italic text-[#cc2b1d]">{siphonersCount} 🪣</span>
                    </div>
                    <input 
                      type="range" min={1} max={Math.floor((playerCount - 1) / 2)}
                      value={siphonersCount}
                      onChange={e => setSiphonersCount(+e.target.value)}
                      className="w-full h-4 bg-gray-200 border-2 border-black appearance-none cursor-pointer accent-[#cc2b1d]"
                    />
                 </div>

                 <div className="bg-[#f4ebd0] border-2 border-black p-3 text-[10px] font-bold uppercase leading-tight italic">
                    🏠 {playerCount - siphonersCount} ХОЗЯЕВ VS 🪣 {siphonersCount} СЛИВЩИК{siphonersCount === 1 ? '' : 'А'}
                    <p className="mt-1 text-[8px] opacity-70 not-italic">
                      Задача хозяев: заполни метр единства до 100% или выгони всех сливщиков.
                    </p>
                 </div>

                 <div>
                    <span className="text-[10px] font-black uppercase mb-3 block">СЛОЖНОСТЬ БОТОВ</span>
                    <div className="grid grid-cols-2 gap-2">
                      {(Object.keys(DIFFICULTY_LABELS) as BotDifficulty[]).map(key => {
                        const d = DIFFICULTY_LABELS[key];
                        const isSelected = key === difficulty;
                        return (
                          <button 
                            key={key} 
                            onClick={() => setDifficulty(key)}
                            className={`propaganda-button p-2 flex items-center gap-2 text-left transition-all ${
                              isSelected ? 'bg-black text-white' : 'bg-white text-black'
                            }`}
                          >
                            <span className="text-xl">{d.emoji}</span>
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black uppercase leading-none">{d.label}</span>
                              <span className="text-[8px] font-bold opacity-60 uppercase">{d.desc}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                 </div>
               </div>
            </section>

            {/* How to Play */}
            <section className="mb-8">
              <div className="propaganda-poster-edge bg-[#cc2b1d] text-[#f4ebd0] p-4">
                <div className="flex items-center gap-2 mb-3 border-b-2 border-[#f4ebd0] pb-1">
                  <Info size={16} />
                  <h3 className="font-black uppercase text-sm">ИНСТРУКЦИЯ К ДЕЙСТВИЮ</h3>
                </div>
                <div className="space-y-2 text-[9px] font-bold uppercase tracking-wider">
                  <div className="flex items-start gap-2">
                    <span className="bg-[#f4ebd0] text-black px-1 rounded">🕹️</span>
                    <span>Двигайся джойстиком (или WASD на ПК)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="bg-[#f4ebd0] text-black px-1 rounded">🅴</span>
                    <span>Кнопка E — взаимодействие с объектами</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="bg-[#f4ebd0] text-black px-1 rounded">🌯</span>
                    <span>Выполняй задачи → заполняй метр единства</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="bg-[#f4ebd0] text-black px-1 rounded">🔔</span>
                    <span>Подойди к арке и нажми E → вызвать сходку</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="bg-[#f4ebd0] text-black px-1 rounded">🗳️</span>
                    <span>На сходке голосуй за подозреваемых</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="bg-[#f4ebd0] text-black px-1 rounded">🪣</span>
                    <span>Сливщики: сливай баки и не попадайся!</span>
                  </div>
                </div>
              </div>
            </section>

            {/* CTAs */}
            <div className="space-y-4 mb-12">
              <button className="w-full propaganda-button bg-[#e5a50a] p-4 text-left relative overflow-hidden group">
                <div className="absolute right-[-10px] top-[-10px] rotate-12 opacity-10 group-hover:scale-110 transition-transform">
                  <Zap size={80} strokeWidth={3} />
                </div>
                <span className="block text-sm font-black mb-1">📅 ЕЖЕДНЕВНЫЙ ВЫЗОВ</span>
                <span className="text-[9px] font-bold opacity-80 uppercase leading-none block">
                  Одинаковые роли для всех · войди в топ сегодня
                </span>
              </button>

              <button className="w-full propaganda-button bg-[#cc2b1d] text-[#f4ebd0] p-6 text-center shadow-[8px_8px_0px_black] hover:shadow-[4px_4px_0px_black] active:shadow-none relative">
                <span className="text-2xl font-black uppercase tracking-tighter italic">🎮 Играть (одиночная)</span>
              </button>

              <button className="w-full propaganda-button bg-white text-black p-4 flex items-center justify-between group">
                <span className="text-lg font-black uppercase italic">🌐 Мультиплеер</span>
                <ArrowRight className="group-hover:translate-x-2 transition-transform" />
              </button>

              {/* Promo Banner */}
              <button className="w-full border-4 border-black bg-[#f4ebd0] p-3 flex items-center gap-4 relative">
                <div className="bg-black text-[#e5a50a] p-2 rotate-[-12deg] shadow-lg">
                   <Flame size={20} />
                </div>
                <div className="text-left">
                  <div className="text-[11px] font-black uppercase">🎟️ Получить талоны на бензин</div>
                  <div className="text-[8px] font-bold uppercase opacity-60">
                    Зафиксируй цену АИ-95 на 3 месяца → @fuel_fuel_fuel_bot
                  </div>
                </div>
              </button>
            </div>

            {/* Ticker */}
            <div className="propaganda-poster-edge bg-black text-[#e5a50a] py-1 mb-8">
              <div className="flex px-4 gap-4 items-center overflow-hidden">
                <span className="text-[9px] font-black uppercase whitespace-nowrap bg-[#cc2b1d] text-white px-2 py-0.5">📰 СЕГОДНЯ В ЖК</span>
                <div className="ticker-wrap flex-1">
                  <div className="ticker-content text-[11px] font-bold uppercase italic">
                    {LOBBY_FLAVOR_TEXTS[flavorIdx]}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full max-w-[380px] px-4 text-center mt-auto pb-6">
        <div className="bg-black h-1 w-full mb-2"></div>
        <p className="text-[8px] font-black uppercase tracking-widest opacity-50">
          ЖК «Цветочные Поляны», 2026 • @bakstab_bot
        </p>
      </footer>
    </div>
  );
}
