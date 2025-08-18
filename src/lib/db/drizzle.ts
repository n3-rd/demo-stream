import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { DATABASE_URL } from '$env/static/private';

const connectionString = DATABASE_URL;

export const pool = new Pool({ connectionString });
export const db = drizzle(pool); 