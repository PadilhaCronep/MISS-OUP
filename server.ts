import express from 'express';
import { createServer as createViteServer } from 'vite';
import { setupDb } from './src/db/index.js';
import { apiRouter } from './src/api/index.js';
import { errorHandler } from './src/api/middleware/errorHandler.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  setupDb();

  app.use('/api', apiRouter);
  app.use(errorHandler);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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
  });
}

startServer();
