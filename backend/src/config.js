import 'dotenv/config';

const nodeEnv = process.env.NODE_ENV || 'development';
let jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  if (nodeEnv === 'production') throw new Error('JWT_SECRET must be set in production');
  jwtSecret = 'dev-only-secret-change-me';
  if (nodeEnv !== 'test') console.warn('[config] JWT_SECRET not set - using an insecure development secret');
}

export const config = {
  nodeEnv,
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/cricket_app',
  mongoUriTest: process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017/cricket_app_test',
  jwtSecret,
  jwtExpires: process.env.JWT_EXPIRES || '7d',
  maxTeamsPerUser: Number(process.env.MAX_TEAMS_PER_USER) || 5,
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
};
