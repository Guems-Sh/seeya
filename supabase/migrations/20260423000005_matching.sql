-- Add response columns to matches
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS response_a TEXT DEFAULT NULL CHECK (response_a IN ('accepted', 'ignored')),
  ADD COLUMN IF NOT EXISTS response_b TEXT DEFAULT NULL CHECK (response_b IN ('accepted', 'ignored'));

-- Normalize: always user_a < user_b (UUID string comparison) to avoid duplicate pairs
ALTER TABLE matches ADD CONSTRAINT matches_user_order CHECK (user_a < user_b);

-- Unique match per slot pair + date (recurring slots can appear on multiple dates)
ALTER TABLE matches ADD CONSTRAINT matches_unique_pair
  UNIQUE (user_a, user_b, slot_a, slot_b, overlap_start);

-- Allow authenticated users to insert matches involving themselves
CREATE POLICY "matches_insert_parties"
  ON matches FOR INSERT TO authenticated
  WITH CHECK (user_a = auth.uid() OR user_b = auth.uid());

-- Allow users to update their own response field only
CREATE POLICY "matches_update_parties"
  ON matches FOR UPDATE TO authenticated
  USING (user_a = auth.uid() OR user_b = auth.uid());
