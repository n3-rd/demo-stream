-- Backfill first_name and last_name from login_name where missing
-- Split on ., _, - and whitespace; use INITCAP to capitalize

UPDATE viewroom_users
SET 
  first_name = COALESCE(NULLIF(first_name, ''), INITCAP(split_part(regexp_replace(login_name, '[._\-]+', ' ', 'g'), ' ', 1))),
  last_name = COALESCE(
    NULLIF(last_name, ''),
    NULLIF(INITCAP(split_part(regexp_replace(login_name, '[._\-]+', ' ', 'g'), ' ', 2)), '')
  )
WHERE (first_name IS NULL OR first_name = '')
   OR (last_name IS NULL OR last_name = ''); 