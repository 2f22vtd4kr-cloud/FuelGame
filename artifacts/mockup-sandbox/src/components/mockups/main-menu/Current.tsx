import './_group.css';
import { useState, useEffect } from 'react';

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
const TABS: { id: LobbyTab; label: string; emoji: string }[] = [
  { id: 'game', label: 'Игра', emoji: '🎮' },
  { id: 'shop', label: 'Магазин', emoji: '🎩' },
  { id: 'leaderboard', label: 'Рейтинг', emoji: '🏆' },
];

const MOCK_PROFILE = {
  babki: 4250,
  totalMatchesPlayed: 37,
  battlePassXP: 1830,
};
const MOCK_ACH_UNLOCKED = 14;
const MOCK_ACH_TOTAL = 50;

export function Current() {
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
    <div className="menu-root" style={{
      position: 'relative', minHeight: '100vh',
      background: 'linear-gradient(180deg, #0D1B2A 0%, #1B2838 60%, #0D1B2A 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      overflowY: 'auto', padding: '24px 16px',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 48, marginBottom: 4 }}>🏘️</div>
        <div style={{
          fontSize: 32, fontWeight: 900, color: '#FF5722',
          letterSpacing: 3, textShadow: '0 2px 12px rgba(255,87,34,0.5)',
        }}>
          95-Й
        </div>
        <div style={{ fontSize: 13, color: '#9E9E9E', marginTop: 4, letterSpacing: 2 }}>
          ЖК «Цветочные Поляны»
        </div>
        <div style={{ fontSize: 11, color: '#607D8B', marginTop: 2 }}>
          Кто из соседей сливает бензин?
        </div>
      </div>

      <div style={{
        width: '100%', maxWidth: 380,
        background: 'rgba(255,215,0,0.07)',
        border: '1px solid rgba(255,215,0,0.2)',
        borderRadius: 12, padding: '10px 14px', marginBottom: 10,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 'bold', color: '#FFD700' }}>
              💰 {MOCK_PROFILE.babki} бабок
            </span>
            <span style={{ fontSize: 11, color: '#9E9E9E' }}>
              • Матчей: {MOCK_PROFILE.totalMatchesPlayed}
            </span>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 9, color: '#9E9E9E' }}>Боевой Пропуск — Ур. {tier}</span>
              <span style={{ fontSize: 9, color: '#64B5F6' }}>{tierPct}%</span>
            </div>
            <div style={{ height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 3,
                background: 'linear-gradient(90deg, #1565C0, #64B5F6)',
                width: `${tierPct}%`,
              }} />
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowAchievements(v => !v)}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 8, padding: '6px 10px',
            cursor: 'pointer', textAlign: 'center', flexShrink: 0,
          }}
        >
          <div style={{ fontSize: 18 }}>🏅</div>
          <div style={{ fontSize: 9, color: '#9E9E9E', marginTop: 2 }}>{MOCK_ACH_UNLOCKED}/{MOCK_ACH_TOTAL}</div>
        </button>
      </div>

      <div style={{ width: '100%', maxWidth: 380, display: 'flex', gap: 6, marginBottom: 14 }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1, padding: '9px 4px',
              background: activeTab === tab.id ? 'rgba(255,87,34,0.18)' : 'rgba(255,255,255,0.04)',
              border: `2px solid ${activeTab === tab.id ? '#FF5722' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 10, cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            }}
          >
            <span style={{ fontSize: 18 }}>{tab.emoji}</span>
            <span style={{
              fontSize: 9, fontWeight: 'bold', letterSpacing: 0.5,
              color: activeTab === tab.id ? '#FF5722' : '#9E9E9E',
            }}>
              {tab.label.toUpperCase()}
            </span>
          </button>
        ))}
      </div>

      {showAchievements && (
        <div style={{
          width: '100%', maxWidth: 380,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12, padding: '12px 14px', marginBottom: 14,
          fontSize: 11, color: '#9E9E9E',
        }}>
          ДОСТИЖЕНИЯ ({MOCK_ACH_UNLOCKED}/{MOCK_ACH_TOTAL}) — список достижений отображается здесь.
        </div>
      )}

      {activeTab === 'shop' && (
        <div style={{ width: '100%', maxWidth: 380, textAlign: 'center', color: '#9E9E9E', padding: '40px 0' }}>
          🎩 Магазин (отдельный экран — шапки, скины машин, питомцы)
        </div>
      )}

      {activeTab === 'leaderboard' && (
        <div style={{ width: '100%', maxWidth: 380, textAlign: 'center', color: '#9E9E9E', padding: '40px 0' }}>
          🏆 Рейтинг (отдельный экран — сезон / сегодня / рядом)
        </div>
      )}

      {activeTab === 'game' && (
        <>
          <div style={{
            width: '100%', maxWidth: 380,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10, padding: '8px 14px', marginBottom: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          }}>
            <div>
              <div style={{ fontSize: 9, color: '#9E9E9E', marginBottom: 2, letterSpacing: 1, fontWeight: 'bold' }}>
                ☀️ ЕЖЕДНЕВНОЕ ЗАДАНИЕ
              </div>
              <div style={{ fontSize: 11, color: '#FFF' }}>
                🚗 Выполни 3 задачи
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 12, color: '#FFD700', fontWeight: 'bold' }}>1/3</div>
              <div style={{ fontSize: 9, color: '#9E9E9E' }}>+200 бабок</div>
            </div>
          </div>

          <div style={{ width: '100%', maxWidth: 380, marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: '#9E9E9E', marginBottom: 8, letterSpacing: 1 }}>
              ВЫБЕРИ ПЕРСОНАЖА
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 12 }}>
              {CHARACTER_KEYS.map(key => {
                const c = CHARACTERS[key];
                const isSelected = key === selected;
                return (
                  <button
                    key={key}
                    onClick={() => setSelected(key)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      gap: 2, padding: '8px 4px',
                      background: isSelected ? `${c.color}33` : 'rgba(255,255,255,0.05)',
                      border: isSelected ? `2px solid ${c.color}` : '2px solid transparent',
                      borderRadius: 10, cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ fontSize: 24 }}>{c.emoji}</div>
                    <div style={{ fontSize: 8, color: isSelected ? '#FFF' : '#9E9E9E', textAlign: 'center', lineHeight: 1.2 }}>
                      {c.name.split(' ')[0]}
                    </div>
                  </button>
                );
              })}
            </div>

            <div style={{
              background: `${charDef.color}22`,
              border: `1.5px solid ${charDef.color}66`,
              borderRadius: 12, padding: '12px 14px',
              display: 'flex', gap: 12, alignItems: 'flex-start',
            }}>
              <div style={{ fontSize: 40, flexShrink: 0 }}>{charDef.emoji}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 'bold', color: '#FFF', marginBottom: 2 }}>
                  {charDef.name}
                </div>
                <div style={{ fontSize: 11, color: '#BDBDBD', lineHeight: 1.4, marginBottom: 6 }}>
                  {charDef.description}
                </div>
                <div style={{ fontSize: 10, color: charDef.color, fontStyle: 'italic' }}>
                  «{charDef.voiceLines[0]}»
                </div>
              </div>
            </div>
          </div>

          <div style={{
            width: '100%', maxWidth: 380,
            background: 'rgba(255,255,255,0.05)',
            borderRadius: 12, padding: '14px 16px', marginBottom: 16,
          }}>
            <div style={{ fontSize: 11, color: '#9E9E9E', marginBottom: 12, letterSpacing: 1 }}>
              НАСТРОЙКИ ИГРЫ
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: '#FFF' }}>Игроков (включая ботов)</span>
                  <span style={{ fontSize: 12, color: '#FF5722', fontWeight: 'bold' }}>{playerCount}</span>
                </div>
                <input type="range" min={4} max={10} value={playerCount}
                  onChange={e => {
                    const n = +e.target.value;
                    setPlayerCount(n);
                    if (siphonersCount >= n - 1) setSiphonersCount(Math.max(1, n - 2));
                  }}
                  style={{ width: '100%', accentColor: '#FF5722' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: '#FFF' }}>Сливщиков</span>
                  <span style={{ fontSize: 12, color: '#F44336', fontWeight: 'bold' }}>{siphonersCount} 🪣</span>
                </div>
                <input type="range" min={1} max={Math.floor((playerCount - 1) / 2)}
                  value={siphonersCount}
                  onChange={e => setSiphonersCount(+e.target.value)}
                  style={{ width: '100%', accentColor: '#F44336' }}
                />
              </div>
            </div>

            <div style={{
              marginTop: 10, padding: '8px 12px',
              background: 'rgba(255,255,255,0.04)',
              borderRadius: 8, fontSize: 11, color: '#9E9E9E', lineHeight: 1.4,
            }}>
              🏠 {playerCount - siphonersCount} хозяев vs 🪣 {siphonersCount} сливщик{siphonersCount === 1 ? '' : 'а'}
              <br/>Задача хозяев: заполни метр единства до 100% или выгони всех сливщиков.
            </div>

            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 11, color: '#9E9E9E', marginBottom: 8, letterSpacing: 1 }}>
                СЛОЖНОСТЬ БОТОВ
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                {(Object.keys(DIFFICULTY_LABELS) as BotDifficulty[]).map(key => {
                  const d = DIFFICULTY_LABELS[key];
                  const isSelected = key === difficulty;
                  return (
                    <button key={key} onClick={() => setDifficulty(key)} style={{
                      background: isSelected ? `${d.color}22` : 'rgba(255,255,255,0.04)',
                      border: `2px solid ${isSelected ? d.color : 'rgba(255,255,255,0.1)'}`,
                      borderRadius: 8, padding: '8px 4px', cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                    }}>
                      <span style={{ fontSize: 18 }}>{d.emoji}</span>
                      <span style={{ fontSize: 9, color: isSelected ? d.color : '#9E9E9E', fontWeight: isSelected ? 'bold' : 'normal', lineHeight: 1.2 }}>{d.label}</span>
                      <span style={{ fontSize: 8, color: '#616161', lineHeight: 1.1 }}>{d.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div style={{
            width: '100%', maxWidth: 380,
            background: 'rgba(255,255,255,0.03)',
            borderRadius: 12, padding: '12px 14px', marginBottom: 16,
            fontSize: 11, color: '#757575', lineHeight: 1.6,
          }}>
            <div style={{ color: '#9E9E9E', fontWeight: 'bold', marginBottom: 6, fontSize: 11, letterSpacing: 1 }}>
              КАК ИГРАТЬ
            </div>
            🕹️ Двигайся джойстиком (или WASD на ПК)<br/>
            🅴 Кнопка E — взаимодействие с объектами<br/>
            🌯 Выполняй задачи → заполняй метр единства<br/>
            🔔 Подойди к арке и нажми E → вызвать сходку<br/>
            🗳️ На сходке голосуй за подозреваемых<br/>
            🪣 Сливщики: сливай баки и не попадайся!
          </div>

          <button style={{
            width: '100%', maxWidth: 380, padding: '14px',
            background: 'linear-gradient(135deg, #FF8F00 0%, #FFD54F 100%)',
            border: 'none', borderRadius: 16,
            fontSize: 14, fontWeight: 800, color: '#1A1A1A',
            cursor: 'pointer', letterSpacing: 1,
            boxShadow: '0 4px 18px rgba(255,152,0,0.5)',
            marginBottom: 8,
          }}>
            📅 Ежедневный вызов
            <span style={{ display: 'block', fontSize: 10, fontWeight: 400, opacity: 0.7, marginTop: 2 }}>
              Одинаковые роли для всех · войди в топ сегодня
            </span>
          </button>

          <button style={{
            width: '100%', maxWidth: 380, padding: '18px',
            background: 'linear-gradient(135deg, #FF5722 0%, #FF8A65 100%)',
            border: 'none', borderRadius: 16,
            fontSize: 18, fontWeight: 900, color: '#FFF',
            cursor: 'pointer', letterSpacing: 2,
            boxShadow: '0 6px 24px rgba(255,87,34,0.5)',
            textTransform: 'uppercase' as const,
            marginBottom: 10,
          }}>
            🎮 Играть (одиночная)
          </button>

          <button style={{
            width: '100%', maxWidth: 380, padding: '16px',
            background: 'rgba(33,150,243,0.15)',
            border: '2px solid rgba(33,150,243,0.5)',
            borderRadius: 16, fontSize: 16, fontWeight: 700, color: '#64B5F6',
            cursor: 'pointer', letterSpacing: 1,
            boxShadow: '0 4px 16px rgba(33,150,243,0.2)',
          }}>
            🌐 Мультиплеер (с друзьями)
          </button>

          <button style={{
            width: '100%', maxWidth: 380, padding: '12px 16px',
            background: 'linear-gradient(135deg, rgba(255,193,7,0.15) 0%, rgba(255,152,0,0.15) 100%)',
            border: '1.5px solid rgba(255,193,7,0.45)',
            borderRadius: 14, marginTop: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            cursor: 'pointer', gap: 10,
          }}>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#FFD700' }}>
                🎟️ Получить талоны на бензин
              </div>
              <div style={{ fontSize: 9, color: '#BDBDBD', marginTop: 2 }}>
                Зафиксируй цену АИ-95 на 3 месяца → @fuel_fuel_fuel_bot
              </div>
            </div>
            <div style={{ fontSize: 14, color: '#FFD700', flexShrink: 0 }}>→</div>
          </button>

          <div style={{
            width: '100%', maxWidth: 380,
            marginTop: 16, marginBottom: 8,
            background: 'rgba(255,87,34,0.08)',
            border: '1px solid rgba(255,87,34,0.25)',
            borderRadius: 10, padding: '8px 14px',
          }}>
            <div style={{ fontSize: 9, color: '#FF5722', letterSpacing: 1, marginBottom: 4, fontWeight: 'bold' }}>
              📰 СЕГОДНЯ В ЖК
            </div>
            <div style={{ fontSize: 11, color: '#BDBDBD', lineHeight: 1.5 }}>
              {LOBBY_FLAVOR_TEXTS[flavorIdx]}
            </div>
          </div>
        </>
      )}

      <div style={{ marginTop: 8, fontSize: 10, color: '#424242', textAlign: 'center' }}>
        ЖК «Цветочные Поляны», 2026 • @bakstab_bot
      </div>
    </div>
  );
}
