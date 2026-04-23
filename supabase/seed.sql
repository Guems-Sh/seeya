-- ============================================================
-- Seed data — development only
-- Run AFTER creating test users in Supabase Auth dashboard
-- Replace UUIDs with actual auth.users UUIDs
-- ============================================================

-- Example:
-- INSERT INTO profiles (id, first_name, last_name_init, bio, preferred_moods, preferred_arrondissements, usual_availability)
-- VALUES
--   ('00000000-0000-0000-0000-000000000001', 'Alex',   'D.', 'Toujours partant pour une bière.', ARRAY['biere','balade']::mood_type[], ARRAY[11, 10], 'weekday_evenings'),
--   ('00000000-0000-0000-0000-000000000002', 'Sarah',  'M.', 'Ciné et restos, c''est ma vie.',   ARRAY['cine','restau']::mood_type[], ARRAY[3, 4, 11], 'both'),
--   ('00000000-0000-0000-0000-000000000003', 'Thomas', 'L.', null,                               ARRAY['sport','cafe']::mood_type[], ARRAY[15, 16], 'weekends');

-- Once profiles exist, seed circles:
-- INSERT INTO circles (owner_id, name, type)
-- VALUES
--   ('00000000-0000-0000-0000-000000000001', 'Proches',       'proches'),
--   ('00000000-0000-0000-0000-000000000001', 'Collègues',     'collegues'),
--   ('00000000-0000-0000-0000-000000000001', 'Connaissances', 'connaissances');
