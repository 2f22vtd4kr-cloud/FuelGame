// §3.4 Cosmetics Shop Tab + §10.3 Telegram Stars purchase flow
// Propaganda Pop visual design — black borders, cream/red/mustard palette
import React, { useState } from 'react';
import { HATS, PETS, CAR_SKINS, RARITY_COLORS, type HatDef, type PetDef, type CarSkinDef } from '../data/cosmetics';
import { loadProfile, saveProfile, XP_PER_TIER } from '../game/profile';
import { unlockAchievementNow } from '../game/rewards';
import { syncInventoryItem } from '../game/sync';

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

type ShopSection = 'hats' | 'pets' | 'cars' | 'battlepass';

const PREMIUM_PASS_COST_STARS = 150;

// ── Propaganda design tokens ────────────────────────────────────────────────
const P_RED    = '#cc2b1d';
const P_MUSTARD= '#e5a50a';
const P_CREAM  = '#f4ebd0';
const P_BLACK  = '#1a1a1a';

export default function ShopTab({ onProfileChange }: Props) {
  const [profile, setProfile] = useState(() => loadProfile());
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [section, setSection] = useState<ShopSection>('hats');
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

  // ── Hats ─────────────────────────────────────────────────────────────────────

  function equipHat(hatId: string) {
    const p = loadProfile();
    p.equippedHat = hatId;
    saveProfile(p);
    refresh();
    syncInventoryItem('hat', hatId, true);
    showToast(`Надета: ${HATS.find(h => h.id === hatId)?.name ?? hatId}`, true);
  }

  function buyWithBabki(hat: HatDef) {
    if (hat.cost > profile.babki) { showToast('Недостаточно бабок 💸', false); return; }
    const p = loadProfile();
    p.babki -= hat.cost;
    if (!p.purchasedHats.includes(hat.id)) p.purchasedHats.push(hat.id);
    p.equippedHat = hat.id;
    saveProfile(p);
    refresh();
    syncInventoryItem('hat', hat.id, true);
    showToast(`Куплено: ${hat.name}!`, true);
  }

  async function buyWithStars(itemType: 'hat' | 'pet' | 'car', item: HatDef | PetDef | CarSkinDef) {
    const tg = window.Telegram?.WebApp;
    if (!tg?.openInvoice) { showToast('Открой игру через Telegram для покупки ⭐', false); return; }

    const onPaid = () => {
      const p = loadProfile();
      if (itemType === 'hat') {
        if (!p.purchasedHats.includes(item.id)) p.purchasedHats.push(item.id);
        p.equippedHat = item.id;
      } else if (itemType === 'pet') {
        if (!p.purchasedPets.includes(item.id)) p.purchasedPets.push(item.id);
        p.equippedPet = item.id;
      } else {
        if (!p.purchasedCarSkins.includes(item.id)) p.purchasedCarSkins.push(item.id);
        p.equippedCarSkin = item.id;
      }
      saveProfile(p);
      refresh();
      syncInventoryItem(itemType, item.id, true);
      showToast(`${item.name} куплена за ⭐!`, true);
    };

    try {
      const res = await fetch('/api/stars/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemType, itemId: item.id, stars: item.cost, name: item.name }),
      });
      if (res.ok) {
        const { invoiceLink } = await res.json() as { invoiceLink: string };
        tg.openInvoice(invoiceLink, (status: string) => {
          if (status === 'paid') onPaid();
          else if (status === 'cancelled') showToast('Покупка отменена', false);
        });
        return;
      }
    } catch { /* fall through */ }

    tg.openInvoice(`${itemType}_${item.id}_${item.cost}`, (status: string) => {
      if (status === 'paid') onPaid();
      else if (status === 'cancelled') showToast('Покупка отменена', false);
    });
  }

  // ── Pets ─────────────────────────────────────────────────────────────────────

  function equipPet(petId: string) {
    const p = loadProfile();
    p.equippedPet = petId;
    saveProfile(p);
    refresh();
    syncInventoryItem('pet', petId, true);
    showToast(`Питомец: ${PETS.find(pt => pt.id === petId)?.name ?? petId}`, true);
  }

  function buyPetWithBabki(pet: PetDef) {
    if (pet.cost > profile.babki) { showToast('Недостаточно бабок 💸', false); return; }
    const p = loadProfile();
    p.babki -= pet.cost;
    if (!p.purchasedPets.includes(pet.id)) p.purchasedPets.push(pet.id);
    p.equippedPet = pet.id;
    saveProfile(p);
    refresh();
    syncInventoryItem('pet', pet.id, true);
    showToast(`Питомец «${pet.name}» куплен!`, true);
  }

  // ── Car Skins ─────────────────────────────────────────────────────────────────

  function equipCarSkin(skinId: string) {
    const p = loadProfile();
    p.equippedCarSkin = skinId;
    saveProfile(p);
    refresh();
    syncInventoryItem('car', skinId, true);
    showToast(`Скин: ${CAR_SKINS.find(s => s.id === skinId)?.name ?? skinId}`, true);
  }

  function buyCarSkinWithBabki(skin: CarSkinDef) {
    if (skin.cost > profile.babki) { showToast('Недостаточно бабок 💸', false); return; }
    const p = loadProfile();
    p.babki -= skin.cost;
    if (!p.purchasedCarSkins.includes(skin.id)) p.purchasedCarSkins.push(skin.id);
    p.equippedCarSkin = skin.id;
    saveProfile(p);
    refresh();
    syncInventoryItem('car', skin.id, true);
    showToast(`Скин «${skin.name}» куплен!`, true);
  }

  // §3.3 Battle Pass premium purchase
  async function buyPremiumPass() {
    const tg = window.Telegram?.WebApp;
    const onPaid = () => {
      const p = loadProfile();
      p.battlePassPremium = true;
      saveProfile(p);
      refresh();
      showToast('Премиум Боевой Пропуск активирован! 💎', true);
    };

    if (!tg?.openInvoice) {
      onPaid();
      return;
    }

    try {
      const res = await fetch('/api/stars/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemType: 'battlepass', itemId: 'premium_pass', stars: PREMIUM_PASS_COST_STARS, name: 'Премиум Боевой Пропуск' }),
      });
      if (res.ok) {
        const { invoiceLink } = await res.json() as { invoiceLink: string };
        tg.openInvoice(invoiceLink, (status: string) => {
          if (status === 'paid') onPaid();
          else if (status === 'cancelled') showToast('Покупка отменена', false);
        });
        return;
      }
    } catch { /* fall through */ }

    tg.openInvoice(`battlepass_premium_pass_${PREMIUM_PASS_COST_STARS}`, (status: string) => {
      if (status === 'paid') onPaid();
      else if (status === 'cancelled') showToast('Покупка отменена', false);
    });
  }

  // §3.6 "Талоновед" achievement stub
  function linkFuelBot() {
    const p = loadProfile();
    if (p.fuelBotLinked) return;
    p.fuelBotLinked = true;
    if (!p.purchasedHats.includes('golden_talono')) p.purchasedHats.push('golden_talono');
    if (!p.purchasedCarSkins.includes('golden_moskvich')) p.purchasedCarSkins.push('golden_moskvich');
    if (!p.purchasedPets.includes('barsik_pet')) p.purchasedPets.push('barsik_pet');
    saveProfile(p);
    syncInventoryItem('hat', 'golden_talono', false);
    syncInventoryItem('car', 'golden_moskvich', false);
    syncInventoryItem('pet', 'barsik_pet', false);
    unlockAchievementNow('fuel_linked');
    refresh();
    showToast('Аккаунт привязан! Золотой Москвич и бонусы разблокированы 🥇', true);
  }

  // ── Filtering ─────────────────────────────────────────────────────────────────

  const filteredHats = HATS.filter(hat => {
    if (selectedFilter === 'owned') return profile.purchasedHats.includes(hat.id);
    if (selectedFilter === 'babki') return hat.currency === 'babki';
    if (selectedFilter === 'stars') return hat.currency === 'stars';
    if (hat.currency === 'free' && hat.battlePassTier !== undefined) {
      const tierReached = profile.battlePassTier >= (hat.battlePassTier ?? 0);
      const unlocked = hat.premiumOnly ? tierReached && profile.battlePassPremium : tierReached;
      return unlocked || profile.purchasedHats.includes(hat.id);
    }
    if (hat.currency === 'daily') return profile.purchasedHats.includes(hat.id);
    return true;
  });

  const filteredPets = PETS.filter(pet => {
    if (selectedFilter === 'owned') return profile.purchasedPets.includes(pet.id);
    if (selectedFilter === 'babki') return pet.currency === 'babki';
    if (selectedFilter === 'stars') return pet.currency === 'stars';
    if (pet.currency === 'free' && pet.battlePassTier !== undefined) {
      const tierReached = profile.battlePassTier >= (pet.battlePassTier ?? 0);
      const unlocked = pet.premiumOnly ? tierReached && profile.battlePassPremium : tierReached;
      return unlocked || profile.purchasedPets.includes(pet.id);
    }
    if (pet.currency === 'daily') return profile.purchasedPets.includes(pet.id);
    return true;
  });

  const filteredCars = CAR_SKINS.filter(skin => {
    if (selectedFilter === 'owned') return profile.purchasedCarSkins.includes(skin.id);
    if (selectedFilter === 'babki') return skin.currency === 'babki';
    if (selectedFilter === 'stars') return skin.currency === 'stars';
    return true;
  });

  // ── Propaganda action button ──────────────────────────────────────────────────

  function ActionButton({
    owned, equipped, currency, cost, onEquip, onBuyBabki, onBuyStars, babelKi,
  }: {
    owned: boolean; equipped: boolean; currency: string; cost: number;
    onEquip: () => void; onBuyBabki?: () => void; onBuyStars?: () => void; babelKi: number;
  }) {
    const base: React.CSSProperties = {
      marginTop: 6, padding: '5px 10px',
      border: `2px solid ${P_BLACK}`,
      fontSize: 9, fontWeight: 900, cursor: 'pointer',
      letterSpacing: 0.5, textTransform: 'uppercase',
      fontFamily: 'Oswald, sans-serif',
      display: 'inline-block', width: '100%',
    };
    if (equipped) return (
      <div style={{ ...base, background: P_RED, color: P_CREAM, borderColor: P_BLACK, cursor: 'default', textAlign: 'center' }}>
        ✓ ВЫБРАНО
      </div>
    );
    if (owned) return (
      <button onClick={onEquip} style={{ ...base, background: P_MUSTARD, color: P_BLACK, boxShadow: `2px 2px 0 ${P_BLACK}`, textAlign: 'center' }}>
        ВЫБРАТЬ
      </button>
    );
    if (currency === 'babki') return (
      <button onClick={onBuyBabki} disabled={cost > babelKi} style={{
        ...base, textAlign: 'center',
        background: cost > babelKi ? '#eee' : P_BLACK,
        color: cost > babelKi ? '#aaa' : P_MUSTARD,
        boxShadow: cost > babelKi ? 'none' : `2px 2px 0 ${P_RED}`,
        cursor: cost > babelKi ? 'not-allowed' : 'pointer',
      }}>
        💰 {cost}
      </button>
    );
    if (currency === 'stars') return (
      <button onClick={onBuyStars} style={{ ...base, background: P_BLACK, color: '#64B5F6', boxShadow: `2px 2px 0 ${P_MUSTARD}`, textAlign: 'center' }}>
        ⭐ {cost}
      </button>
    );
    if (currency === 'fuel_linked') return (
      <button onClick={linkFuelBot} style={{ ...base, background: P_MUSTARD, color: P_BLACK, boxShadow: `2px 2px 0 ${P_BLACK}`, textAlign: 'center' }}>
        🔗 ПРИВЯЗАТЬ
      </button>
    );
    return null;
  }

  // ── Propaganda card ─────────────────────────────────────────────────────────

  const RARITY_LABELS: Record<string, string> = { common: 'обычная', rare: 'редкая', epic: 'эпичная', legendary: 'легенд.' };

  const cardStyle = (equipped: boolean, owned: boolean, rarityColor: string): React.CSSProperties => ({
    background: equipped ? P_RED : owned ? P_CREAM : '#fff',
    border: `2px solid ${equipped ? P_BLACK : P_BLACK}`,
    boxShadow: equipped
      ? `3px 3px 0 ${P_BLACK}`
      : owned
      ? `3px 3px 0 ${P_MUSTARD}`
      : `3px 3px 0 rgba(0,0,0,0.15)`,
    padding: '10px 8px 8px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
    borderLeft: `4px solid ${equipped ? P_MUSTARD : rarityColor}`,
  });

  const SECTION_TABS: { id: ShopSection; label: string }[] = [
    { id: 'hats',       label: '🧢 Шапки'   },
    { id: 'pets',       label: '🐾 Питомцы'  },
    { id: 'cars',       label: '🚗 Авто'     },
    { id: 'battlepass', label: '🎫 Пропуск'  },
  ];
  const FILTER_TABS: { id: 'all'|'owned'|'babki'|'stars'; label: string }[] = [
    { id: 'all',   label: 'Все'     },
    { id: 'owned', label: 'Мои'     },
    { id: 'babki', label: '💰 Бабки' },
    { id: 'stars', label: '⭐ Stars' },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ width: '100%', background: P_CREAM, fontFamily: 'Oswald, sans-serif' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 60, left: '50%', transform: 'translateX(-50%)',
          background: toast.ok ? P_BLACK : P_RED,
          color: P_CREAM,
          border: `3px solid ${toast.ok ? P_MUSTARD : P_BLACK}`,
          padding: '8px 18px',
          fontSize: 13, fontWeight: 900, zIndex: 200,
          boxShadow: `4px 4px 0 ${P_BLACK}`, whiteSpace: 'nowrap',
          letterSpacing: 1, textTransform: 'uppercase',
        }}>
          {toast.msg}
        </div>
      )}

      {/* Balance bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '8px 12px',
        background: P_MUSTARD,
        borderBottom: `4px solid ${P_BLACK}`,
      }}>
        <span style={{ fontSize: 15, color: P_BLACK, fontWeight: 900, letterSpacing: 1 }}>
          💰 {profile.babki} БАБОК
        </span>
        <span style={{ fontSize: 11, color: P_BLACK, fontWeight: 700 }}>
          {HATS.find(h => h.id === profile.equippedHat)?.emoji ?? '😶'}{' '}
          {PETS.find(p => p.id === profile.equippedPet)?.emoji ?? '—'}{' '}
          {CAR_SKINS.find(s => s.id === profile.equippedCarSkin)?.emoji ?? '🚗'}
        </span>
      </div>

      {/* Section tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderBottom: `4px solid ${P_BLACK}` }}>
        {SECTION_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setSection(tab.id)}
            style={{
              padding: '8px 4px', fontSize: 10, fontWeight: 900,
              background: section === tab.id ? P_RED : '#fff',
              color: section === tab.id ? P_CREAM : P_BLACK,
              border: 'none',
              borderRight: `2px solid ${P_BLACK}`,
              cursor: 'pointer', letterSpacing: 0.5,
              textTransform: 'uppercase',
              fontFamily: 'Oswald, sans-serif',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '12px' }}>
        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
          {FILTER_TABS.map(f => (
            <button
              key={f.id}
              onClick={() => setSelectedFilter(f.id)}
              style={{
                flex: 1, padding: '5px 4px', fontSize: 9, fontWeight: 900,
                background: selectedFilter === f.id ? P_BLACK : '#fff',
                color: selectedFilter === f.id ? P_MUSTARD : P_BLACK,
                border: `2px solid ${P_BLACK}`,
                boxShadow: selectedFilter === f.id ? `2px 2px 0 ${P_RED}` : 'none',
                cursor: 'pointer', textTransform: 'uppercase',
                fontFamily: 'Oswald, sans-serif',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* ── Hats grid ── */}
        {section === 'hats' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {filteredHats.map(hat => {
              const tierUnlocked = hat.currency === 'free' && hat.battlePassTier !== undefined &&
                (hat.premiumOnly
                  ? profile.battlePassTier >= hat.battlePassTier && profile.battlePassPremium
                  : profile.battlePassTier >= hat.battlePassTier);
              const owned = profile.purchasedHats.includes(hat.id) || tierUnlocked;
              const equipped = profile.equippedHat === hat.id;
              const rarityColor = RARITY_COLORS[hat.rarity];
              return (
                <div key={hat.id} style={cardStyle(equipped, owned, rarityColor)}>
                  <div style={{ fontSize: 30 }}>{hat.emoji}</div>
                  <div style={{
                    fontSize: 10, color: equipped ? P_CREAM : P_BLACK,
                    fontWeight: 900, textAlign: 'center', lineHeight: 1.2,
                    textTransform: 'uppercase', letterSpacing: 0.3,
                  }}>{hat.name}</div>
                  <div style={{ fontSize: 8, color: rarityColor, fontWeight: 700, textTransform: 'uppercase' }}>
                    {RARITY_LABELS[hat.rarity]}
                  </div>
                  <div style={{ fontSize: 9, color: equipped ? 'rgba(255,255,255,0.7)' : '#666', textAlign: 'center', lineHeight: 1.3 }}>
                    {hat.description}
                  </div>
                  <ActionButton
                    owned={owned} equipped={equipped} currency={hat.currency} cost={hat.cost}
                    babelKi={profile.babki}
                    onEquip={() => equipHat(hat.id)}
                    onBuyBabki={() => buyWithBabki(hat)}
                    onBuyStars={() => buyWithStars('hat', hat)}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* ── Pets grid ── */}
        {section === 'pets' && (
          <>
            <div style={{ fontSize: 10, color: '#555', marginBottom: 10, lineHeight: 1.4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              🐾 Питомцы бегают рядом с тобой во дворе. Видны тебе и команде.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {filteredPets.map(pet => {
                const tierUnlocked = pet.currency === 'free' && pet.battlePassTier !== undefined &&
                  (pet.premiumOnly
                    ? profile.battlePassTier >= pet.battlePassTier && profile.battlePassPremium
                    : profile.battlePassTier >= pet.battlePassTier);
                const owned = profile.purchasedPets.includes(pet.id) || tierUnlocked;
                const equipped = profile.equippedPet === pet.id;
                const rarityColor = RARITY_COLORS[pet.rarity];
                return (
                  <div key={pet.id} style={cardStyle(equipped, owned, rarityColor)}>
                    <div style={{ fontSize: 30 }}>{pet.emoji}</div>
                    <div style={{
                      fontSize: 10, color: equipped ? P_CREAM : P_BLACK,
                      fontWeight: 900, textAlign: 'center', lineHeight: 1.2,
                      textTransform: 'uppercase', letterSpacing: 0.3,
                    }}>{pet.name}</div>
                    <div style={{ fontSize: 8, color: rarityColor, fontWeight: 700, textTransform: 'uppercase' }}>
                      {RARITY_LABELS[pet.rarity]}
                    </div>
                    <div style={{ fontSize: 9, color: equipped ? 'rgba(255,255,255,0.7)' : '#666', textAlign: 'center', lineHeight: 1.3, fontStyle: 'italic' }}>
                      «{pet.animation}»
                    </div>
                    <ActionButton
                      owned={owned} equipped={equipped} currency={pet.currency} cost={pet.cost}
                      babelKi={profile.babki}
                      onEquip={() => equipPet(pet.id)}
                      onBuyBabki={() => buyPetWithBabki(pet)}
                      onBuyStars={() => buyWithStars('pet', pet)}
                    />
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ── Car Skins grid ── */}
        {section === 'cars' && (
          <>
            <div style={{ fontSize: 10, color: '#555', marginBottom: 10, lineHeight: 1.4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              🚗 Скины применяются к твоей машине в следующем матче.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {filteredCars.map(skin => {
                const owned = profile.purchasedCarSkins.includes(skin.id);
                const equipped = profile.equippedCarSkin === skin.id;
                const rarityColor = RARITY_COLORS[skin.rarity];
                return (
                  <div key={skin.id} style={cardStyle(equipped, owned, rarityColor)}>
                    <div style={{
                      width: 44, height: 26, borderRadius: 3,
                      background: skin.color, border: `2px solid ${P_BLACK}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16, boxShadow: `2px 2px 0 ${P_BLACK}`,
                    }}>
                      {skin.emoji}
                    </div>
                    <div style={{
                      fontSize: 10, color: equipped ? P_CREAM : P_BLACK,
                      fontWeight: 900, textAlign: 'center', lineHeight: 1.2,
                      textTransform: 'uppercase', letterSpacing: 0.3,
                    }}>{skin.name}</div>
                    <div style={{ fontSize: 8, color: rarityColor, fontWeight: 700, textTransform: 'uppercase' }}>
                      {RARITY_LABELS[skin.rarity]}
                    </div>
                    <div style={{ fontSize: 9, color: equipped ? 'rgba(255,255,255,0.7)' : '#666', textAlign: 'center', lineHeight: 1.3 }}>
                      {skin.description}
                    </div>
                    <ActionButton
                      owned={owned} equipped={equipped} currency={skin.currency} cost={skin.cost}
                      babelKi={profile.babki}
                      onEquip={() => equipCarSkin(skin.id)}
                      onBuyBabki={() => buyCarSkinWithBabki(skin)}
                      onBuyStars={() => buyWithStars('car', skin)}
                    />
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ── §3.3 Battle Pass tab ── */}
        {section === 'battlepass' && (() => {
          const xpIntoTier = profile.battlePassXP - profile.battlePassTier * XP_PER_TIER;
          const tierPct = Math.min(100, Math.round((xpIntoTier / XP_PER_TIER) * 100));
          const maxed = profile.battlePassTier >= 50;
          const upcoming = [...HATS, ...PETS]
            .filter((item): item is (HatDef | PetDef) & { battlePassTier: number } => item.battlePassTier !== undefined)
            .sort((a, b) => a.battlePassTier - b.battlePassTier);

          return (
            <div>
              {/* XP bar */}
              <div style={{
                padding: '14px', marginBottom: 12,
                background: '#fff', border: `4px solid ${P_BLACK}`,
                boxShadow: `4px 4px 0 ${P_MUSTARD}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 900, color: P_BLACK, textTransform: 'uppercase' }}>
                    🎫 Уровень {profile.battlePassTier}/50
                  </span>
                  <span style={{ fontSize: 10, color: profile.battlePassPremium ? '#1565C0' : '#888', fontWeight: 900 }}>
                    {profile.battlePassPremium ? '💎 Премиум' : 'Базовый'}
                  </span>
                </div>
                <div style={{ width: '100%', height: 14, background: P_BLACK, overflow: 'hidden', position: 'relative' }}>
                  <div style={{
                    width: `${maxed ? 100 : tierPct}%`, height: '100%',
                    background: `linear-gradient(90deg, ${P_RED}, ${P_MUSTARD})`,
                    transition: 'width 0.4s',
                  }} />
                  <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', paddingLeft: 6, fontSize: 9, fontWeight: 900, color: P_CREAM }}>
                    {maxed ? 'МАКСИМУМ!' : `${xpIntoTier} / ${XP_PER_TIER} XP`}
                  </span>
                </div>
              </div>

              {!profile.battlePassPremium && (
                <button onClick={buyPremiumPass} style={{
                  width: '100%', padding: '12px', marginBottom: 14,
                  background: P_BLACK, border: `4px solid ${P_BLACK}`,
                  boxShadow: `4px 4px 0 ${P_RED}`,
                  fontSize: 13, fontWeight: 900, color: P_MUSTARD,
                  cursor: 'pointer', textTransform: 'uppercase',
                  fontFamily: 'Oswald, sans-serif', letterSpacing: 1,
                }}>
                  💎 Купить Премиум — ⭐ {PREMIUM_PASS_COST_STARS}
                </button>
              )}

              <div style={{ fontSize: 9, color: '#666', marginBottom: 10, lineHeight: 1.5, fontWeight: 700, textTransform: 'uppercase' }}>
                Бесплатная линия открывает часть наград. Премиум — эксклюзивные шапки и питомцев.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {upcoming.map(item => {
                  const reached = profile.battlePassTier >= item.battlePassTier;
                  const unlocked = item.premiumOnly ? reached && profile.battlePassPremium : reached;
                  return (
                    <div key={item.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 10px',
                      background: unlocked ? P_MUSTARD : '#fff',
                      border: `2px solid ${P_BLACK}`,
                      boxShadow: unlocked ? `2px 2px 0 ${P_BLACK}` : 'none',
                    }}>
                      <div style={{ width: 28, textAlign: 'center', fontSize: 11, fontWeight: 900, color: reached ? P_RED : '#aaa' }}>
                        {item.battlePassTier}
                      </div>
                      <div style={{ fontSize: 20 }}>{item.emoji}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, color: P_BLACK, fontWeight: 900, textTransform: 'uppercase' }}>{item.name}</div>
                        <div style={{ fontSize: 9, color: item.premiumOnly ? '#1565C0' : '#2e7d32', fontWeight: 700, textTransform: 'uppercase' }}>
                          {item.premiumOnly ? '💎 Премиум' : '🆓 Бесплатно'}
                        </div>
                      </div>
                      <div style={{ fontSize: 14 }}>{unlocked ? '✅' : '🔒'}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Stars info footer */}
        <div style={{
          marginTop: 14, padding: '8px 12px',
          background: P_BLACK, border: `2px solid ${P_BLACK}`,
          fontSize: 10, color: P_CREAM, lineHeight: 1.5, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: 0.5,
        }}>
          ⭐ Покупки за Stars — только в Telegram: @bakstab_bot
        </div>
      </div>
    </div>
  );
}
