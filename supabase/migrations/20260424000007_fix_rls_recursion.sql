-- Fix infinite recursion: circles_select_member_or_owner queries circle_members,
-- circle_members_select queries circles → infinite loop.
-- Solution: circles_select only checks owner_id (no cross-table reference).
-- circle_members_select keeps its logic (queries circles by owner_id only, no recursion).

DROP POLICY IF EXISTS "circles_select_member_or_owner" ON circles;
CREATE POLICY "circles_select_own"
  ON circles FOR SELECT TO authenticated
  USING (owner_id = auth.uid());
