import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: process.env.PORT ? Number(process.env.PORT) : 3000,
  databaseUrl: process.env.DATABASE_URL ?? '',
  serproBaseUrl: process.env.SERPRO_BASE_URL ?? '',
  serproBearerToken: process.env.SERPRO_BEARER_TOKEN ?? '',
};

if (!env.databaseUrl) {
  // eslint-disable-next-line no-console
  console.warn('DATABASE_URL não definida. A conexão com o Postgres irá falhar.');
}


