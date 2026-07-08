import './PropagandaBroadsheet.css';
import { useState, useEffect } from 'react';
import { Trophy, ShoppingBag, Gamepad2, Medal, Users, User, Flame, ArrowRight, Info, Zap } from 'lucide-react';

type CharacterKey = 'denis' | 'anya' | 'vova' | 'uncle_seryozha' | 'petrovich' | 'marina' | 'akhmet' | 'oleg' | 'lena' | 'barsik';
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

export function PropagandaBroadsheet() {
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
    <div className="pk-broadsheet-root">
      <div className="pk-broadsheet-paper flex flex-col">
        <div className="paper-grain"></div>
        
        {/* Header / Masthead */}
        <header className="border-b-4 border-double border-[#1a1a1a] pb-2 mb-4 relative z-10 pt-4 px-4 mt-2">
          <div className="flex justify-between items-center text-[9px] font-black uppercase broadsheet-sans border-b border-[#1a1a1a] pb-1 mb-1">
            <span>Выпуск №42</span>
            <span>15 Окт. 2026</span>
            <span>Цена: 2 бабки</span>
          </div>
          <div className="relative">
            <h1 className="text-7xl text-center broadsheet-title font-black tracking-tighter leading-none mt-2 drop-shadow-sm">
              95-Й
            </h1>
            
            {/* Stamp Badge */}
            <div className="absolute top-0 right-0 z-20 rotate-[12deg] translate-x-2 -translate-y-2">
              <div 
                className="w-16 h-16 rounded-full stamp-seal flex flex-col items-center justify-center p-1 cursor-pointer hover:scale-105 transition-transform bg-[#f4ebd0] shadow-sm"
                onClick={() => setShowAchievements(!showAchievements)}
              >
                <span className="text-[7px] font-black uppercase tracking-widest text-center leading-none mt-1">Уровень {tier}</span>
                <span className="text-sm font-black my-0.5">{MOCK_PROFILE.babki} 💰</span>
                <span className="text-[5px] font-bold uppercase text-center border-t border-[#cc2b1d] pt-0.5 w-full">Достижения</span>
              </div>
            </div>
          </div>
          <h2 className="text-center text-[10px] font-bold uppercase broadsheet-sans mt-2 tracking-widest border-t border-[#1a1a1a] pt-1">
            Вестник ЖК «Цветочные Поляны»
          </h2>
        </header>

        {/* Navigation Tabs */}
        <nav className="flex border-y-2 border-[#1a1a1a] mx-4 mb-5 z-10 relative">
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2 text-xs font-black uppercase broadsheet-sans border-r-2 border-[#1a1a1a] last:border-r-0 transition-colors ${
                  isActive ? 'bg-[#1a1a1a] text-[#f4ebd0]' : 'bg-transparent text-[#1a1a1a] hover:bg-black/10'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        <main className="px-4 relative z-10 flex-1 w-full">
          {showAchievements && (
            <div className="border-4 border-double border-[#cc2b1d] p-3 mb-5 bg-[#f4ebd0]">
              <h3 className="font-black uppercase text-sm broadsheet-sans mb-1 text-[#cc2b1d]">Выписка о достижениях</h3>
              <p className="text-[10px] font-bold font-serif leading-tight">
                Зарегистрировано {MOCK_ACH_UNLOCKED} подвигов из {MOCK_ACH_TOTAL}. Продолжайте трудиться на благо двора!
              </p>
            </div>
          )}

          {activeTab === 'game' && (
            <>
              {/* Daily Challenge Lead Story */}
              <article className="mb-6">
                <h3 className="text-2xl font-black broadsheet-title leading-none mb-2 border-b-2 border-[#1a1a1a] pb-1 uppercase tracking-tight">
                  Ежедневное задание
                </h3>
                <p className="text-xs font-serif leading-relaxed mb-3 drop-cap text-justify">
                  Сегодня администрации двора требуется помощь каждого ответственного жильца. Всем поручено <strong className="font-black">выполнить 3 задачи</strong>. Выполнение нормы поощряется премией из фонда ТСЖ.
                </p>
                <div className="flex justify-between items-center bg-[#e5a50a] p-2 border-2 border-[#1a1a1a]">
                  <span className="font-black uppercase broadsheet-sans text-sm tracking-wider">Прогресс: 1/3</span>
                  <span className="font-black uppercase bg-[#1a1a1a] text-[#f4ebd0] px-2 text-[10px] py-1 tracking-widest">+200 БАБОК</span>
                </div>
              </article>

              {/* Character Selection Grid */}
              <section className="mb-6">
                <h3 className="text-lg font-black broadsheet-sans uppercase border-y-2 border-[#1a1a1a] py-1 mb-3 text-center tracking-widest">
                  ПОДОЗРЕВАЕМЫЕ ЛИЦА
                </h3>
                <div className="classifieds-grid mb-3">
                  {CHARACTER_KEYS.map(key => {
                    const c = CHARACTERS[key];
                    const isSelected = key === selected;
                    return (
                      <button
                        key={key}
                        onClick={() => setSelected(key)}
                        className={`aspect-square flex flex-col items-center justify-center relative overflow-hidden transition-all ${
                          isSelected ? 'bg-[#cc2b1d] text-white' : 'bg-white hover:bg-gray-200'
                        }`}
                      >
                        {!isSelected && <div className="halftone-bg"></div>}
                        {isSelected && <div className="halftone-bg-red"></div>}
                        <span className="text-2xl relative z-10">{c.emoji}</span>
                        <span className="text-[7px] font-black uppercase broadsheet-sans mt-1 relative z-10 text-center leading-none tracking-wider">
                          {c.name.split(' ')[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Character Detail */}
                <div className="border-2 border-[#1a1a1a] p-3 bg-white relative">
                  <div className="halftone-bg"></div>
                  <div className="flex gap-3 relative z-10">
                    <div className="w-14 h-14 shrink-0 border-2 border-[#1a1a1a] flex items-center justify-center text-3xl bg-[#f4ebd0]">
                      {charDef.emoji}
                    </div>
                    <div>
                      <h4 className="font-black text-lg uppercase broadsheet-sans leading-none mb-1">{charDef.name}</h4>
                      <p className="text-[10px] font-serif leading-tight">{charDef.description}</p>
                    </div>
                  </div>
                  <div className="mt-3 border-t border-dashed border-[#1a1a1a] pt-2 text-[11px] italic font-serif relative z-10 font-bold">
                    «{charDef.voiceLines[0]}»
                  </div>
                </div>
              </section>

              {/* Game Settings */}
              <section className="mb-6">
                <h3 className="text-md font-black broadsheet-sans uppercase bg-[#1a1a1a] text-[#f4ebd0] inline-block px-2 py-1 mb-3 tracking-widest">
                  БЛАНК НАСТРОЕК МАТЧА
                </h3>
                <div className="border-2 border-[#1a1a1a] p-4 bg-[#f4ebd0] relative">
                  
                  <div className="mb-4">
                    <div className="flex justify-between items-end mb-1">
                      <span className="text-[10px] font-black uppercase broadsheet-sans tracking-wide">Число жильцов</span>
                      <span className="text-lg font-black broadsheet-title text-[#cc2b1d] leading-none">{playerCount}</span>
                    </div>
                    <input 
                      type="range" min={4} max={10} value={playerCount}
                      onChange={e => {
                        const n = +e.target.value;
                        setPlayerCount(n);
                        if (siphonersCount >= n - 1) setSiphonersCount(Math.max(1, n - 2));
                      }}
                      className="broadsheet-range"
                    />
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between items-end mb-1">
                      <span className="text-[10px] font-black uppercase broadsheet-sans tracking-wide">Квота сливщиков</span>
                      <span className="text-lg font-black broadsheet-title text-[#cc2b1d] leading-none">{siphonersCount} 🪣</span>
                    </div>
                    <input 
                      type="range" min={1} max={Math.floor((playerCount - 1) / 2)}
                      value={siphonersCount}
                      onChange={e => setSiphonersCount(+e.target.value)}
                      className="broadsheet-range"
                    />
                  </div>

                  <div className="border border-[#1a1a1a] p-2 text-[9px] font-serif font-bold uppercase leading-tight mb-4 bg-white text-center shadow-sm">
                    Итоговая диспозиция: {playerCount - siphonersCount} Хозяев против {siphonersCount} Сливщиков
                  </div>

                  <div>
                     <span className="text-[10px] font-black uppercase broadsheet-sans mb-2 block tracking-wide">УРОВЕНЬ ИИ-БОТОВ</span>
                     <div className="grid grid-cols-2 gap-2">
                        {(Object.keys(DIFFICULTY_LABELS) as BotDifficulty[]).map(key => {
                          const d = DIFFICULTY_LABELS[key];
                          const isSelected = key === difficulty;
                          return (
                            <button 
                              key={key} 
                              onClick={() => setDifficulty(key)}
                              className={`border border-[#1a1a1a] p-2 flex items-center gap-2 text-left transition-all ${
                                isSelected ? 'bg-[#1a1a1a] text-[#f4ebd0]' : 'bg-white text-[#1a1a1a] hover:bg-gray-100'
                              }`}
                            >
                              <span className="text-sm">{d.emoji}</span>
                              <div className="flex flex-col">
                                <span className="text-[9px] font-black uppercase broadsheet-sans leading-none">{d.label}</span>
                                <span className="text-[7px] font-serif uppercase mt-0.5 opacity-80">{d.desc}</span>
                              </div>
                            </button>
                          );
                        })}
                     </div>
                  </div>
                </div>
              </section>

              {/* Instructions */}
              <section className="mb-6">
                <h3 className="text-md font-black broadsheet-title uppercase border-b-2 border-[#1a1a1a] pb-1 mb-3 tracking-tighter">
                  Памятка жильцу
                </h3>
                <ul className="text-[11px] font-serif space-y-2 relative border-l-2 border-[#1a1a1a] pl-3">
                  <li className="flex items-start gap-2">
                    <span className="border border-[#1a1a1a] px-1 bg-white text-[9px] shadow-[1px_1px_0px_#1a1a1a]">🕹️</span>
                    <span className="leading-tight">Двигайся джойстиком (или WASD на ПК).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="border border-[#1a1a1a] px-1 bg-white text-[9px] shadow-[1px_1px_0px_#1a1a1a]">🅴</span>
                    <span className="leading-tight">Кнопка E — взаимодействие с объектами.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="border border-[#1a1a1a] px-1 bg-white text-[9px] shadow-[1px_1px_0px_#1a1a1a]">🌯</span>
                    <span className="leading-tight">Выполняй задачи → заполняй метр единства.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="border border-[#1a1a1a] px-1 bg-white text-[9px] shadow-[1px_1px_0px_#1a1a1a]">🔔</span>
                    <span className="leading-tight">Подойди к арке и нажми E → вызвать сходку.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="border border-[#1a1a1a] px-1 bg-white text-[9px] shadow-[1px_1px_0px_#1a1a1a]">🗳️</span>
                    <span className="leading-tight">На сходке голосуй за подозреваемых.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="border border-[#1a1a1a] px-1 bg-white text-[9px] shadow-[1px_1px_0px_#1a1a1a]">🪣</span>
                    <span className="leading-tight">Сливщики: сливай баки и не попадайся!</span>
                  </li>
                </ul>
              </section>

              {/* CTAs / Coupons */}
              <section className="space-y-4 mb-6">
                <h3 className="text-lg font-black broadsheet-sans uppercase border-y-2 border-[#1a1a1a] py-1 mb-2 text-center tracking-widest bg-[#e5a50a]">
                  ПУТЁВКИ И ТАЛОНЫ
                </h3>
                
                <button className="coupon-stub w-full p-3 bg-white text-left flex items-center justify-between group">
                   <div>
                     <div className="text-[10px] font-black broadsheet-sans uppercase tracking-widest text-[#cc2b1d] mb-0.5">Ежедневный вызов</div>
                     <div className="text-xs font-black broadsheet-sans tracking-wide">ОДИНАКОВЫЕ РОЛИ ДЛЯ ВСЕХ</div>
                     <div className="text-[10px] font-serif italic mt-1 text-gray-700">Войди в топ сегодня</div>
                   </div>
                   <div className="w-8 h-8 border border-[#1a1a1a] rounded-full flex items-center justify-center font-bold text-sm broadsheet-sans rotate-12 group-hover:bg-[#cc2b1d] group-hover:text-white transition-colors shrink-0">
                     1
                   </div>
                </button>
                
                <button className="coupon-stub bg-red w-full py-4 px-3 bg-[#cc2b1d] text-[#f4ebd0] text-center border-[#1a1a1a] hover:bg-[#a82318] transition-colors">
                  <div className="text-3xl font-black broadsheet-sans tracking-widest">ИГРАТЬ</div>
                  <div className="text-[10px] font-serif uppercase tracking-widest border-t border-[#f4ebd0]/30 pt-1 mt-1 inline-block">Одиночная путевка</div>
                </button>
                
                <button className="coupon-stub bg-black w-full p-4 bg-[#1a1a1a] text-[#f4ebd0] flex justify-between items-center hover:bg-[#333] transition-colors">
                  <div>
                    <div className="text-xl font-black broadsheet-sans tracking-widest text-left">МУЛЬТИПЛЕЕР</div>
                    <div className="text-[10px] font-serif uppercase mt-1 text-[#e5a50a] text-left">Коллективный труд</div>
                  </div>
                  <ArrowRight size={24} className="text-[#e5a50a]" />
                </button>
                
                <button className="coupon-stub bg-mustard w-full p-3 bg-[#e5a50a] border-[#1a1a1a] flex gap-3 items-center hover:bg-[#c99009] transition-colors">
                  <div className="bg-white border-2 border-[#1a1a1a] p-2 -rotate-6 shrink-0 shadow-sm">
                    <Flame size={20} className="text-[#cc2b1d]" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-black broadsheet-sans uppercase tracking-wide leading-tight mb-1">Получить талоны на бензин</div>
                    <div className="text-[9px] font-serif leading-tight opacity-90">Зафиксируй цену АИ-95 на 3 месяца<br/><span className="font-bold underline decoration-dotted underline-offset-2">@fuel_fuel_fuel_bot</span></div>
                  </div>
                </button>
              </section>
            </>
          )}

          {activeTab === 'shop' && (
            <div className="border-4 border-double border-[#1a1a1a] p-8 text-center my-8 bg-white relative">
              <div className="halftone-bg"></div>
              <ShoppingBag size={40} className="mx-auto mb-3 text-[#cc2b1d] relative z-10" />
              <h2 className="font-black text-2xl uppercase broadsheet-title mb-2 relative z-10">МАГАЗИН РАЙПО</h2>
              <p className="text-xs font-serif uppercase opacity-80 relative z-10">Шапки, скины машин, питомцы — всё для солидного соседа!</p>
            </div>
          )}

          {activeTab === 'leaderboard' && (
            <div className="border-4 border-double border-[#1a1a1a] p-8 text-center my-8 bg-white relative">
              <div className="halftone-bg"></div>
              <Trophy size={40} className="mx-auto mb-3 text-[#e5a50a] relative z-10" />
              <h2 className="font-black text-2xl uppercase broadsheet-title mb-2 relative z-10">ДОСКА ПОЧЁТА</h2>
              <p className="text-xs font-serif uppercase opacity-80 relative z-10">Лучшие стахановцы нашего ЖК.</p>
            </div>
          )}
        </main>

        {/* Ticker Bulletin */}
        <div className="w-full border-t-4 border-b-2 border-double border-[#1a1a1a] py-1 bg-[#1a1a1a] text-[#f4ebd0] mt-auto z-10 relative">
          <div className="flex px-4 gap-3 items-center">
            <span className="text-[9px] font-black uppercase broadsheet-sans whitespace-nowrap bg-[#cc2b1d] px-2 py-0.5 tracking-widest text-white">
              СВОДКА
            </span>
            <div className="ticker-wrap flex-1">
              <div className="ticker-content text-[11px] font-serif uppercase tracking-widest">
                {LOBBY_FLAVOR_TEXTS[flavorIdx]}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="w-full text-center py-4 z-10 relative">
          <p className="text-[9px] font-black uppercase broadsheet-sans tracking-widest opacity-60">
            Издательство ЖК «Цветочные Поляны», 2026 • @bakstab_bot
          </p>
        </footer>
      </div>
    </div>
  );
}
