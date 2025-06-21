import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
config();

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL || 'postgres://user:password@neon-db-hostname:5432/petwell?sslmode=require',
  ssl: {
    rejectUnauthorized: false,
  },
  entities: [__dirname + '/../modules/**/entities/*.entity{.ts,.js}'],
  synchronize: true,
  migrations: [__dirname + '/../migration/*{.ts,.js}'],
};

const AppDataSource = new DataSource(dataSourceOptions);
export default AppDataSource;
