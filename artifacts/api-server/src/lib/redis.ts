import Redis from 'ioredis';
import { logger } from './logger';

let _client: Redis | null = null;

export function getRedis(): Redis | null {
  return _client;
}

export function isRedisAvailable(): boolean {
  return _client !== null && (_client.status === 'ready' || _client.status === 'connect');
}

export async function connectRedis(): Promise<void> {
  const url = process.env['REDIS_URL'];
  if (!url) {
    logger.warn('REDIS_URL not set — room persistence and daily leaderboard disabled');
    return;
  }

  return new Promise<void>((resolve) => {
    const client = new Redis(url, {
      maxRetriesPerRequest: 2,
      connectTimeout: 8000,
      // Don't retry forever — fail fast so we don't block startup
      retryStrategy: (times) => {
        if (times > 3) return null;
        return Math.min(times * 300, 2000);
      },
      // Silence unhandled rejection on final failure
      enableOfflineQueue: true,
    });

    let settled = false;

    const settle = (ok: boolean) => {
      if (settled) return;
      settled = true;
      if (ok) {
        _client = client;
        resolve();
      } else {
        client.disconnect(false);
        resolve(); // non-fatal — server continues without Redis
      }
    };

    client.once('ready', () => {
      logger.info('Redis connected');
      settle(true);
    });

    client.on('error', (err: Error) => {
      logger.warn({ err: err.message }, 'Redis error');
      if (!settled) settle(false);
    });

    // 10s hard timeout — don't block the HTTP server from starting
    setTimeout(() => {
      if (!settled) {
        logger.warn('Redis connect timeout — continuing without persistence');
        settle(false);
      }
    }, 10_000);
  });
}
