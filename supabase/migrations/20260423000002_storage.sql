-- ============================================================
-- Storage — avatars bucket
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,  -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Public read (avatars are shown to other users)
CREATE POLICY "avatars_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- User can only upload files named {uid}.ext at bucket root
CREATE POLICY "avatars_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND name ~ ('^' || auth.uid()::text || '\.[a-zA-Z]+$')
  );

CREATE POLICY "avatars_update_own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND owner_id = auth.uid()
  );

CREATE POLICY "avatars_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND owner_id = auth.uid()
  );
