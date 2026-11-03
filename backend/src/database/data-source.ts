import 'reflect-metadata';
import { config } from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';
import { entities } from './entities';

config({ quiet: true });

export const buildDataSourceOptions = (env: NodeJS.ProcessEnv = process.env): DataSourceOptions => ({
  type: 'postgres',
  host: env.DB_HOST,
  port: Number(env.DB_PORT ?? 5432),
  username: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  entities,
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  synchronize: false,
});

/** Used by the TypeORM CLI (migrations) and the seed script. */
export default new DataSource(buildDataSourceOptions());
