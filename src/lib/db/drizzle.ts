import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { DATABASE_URL } from '$env/static/private';
import * as schema from './schema';

const connectionString = DATABASE_URL;

export const pool = new Pool({
    connectionString,
    connectionTimeoutMillis: 5000,  // fail fast if DB is unreachable (prevents nginx 502 on long TCP timeouts)
    idleTimeoutMillis: 30000,
    max: 10
});

pool.on('error', (err: Error) => {
    console.error('Unexpected error on idle client', err);
});
export const db = drizzle(pool, { schema });