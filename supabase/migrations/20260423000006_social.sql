-- ============================================================
-- Fix slots RLS: circle members can see each other's slots
-- Required for matching algorithm AND current mood display
-- ============================================================

DROP POLICY IF EXISTS "slots_select_own" ON slots;

CREATE POLICY "slots_select_own_or_contact"
  ON slots FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM circle_members cm1
      JOIN circle_members cm2 ON cm1.circle_id = cm2.circle_id
      WHERE cm1.profile_id = auth.uid()
        AND cm2.profile_id = slots.user_id
    )
  );

-- ============================================================
-- Update join_via_invitation: return inviter info for push
-- ============================================================

CREATE OR REPLACE FUNCTION join_via_invitation(p_token text, p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_inv         invitations;
  v_circle_name text;
BEGIN
  SELECT * INTO v_inv
  FROM invitations
  WHERE token = p_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'invalid_token');
  END IF;

  IF v_inv.expires_at < now() THEN
    RETURN json_build_object('error', 'token_expired');
  END IF;

  IF v_inv.uses_count >= 10 THEN
    RETURN json_build_object('error', 'token_exhausted');
  END IF;

  IF v_inv.created_by = p_user_id THEN
    RETURN json_build_object('error', 'own_invitation');
  END IF;

  IF v_inv.circle_id IS NOT NULL THEN
    INSERT INTO circle_members (circle_id, profile_id)
    VALUES (v_inv.circle_id, p_user_id)
    ON CONFLICT DO NOTHING;

    SELECT name INTO v_circle_name FROM circles WHERE id = v_inv.circle_id;
  END IF;

  UPDATE invitations
  SET uses_count = uses_count + 1,
      used_at    = COALESCE(used_at, now())
  WHERE id = v_inv.id;

  RETURN json_build_object(
    'success',     true,
    'circle_id',   v_inv.circle_id,
    'inviter_id',  v_inv.created_by::text,
    'circle_name', v_circle_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION join_via_invitation(text, uuid) TO authenticated;
