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

-- Any authenticated user can read any profile (social features, matching display)
CREATE POLICY "profiles_select_authenticated"
  ON profiles FOR SELECT TO authenticated
  USING (true);

-- User can only create their own profile
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- User can only update their own profile
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ============================================================
-- circles
-- ============================================================

-- Owner or member can read a circle
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

CREATE POLICY "circles_insert_own"
  ON circles FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "circles_update_owner"
  ON circles FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "circles_delete_owner"
  ON circles FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- ============================================================
-- circle_members
-- ============================================================

-- Member sees their own memberships; owner sees all members of their circles
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

-- Only circle owner can add members
CREATE POLICY "circle_members_insert_owner"
  ON circle_members FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM circles c
      WHERE c.id = circle_members.circle_id
        AND c.owner_id = auth.uid()
    )
  );

-- Owner can remove anyone; member can remove themselves (leave)
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

-- Users only see their own slots (matching runs server-side with service role)
CREATE POLICY "slots_select_own"
  ON slots FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "slots_insert_own"
  ON slots FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "slots_update_own"
  ON slots FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "slots_delete_own"
  ON slots FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- events
-- ============================================================

-- All open events are visible to authenticated users (map display)
-- Cancelled/confirmed events visible to creator and participants
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

CREATE POLICY "events_insert_own"
  ON events FOR INSERT TO authenticated
  WITH CHECK (creator_id = auth.uid());

CREATE POLICY "events_update_creator"
  ON events FOR UPDATE TO authenticated
  USING (creator_id = auth.uid());

CREATE POLICY "events_delete_creator"
  ON events FOR DELETE TO authenticated
  USING (creator_id = auth.uid());

-- ============================================================
-- event_participants
-- ============================================================

-- Participant sees their own rows; event creator sees all participants
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

CREATE POLICY "event_participants_insert_own"
  ON event_participants FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "event_participants_update_own"
  ON event_participants FOR UPDATE TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "event_participants_delete_own"
  ON event_participants FOR DELETE TO authenticated
  USING (profile_id = auth.uid());

-- ============================================================
-- matches
-- ============================================================

-- Only the two matched users can see their match
CREATE POLICY "matches_select_parties"
  ON matches FOR SELECT TO authenticated
  USING (user_a = auth.uid() OR user_b = auth.uid());

-- Matches are created server-side only (service role bypasses RLS)
-- No INSERT/UPDATE policy needed for authenticated role

-- ============================================================
-- invitations
-- ============================================================

-- Creator reads their own invitations
CREATE POLICY "invitations_select_own"
  ON invitations FOR SELECT TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "invitations_insert_own"
  ON invitations FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "invitations_update_own"
  ON invitations FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

-- ============================================================
-- push_subscriptions
-- ============================================================

CREATE POLICY "push_subscriptions_all_own"
  ON push_subscriptions FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
