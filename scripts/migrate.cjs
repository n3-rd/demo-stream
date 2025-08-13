const { readFileSync, existsSync } = require('fs');
const { resolve } = require('path');
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const pool = new Pool({ connectionString });

(async () => {
  const files = ['001_init.sql', '002_file_blobs.sql', '003_add_viewroom_user_names.sql', '004_backfill_viewroom_user_names.sql', '005_representatives_split_names.sql'];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const f of files) {
      const sqlPath = resolve(__dirname, '..', 'sql', f);
      if (!existsSync(sqlPath)) continue;
      const sql = readFileSync(sqlPath, 'utf8');
      await client.query(sql);
    }
    await client.query('COMMIT');
    console.log('Migration complete');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})(); 