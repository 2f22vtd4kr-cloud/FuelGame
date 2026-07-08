import './_group.css';
import './Noir.css';
import { useState, useEffect } from 'react';
import { Search, Shield, Trophy, ShoppingBag, FileText, ChevronRight, User, Settings as SettingsIcon, AlertCircle } from 'lucide-react';

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
  { id: 'game', label: 'Игра', icon: Shield },
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

export function Noir() {
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
    <div className="noir-root min-h-screen pb-12 flex flex-col items-center">
      <div className="scanlines"></div>
      
      {/* Header */}
      <div className="relative z-10 pt-8 pb-6 text-center w-full max-w-[420px]">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-4xl flicker">🏢</span>
        </div>
        <h1 className="text-6xl font-black tracking-tighter text-white uppercase italic leading-none" style={{ textShadow: '4px 4px 0px var(--noir-accent)' }}>
          95-Й
        </h1>
        <div className="mt-2 space-y-1">
          <p className="typewriter text-xs tracking-widest text-[var(--noir-accent)] font-bold">
            ЖК «Цветочные Поляны»
          </p>
          <p className="text-[10px] text-[var(--noir-muted)] uppercase tracking-tight">
            Кто из соседей сливает бензин?
          </p>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-[420px] px-4 space-y-6">
        
        {/* Profile Bar */}
        <div className="evidence-file p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-black border border-[var(--noir-border)] flex items-center justify-center text-2xl">
            🕵️
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-end mb-1">
              <span className="typewriter text-xs font-bold">ДОСЬЕ ИГРОКА</span>
              <span className="text-[10px] text-[var(--noir-muted)]">#{MOCK_PROFILE.totalMatchesPlayed} ДЕЛ</span>
            </div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-lg font-bold text-white tracking-tight">💰 {MOCK_PROFILE.babki} <span className="text-[10px] text-[var(--noir-muted)]">БАБОК</span></span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[8px] typewriter text-[var(--noir-muted)] font-bold">
                <span>ПРОПУСК: УРОВЕНЬ {tier}</span>
                <span>{tierPct}%</span>
              </div>
              <div className="h-1 bg-black border border-[var(--noir-border)]">
                <div 
                  className="h-full bg-[var(--noir-accent)] shadow-[0_0_5px_var(--noir-accent)]" 
                  style={{ width: `${tierPct}%` }}
                />
              </div>
            </div>
          </div>
          <button 
            onClick={() => setShowAchievements(!showAchievements)}
            className="w-10 h-10 border border-[var(--noir-border)] flex flex-col items-center justify-center hover:bg-[var(--noir-highlight)]"
          >
            <span className="text-lg">🏅</span>
            <span className="text-[7px] font-bold text-[var(--noir-muted)]">{MOCK_ACH_UNLOCKED}/{MOCK_ACH_TOTAL}</span>
          </button>
        </div>

        {/* Achievement Panel */}
        {showAchievements && (
           <div className="evidence-file p-3 text-[10px] text-[var(--noir-muted)] border-l-4 border-l-[var(--noir-accent)]">
             <div className="flex items-center gap-2 mb-1">
                <AlertCircle size={12} className="text-[var(--noir-accent)]" />
                <span className="typewriter text-white font-bold">АРХИВ ДОСТИЖЕНИЙ</span>
             </div>
             Список выполненных дел и наград. Прогресс: {MOCK_ACH_UNLOCKED} из {MOCK_ACH_TOTAL}.
           </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-[var(--noir-border)]">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-3 flex flex-col items-center gap-1 transition-all ${isActive ? 'text-[var(--noir-accent)]' : 'text-[var(--noir-muted)]'}`}
              >
                <Icon size={18} strokeWidth={isActive ? 3 : 2} />
                <span className="typewriter text-[9px] font-bold tracking-widest">{tab.label}</span>
                {isActive && <div className="absolute bottom-0 w-8 h-[2px] bg-[var(--noir-accent)]" />}
              </button>
            );
          })}
        </div>

        {/* Main Content Area */}
        {activeTab === 'shop' && (
          <div className="py-20 text-center opacity-50 space-y-4">
            <ShoppingBag size={48} className="mx-auto text-[var(--noir-muted)]" />
            <p className="typewriter text-xs">ЧЕРНЫЙ РЫНОК ЗАКРЫТ</p>
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="py-20 text-center opacity-50 space-y-4">
            <Trophy size={48} className="mx-auto text-[var(--noir-muted)]" />
            <p className="typewriter text-xs">СПИСОК ПОДОЗРЕВАЕМЫХ</p>
          </div>
        )}

        {activeTab === 'game' && (
          <div className="space-y-6">
            
            {/* Daily Challenge */}
            <div className="evidence-file bg-black/40 border-dashed border-2 border-[var(--noir-border)] p-4 flex items-center justify-between">
              <div>
                <p className="typewriter text-[9px] text-[var(--noir-accent)] font-bold mb-1">ОПЕРАТИВНАЯ СВОДКА</p>
                <h3 className="text-white text-xs font-bold uppercase tracking-wide">Выполни 3 задачи во дворе</h3>
              </div>
              <div className="text-right">
                <div className="text-xl font-black text-white italic">1/3</div>
                <div className="typewriter text-[8px] text-[var(--noir-muted)]">+200 БАБОК</div>
              </div>
            </div>

            {/* Character Select */}
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <h3 className="typewriter text-[10px] text-white font-bold">ПОДОЗРЕВАЕМЫЕ</h3>
                <span className="text-[9px] text-[var(--noir-muted)] uppercase italic">Выберите фигуранта</span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {CHARACTER_KEYS.map(key => {
                  const c = CHARACTERS[key];
                  const isSelected = key === selected;
                  return (
                    <button
                      key={key}
                      onClick={() => setSelected(key)}
                      className={`relative aspect-square border-2 transition-all flex flex-col items-center justify-center p-1
                        ${isSelected ? 'border-[var(--noir-accent)] bg-[var(--noir-highlight)] scale-105 z-10' : 'border-[var(--noir-border)] bg-black/50 grayscale hover:grayscale-0'}`}
                    >
                      <span className="text-2xl">{c.emoji}</span>
                      <span className={`text-[7px] font-bold mt-1 uppercase tracking-tighter truncate w-full text-center ${isSelected ? 'text-white' : 'text-[var(--noir-muted)]'}`}>
                        {c.name.split(' ')[0]}
                      </span>
                      {isSelected && <div className="absolute -top-1 -right-1 w-2 h-2 bg-[var(--noir-accent)] rotate-45" />}
                    </button>
                  );
                })}
              </div>

              {/* Character Detail Card */}
              <div className="evidence-file p-4 flex gap-4 border-l-4" style={{ borderColor: charDef.color }}>
                <div className="w-16 h-16 bg-black/80 flex items-center justify-center text-4xl shadow-inner border border-[var(--noir-border)]">
                  {charDef.emoji}
                </div>
                <div className="flex-1 space-y-1">
                  <h4 className="text-sm font-black uppercase text-white tracking-wide">{charDef.name}</h4>
                  <p className="text-[10px] text-[var(--noir-muted)] leading-tight italic line-clamp-2">
                    {charDef.description}
                  </p>
                  <div className="pt-1 flex items-start gap-1">
                    <FileText size={10} className="mt-0.5 text-[var(--noir-accent)] shrink-0" />
                    <span className="text-[10px] text-white font-bold italic">«{charDef.voiceLines[0]}»</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Settings */}
            <div className="evidence-file p-5 space-y-6">
              <div className="flex items-center gap-2 border-b border-[var(--noir-border)] pb-2">
                <SettingsIcon size={14} className="text-[var(--noir-accent)]" />
                <h3 className="typewriter text-[10px] text-white font-bold tracking-widest">ПАРАМЕТРЫ СЛЕДСТВИЯ</h3>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between text-[10px] typewriter">
                    <span className="text-[var(--noir-muted)]">КОЛ-ВО ФИГУРАНТОВ</span>
                    <span className="text-white font-bold">{playerCount} ЧЕЛ.</span>
                  </div>
                  <input 
                    type="range" min={4} max={10} value={playerCount}
                    onChange={e => {
                      const n = +e.target.value;
                      setPlayerCount(n);
                      if (siphonersCount >= n - 1) setSiphonersCount(Math.max(1, n - 2));
                    }}
                    className="w-full"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-[10px] typewriter">
                    <span className="text-[var(--noir-muted)]">АКТИВНЫЕ СЛИВЩИКИ</span>
                    <span className="text-[var(--noir-accent)] font-bold">{siphonersCount} 🪣</span>
                  </div>
                  <input 
                    type="range" min={1} max={Math.floor((playerCount - 1) / 2)}
                    value={siphonersCount}
                    onChange={e => setSiphonersCount(+e.target.value)}
                    className="w-full"
                    style={{ filter: 'hue-rotate(340deg)' }}
                  />
                  <div className="bg-black/80 border border-[var(--noir-border)] p-2 text-[8px] text-[var(--noir-muted)] leading-relaxed italic">
                    <span className="text-white font-bold">ОБСТАНОВКА:</span> {playerCount - siphonersCount} ХОЗЯЕВ VS {siphonersCount} СЛИВЩИКА.
                    ЗАДАЧА: ЗАПОЛНИТЬ МЕТР ЕДИНСТВА ИЛИ ВЫЯВИТЬ ПРЕДАТЕЛЕЙ.
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <h3 className="typewriter text-[9px] text-[var(--noir-muted)] font-bold">УРОВЕНЬ УГРОЗЫ</h3>
                <div className="grid grid-cols-4 gap-2">
                  {(Object.keys(DIFFICULTY_LABELS) as BotDifficulty[]).map(key => {
                    const d = DIFFICULTY_LABELS[key];
                    const isSelected = key === difficulty;
                    return (
                      <button 
                        key={key} 
                        onClick={() => setDifficulty(key)}
                        className={`py-2 px-1 border transition-all flex flex-col items-center gap-1
                          ${isSelected ? 'bg-white border-white scale-105' : 'bg-transparent border-[var(--noir-border)] hover:border-[var(--noir-muted)]'}`}
                      >
                        <span className={`typewriter text-[8px] font-bold ${isSelected ? 'text-black' : 'text-[var(--noir-muted)]'}`}>{d.label}</span>
                        <span className="text-xs">{d.emoji}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* How to Play */}
            <div className="evidence-file p-4 bg-[var(--noir-paper)] text-[10px] space-y-3">
              <h3 className="typewriter text-white font-bold border-b border-[var(--noir-border)] pb-1">ПРОТОКОЛ ДЕЙСТВИЙ</h3>
              <ul className="space-y-2 text-[var(--noir-muted)]">
                <li className="flex gap-2">
                  <span className="text-[var(--noir-accent)] font-bold">01.</span>
                  <span>ДВИЖЕНИЕ: ДЖОЙСТИК ИЛИ WASD</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-[var(--noir-accent)] font-bold">02.</span>
                  <span>КОНТАКТ: КНОПКА [E] С ОБЪЕКТАМИ</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-[var(--noir-accent)] font-bold">03.</span>
                  <span>ЦЕЛЬ: ВЫПОЛНЯЙ ЗАДАЧИ, ЗАПОЛНЯЙ МЕТР</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-[var(--noir-accent)] font-bold">04.</span>
                  <span>СХОДКА: ВЫЗОВ ЧЕРЕЗ [E] У АРКИ</span>
                </li>
                <li className="flex gap-2 text-white/80">
                  <span className="text-[var(--noir-accent)] font-bold">!!</span>
                  <span className="font-bold">СЛИВЩИКИ: ДЕЙСТВУЙТЕ СКРЫТНО!</span>
                </li>
              </ul>
            </div>

            {/* Buttons */}
            <div className="space-y-3 pt-4">
              <button className="noir-button w-full p-4 flex flex-col items-center justify-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="typewriter text-xs font-black text-white">📅 Ежедневный вызов</span>
                <span className="text-[8px] text-[var(--noir-muted)] mt-1 tracking-tight">ОДИНАКОВЫЕ РОЛИ ДЛЯ ВСЕХ • ВОЙДИ В ТОП</span>
              </button>

              <button className="noir-button noir-button-primary w-full p-5 flex items-center justify-center gap-3 relative overflow-hidden shadow-2xl">
                <span className="text-2xl">🎮</span>
                <span className="text-xl font-black italic tracking-widest">ИГРАТЬ</span>
              </button>

              <button className="noir-button w-full p-4 text-sm font-bold text-white hover:bg-white hover:text-black">
                🌐 МУЛЬТИПЛЕЕР
              </button>

              <button className="w-full p-3 bg-black border border-dashed border-[var(--noir-border)] flex items-center justify-between group hover:border-[var(--noir-accent)] transition-colors">
                <div className="text-left">
                  <div className="typewriter text-[10px] font-bold text-[var(--noir-accent)]">🎟️ ТАЛОНЫ НА БЕНЗИН</div>
                  <div className="text-[8px] text-[var(--noir-muted)]">ФИКСИРУЙ ЦЕНУ АИ-95 → @FUEL_BOT</div>
                </div>
                <ChevronRight size={16} className="text-[var(--noir-muted)] group-hover:text-[var(--noir-accent)]" />
              </button>
            </div>

            {/* News Ticker */}
            <div className="evidence-file p-3 bg-black/80 border-l-4 border-l-[var(--noir-accent)] overflow-hidden">
               <div className="flex justify-between items-center mb-1">
                 <span className="typewriter text-[8px] text-[var(--noir-accent)] font-bold">СВОДКА ПРОИСШЕСТВИЙ</span>
                 <div className="flex gap-0.5">
                   <div className="w-1 h-1 bg-[var(--noir-accent)] flicker" />
                   <div className="w-1 h-1 bg-[var(--noir-accent)] flicker delay-100" />
                   <div className="w-1 h-1 bg-[var(--noir-accent)] flicker delay-200" />
                 </div>
               </div>
               <div className="h-8 flex items-center">
                 <p className="text-[10px] text-white/90 leading-tight italic animate-in fade-in slide-in-from-right-4 duration-500">
                   {LOBBY_FLAVOR_TEXTS[flavorIdx]}
                 </p>
               </div>
            </div>

          </div>
        )}

        {/* Footer */}
        <div className="pt-8 pb-4 text-center">
          <p className="typewriter text-[8px] text-[var(--noir-muted)] tracking-[0.2em]">
            ЖК «ЦВЕТОЧНЫЕ ПОЛЯНЫ» © 2026 • @BAKSTAB_BOT
          </p>
        </div>
      </div>
    </div>
  );
}
