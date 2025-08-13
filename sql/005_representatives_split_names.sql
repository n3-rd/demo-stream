ALTER TABLE representatives
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Backfill from existing name column: first token as first_name, remainder as last_name
UPDATE representatives
SET 
  first_name = COALESCE(NULLIF(first_name, ''), NULLIF(split_part(trim(name), ' ', 1), '')),
  last_name = COALESCE(
    NULLIF(last_name, ''),
    NULLIF(trim(regexp_replace(trim(name), '^\S+\s*(.*)$', '\1')), '')
  )
WHERE (first_name IS NULL OR first_name = '')
   OR (last_name IS NULL OR last_name = ''); 