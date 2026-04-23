-- ============================================================
-- get_invitation_info: public (no auth) — used on /join page
-- ============================================================

CREATE OR REPLACE FUNCTION get_invitation_info(p_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_inv   invitations;
  v_prof  profiles;
  v_circ  circles;
BEGIN
  SELECT * INTO v_inv
  FROM invitations
  WHERE token = p_token
    AND expires_at > now()
    AND uses_count < 10;

  IF NOT FOUND THEN
    RETURN json_build_object('valid', false);
  END IF;

  SELECT * INTO v_prof FROM profiles WHERE id = v_inv.created_by;

  IF v_inv.circle_id IS NOT NULL THEN
    SELECT * INTO v_circ FROM circles WHERE id = v_inv.circle_id;
  END IF;

  RETURN json_build_object(
    'valid',        true,
    'inviter_name', v_prof.first_name || ' ' || v_prof.last_name_init,
    'circle_name',  v_circ.name,
    'circle_id',    v_inv.circle_id
  );
END;
$$;

-- Callable by unauthenticated users (anon role)
GRANT EXECUTE ON FUNCTION get_invitation_info(text) TO anon, authenticated;

-- ============================================================
-- join_via_invitation: processes token for a given user
-- ============================================================

CREATE OR REPLACE FUNCTION join_via_invitation(p_token text, p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_inv invitations;
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

  -- Don't let the creator join their own circle via their own link
  IF v_inv.created_by = p_user_id THEN
    RETURN json_build_object('error', 'own_invitation');
  END IF;

  IF v_inv.circle_id IS NOT NULL THEN
    INSERT INTO circle_members (circle_id, profile_id)
    VALUES (v_inv.circle_id, p_user_id)
    ON CONFLICT DO NOTHING;
  END IF;

  UPDATE invitations
  SET uses_count = uses_count + 1,
      used_at    = COALESCE(used_at, now())
  WHERE id = v_inv.id;

  RETURN json_build_object('success', true, 'circle_id', v_inv.circle_id);
END;
$$;

GRANT EXECUTE ON FUNCTION join_via_invitation(text, uuid) TO authenticated;
