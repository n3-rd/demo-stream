-- Add missing columns to rooms table
ALTER TABLE rooms 
ADD COLUMN IF NOT EXISTS customer_name text,
ADD COLUMN IF NOT EXISTS customer_email text,
ADD COLUMN IF NOT EXISTS customer_phone text,
ADD COLUMN IF NOT EXISTS room_id text,
ADD COLUMN IF NOT EXISTS additional_information text,
ADD COLUMN IF NOT EXISTS representative_id uuid REFERENCES representatives(id); 