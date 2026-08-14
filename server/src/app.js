import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { errorHandler } from './middleware/error.js';
import healthRouter from './routes/health.js';
import contentRouter from './routes/content.js';
import authRouter from './routes/auth.js';

export function createApp() {
  const app = express();

  app.use(cors({
    origin: config.corsOrigin,
    credentials: true
  }));
  app.use(express.json({ limit: '2mb' }));

  app.use('/api/health', healthRouter);
  app.use('/api/content', contentRouter);
  app.use('/api/auth', authRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  app.use(errorHandler);

  return app;
}
