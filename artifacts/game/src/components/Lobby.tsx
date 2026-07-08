import './Lobby.css';
import React, { useState, useEffect } from 'react';
import { Trophy, ShoppingBag, Gamepad2, Medal, ArrowRight, Info, Zap, Flame } from 'lucide-react';
import type { CharacterKey, BotDifficulty } from '../game/types';
import { CHARACTERS, CHARACTER_KEYS } from '../data/characters';
import { gs, startGame } from '../game/state';
import { loadProfile, saveProfile, moscowDateString, xpToTier } from '../game/profile';
import { getDailyChallenge } from '../data/dailyChallenges';
import { ACHIEVEMENTS } from '../data/achievements';
import LeaderboardTab from './LeaderboardTab';
import ShopTab from './ShopTab';
import { t } from '../i18n/strings';

const LOBBY_FLAVOR_TEXTS = [
  'В подъезде №3 снова сломался лифт. Администрация: «Заявка в работе.»',
  'На стоянке нашли 2 пустые канистры. Очень подозрительно.',
  'Дядя Серёжа с балкона кричит про талоны. Опять.',
  'В ЖК-чате 47 смеющихся смайликов под объявлением об уголовной ответственности.',
  'Крипто-Вова припарковал Zeekr поперёк двух мест. Соседи в ярости.',
  'Бабушка из 5 подъезда допрашивает всех входящих. Сходка неизбежна.',
  'АИ-95: 87₽↑. Во дворе неспокойно.',
  'Петрович снова «чинил» чужую машину в 2 ночи. Или не чинил?',
  'Марина снимает двор на сторис. Сливщики в панике.',
  'Ахмет подметает двор и молчит. Он что-то знает.',
];

interface Props {
  onStart: () => void;
  onMultiplayer: () => void;
}

const DIFFICULTY_LABELS: Record<BotDifficulty, { label: string; emoji: string; desc: string; color: string }> = {
  easy:      { label: 'Лёгкий',    emoji: '🟢', desc: 'Боты ленятся',         color: '#4CAF50' },
  medium:    { label: 'Средний',   emoji: '🟡', desc: 'Стандартная игра',      color: '#FF9800' },
  hard:      { label: 'Сложный',   emoji: '🔴', desc: 'Боты хитрят',           color: '#F44336' },
  nightmare: { label: 'Кошмар',    emoji: '💀', desc: 'Почти нереально',       color: '#9C27B0' },
};

type LobbyTab = 'game' | 'shop' | 'leaderboard';

