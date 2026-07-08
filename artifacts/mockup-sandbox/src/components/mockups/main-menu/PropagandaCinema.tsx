import './PropagandaCinema.css';
import { useState, useEffect } from 'react';
import { Trophy, ShoppingBag, Gamepad2, Medal, ArrowRight, Flame, Info } from 'lucide-react';

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

export function PropagandaCinema() {
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
    <div className="pk-cinema-root min-h-screen flex flex-col items-center relative w-full overflow-x-hidden">
      <div className="pk-cinema-grain"></div>
      <div className="pk-cinema-vignette"></div>
      
      <div className="w-full max-w-[420px] relative z-10 flex flex-col min-h-screen">
        
        {/* Ticket Stub Profile Bar */}
        <div className="w-full flex justify-between items-center px-4 py-3 bg-[#cc2b1d] border-b-4 border-black shadow-[0_5px_15px_rgba(0,0,0,0.8)] z-30 shrink-0">
          <div className="flex gap-4 items-center">
            <span className="font-black text-sm uppercase text-[#f4ebd0] tracking-widest drop-shadow-[1px_1px_0px_#000]">🎟️ {MOCK_PROFILE.babki}</span>
            <span className="text-[9px] font-bold text-black uppercase bg-[#e5a50a] px-2 py-0.5 tracking-widest flex items-center shadow-sm">
              Матчей: {MOCK_PROFILE.totalMatchesPlayed}
            </span>
          </div>
          <button 
            onClick={() => setShowAchievements(!showAchievements)} 
            className="text-[10px] font-black bg-black text-[#e5a50a] px-2 py-1.5 uppercase tracking-widest pk-cinema-button shadow-sm"
          >
            🏅 {MOCK_ACH_UNLOCKED}/{MOCK_ACH_TOTAL}
          </button>
        </div>
        <div className="w-full h-1.5 bg-[#1a1a1a] z-30 shrink-0 relative overflow-hidden">
          <div className="h-full bg-[#e5a50a] transition-all duration-500 relative" style={{ width: `${tierPct}%` }}>
            <div className="absolute right-0 top-0 bottom-0 w-4 bg-white/30 skew-x-[-20deg]"></div>
          </div>
        </div>

        {/* Cinematic Hero Section */}
        <div className="relative pt-12 pb-8 flex flex-col items-center justify-center z-10 w-full shrink-0" style={{ minHeight: '50vh' }}>
          {/* Rim Light for Character */}
          <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] rounded-full blur-[80px]" style={{ backgroundColor: charDef.color, opacity: 0.45 }}></div>
          <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150px] h-[150px] rounded-full blur-[40px] bg-[#f4ebd0] opacity-20"></div>

          {/* Diagonal Sash */}
          <div className="absolute top-[20%] left-[-20%] right-[-20%] h-[70px] pk-cinema-sash -rotate-12 z-10 flex items-center justify-center overflow-hidden">
            <div className="text-[#f4ebd0] font-black text-[32px] uppercase tracking-[0.3em] italic drop-shadow-[4px_4px_0px_#000] scale-y-125 translate-y-[-2px]">
              95-Й Бакстаб
            </div>
          </div>

          {/* Character Portrait */}
          <div className="mt-8 relative z-20">
            <div className="text-[150px] leading-none drop-shadow-[0_20px_30px_rgba(0,0,0,0.9)] transform transition-transform hover:scale-105 duration-500">
              {charDef.emoji}
            </div>
          </div>

          {/* Character Info */}
          <div className="z-20 text-center px-4 mt-8 flex flex-col items-center">
            <h2 className="text-5xl font-black uppercase text-[#e5a50a] tracking-widest drop-shadow-[3px_3px_0px_#000] scale-y-110 mb-3">
              {charDef.name}
            </h2>
            <h3 className="text-[11px] uppercase font-bold text-[#f4ebd0] tracking-[0.3em] opacity-90 mb-5 bg-[#0f0f0f]/80 border border-[#f4ebd0]/20 px-3 py-1.5 backdrop-blur-sm">
              {charDef.description}
            </h3>
            <div className="border-t border-b border-[#e5a50a]/30 py-2 px-6 w-fit bg-[#000]/30 backdrop-blur-md">
              <p className="text-[12px] uppercase font-black italic tracking-widest text-[#f4ebd0] drop-shadow-[2px_2px_0px_#000]">
                «{charDef.voiceLines[0]}»
              </p>
            </div>
          </div>
        </div>

        {/* Filmstrip Picker */}
        <div className="pk-cinema-filmstrip z-20 w-full flex-shrink-0 mt-4">
          <div className="text-center mb-3">
            <span className="text-[9px] uppercase tracking-[0.5em] font-black text-[#e5a50a]">В главных ролях</span>
          </div>
          <div className="flex gap-4 overflow-x-auto px-6 pb-4 pt-2 no-scrollbar items-center snap-x snap-mandatory">
            {CHARACTER_KEYS.map(key => {
              const c = CHARACTERS[key];
              const isSelected = key === selected;
              return (
                <button
                  key={key}
                  onClick={() => setSelected(key)}
                  className={`snap-center flex-shrink-0 relative transition-all duration-300 ${
                    isSelected ? 'scale-110 z-10' : 'scale-90 opacity-60 hover:opacity-100 hover:scale-100'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute inset-0 bg-[#e5a50a] blur-[15px] opacity-50 rounded-full"></div>
                  )}
                  <div className={`relative w-14 h-14 flex items-center justify-center border-2 shadow-lg ${isSelected ? 'border-[#e5a50a] bg-[#1a1a1a]' : 'border-[#444] bg-black'}`}>
                     <span className="text-3xl">{c.emoji}</span>
                  </div>
                  {isSelected && (
                    <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black px-2 py-0.5 border border-[#e5a50a]/30">
                      <span className="text-[8px] font-black uppercase tracking-widest text-[#e5a50a]">{c.name.split(' ')[0]}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Playbill Panel */}
        <div className="pk-cinema-playbill w-full flex-1 rounded-t-3xl pk-cinema-playbill-texture flex flex-col items-center mt-[-10px] pb-12">
          
          {/* Top Edge / Ticker */}
          <div className="w-full bg-[#1a1a1a] text-[#e5a50a] py-2 flex items-center px-4 border-b-4 border-[#cc2b1d] rounded-t-3xl overflow-hidden shadow-md">
            <span className="text-[9px] font-black uppercase whitespace-nowrap bg-[#cc2b1d] text-[#f4ebd0] px-2 py-1 tracking-widest mr-3">
              Сводка
            </span>
            <div className="flex-1 overflow-hidden">
              <div className="text-[11px] font-bold uppercase italic tracking-wider truncate">
                {LOBBY_FLAVOR_TEXTS[flavorIdx]}
              </div>
            </div>
          </div>

          <div className="w-full px-5 py-6 flex flex-col gap-6">
            
            {/* Tabs */}
            <nav className="flex bg-[#1a1a1a] p-1 shadow-[4px_4px_0px_rgba(0,0,0,0.3)] border border-[#1a1a1a] w-full">
              {TABS.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 py-3 flex flex-col items-center gap-1.5 transition-colors pk-cinema-button ${
                      isActive ? 'bg-[#cc2b1d] text-[#f4ebd0] shadow-inner' : 'bg-transparent text-[#f4ebd0] hover:bg-white/10'
                    }`}
                  >
                    <Icon size={18} />
                    <span className="text-[10px] font-black tracking-[0.2em] uppercase">{tab.label}</span>
                  </button>
                );
              })}
            </nav>

            <main className="w-full">
              {showAchievements && (
                <div className="bg-[#1a1a1a] text-[#f4ebd0] p-5 mb-6 border-l-4 border-[#e5a50a] shadow-[4px_4px_0px_rgba(0,0,0,0.3)]">
                  <h3 className="font-black uppercase text-sm mb-2 tracking-widest text-[#e5a50a]">Награды</h3>
                  <p className="text-[10px] font-bold uppercase leading-relaxed opacity-80 tracking-widest">
                    Список достижений отображается здесь. Продолжайте служить двору!
                  </p>
                </div>
              )}

              {activeTab === 'shop' && (
                <div className="bg-[#1a1a1a] text-[#f4ebd0] p-12 text-center border-4 border-[#1a1a1a] shadow-[8px_8px_0px_rgba(0,0,0,0.3)]">
                  <ShoppingBag size={48} className="mx-auto mb-5 text-[#e5a50a]" />
                  <h2 className="font-black text-2xl uppercase mb-3 tracking-[0.2em]">Магазин</h2>
                  <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest leading-relaxed">Шапки, скины машин, питомцы — всё для солидного соседа!</p>
                </div>
              )}

              {activeTab === 'leaderboard' && (
                <div className="bg-[#1a1a1a] text-[#f4ebd0] p-12 text-center border-4 border-[#1a1a1a] shadow-[8px_8px_0px_rgba(0,0,0,0.3)]">
                  <Trophy size={48} className="mx-auto mb-5 text-[#cc2b1d]" />
                  <h2 className="font-black text-2xl uppercase mb-3 tracking-[0.2em]">Рейтинг</h2>
                  <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest leading-relaxed">Лучшие стахановцы нашего ЖК.</p>
                </div>
              )}

              {activeTab === 'game' && (
                <div className="flex flex-col gap-8">
                  
                  {/* Daily Challenge - Theater Ticket Style */}
                  <div className="bg-[#1a1a1a] text-[#f4ebd0] flex items-stretch border-2 border-[#1a1a1a] shadow-[4px_4px_0px_rgba(0,0,0,0.3)] relative overflow-hidden">
                    <div className="w-8 border-r-2 border-dashed border-[#f4ebd0]/30 flex items-center justify-center bg-[#cc2b1d]">
                      <span className="text-[9px] font-black uppercase tracking-widest -rotate-90 whitespace-nowrap text-[#f4ebd0]">Сеанс</span>
                    </div>
                    <div className="flex-1 p-4 flex flex-col justify-center">
                      <span className="block text-[9px] font-black uppercase tracking-[0.2em] mb-1.5 text-[#e5a50a]">Ежедневный вызов</span>
                      <span className="text-xs font-black uppercase tracking-widest">🚗 Выполни 3 задачи</span>
                    </div>
                    <div className="p-4 bg-black flex flex-col items-end justify-center">
                      <div className="text-lg font-black italic tracking-widest mb-1.5 text-[#e5a50a]">1/3</div>
                      <div className="text-[8px] font-black uppercase text-black bg-[#e5a50a] px-1.5 py-0.5 tracking-widest">+200 БАБОК</div>
                    </div>
                  </div>

                  {/* Settings - Director's Notes */}
                  <section>
                    <div className="flex items-center gap-3 mb-5">
                      <div className="h-[2px] flex-1 bg-[#1a1a1a]"></div>
                      <h3 className="font-black uppercase text-[12px] tracking-[0.3em] text-[#1a1a1a]">Режиссура</h3>
                      <div className="h-[2px] flex-1 bg-[#1a1a1a]"></div>
                    </div>
                    
                    <div className="border-4 border-[#1a1a1a] p-5 bg-transparent shadow-[4px_4px_0px_rgba(0,0,0,0.3)] space-y-7 relative">
                      
                      <div className="space-y-5">
                        <div>
                          <div className="flex justify-between items-end mb-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#1a1a1a]">Актеры (Игроки)</span>
                            <span className="text-xl font-black italic text-[#cc2b1d]">{playerCount}</span>
                          </div>
                          <input 
                            type="range" min={4} max={10} value={playerCount}
                            onChange={e => {
                              const n = +e.target.value;
                              setPlayerCount(n);
                              if (siphonersCount >= n - 1) setSiphonersCount(Math.max(1, n - 2));
                            }}
                            className="w-full h-2 bg-[#1a1a1a]/20 appearance-none cursor-pointer accent-[#cc2b1d]"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between items-end mb-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#1a1a1a]">Антагонисты (Сливщики)</span>
                            <span className="text-xl font-black italic text-[#cc2b1d]">{siphonersCount} 🪣</span>
                          </div>
                          <input 
                            type="range" min={1} max={Math.floor((playerCount - 1) / 2)}
                            value={siphonersCount}
                            onChange={e => setSiphonersCount(+e.target.value)}
                            className="w-full h-2 bg-[#1a1a1a]/20 appearance-none cursor-pointer accent-[#cc2b1d]"
                          />
                        </div>
                      </div>

                      <div className="bg-[#1a1a1a] text-[#f4ebd0] p-4 text-center border-l-4 border-[#cc2b1d]">
                         <span className="text-[10px] font-black uppercase tracking-[0.1em] block mb-1.5">
                           {playerCount - siphonersCount} ХОЗЯЕВ VS {siphonersCount} СЛИВЩИК{siphonersCount === 1 ? '' : 'А'}
                         </span>
                         <p className="text-[8px] font-bold uppercase tracking-widest opacity-70">
                           Задача хозяев: заполни метр единства до 100% или выгони всех сливщиков.
                         </p>
                      </div>

                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest mb-3 block text-center text-[#1a1a1a]">Интеллект массовки</span>
                        <div className="grid grid-cols-2 gap-2">
                          {(Object.keys(DIFFICULTY_LABELS) as BotDifficulty[]).map(key => {
                            const d = DIFFICULTY_LABELS[key];
                            const isSelected = key === difficulty;
                            return (
                              <button 
                                key={key} 
                                onClick={() => setDifficulty(key)}
                                className={`pk-cinema-button p-2.5 border-2 text-left flex items-center gap-2 ${
                                  isSelected ? 'border-[#1a1a1a] bg-[#1a1a1a] text-[#f4ebd0] shadow-[2px_2px_0px_#cc2b1d]' : 'border-[#1a1a1a]/30 text-[#1a1a1a] hover:border-[#1a1a1a]'
                                }`}
                              >
                                <span className="text-xl drop-shadow-sm">{d.emoji}</span>
                                <div className="flex flex-col">
                                  <span className="text-[10px] font-black uppercase tracking-widest">{d.label}</span>
                                  <span className={`text-[7px] font-bold uppercase tracking-widest ${isSelected ? 'opacity-80' : 'opacity-60'}`}>{d.desc}</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                    </div>
                  </section>

                  {/* How to Play - Script Format */}
                  <section>
                    <div className="bg-[#cc2b1d] text-[#f4ebd0] p-6 shadow-[4px_4px_0px_rgba(0,0,0,0.3)] border-2 border-[#1a1a1a]">
                      <div className="flex flex-col items-center mb-5 pb-3 border-b-2 border-[#f4ebd0]/30">
                        <div className="flex items-center gap-2 mb-1">
                          <Info size={16} />
                          <h3 className="font-black uppercase text-sm tracking-[0.3em]">Сценарий</h3>
                        </div>
                        <span className="text-[8px] font-bold uppercase tracking-widest opacity-80">Обязательно к прочтению</span>
                      </div>
                      <div className="space-y-4 text-[10px] font-bold uppercase tracking-widest">
                        <div className="flex items-start gap-3">
                          <span className="text-[#e5a50a] font-black w-5 text-right flex-shrink-0">01</span>
                          <span>Двигайся джойстиком (или WASD на ПК)</span>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="text-[#e5a50a] font-black w-5 text-right flex-shrink-0">02</span>
                          <span>Кнопка E — взаимодействие с объектами</span>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="text-[#e5a50a] font-black w-5 text-right flex-shrink-0">03</span>
                          <span>Выполняй задачи → заполняй метр единства</span>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="text-[#e5a50a] font-black w-5 text-right flex-shrink-0">04</span>
                          <span>Подойди к арке и нажми E → вызвать сходку</span>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="text-[#e5a50a] font-black w-5 text-right flex-shrink-0">05</span>
                          <span>На сходке голосуй за подозреваемых</span>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="text-[#e5a50a] font-black w-5 text-right flex-shrink-0">06</span>
                          <span>Сливщики: сливай баки и не попадайся!</span>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* CTAs - Clapperboard / Marquee Style */}
                  <section className="space-y-4 pb-2">
                    <button className="w-full pk-cinema-button bg-[#e5a50a] text-[#1a1a1a] p-5 text-center border-4 border-[#1a1a1a] shadow-[6px_6px_0px_#1a1a1a]">
                      <span className="block text-sm font-black tracking-[0.2em] uppercase mb-1.5">📅 Премьера: Вызов</span>
                      <span className="text-[8px] font-bold uppercase tracking-widest opacity-80 block">
                        Одинаковые роли для всех · войди в топ сегодня
                      </span>
                    </button>

                    <button className="w-full pk-cinema-button bg-[#cc2b1d] text-[#f4ebd0] py-6 border-4 border-[#1a1a1a] shadow-[6px_6px_0px_#1a1a1a] group overflow-hidden relative">
                      <div className="absolute bottom-0 left-0 w-full h-1.5 bg-[repeating-linear-gradient(45deg,#1a1a1a,#1a1a1a_10px,transparent_10px,transparent_20px)] opacity-50"></div>
                      <span className="relative z-10 text-2xl font-black uppercase tracking-[0.2em] italic flex items-center justify-center gap-3 drop-shadow-[2px_2px_0px_#000]">
                        <Gamepad2 size={28} className="group-hover:rotate-12 transition-transform" />
                        Играть (Соло)
                      </span>
                    </button>

                    <button className="w-full pk-cinema-button bg-[#1a1a1a] text-[#f4ebd0] p-5 flex items-center justify-between border-4 border-[#1a1a1a] shadow-[4px_4px_0px_rgba(0,0,0,0.3)] group">
                      <span className="text-sm font-black uppercase tracking-widest">🌐 Мультиплеер</span>
                      <ArrowRight className="group-hover:translate-x-2 transition-transform text-[#e5a50a]" />
                    </button>

                    {/* Promo Banner */}
                    <button className="w-full mt-6 pk-cinema-button bg-transparent border-2 border-dashed border-[#1a1a1a] p-4 flex items-center gap-4 hover:bg-[#1a1a1a]/5 transition-colors">
                      <div className="bg-[#1a1a1a] text-[#e5a50a] p-2.5 flex-shrink-0 shadow-[2px_2px_0px_#cc2b1d]">
                         <Flame size={20} />
                      </div>
                      <div className="text-left">
                        <div className="text-[10px] font-black uppercase tracking-widest text-[#cc2b1d]">🎟️ Получить талоны на бензин</div>
                        <div className="text-[8px] font-bold uppercase tracking-widest opacity-80 mt-1">
                          Зафиксируй цену АИ-95 на 3 месяца → @fuel_fuel_fuel_bot
                        </div>
                      </div>
                    </button>
                  </section>

                </div>
              )}
            </main>
          </div>
          
          {/* Credits Footer */}
          <footer className="w-full bg-[#1a1a1a] text-[#f4ebd0] py-10 flex flex-col items-center border-t-8 border-[#cc2b1d]">
            <div className="w-full max-w-[300px] border-t border-[#f4ebd0]/20 pt-8 text-center">
              <div className="text-[7px] font-black uppercase tracking-[0.5em] opacity-50 mb-3">Производство студии</div>
              <p className="text-[11px] font-black uppercase tracking-[0.3em] opacity-70">
                ЖК «Цветочные Поляны», 2026
              </p>
              <p className="text-[9px] font-black uppercase tracking-widest opacity-50 mt-2">
                @bakstab_bot
              </p>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
