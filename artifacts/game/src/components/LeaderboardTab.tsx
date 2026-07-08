// §9.3 Leaderboard Tab — Season (all-time) | Today (daily SP) | Nearby
import React, { useEffect, useState } from 'react';
import { CHARACTERS } from '../data/characters';
import { getMoscowDateString } from '../game/state';

interface AllTimeEntry {
  id: number;
  playerName: string;
  character: string | null;
  babki: number;
  wins: number;
  matches: number;
  deviceId: string | null;
}

interface DailyEntry {
  rank: number;
  userId: number;
  score: number;
  matchesPlayed: number;
  displayName: string | null;
  preferredCharacter: string | null;
}

type Tab = 'season' | 'today' | 'nearby';

interface Props {
  myDeviceId: string;
}

export default function LeaderboardTab({ myDeviceId }: Props) {
  const [tab, setTab] = useState<Tab>('season');
  const [allTime, setAllTime] = useState<AllTimeEntry[]>([]);
  const [daily, setDaily] = useState<DailyEntry[]>([]);
  const [loadingSeason, setLoadingSeason] = useState(false);
  const [loadingDaily, setLoadingDaily] = useState(false);
  const [errorSeason, setErrorSeason] = useState('');
  const [errorDaily, setErrorDaily] = useState('');

  useEffect(() => {
    if ((tab === 'season' || tab === 'nearby') && allTime.length === 0) {
      setLoadingSeason(true);
      setErrorSeason('');
      fetch('/api/leaderboard')
        .then(r => r.json())
        .then(data => { setAllTime(data.entries ?? []); setLoadingSeason(false); })
        .catch(() => { setErrorSeason('Нет соединения с сервером'); setLoadingSeason(false); });
    }
    if (tab === 'today' && daily.length === 0) {
      setLoadingDaily(true);
      setErrorDaily('');
      const today = getMoscowDateString();
      fetch(`/api/leaderboard/daily?date=${today}`)
        .then(r => r.json())
        .then(data => { setDaily(data.entries ?? []); setLoadingDaily(false); })
        .catch(() => { setErrorDaily('Нет соединения с сервером'); setLoadingDaily(false); });
    }
  }, [tab]);

  const myRank = allTime.findIndex(e => e.deviceId === myDeviceId);
  const nearbyEntries = myRank >= 0
    ? allTime.slice(Math.max(0, myRank - 3), Math.min(allTime.length, myRank + 4))
    : allTime.slice(0, 7);

  const TABS: { id: Tab; label: string }[] = [
    { id: 'season', label: '🏆 Сезон' },
    { id: 'today',  label: '📅 Сегодня' },
    { id: 'nearby', label: '👥 Рядом' },
  ];

  const loading = tab === 'today' ? loadingDaily : loadingSeason;
  const error = tab === 'today' ? errorDaily : errorSeason;

  return (
    <div style={{ width: '100%', maxWidth: 380 }}>
      {/* Tab strip */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1, padding: '7px 0', borderRadius: 8, border: 'none',
              fontSize: 11, fontWeight: tab === t.id ? 'bold' : 'normal',
              cursor: 'pointer',
              background: tab === t.id ? 'rgba(255,87,34,0.25)' : 'rgba(255,255,255,0.06)',
              color: tab === t.id ? '#FF8A65' : '#9E9E9E',
              transition: 'all 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Subheader */}
      <div style={{ fontSize: 10, color: '#607D8B', letterSpacing: 1, marginBottom: 10, textAlign: 'center' }}>
        {tab === 'season' && '💰 Всего бабок за все время · Топ-20'}
        {tab === 'today'  && `⚡ Ежедневный вызов · ${getMoscowDateString()}`}
        {tab === 'nearby' && '👀 Соседи рядом с тобой в рейтинге'}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', color: '#607D8B', fontSize: 13, padding: 24 }}>Загрузка...</div>
      )}
      {error && (
        <div style={{ textAlign: 'center', color: '#EF5350', fontSize: 12, padding: 16 }}>{error}</div>
      )}

      {/* ── Season / Nearby (allTime data) ── */}
      {!loading && !error && (tab === 'season' || tab === 'nearby') && (() => {
        const list = tab === 'nearby' ? nearbyEntries : allTime;
        if (list.length === 0) return (
          <div style={{ textAlign: 'center', color: '#607D8B', fontSize: 12, padding: 24, lineHeight: 1.6 }}>
            Рейтинг пуст.<br />Сыграй матч, чтобы попасть в список!
          </div>
        );
        return (
          <>
            {tab === 'nearby' && myRank === -1 && (
              <div style={{ marginBottom: 10, padding: '7px 10px', background: 'rgba(255,87,34,0.08)', border: '1px solid rgba(255,87,34,0.2)', borderRadius: 10, fontSize: 11, color: '#FF8A65', textAlign: 'center' }}>
                Сыграй матч, чтобы появиться рядом с другими!
              </div>
            )}
            {list.map((entry) => {
              const globalIdx = allTime.findIndex(e => e.id === entry.id);
              const i = globalIdx >= 0 ? globalIdx : 0;
              const isMe = entry.deviceId === myDeviceId;
              const charKey = entry.character as keyof typeof CHARACTERS;
              const charEmoji = CHARACTERS[charKey]?.emoji ?? '👤';
              const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
              return (
                <div key={entry.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px', marginBottom: 4,
                  background: isMe ? 'rgba(255,215,0,0.12)' : i < 3 ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
                  border: isMe ? '1px solid rgba(255,215,0,0.35)' : '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 10,
                }}>
                  <div style={{ fontSize: i < 3 ? 18 : 13, width: 28, textAlign: 'center', flexShrink: 0, color: i < 3 ? '#FFF' : '#616161', fontWeight: 'bold' }}>
                    {medal}
                  </div>
                  <div style={{ fontSize: 22, flexShrink: 0 }}>{charEmoji}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: isMe ? '#FFD700' : '#FFF', fontWeight: isMe ? 'bold' : 'normal', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {entry.playerName}{isMe ? ' (ты)' : ''}
                    </div>
                    <div style={{ fontSize: 9, color: '#757575', marginTop: 2 }}>
                      {entry.matches} матч{entry.matches === 1 ? '' : entry.matches < 5 ? 'а' : 'ей'} · {entry.wins} побед{entry.wins === 1 ? 'а' : entry.wins < 5 ? 'ы' : ''}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 'bold', color: i === 0 ? '#FFD700' : i === 1 ? '#E0E0E0' : i === 2 ? '#CD7F32' : '#FFF', flexShrink: 0 }}>
                    💰{entry.babki}
                  </div>
                </div>
              );
            })}
            {myRank === -1 && tab === 'season' && allTime.length > 0 && (
              <div style={{ marginTop: 10, padding: '8px 10px', background: 'rgba(255,87,34,0.08)', border: '1px solid rgba(255,87,34,0.2)', borderRadius: 10, fontSize: 11, color: '#FF8A65', textAlign: 'center' }}>
                Сыграй матч, чтобы попасть в рейтинг!
              </div>
            )}
          </>
        );
      })()}

      {/* ── Today (daily SP leaderboard) ── */}
      {!loading && !error && tab === 'today' && (() => {
        if (daily.length === 0) return (
          <div style={{ textAlign: 'center', color: '#607D8B', fontSize: 12, padding: 24, lineHeight: 1.8 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📅</div>
            <div style={{ fontWeight: 'bold', color: '#FF8A65', marginBottom: 6 }}>Ежедневный вызов</div>
            Сегодня ещё никто не записал результат.<br />
            Нажми <strong>«Ежедневный вызов»</strong> в меню —<br />
            все игроки в этот день получают те же роли!
          </div>
        );
        return (
          <>
            <div style={{ marginBottom: 8, padding: '6px 10px', background: 'rgba(255,152,0,0.1)', border: '1px solid rgba(255,152,0,0.25)', borderRadius: 8, fontSize: 10, color: '#FFB74D', textAlign: 'center' }}>
              ⚡ Одинаковые роли и раскладка для всех · сброс в 00:00 МСК
            </div>
            {daily.map((entry) => {
              const charKey = (entry.preferredCharacter ?? 'denis') as keyof typeof CHARACTERS;
              const charEmoji = CHARACTERS[charKey]?.emoji ?? '👤';
              const medal = entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `${entry.rank}.`;
              const totalSecs = Math.round(entry.score);
              const mins = Math.floor(totalSecs / 60);
              const secs = totalSecs % 60;
              const timeStr = `${mins}:${String(secs).padStart(2, '0')}`;
              return (
                <div key={entry.userId} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px', marginBottom: 4,
                  background: entry.rank <= 3 ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 10,
                }}>
                  <div style={{ fontSize: entry.rank <= 3 ? 18 : 13, width: 28, textAlign: 'center', flexShrink: 0, fontWeight: 'bold', color: entry.rank <= 3 ? '#FFF' : '#616161' }}>
                    {medal}
                  </div>
                  <div style={{ fontSize: 22, flexShrink: 0 }}>{charEmoji}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: '#FFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {entry.displayName ?? 'Аноним'}
                    </div>
                    <div style={{ fontSize: 9, color: '#757575', marginTop: 2 }}>
                      {entry.matchesPlayed} попытк{entry.matchesPlayed === 1 ? 'а' : entry.matchesPlayed < 5 ? 'и' : ''}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 'bold', color: entry.rank === 1 ? '#FFD700' : entry.rank === 2 ? '#E0E0E0' : entry.rank === 3 ? '#CD7F32' : '#FF8A65', flexShrink: 0 }}>
                    ⏱{timeStr}
                  </div>
                </div>
              );
            })}
          </>
        );
      })()}
    </div>
  );
}
