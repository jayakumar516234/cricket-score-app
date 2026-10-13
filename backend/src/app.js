import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import teamRoutes from './routes/teams.js';
import matchRoutes from './routes/matches.js';
import miscRoutes from './routes/misc.js';
import { errorHandler } from './utils/http.js';

export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: config.clientOrigin.split(','), credentials: false }));
  app.use(express.json({ limit: '6mb' })); // team save sends 11 small player photos
  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/teams', teamRoutes);
  app.use('/api/matches', matchRoutes);
  app.use('/api', miscRoutes);
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));
  app.use(errorHandler);
  return app;
}
