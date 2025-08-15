-- Create rep_device_tokens table for storing FCM tokens
CREATE TABLE IF NOT EXISTS rep_device_tokens (
    rep_id UUID NOT NULL,
    device_token TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (rep_id, device_token),
    FOREIGN KEY (rep_id) REFERENCES representatives(id) ON DELETE CASCADE
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_rep_device_tokens_rep_id ON rep_device_tokens(rep_id);
CREATE INDEX IF NOT EXISTS idx_rep_device_tokens_updated_at ON rep_device_tokens(updated_at); 