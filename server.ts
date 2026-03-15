import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import net from 'node:net';
import { setupDb } from './src/db/index.js';
import { apiRouter } from './src/api/index.js';
import { errorHandler } from './src/api/middleware/errorHandler.js';

function parsePort(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(65535, Math.round(parsed)));
}

function canListenOnPort(port: number, host = '0.0.0.0'): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', () => {
      resolve(false);
    });

    server.once('listening', () => {
      server.close(() => resolve(true));
    });

    server.listen(port, host);
  });
}

async function resolveAvailablePort(
  preferredPort: number,
  host = '0.0.0.0',
  maxAttempts = 50,
): Promise<number> {
  for (let offset = 0; offset <= maxAttempts; offset += 1) {
    const candidate = preferredPort + offset;
    if (candidate > 65535) break;
    // eslint-disable-next-line no-await-in-loop
    const available = await canListenOnPort(candidate, host);
    if (available) return candidate;
  }

  throw new Error(`Nao foi possivel encontrar porta disponivel a partir de ${preferredPort}.`);
}

async function startServer() {
  const app = express();

  const requestedPort = parsePort(process.env.PORT, 3000);
  const requestedHmrPort = parsePort(process.env.VITE_HMR_PORT, 24678);

  const PORT = await resolveAvailablePort(requestedPort);
  const HMR_PORT = await resolveAvailablePort(requestedHmrPort);

  app.use(express.json());

  setupDb();

  app.use('/api', apiRouter);
  app.use(errorHandler);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: {
          port: HMR_PORT,
          clientPort: HMR_PORT,
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (_req, res) => {
      res.sendFile('dist/index.html', { root: '.' });
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    if (PORT !== requestedPort) {
      console.log(`[dev] Porta ${requestedPort} em uso. Subindo em ${PORT}.`);
    }
    if (process.env.NODE_ENV !== 'production' && HMR_PORT !== requestedHmrPort) {
      console.log(`[dev] HMR na porta ${HMR_PORT} (porta padrao ${requestedHmrPort} estava ocupada).`);
    }
  });
}

startServer();
