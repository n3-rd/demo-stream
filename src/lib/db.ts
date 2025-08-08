import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/demo_stream';

export const dbPool = new Pool({ connectionString });

export async function query<T = any>(text: string, params: any[] = []): Promise<{ rows: T[] }>{
  const client = await dbPool.connect();
  try {
    const res = await client.query<T>(text, params);
    return { rows: res.rows };
  } finally {
    client.release();
  }
} 