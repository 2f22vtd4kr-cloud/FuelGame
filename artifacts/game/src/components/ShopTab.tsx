// §3.4 Cosmetics Shop Tab + §10.3 Telegram Stars purchase flow
import React, { useState } from 'react';
import { HATS, PETS, CAR_SKINS, RARITY_COLORS, type HatDef, type PetDef, type CarSkinDef } from '../data/cosmetics';
import { loadProfile, saveProfile, XP_PER_TIER } from '../game/profile';
import { unlockAchievementNow } from '../game/rewards';

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
    showToast(`Питомец «${pet.name}» куплен!`, true);
  }

  // ── Car Skins ─────────────────────────────────────────────────────────────────

  function equipCarSkin(skinId: string) {
    const p = loadProfile();
    p.equippedCarSkin = skinId;
    saveProfile(p);
    refresh();
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
      // Dev/offline fallback so the flow is testable without Telegram
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

  // §3.6 "Талоновед" achievement stub — manual confirmation of @fuel_fuel_fuel_bot linking
  function linkFuelBot() {
    const p = loadProfile();
    if (p.fuelBotLinked) return;
    p.fuelBotLinked = true;
    if (!p.purchasedHats.includes('golden_talono')) p.purchasedHats.push('golden_talono');
    if (!p.purchasedCarSkins.includes('golden_moskvich')) p.purchasedCarSkins.push('golden_moskvich');
    if (!p.purchasedPets.includes('barsik_pet')) p.purchasedPets.push('barsik_pet');
    saveProfile(p);
    // §3.6 "Талоновед" achievement grants its own +1000 babki reward — don't double-pay here.
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

  // ── Shared action button renderer ─────────────────────────────────────────────

  function ActionButton({
    owned, equipped, currency, cost, onEquip, onBuyBabki, onBuyStars, babelKi,
  }: {
    owned: boolean; equipped: boolean; currency: string; cost: number;
    onEquip: () => void; onBuyBabki?: () => void; onBuyStars?: () => void; babelKi: number;
  }) {
    if (equipped) return (
      <div style={{
        marginTop: 4, padding: '4px 10px',
        background: 'rgba(255,87,34,0.3)', border: '1px solid rgba(255,87,34,0.5)',
        borderRadius: 6, fontSize: 9, color: '#FF5722', fontWeight: 'bold',
      }}>✓ Выбрано</div>
    );
    if (owned) return (
      <button onClick={onEquip} style={{
        marginTop: 4, padding: '4px 10px',
        background: 'rgba(76,175,80,0.2)', border: '1px solid rgba(76,175,80,0.4)',
        borderRadius: 6, fontSize: 9, color: '#81C784', cursor: 'pointer', fontWeight: 'bold',
      }}>Выбрать</button>
    );
    if (currency === 'babki') return (
      <button onClick={onBuyBabki} disabled={cost > babelKi} style={{
        marginTop: 4, padding: '4px 10px',
        background: cost > babelKi ? 'rgba(255,255,255,0.04)' : 'rgba(255,215,0,0.15)',
        border: `1px solid ${cost > babelKi ? 'rgba(255,255,255,0.1)' : 'rgba(255,215,0,0.4)'}`,
        borderRadius: 6, fontSize: 9,
        color: cost > babelKi ? '#616161' : '#FFD700',
        cursor: cost > babelKi ? 'not-allowed' : 'pointer', fontWeight: 'bold',
      }}>💰 {cost}</button>
    );
    if (currency === 'stars') return (
      <button onClick={onBuyStars} style={{
        marginTop: 4, padding: '4px 10px',
        background: 'rgba(100,181,246,0.12)', border: '1px solid rgba(100,181,246,0.35)',
        borderRadius: 6, fontSize: 9, color: '#64B5F6', cursor: 'pointer', fontWeight: 'bold',
      }}>⭐ {cost}</button>
    );
    if (currency === 'fuel_linked') return (
      <button onClick={linkFuelBot} style={{
        marginTop: 4, padding: '4px 10px',
        background: 'rgba(255,152,0,0.15)', border: '1px solid rgba(255,152,0,0.4)',
        borderRadius: 6, fontSize: 8, color: '#FF9800', cursor: 'pointer', fontWeight: 'bold',
      }}>🔗 Привязать</button>
    );
    return null;
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  const SECTION_LABELS: Record<ShopSection, string> = { hats: '🧢 Шапки', pets: '🐾 Питомцы', cars: '🚗 Авто', battlepass: '🎫 Пропуск' };

  return (
    <div style={{ width: '100%', maxWidth: 380 }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 60, left: '50%', transform: 'translateX(-50%)',
          background: toast.ok ? 'rgba(76,175,80,0.92)' : 'rgba(244,67,54,0.92)',
          color: '#FFF', borderRadius: 10, padding: '8px 18px',
          fontSize: 13, fontWeight: 'bold', zIndex: 200,
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)', whiteSpace: 'nowrap',
        }}>
          {toast.msg}
        </div>
      )}

      {/* Balance */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '8px 12px', marginBottom: 10,
        background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.2)', borderRadius: 10,
      }}>
        <span style={{ fontSize: 13, color: '#FFD700', fontWeight: 'bold' }}>
          💰 {profile.babki} бабок
        </span>
        <span style={{ fontSize: 10, color: '#9E9E9E' }}>
          🧢 {HATS.find(h => h.id === profile.equippedHat)?.emoji ?? '😶'}{' '}
          🐾 {PETS.find(p => p.id === profile.equippedPet)?.emoji ?? '🚫'}{' '}
          🚗 {CAR_SKINS.find(s => s.id === profile.equippedCarSkin)?.emoji ?? '🚗'}
        </span>
      </div>

      {/* Section tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {(['hats', 'pets', 'cars', 'battlepass'] as ShopSection[]).map(s => (
          <button key={s} onClick={() => setSection(s)} style={{
            flex: 1, padding: '7px 4px', fontSize: 11, borderRadius: 9,
            background: section === s ? 'rgba(255,87,34,0.2)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${section === s ? 'rgba(255,87,34,0.5)' : 'rgba(255,255,255,0.1)'}`,
            color: section === s ? '#FF5722' : '#9E9E9E',
            cursor: 'pointer', fontWeight: section === s ? 'bold' : 'normal',
          }}>
            {SECTION_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {(['all', 'owned', 'babki', 'stars'] as const).map(f => {
          const labels = { all: 'Все', owned: 'Мои', babki: '💰 Бабки', stars: '⭐ Stars' };
          return (
            <button key={f} onClick={() => setSelectedFilter(f)} style={{
              flex: 1, padding: '5px 4px', fontSize: 10, borderRadius: 8,
              background: selectedFilter === f ? 'rgba(30,100,180,0.2)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${selectedFilter === f ? 'rgba(30,100,180,0.5)' : 'rgba(255,255,255,0.1)'}`,
              color: selectedFilter === f ? '#64B5F6' : '#9E9E9E',
              cursor: 'pointer', fontWeight: selectedFilter === f ? 'bold' : 'normal',
            }}>
              {labels[f]}
            </button>
          );
        })}
      </div>

      {/* ── Hats grid ── */}
      {section === 'hats' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {filteredHats.map(hat => {
            // Free Battle Pass tier rewards are auto-claimed once their unlock condition is met
            const tierUnlocked = hat.currency === 'free' && hat.battlePassTier !== undefined &&
              (hat.premiumOnly
                ? profile.battlePassTier >= hat.battlePassTier && profile.battlePassPremium
                : profile.battlePassTier >= hat.battlePassTier);
            const owned = profile.purchasedHats.includes(hat.id) || tierUnlocked;
            const equipped = profile.equippedHat === hat.id;
            const rarityColor = RARITY_COLORS[hat.rarity];
            return (
              <div key={hat.id} style={{
                background: equipped ? 'rgba(255,87,34,0.15)' : owned ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.03)',
                border: `1.5px solid ${equipped ? '#FF5722' : rarityColor + '66'}`,
                borderRadius: 12, padding: '10px 10px 8px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              }}>
                <div style={{ fontSize: 32 }}>{hat.emoji}</div>
                <div style={{ fontSize: 11, color: '#FFF', fontWeight: 'bold', textAlign: 'center', lineHeight: 1.2 }}>
                  {hat.name}
                </div>
                <div style={{ fontSize: 9, color: rarityColor, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {hat.rarity === 'common' ? 'обычная' : hat.rarity === 'rare' ? 'редкая' : hat.rarity === 'epic' ? 'эпичная' : 'легенд.'}
                </div>
                <div style={{ fontSize: 9, color: '#757575', textAlign: 'center', lineHeight: 1.3 }}>
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
          <div style={{ fontSize: 10, color: '#607D8B', marginBottom: 8, lineHeight: 1.4 }}>
            🐾 Питомцы бегают рядом с тобой во дворе. Видны только тебе и твоей команде.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {filteredPets.map(pet => {
              // Free Battle Pass tier rewards are auto-claimed once their unlock condition is met
              const tierUnlocked = pet.currency === 'free' && pet.battlePassTier !== undefined &&
                (pet.premiumOnly
                  ? profile.battlePassTier >= pet.battlePassTier && profile.battlePassPremium
                  : profile.battlePassTier >= pet.battlePassTier);
              const owned = profile.purchasedPets.includes(pet.id) || tierUnlocked;
              const equipped = profile.equippedPet === pet.id;
              const rarityColor = RARITY_COLORS[pet.rarity];
              return (
                <div key={pet.id} style={{
                  background: equipped ? 'rgba(255,87,34,0.15)' : owned ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.03)',
                  border: `1.5px solid ${equipped ? '#FF5722' : rarityColor + '66'}`,
                  borderRadius: 12, padding: '10px 10px 8px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                }}>
                  <div style={{ fontSize: 32 }}>{pet.emoji}</div>
                  <div style={{ fontSize: 11, color: '#FFF', fontWeight: 'bold', textAlign: 'center', lineHeight: 1.2 }}>
                    {pet.name}
                  </div>
                  <div style={{ fontSize: 9, color: rarityColor, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {pet.rarity === 'common' ? 'обычная' : pet.rarity === 'rare' ? 'редкая' : pet.rarity === 'epic' ? 'эпичная' : 'легенд.'}
                  </div>
                  <div style={{ fontSize: 9, color: '#757575', textAlign: 'center', lineHeight: 1.3, fontStyle: 'italic' }}>
                    «{pet.animation}»
                  </div>
                  <div style={{ fontSize: 9, color: '#616161', textAlign: 'center', lineHeight: 1.3 }}>
                    {pet.description}
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
          <div style={{ fontSize: 10, color: '#607D8B', marginBottom: 8, lineHeight: 1.4 }}>
            🚗 Скины применяются к твоей машине в следующем матче.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {filteredCars.map(skin => {
              const owned = profile.purchasedCarSkins.includes(skin.id);
              const equipped = profile.equippedCarSkin === skin.id;
              const rarityColor = RARITY_COLORS[skin.rarity];
              return (
                <div key={skin.id} style={{
                  background: equipped ? 'rgba(255,87,34,0.15)' : owned ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.03)',
                  border: `1.5px solid ${equipped ? '#FF5722' : rarityColor + '66'}`,
                  borderRadius: 12, padding: '10px 10px 8px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                }}>
                  {/* Color preview swatch */}
                  <div style={{
                    width: 40, height: 24, borderRadius: 5,
                    background: skin.color, border: '2px solid rgba(255,255,255,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16,
                  }}>
                    {skin.emoji}
                  </div>
                  <div style={{ fontSize: 11, color: '#FFF', fontWeight: 'bold', textAlign: 'center', lineHeight: 1.2 }}>
                    {skin.name}
                  </div>
                  <div style={{ fontSize: 9, color: rarityColor, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {skin.rarity === 'common' ? 'обычная' : skin.rarity === 'rare' ? 'редкая' : skin.rarity === 'epic' ? 'эпичная' : 'легенд.'}
                  </div>
                  <div style={{ fontSize: 9, color: '#757575', textAlign: 'center', lineHeight: 1.3 }}>
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
            <div style={{
              padding: '14px 14px', marginBottom: 12,
              background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.25)', borderRadius: 12,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <span style={{ fontSize: 15, fontWeight: 'bold', color: '#FFD700' }}>
                  🎫 Уровень {profile.battlePassTier}/50
                </span>
                <span style={{ fontSize: 10, color: profile.battlePassPremium ? '#64B5F6' : '#757575', fontWeight: 'bold' }}>
                  {profile.battlePassPremium ? '💎 Премиум активен' : 'Бесплатная линия'}
                </span>
              </div>
              <div style={{ width: '100%', height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <div style={{
                  width: `${maxed ? 100 : tierPct}%`, height: '100%',
                  background: 'linear-gradient(90deg, #FF9800, #FFD700)',
                }} />
              </div>
              <div style={{ fontSize: 9, color: '#9E9E9E', marginTop: 4 }}>
                {maxed ? 'Максимальный уровень достигнут!' : `${xpIntoTier} / ${XP_PER_TIER} XP до следующего уровня`}
              </div>
            </div>

            {!profile.battlePassPremium && (
              <button onClick={buyPremiumPass} style={{
                width: '100%', padding: '12px', marginBottom: 14,
                background: 'rgba(100,181,246,0.15)', border: '1.5px solid rgba(100,181,246,0.5)',
                borderRadius: 12, fontSize: 13, fontWeight: 'bold', color: '#64B5F6', cursor: 'pointer',
              }}>
                💎 Купить Премиум Пропуск — ⭐ {PREMIUM_PASS_COST_STARS}
              </button>
            )}

            <div style={{ fontSize: 10, color: '#607D8B', marginBottom: 8, lineHeight: 1.4 }}>
              Бесплатная линия открывает часть наград по уровням. Премиум открывает эксклюзивные шапки и питомцев на тех же уровнях.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {upcoming.map(item => {
                const reached = profile.battlePassTier >= item.battlePassTier;
                const unlocked = item.premiumOnly ? reached && profile.battlePassPremium : reached;
                return (
                  <div key={item.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                    background: unlocked ? 'rgba(76,175,80,0.1)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${unlocked ? 'rgba(76,175,80,0.3)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: 10,
                  }}>
                    <div style={{
                      width: 30, textAlign: 'center', fontSize: 11, fontWeight: 'bold',
                      color: reached ? '#FFD700' : '#757575',
                    }}>
                      {item.battlePassTier}
                    </div>
                    <div style={{ fontSize: 20 }}>{item.emoji}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: '#FFF', fontWeight: 'bold' }}>{item.name}</div>
                      <div style={{ fontSize: 9, color: item.premiumOnly ? '#64B5F6' : '#81C784' }}>
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

      {/* §10.3 Stars info */}
      <div style={{
        marginTop: 14, padding: '8px 12px',
        background: 'rgba(100,181,246,0.06)', border: '1px solid rgba(100,181,246,0.15)',
        borderRadius: 10, fontSize: 10, color: '#607D8B', lineHeight: 1.5,
      }}>
        ⭐ Покупки за Telegram Stars доступны в приложении Telegram.
        Открой игру через @bakstab_bot для оплаты.
      </div>
    </div>
  );
}
