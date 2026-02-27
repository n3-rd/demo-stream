import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { DATABASE_URL } from '$env/static/private';
import * as schema from './schema';

const connectionString = DATABASE_URL;

export const pool = new Pool({ connectionString });

pool.on('error', (err: Error) => {
    console.error('Unexpected error on idle client', err);
});
export const db = drizzle(pool, { schema });