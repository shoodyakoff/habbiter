-- Create table for storing temporary auth tokens
CREATE TABLE auth_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token UUID DEFAULT uuid_generate_v4(), -- The token shown in the deep link
    status TEXT DEFAULT 'pending', -- pending, scanned, success, expired
    telegram_id BIGINT,
    telegram_username TEXT,
    telegram_first_name TEXT,
    telegram_photo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '5 minutes')
);

-- Index for fast lookups
CREATE INDEX idx_auth_tokens_token ON auth_tokens(token);

-- RLS
ALTER TABLE auth_tokens ENABLE ROW LEVEL SECURITY;

-- Allow public access to create tokens (we'll secure this via Edge Function logic ideally, but for now allow insert)
-- Actually, better to control this via Service Role in Edge Function only.
-- So we can leave RLS enabled but no policies for 'anon' means 'anon' cannot access directly.
-- The Edge Function uses Service Role Key which bypasses RLS.
