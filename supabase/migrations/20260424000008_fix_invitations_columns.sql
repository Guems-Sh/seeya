-- Add missing columns to invitations table
ALTER TABLE invitations
  ADD COLUMN IF NOT EXISTS uses_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS used_at timestamptz;