export default function Lobby({ onStart, onMultiplayer }: Props) {
  const [activeTab, setActiveTab] = useState<LobbyTab>('game');
  const [selected, setSelected] = useState<CharacterKey>('denis');
  const [playerCount, setPlayerCount] = useState(6);
  const [siphonersCount, setSiphonersCount] = useState(2);
  const [difficulty, setDifficulty] = useState<BotDifficulty>('medium');
  const [flavorIdx, setFlavorIdx] = useState(() => Math.floor(Math.random() * LOBBY_FLAVOR_TEXTS.length));
  const [showAchievements, setShowAchievements] = useState(false);
  const [profileKey, setProfileKey] = useState(0);
  const charDef = CHARACTERS[selected];

  const profile = loadProfile();
  const today = moscowDateString();
  const dailyDef = getDailyChallenge(today);
  const dailyState = profile.daily?.date === today ? profile.daily : null;
  const dailyProgress = dailyState?.progress ?? 0;
  const dailyCompleted = dailyState?.completed ?? false;

  const XP_PER_TIER = 500;
  const tier = xpToTier(profile.battlePassXP);
  const xpInTier = profile.battlePassXP % XP_PER_TIER;
  const tierPct = Math.round((xpInTier / XP_PER_TIER) * 100);

  useEffect(() => {
    const id = setInterval(() => {
      setFlavorIdx(i => (i + 1) % LOBBY_FLAVOR_TEXTS.length);
    }, 6000);
    return () => clearInterval(id);
  }, []);

  function handleStart(useDailySeed = false) {
    gs.selectedCharacter = selected;
    gs.botDifficulty = difficulty;
    const p = loadProfile();
    if (!p.playerName) {
      p.playerName = CHARACTERS[selected].name.split(' ')[0];
      saveProfile(p);
    }
    startGame(selected, useDailySeed ? 6 : playerCount, useDailySeed ? 2 : siphonersCount, useDailySeed);
    onStart();
  }

  const unlockedAchs = ACHIEVEMENTS.filter(a => profile.achievements.includes(a.id));

  const lang = profile.language;
  const TABS: { id: LobbyTab; label: string; icon: any }[] = [
    { id: 'game', label: t('lobby_tab_game', lang), icon: Gamepad2 },
    { id: 'shop', label: t('lobby_tab_shop', lang), icon: ShoppingBag },
    { id: 'leaderboard', label: t('lobby_tab_leaderboard', lang), icon: Trophy },
  ];

  return (
    <div className="lobby-constructivist-root flex flex-col items-center">
      <div className="constructivist-bg"></div>
      <div className="constructivist-beams"></div>

      <div className="w-full max-w-[420px] relative z-10 flex flex-col min-h-full mx-auto">

        {/* Dynamic Header Composition */}
        <header className="relative w-full pt-12 pb-6 px-4">
          <div className="absolute top-[-20%] left-[-10%] w-[120%] h-[120%] bg-[#cc2b1d] -skew-y-6 z-0 border-b-8 border-[#1a1a1a]"></div>
          <div className="absolute top-0 right-[-10%] w-[50%] h-[80%] bg-[#e5a50a] rotate-[15deg] z-0 border-4 border-[#1a1a1a] shadow-[8px_8px_0_#1a1a1a]"></div>

          <div className="relative z-10 flex flex-col">
            <div className="flex items-end justify-between">
              <div className="flex flex-col">
                <span className="text-[100px] sm:text-[120px] leading-[0.8] tracking-tighter russo-font text-[#f4ebd0] drop-shadow-[4px_4px_0_#1a1a1a]">95</span>
                <span className="text-[36px] sm:text-[40px] leading-none tracking-tight text-[#1a1a1a] font-black uppercase mt-[-10px] ml-2 bg-[#e5a50a] px-2 w-max border-2 border-[#1a1a1a] rotate-[-3deg]">бакстаб</span>
              </div>
              <div className="text-[70px] sm:text-[80px] drop-shadow-[4px_4px_0_#1a1a1a] rotate-[15deg]">🏘️</div>
            </div>

            <div className="bg-[#1a1a1a] text-[#f4ebd0] p-2 mt-4 rotate-[2deg] shadow-[4px_4px_0_#e5a50a] w-max max-w-full">
              <span className="font-black text-sm uppercase tracking-widest block text-center">ЖК «Цветочные Поляны»</span>
            </div>
            <p className="mt-2 text-[#f4ebd0] font-bold text-xs uppercase tracking-wider pl-2 border-l-4 border-[#e5a50a]">
              Кто из соседей сливает бензин?
            </p>
          </div>
        </header>

        {/* Profile Stats - Angled Block */}
        <div className="px-4 mb-8">
          <div className="bg-white border-4 border-[#1a1a1a] p-1 flex shadow-[6px_6px_0_#cc2b1d] -skew-x-6 relative">
            <div className="flex-1 bg-[#f4ebd0] p-3 flex flex-col justify-center border-r-4 border-[#1a1a1a] min-w-0">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <span className="font-black text-xl sm:text-2xl uppercase tracking-tighter skew-x-6">💰 {profile.babki}</span>
                <span className="text-[10px] font-bold text-[#1a1a1a] uppercase bg-[#e5a50a] px-1 skew-x-6">МАТЧЕЙ: {profile.totalMatchesPlayed}</span>
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
            <button
              onClick={() => setShowAchievements(v => !v)}
              className="bg-[#1a1a1a] text-[#f4ebd0] px-4 flex flex-col items-center justify-center hover:bg-[#cc2b1d] transition-colors"
            >
              <div className="skew-x-6 flex flex-col items-center">
                <Medal size={28} />
                <span className="font-black text-sm mt-1">{unlockedAchs.length}/{ACHIEVEMENTS.length}</span>
              </div>
            </button>
          </div>
        </div>

        {/* Achievements panel */}
        {showAchievements && (
          <div className="px-4 mb-8">
            <div className="bg-[#1a1a1a] text-[#f4ebd0] border-4 border-[#1a1a1a] p-4 shadow-[6px_6px_0_#e5a50a] max-h-[300px] overflow-y-auto">
              <h3 className="font-black uppercase text-lg mb-3 russo-font border-b-2 border-[#e5a50a] pb-2">
                СТАХАНОВСКИЕ ДОСТИЖЕНИЯ ({unlockedAchs.length}/{ACHIEVEMENTS.length})
              </h3>
              <div className="space-y-1">
                {ACHIEVEMENTS.map(ach => {
                  const unlocked = profile.achievements.includes(ach.id);
                  return (
                    <div key={ach.id} className={`flex items-center gap-3 py-1.5 border-b border-[#f4ebd0]/10 ${unlocked ? '' : 'opacity-40'}`}>
                      <div className={`text-xl shrink-0 ${unlocked ? '' : 'grayscale'}`}>{ach.emoji}</div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs font-black uppercase leading-tight ${unlocked ? 'text-[#e5a50a]' : 'text-[#f4ebd0]'}`}>{ach.title}</div>
                        <div className="text-[10px] text-[#f4ebd0]/60 leading-tight">{ach.description}</div>
                      </div>
                      <div className="text-[10px] font-black shrink-0 text-[#e5a50a]">
                        {unlocked ? `✅ +${ach.babkiReward}` : `${ach.babkiReward}💰`}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Diagonal Navigation */}
        <nav className="px-4 mb-8 flex flex-col gap-2 relative">
          <div className="absolute left-6 top-0 bottom-0 w-1 bg-[#cc2b1d] z-0"></div>
          {TABS.map((tab, idx) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
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

          {activeTab === 'shop' && (
            <div className="bg-white border-4 border-[#1a1a1a] shadow-[8px_8px_0_#cc2b1d] overflow-hidden">
              <ShopTab key={profileKey} onProfileChange={() => setProfileKey(k => k + 1)} />
            </div>
          )}

          {activeTab === 'leaderboard' && (
            <div className="bg-white border-4 border-[#1a1a1a] shadow-[8px_8px_0_#e5a50a] overflow-hidden">
              <LeaderboardTab myDeviceId={profile.deviceId} />
            </div>
          )}

          {activeTab === 'game' && (
            <div className="space-y-10">

              {/* Daily Challenge - Diagonal Ribbon */}
              <div className="relative">
                <div className={`absolute inset-0 rotate-[2deg] border-4 border-[#1a1a1a] shadow-[6px_6px_0_rgba(0,0,0,0.3)] z-0 ${dailyCompleted ? 'bg-[#4CAF50]' : 'bg-[#e5a50a]'}`}></div>
                <div className="bg-[#1a1a1a] text-[#f4ebd0] border-4 border-[#1a1a1a] p-4 relative z-10 rotate-[-1deg] flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="block text-[10px] font-black uppercase tracking-widest text-[#e5a50a] mb-1">ЕЖЕДНЕВНОЕ ЗАДАНИЕ</span>
                    <span className="text-base font-black uppercase russo-font block truncate">{dailyDef.emoji} {dailyDef.label}</span>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    {dailyCompleted ? (
                      <span className="text-lg font-black text-[#4CAF50] russo-font">✅ ГОТОВО</span>
                    ) : (
                      <>
                        <span className="text-3xl font-black text-[#cc2b1d] russo-font drop-shadow-[2px_2px_0_#f4ebd0]">{dailyProgress}/{dailyDef.target}</span>
                        <span className="text-[10px] font-black bg-[#f4ebd0] text-[#1a1a1a] px-1">+200 БАБОК</span>
                      </>
                    )}
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
                          {c.shortName ?? c.name.split(' ')[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Character Dossier - Photomontage Style */}
                <div className="border-4 border-[#1a1a1a] bg-[#f4ebd0] relative group hover:shadow-[8px_8px_0_#1a1a1a] transition-shadow duration-300 mb-2">
                  <div className="absolute top-0 right-0 w-[120px] sm:w-[150px] h-full bg-[#e5a50a] z-0 pointer-events-none" style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}></div>

                  <div className="relative z-10 flex p-3 pr-2 sm:p-4">
                    <div
                      className="w-20 h-20 sm:w-24 sm:h-24 border-4 border-[#1a1a1a] rounded-none flex items-center justify-center text-5xl sm:text-6xl shadow-[4px_4px_0_#1a1a1a] shrink-0 -translate-x-2 -translate-y-2 rotate-[-4deg] group-hover:rotate-0 transition-transform duration-300"
                      style={{ backgroundColor: charDef.color }}
                    >
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
                      <p className="text-[11px] sm:text-xs font-bold text-[#1a1a1a] uppercase bg-white/95 p-1.5 border-l-4 border-[#cc2b1d] leading-tight relative z-10 shadow-[2px_2px_0_rgba(0,0,0,0.1)]">
                        {charDef.description}
                      </p>
                    </div>
                  </div>
                  <div className="bg-[#1a1a1a] text-[#f4ebd0] p-3 sm:p-4 text-center border-t-4 border-[#1a1a1a]">
                    <span className="font-black text-sm sm:text-base uppercase tracking-widest leading-tight block">«{charDef.voiceLines[0]}»</span>
                  </div>
                </div>
              </section>

              {/* Sliders / Settings */}
              <section>
                <div className="bg-[#1a1a1a] text-[#f4ebd0] inline-block px-4 py-2 border-4 border-[#1a1a1a] mb-6 rotate-[2deg] shadow-[4px_4px_0_#e5a50a]">
                  <h3 className="font-black uppercase text-2xl russo-font tracking-widest">ПЛАН РАБОТ</h3>
                </div>

                <div className="border-4 border-[#1a1a1a] bg-white p-5 sm:p-6 space-y-8 shadow-[8px_8px_0_#cc2b1d]">

                  <div className="relative">
                    <div className="flex justify-between items-end mb-3 border-b-4 border-[#1a1a1a] pb-2">
                      <span className="text-base font-black uppercase tracking-wider">ИГРОКОВ (С БОТАМИ)</span>
                      <span className="text-4xl font-black text-[#cc2b1d] russo-font drop-shadow-[2px_2px_0_#1a1a1a] leading-none">{playerCount}</span>
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
                    <div className="flex justify-between items-end mb-3 border-b-4 border-[#1a1a1a] pb-2">
                      <span className="text-base font-black uppercase tracking-wider">СЛИВЩИКОВ</span>
                      <span className="text-4xl font-black text-[#1a1a1a] russo-font leading-none">{siphonersCount} 🪣</span>
                    </div>
                    <input
                      type="range" min={1} max={Math.floor((playerCount - 1) / 2)}
                      value={siphonersCount}
                      onChange={e => setSiphonersCount(+e.target.value)}
                    />
                  </div>

                  <div className="bg-[#e5a50a] border-4 border-[#1a1a1a] p-3 flex flex-col gap-1 text-sm font-black uppercase skew-x-[-5deg]">
                    <span className="skew-x-[5deg] text-center">🏠 {playerCount - siphonersCount} ХОЗЯЕВ VS 🪣 {siphonersCount} СЛИВЩИК{siphonersCount === 1 ? '' : 'А'}</span>
                    <span className="skew-x-[5deg] text-[10px] font-bold normal-case text-center leading-tight">
                      Задача хозяев: заполни метр единства до 100% или выгони всех сливщиков
                    </span>
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
                    'Двигайся джойстиком (или WASD на ПК)',
                    'Кнопка E — взаимодействие с объектами',
                    'Выполняй задачи → заполняй метр единства',
                    'Подойди к арке и нажми E → вызвать сходку',
                    'На сходке голосуй за подозреваемых',
                    'Сливщики: сливай баки и не попадайся!',
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

                {/* Fuel bot CTA */}
                <button
                  onClick={() => {
                    const tg = (window as any).Telegram?.WebApp;
                    if (tg?.openTelegramLink) {
                      tg.openTelegramLink('https://t.me/fuel_fuel_fuel_bot');
                    } else {
                      window.open('https://t.me/fuel_fuel_fuel_bot', '_blank');
                    }
                  }}
                  className="w-full border-4 border-[#1a1a1a] bg-[#e5a50a] flex items-stretch hover:shadow-[6px_6px_0_#cc2b1d] transition-all group"
                >
                  <div className="bg-[#1a1a1a] text-[#e5a50a] p-4 flex items-center justify-center w-16 group-hover:scale-110 transition-transform">
                    <Flame size={32} />
                  </div>
                  <div className="p-3 text-left flex flex-col justify-center">
                    <div className="text-sm font-black uppercase russo-font">ТАЛОНЫ НА БЕНЗИН</div>
                    <div className="text-[9px] font-bold uppercase border-t-2 border-[#1a1a1a] pt-1 mt-1">
                      Зафиксируй цену АИ-95 → @fuel_fuel_fuel_bot
                    </div>
                  </div>
                </button>

                {/* Daily CTA */}
                <button onClick={() => handleStart(true)} className="w-full border-4 border-[#1a1a1a] bg-[#1a1a1a] text-[#f4ebd0] p-4 flex items-center justify-between group hover:bg-[#cc2b1d] transition-colors relative overflow-hidden">
                  <div className="absolute right-[-20px] top-1/2 -translate-y-1/2 opacity-20">
                    <Zap size={100} />
                  </div>
                  <div className="text-left relative z-10">
                    <span className="block text-xl font-black uppercase russo-font tracking-widest">ЕЖЕДНЕВНЫЙ ВЫЗОВ</span>
                    <span className="text-[10px] font-bold uppercase opacity-80 border-l-2 border-[#e5a50a] pl-2">Одинаковые роли для всех · войди в топ сегодня</span>
                  </div>
                  <ArrowRight size={32} className="relative z-10 text-[#e5a50a] group-hover:translate-x-2 transition-transform" />
                </button>

                {/* Primary Game CTA */}
                <button onClick={() => handleStart(false)} className="w-full border-4 border-[#1a1a1a] bg-[#cc2b1d] text-[#f4ebd0] p-6 text-center shadow-[12px_12px_0_#1a1a1a] hover:shadow-[4px_4px_0_#1a1a1a] hover:translate-y-2 hover:translate-x-2 transition-all relative">
                  <div className="absolute inset-2 border-2 border-[#f4ebd0] border-dashed pointer-events-none"></div>
                  <span className="text-4xl font-black uppercase tracking-widest russo-font drop-shadow-[2px_2px_0_#1a1a1a]">{lang === 'en' ? t('lobby_start', lang) : 'ИГРАТЬ'}</span>
                  <span className="block text-sm font-bold uppercase mt-2 bg-[#1a1a1a] px-2 w-max mx-auto -skew-x-12">
                    ОДИНОЧНАЯ
                  </span>
                </button>

                {/* Multiplayer CTA */}
                <button onClick={onMultiplayer} className="w-full border-4 border-[#1a1a1a] bg-white text-[#1a1a1a] p-4 text-center hover:bg-[#f4ebd0] transition-colors">
                  <span className="text-2xl font-black uppercase tracking-widest russo-font">{lang === 'en' ? t('lobby_multiplayer', lang) : 'МУЛЬТИПЛЕЕР'}</span>
                </button>

              </div>

              {/* Ticker Bottom */}
              <div className="border-y-8 border-[#1a1a1a] bg-[#1a1a1a] text-[#f4ebd0] py-2 flex items-center relative overflow-hidden mb-8">
                <div className="bg-[#cc2b1d] px-4 py-2 font-black uppercase text-sm z-10 shrink-0 border-r-4 border-[#1a1a1a]">
                  СЕГОДНЯ В ЖК
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
              ЖК «ЦВЕТОЧНЫЕ ПОЛЯНЫ» © 2026<br/>
              @bakstab_bot
            </p>
          </div>
        </footer>

      </div>
    </div>
  );
}
