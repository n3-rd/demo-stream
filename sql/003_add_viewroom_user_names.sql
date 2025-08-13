ALTER TABLE viewroom_users
  ADD COLUMN IF NOT EXISTS first_name TEXT;
 
ALTER TABLE viewroom_users
  ADD COLUMN IF NOT EXISTS last_name TEXT; 