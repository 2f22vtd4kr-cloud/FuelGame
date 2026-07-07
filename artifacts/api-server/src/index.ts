import { createServer } from 'http';
import app from './app';
import { logger } from './lib/logger';
import { handleWsUpgrade, restoreRoomsFromRedis } from './game/wsHandler';
import { connectRedis } from './lib/redis';

const rawPort = process.env['PORT'];

if (!rawPort) {
  throw new Error('PORT environment variable is required but was not provided.');
}

const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Wrap Express in a raw http.Server so we can intercept WebSocket upgrades
const server = createServer(app);

server.on('upgrade', (req, socket, head) => {
  const url = req.url ?? '';
  if (url.startsWith('/api/ws')) {
    handleWsUpgrade(req, socket, head as Buffer);
  } else {
    socket.destroy();
  }
});

// Boot sequence: Redis → restore rooms → start listening
async function boot(): Promise<void> {
  await connectRedis();
  await restoreRoomsFromRedis();
  server.listen(port, () => {
    logger.info({ port }, 'Server listening (HTTP + WebSocket)');
  });
}

boot().catch((err) => {
  logger.error({ err }, 'Fatal startup error');
  process.exit(1);
});
