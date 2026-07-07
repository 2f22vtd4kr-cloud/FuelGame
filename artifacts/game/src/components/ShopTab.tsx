// §3.4 Cosmetics Shop Tab + §10.3 Telegram Stars purchase flow
import React, { useState } from 'react';
import { HATS, RARITY_COLORS, type HatDef } from '../data/cosmetics';
import { loadProfile, saveProfile } from '../game/profile';

interface Props {
  onProfileChange: () => void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        openInvoice: (slug: string, callback?: (status: string) => void) => void;
        initDataUnsafe?: { user?: { first_name?: string } };
      };
    };
  }
}

export default function ShopTab({ onProfileChange }: Props) {
  const [profile, setProfile] = useState(() => loadProfile());
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'owned' | 'babki' | 'stars'>('all');

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2500);
  }

  function refresh() {
    const p = loadProfile();
    setProfile(p);
    onProfileChange();
  }

  function equipHat(hatId: string) {
    const p = loadProfile();
    p.equippedHat = hatId;
    saveProfile(p);
    refresh();
    showToast(`Надета: ${HATS.find(h => h.id === hatId)?.name ?? hatId}`, true);
  }

  function buyWithBabki(hat: HatDef) {
    if (hat.cost > profile.babki) {
      showToast('Недостаточно бабок 💸', false);
      return;
    }
    const p = loadProfile();
    p.babki -= hat.cost;
    if (!p.purchasedHats.includes(hat.id)) p.purchasedHats.push(hat.id);
    p.equippedHat = hat.id;
    saveProfile(p);
    refresh();
    showToast(`Куплено: ${hat.name}!`, true);
  }

  async function buyWithStars(hat: HatDef) {
    // §10.3 Telegram Stars flow
    const tg = window.Telegram?.WebApp;
    if (!tg?.openInvoice) {
      showToast('Открой игру через Telegram для покупки ⭐', false);
      return;
    }

    const onPaid = () => {
      const p = loadProfile();
      if (!p.purchasedHats.includes(hat.id)) p.purchasedHats.push(hat.id);
      p.equippedHat = hat.id;
      saveProfile(p);
      refresh();
      showToast(`${hat.name} куплена за ⭐!`, true);
    };

    // Try to get a proper invoice link from the backend (§10.3)
    try {
      const res = await fetch('/api/stars/invoice', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemType: 'hat', itemId: hat.id, stars: hat.cost, name: hat.name }),
      });
      if (res.ok) {
        const { invoiceLink } = await res.json() as { invoiceLink: string };
        tg.openInvoice(invoiceLink, (status: string) => {
          if (status === 'paid') onPaid();
          else if (status === 'cancelled') showToast('Покупка отменена', false);
        });
        return;
      }
    } catch {
      // Backend unavailable — fall through to slug path
    }

    // Fallback: client-side slug (works only if Telegram resolves it)
    const slug = `hat_${hat.id}_${hat.cost}`;
    tg.openInvoice(slug, (status: string) => {
      if (status === 'paid') onPaid();
      else if (status === 'cancelled') showToast('Покупка отменена', false);
    });
  }

  const filteredHats = HATS.filter(hat => {
    if (selectedFilter === 'owned') return profile.purchasedHats.includes(hat.id);
    if (selectedFilter === 'babki') return hat.currency === 'babki';
    if (selectedFilter === 'stars') return hat.currency === 'stars';
    // hide battle pass hats unless unlocked (keep UI clean)
    if (hat.currency === 'free' && hat.battlePassTier !== undefined) {
      return profile.battlePassTier >= (hat.battlePassTier ?? 0) || profile.purchasedHats.includes(hat.id);
    }
    // §3.5 daily hats: only show if owned (they're earned via daily challenge, not purchasable)
    if (hat.currency === 'daily') return profile.purchasedHats.includes(hat.id);
    return true;
  });

  return (
    <div style={{ width: '100%', maxWidth: 380 }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 60, left: '50%', transform: 'translateX(-50%)',
          background: toast.ok ? 'rgba(76,175,80,0.92)' : 'rgba(244,67,54,0.92)',
          color: '#FFF', borderRadius: 10, padding: '8px 18px',
          fontSize: 13, fontWeight: 'bold', zIndex: 200,
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          whiteSpace: 'nowrap',
        }}>
          {toast.msg}
        </div>
      )}

      {/* Balance */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '8px 12px', marginBottom: 12,
        background: 'rgba(255,215,0,0.08)',
        border: '1px solid rgba(255,215,0,0.2)',
        borderRadius: 10,
      }}>
        <span style={{ fontSize: 13, color: '#FFD700', fontWeight: 'bold' }}>
          💰 {profile.babki} бабок
        </span>
        <span style={{ fontSize: 11, color: '#9E9E9E' }}>
          Надет: {HATS.find(h => h.id === profile.equippedHat)?.emoji ?? '😶'}{' '}
          {HATS.find(h => h.id === profile.equippedHat)?.name ?? 'Без шапки'}
        </span>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {(['all', 'owned', 'babki', 'stars'] as const).map(f => {
          const labels = { all: 'Все', owned: 'Мои', babki: '💰 Бабки', stars: '⭐ Stars' };
          return (
            <button key={f} onClick={() => setSelectedFilter(f)} style={{
              flex: 1, padding: '5px 4px', fontSize: 10, borderRadius: 8,
              background: selectedFilter === f ? 'rgba(255,87,34,0.2)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${selectedFilter === f ? 'rgba(255,87,34,0.5)' : 'rgba(255,255,255,0.1)'}`,
              color: selectedFilter === f ? '#FF5722' : '#9E9E9E',
              cursor: 'pointer', fontWeight: selectedFilter === f ? 'bold' : 'normal',
            }}>
              {labels[f]}
            </button>
          );
        })}
      </div>

      {/* Hat grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
        {filteredHats.map(hat => {
          const owned = profile.purchasedHats.includes(hat.id);
          const equipped = profile.equippedHat === hat.id;
          const rarityColor = RARITY_COLORS[hat.rarity];

          return (
            <div key={hat.id} style={{
              background: equipped
                ? 'rgba(255,87,34,0.15)'
                : owned
                  ? 'rgba(255,255,255,0.07)'
                  : 'rgba(255,255,255,0.03)',
              border: `1.5px solid ${equipped ? '#FF5722' : rarityColor + '66'}`,
              borderRadius: 12, padding: '10px 10px 8px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              transition: 'all 0.15s',
            }}>
              <div style={{ fontSize: 32 }}>{hat.emoji}</div>
              <div style={{
                fontSize: 11, color: '#FFF', fontWeight: 'bold',
                textAlign: 'center', lineHeight: 1.2,
              }}>
                {hat.name}
              </div>
              <div style={{ fontSize: 9, color: rarityColor, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {hat.rarity === 'common' ? 'обычная' : hat.rarity === 'rare' ? 'редкая' : hat.rarity === 'epic' ? 'эпичная' : 'легенд.'}
              </div>
              <div style={{ fontSize: 9, color: '#757575', textAlign: 'center', lineHeight: 1.3 }}>
                {hat.description}
              </div>

              {equipped ? (
                <div style={{
                  marginTop: 4, padding: '4px 10px',
                  background: 'rgba(255,87,34,0.3)',
                  border: '1px solid rgba(255,87,34,0.5)',
                  borderRadius: 6, fontSize: 9, color: '#FF5722', fontWeight: 'bold',
                }}>
                  ✓ Надета
                </div>
              ) : owned ? (
                <button
                  onClick={() => equipHat(hat.id)}
                  style={{
                    marginTop: 4, padding: '4px 10px',
                    background: 'rgba(76,175,80,0.2)',
                    border: '1px solid rgba(76,175,80,0.4)',
                    borderRadius: 6, fontSize: 9, color: '#81C784', cursor: 'pointer', fontWeight: 'bold',
                  }}
                >
                  Надеть
                </button>
              ) : hat.currency === 'babki' ? (
                <button
                  onClick={() => buyWithBabki(hat)}
                  disabled={hat.cost > profile.babki}
                  style={{
                    marginTop: 4, padding: '4px 10px',
                    background: hat.cost > profile.babki ? 'rgba(255,255,255,0.04)' : 'rgba(255,215,0,0.15)',
                    border: `1px solid ${hat.cost > profile.babki ? 'rgba(255,255,255,0.1)' : 'rgba(255,215,0,0.4)'}`,
                    borderRadius: 6, fontSize: 9,
                    color: hat.cost > profile.babki ? '#616161' : '#FFD700',
                    cursor: hat.cost > profile.babki ? 'not-allowed' : 'pointer',
                    fontWeight: 'bold',
                  }}
                >
                  💰 {hat.cost}
                </button>
              ) : hat.currency === 'stars' ? (
                <button
                  onClick={() => buyWithStars(hat)}
                  style={{
                    marginTop: 4, padding: '4px 10px',
                    background: 'rgba(100,181,246,0.12)',
                    border: '1px solid rgba(100,181,246,0.35)',
                    borderRadius: 6, fontSize: 9, color: '#64B5F6', cursor: 'pointer', fontWeight: 'bold',
                  }}
                >
                  ⭐ {hat.cost}
                </button>
              ) : hat.currency === 'fuel_linked' ? (
                <div style={{ fontSize: 8, color: '#FF9800', marginTop: 4, textAlign: 'center' }}>
                  🔗 @fuel_fuel_bot
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* §10.3 Stars info */}
      <div style={{
        marginTop: 14, padding: '8px 12px',
        background: 'rgba(100,181,246,0.06)',
        border: '1px solid rgba(100,181,246,0.15)',
        borderRadius: 10, fontSize: 10, color: '#607D8B', lineHeight: 1.5,
      }}>
        ⭐ Покупки за Telegram Stars доступны в приложении Telegram.
        Открой игру через @bakstab_bot для оплаты.
      </div>
    </div>
  );
}
