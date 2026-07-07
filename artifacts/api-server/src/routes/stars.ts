// §10.3 Telegram Stars invoice creation endpoint
// POST /api/stars/invoice → { invoiceLink: string }
// Requires BOT_TOKEN env var (set in Replit Secrets as BOT_TOKEN).
// When BOT_TOKEN is absent the endpoint returns 503 so the client falls back
// to the client-side openInvoice(slug) path.

import { Router } from 'express';

const router = Router();

interface InvoiceBody {
  itemType: 'hat' | 'pet' | 'battlepass';
  itemId:   string;
  stars:    number; // price in Telegram Stars (XTR)
  name:     string; // display name shown in payment UI
}

const ITEM_TITLES: Record<string, string> = {
  hat:         'Шапка — 95-Й',
  pet:         'Питомец — 95-Й',
  battlepass:  'Бакстаб Премиум',
};

const ITEM_DESCRIPTIONS: Record<string, string> = {
  hat:         'Косметическая шапка в игре «95-Й Бакстаб»',
  pet:         'Питомец-компаньон в игре «95-Й Бакстаб»',
  battlepass:  'Премиум Боевой Пропуск — все 50 уровней + эксклюзивные скины',
};

router.post('/stars/invoice', async (req, res) => {
  const { itemType, itemId, stars, name } = req.body as InvoiceBody;

  if (!itemType || !itemId || !stars || stars < 1) {
    res.status(400).json({ error: 'Missing required fields: itemType, itemId, stars' });
    return;
  }

  const BOT_TOKEN = process.env['BOT_TOKEN'];
  if (!BOT_TOKEN) {
    // No bot token configured — caller falls back to client-side slug path
    res.status(503).json({ error: 'Bot token not configured on this server' });
    return;
  }

  const title       = name        || ITEM_TITLES[itemType]       || '95-Й Косметика';
  const description = ITEM_DESCRIPTIONS[itemType] || 'Косметический предмет в игре 95-Й';

  try {
    const tgRes = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          payload: JSON.stringify({ itemType, itemId }),
          currency: 'XTR',   // Telegram Stars ISO code
          prices:   [{ label: title, amount: stars }],
        }),
      },
    );

    const data = await tgRes.json() as { ok: boolean; result?: string; description?: string };

    if (!data.ok) {
      res.status(400).json({ error: data.description ?? 'Telegram API error' });
      return;
    }

    res.json({ invoiceLink: data.result });
  } catch (err) {
    res.status(500).json({ error: 'Failed to contact Telegram API' });
  }
});

export default router;
