-- ============================================================
-- Ensure all tables exist (idempotent)
-- ============================================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES profiles ON DELETE CASCADE,
  endpoint    text        NOT NULL UNIQUE,
  p256dh      text        NOT NULL,
  auth_key    text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions (user_id);

-- matches extra columns from migration 000005
ALTER TABLE matches ADD COLUMN IF NOT EXISTS response_a text DEFAULT NULL CHECK (response_a IN ('accepted', 'ignored'));
ALTER TABLE matches ADD COLUMN IF NOT EXISTS response_b text DEFAULT NULL CHECK (response_b IN ('accepted', 'ignored'));

-- ============================================================
-- Enable Row Level Security
-- ============================================================

ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE circles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_members     ENABLE ROW LEVEL SECURITY;
ALTER TABLE slots              ENABLE ROW LEVEL SECURITY;
ALTER TABLE events             ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches            ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- profiles
-- ============================================================

DROP POLICY IF EXISTS "profiles_select_authenticated" ON profiles;
CREATE POLICY "profiles_select_authenticated"
  ON profiles FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ============================================================
-- circles
-- ============================================================

DROP POLICY IF EXISTS "circles_select_member_or_owner" ON circles;
CREATE POLICY "circles_select_member_or_owner"
  ON circles FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM circle_members cm
      WHERE cm.circle_id = circles.id
        AND cm.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "circles_insert_own" ON circles;
CREATE POLICY "circles_insert_own"
  ON circles FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "circles_update_owner" ON circles;
CREATE POLICY "circles_update_owner"
  ON circles FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "circles_delete_owner" ON circles;
CREATE POLICY "circles_delete_owner"
  ON circles FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- ============================================================
-- circle_members
-- ============================================================

DROP POLICY IF EXISTS "circle_members_select" ON circle_members;
CREATE POLICY "circle_members_select"
  ON circle_members FOR SELECT TO authenticated
  USING (
    profile_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM circles c
      WHERE c.id = circle_members.circle_id
        AND c.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "circle_members_insert_owner" ON circle_members;
CREATE POLICY "circle_members_insert_owner"
  ON circle_members FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM circles c
      WHERE c.id = circle_members.circle_id
        AND c.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "circle_members_delete_owner_or_self" ON circle_members;
CREATE POLICY "circle_members_delete_owner_or_self"
  ON circle_members FOR DELETE TO authenticated
  USING (
    profile_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM circles c
      WHERE c.id = circle_members.circle_id
        AND c.owner_id = auth.uid()
    )
  );

-- ============================================================
-- slots
-- ============================================================

DROP POLICY IF EXISTS "slots_select_own" ON slots;
CREATE POLICY "slots_select_own"
  ON slots FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "slots_insert_own" ON slots;
CREATE POLICY "slots_insert_own"
  ON slots FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "slots_update_own" ON slots;
CREATE POLICY "slots_update_own"
  ON slots FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "slots_delete_own" ON slots;
CREATE POLICY "slots_delete_own"
  ON slots FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- events
-- ============================================================

DROP POLICY IF EXISTS "events_select_authenticated" ON events;
CREATE POLICY "events_select_authenticated"
  ON events FOR SELECT TO authenticated
  USING (
    status = 'open'
    OR creator_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM event_participants ep
      WHERE ep.event_id = events.id
        AND ep.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "events_insert_own" ON events;
CREATE POLICY "events_insert_own"
  ON events FOR INSERT TO authenticated
  WITH CHECK (creator_id = auth.uid());

DROP POLICY IF EXISTS "events_update_creator" ON events;
CREATE POLICY "events_update_creator"
  ON events FOR UPDATE TO authenticated
  USING (creator_id = auth.uid());

DROP POLICY IF EXISTS "events_delete_creator" ON events;
CREATE POLICY "events_delete_creator"
  ON events FOR DELETE TO authenticated
  USING (creator_id = auth.uid());

-- ============================================================
-- event_participants
-- ============================================================

DROP POLICY IF EXISTS "event_participants_select" ON event_participants;
CREATE POLICY "event_participants_select"
  ON event_participants FOR SELECT TO authenticated
  USING (
    profile_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_participants.event_id
        AND e.creator_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "event_participants_insert_own" ON event_participants;
CREATE POLICY "event_participants_insert_own"
  ON event_participants FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "event_participants_update_own" ON event_participants;
CREATE POLICY "event_participants_update_own"
  ON event_participants FOR UPDATE TO authenticated
  USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "event_participants_delete_own" ON event_participants;
CREATE POLICY "event_participants_delete_own"
  ON event_participants FOR DELETE TO authenticated
  USING (profile_id = auth.uid());

-- ============================================================
-- matches
-- ============================================================

DROP POLICY IF EXISTS "matches_select_parties" ON matches;
CREATE POLICY "matches_select_parties"
  ON matches FOR SELECT TO authenticated
  USING (user_a = auth.uid() OR user_b = auth.uid());

DROP POLICY IF EXISTS "matches_insert_parties" ON matches;
CREATE POLICY "matches_insert_parties"
  ON matches FOR INSERT TO authenticated
  WITH CHECK (user_a = auth.uid() OR user_b = auth.uid());

DROP POLICY IF EXISTS "matches_update_parties" ON matches;
CREATE POLICY "matches_update_parties"
  ON matches FOR UPDATE TO authenticated
  USING (user_a = auth.uid() OR user_b = auth.uid());

-- ============================================================
-- invitations
-- ============================================================

DROP POLICY IF EXISTS "invitations_select_own" ON invitations;
CREATE POLICY "invitations_select_own"
  ON invitations FOR SELECT TO authenticated
  USING (created_by = auth.uid());

DROP POLICY IF EXISTS "invitations_insert_own" ON invitations;
CREATE POLICY "invitations_insert_own"
  ON invitations FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "invitations_update_own" ON invitations;
CREATE POLICY "invitations_update_own"
  ON invitations FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

-- ============================================================
-- push_subscriptions
-- ============================================================

DROP POLICY IF EXISTS "push_subscriptions_all_own" ON push_subscriptions;
CREATE POLICY "push_subscriptions_all_own"
  ON push_subscriptions FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
