import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  tokenPepper: process.env.TOKEN_PEPPER || 'lcp_dev_token_pepper_secret_2026',
  githubClientId: process.env.GITHUB_CLIENT_ID || '',
  githubClientSecret: process.env.GITHUB_CLIENT_SECRET || '',
  dbPath: process.env.DB_PATH || '',
  nodeEnv: process.env.NODE_ENV || 'development'
};
