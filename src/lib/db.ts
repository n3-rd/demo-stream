import { Pool } from 'pg';
import { DATABASE_URL } from '$env/static/private';

const connectionString = DATABASE_URL;

export const dbPool = new Pool({ connectionString });

dbPool.on('error', (err: Error) => {
  console.error('Unexpected error on idle client', err);
});

export async function query<T = any>(text: string, params: any[] = []): Promise<{ rows: T[] }> {
  const client = await dbPool.connect();
  try {
    const res = await client.query<T>(text, params);
    return { rows: res.rows };
  } finally {
    client.release();
  }
} 