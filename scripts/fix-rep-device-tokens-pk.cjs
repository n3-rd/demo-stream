/**
 * One-time fix so db:push stops failing with "column id is in a primary key" (42P16).
 * Only table with composite PK (no id) in Drizzle schema is rep_device_tokens.
 * If the DB has rep_device_tokens with an "id" column and PK(id), this script
 * aligns it with the schema so push has nothing to change.
 *
 * Run: node scripts/fix-rep-device-tokens-pk.cjs
 * Then: pnpm db:push
 */
require('dotenv').config();
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const pool = new Pool({ connectionString });

async function main() {
  const client = await pool.connect();
  try {
    const { rows: cols } = await client.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'rep_device_tokens'
       ORDER BY ordinal_position`
    );
    const hasId = cols.some((r) => r.column_name === 'id');
    if (!hasId) {
      console.log('rep_device_tokens has no id column, nothing to fix.');
      return;
    }

    const { rows: constraints } = await client.query(
      `SELECT conname FROM pg_constraint
       WHERE conrelid = 'public.rep_device_tokens'::regclass AND contype = 'p'`
    );
    const pkName = constraints[0]?.conname;
    if (!pkName) {
      console.log('No primary key on rep_device_tokens?');
      return;
    }

    console.log('Dropping old PK and id column, adding composite PK...');
    await client.query('BEGIN');
    await client.query(`ALTER TABLE rep_device_tokens DROP CONSTRAINT "${pkName}"`);
    await client.query('ALTER TABLE rep_device_tokens DROP COLUMN id');
    await client.query(
      'ALTER TABLE rep_device_tokens ADD CONSTRAINT rep_device_tokens_rep_id_device_token_pk PRIMARY KEY (rep_id, device_token)'
    );
    await client.query('COMMIT');
    console.log('Done. Run pnpm db:push');
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(e);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
