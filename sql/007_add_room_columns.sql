-- Add missing columns to rooms table
DO $$
BEGIN
    -- Add customer_name column
    IF NOT EXISTS (
        SELECT column_name 
        FROM information_schema.columns
        WHERE table_name = 'rooms' AND column_name = 'customer_name'
    ) THEN
        ALTER TABLE rooms ADD COLUMN customer_name text;
    END IF;

    -- Add customer_email column
    IF NOT EXISTS (
        SELECT column_name 
        FROM information_schema.columns
        WHERE table_name = 'rooms' AND column_name = 'customer_email'
    ) THEN
        ALTER TABLE rooms ADD COLUMN customer_email text;
    END IF;

    -- Add customer_phone column
    IF NOT EXISTS (
        SELECT column_name 
        FROM information_schema.columns
        WHERE table_name = 'rooms' AND column_name = 'customer_phone'
    ) THEN
        ALTER TABLE rooms ADD COLUMN customer_phone text;
    END IF;

    -- Add room_id column
    IF NOT EXISTS (
        SELECT column_name 
        FROM information_schema.columns
        WHERE table_name = 'rooms' AND column_name = 'room_id'
    ) THEN
        ALTER TABLE rooms ADD COLUMN room_id text;
    END IF;

    -- Add additional_information column
    IF NOT EXISTS (
        SELECT column_name 
        FROM information_schema.columns
        WHERE table_name = 'rooms' AND column_name = 'additional_information'
    ) THEN
        ALTER TABLE rooms ADD COLUMN additional_information text;
    END IF;

    -- Add representative_id column
    IF NOT EXISTS (
        SELECT column_name 
        FROM information_schema.columns
        WHERE table_name = 'rooms' AND column_name = 'representative_id'
    ) THEN
        ALTER TABLE rooms ADD COLUMN representative_id uuid REFERENCES representatives(id);
    END IF;
END $$; 