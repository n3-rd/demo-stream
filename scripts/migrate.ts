import { readFileSync } from 'fs';
import { resolve } from 'path';
import { dbPool } from '../src/lib/db';

async function main() {
  const sqlPath = resolve(__dirname, '..', 'sql', '001_init.sql');
  const sql = readFileSync(sqlPath, 'utf8');
  const client = await dbPool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Migration complete');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await dbPool.end();
  }
}

main(); 