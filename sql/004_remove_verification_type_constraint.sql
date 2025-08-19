-- Remove any check constraints on verification_type column
-- This will handle various possible constraint names and structures

-- First, let's see what constraints exist (this is just for reference)
-- SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'verification_codes'::regclass;

-- Drop any check constraints that might exist on verification_type
DO $$
DECLARE
    constraint_name text;
BEGIN
    -- Find and drop any check constraints on verification_type column
    FOR constraint_name IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'verification_codes'::regclass 
        AND contype = 'c'
        AND pg_get_constraintdef(oid) LIKE '%verification_type%'
    LOOP
        EXECUTE 'ALTER TABLE verification_codes DROP CONSTRAINT ' || constraint_name;
    END LOOP;
END $$;

-- Alternative approach: Drop all check constraints on the table if the above doesn't work
-- ALTER TABLE verification_codes DROP CONSTRAINT IF EXISTS verification_codes_verification_type_check;
-- ALTER TABLE verification_codes DROP CONSTRAINT IF EXISTS verification_codes_verification_type_check_1;
-- ALTER TABLE verification_codes DROP CONSTRAINT IF EXISTS verification_codes_verification_type_check_2; 