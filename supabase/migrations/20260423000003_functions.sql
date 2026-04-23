-- ============================================================
-- Cleanup: expire spontaneous events after 3 hours
-- Called via Supabase pg_cron or Edge Function scheduler
-- ============================================================

CREATE OR REPLACE FUNCTION expire_spontaneous_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE events
  SET status = 'cancelled'
  WHERE type = 'spontaneous'
    AND status = 'open'
    AND created_at < now() - INTERVAL '3 hours';
END;
$$;

-- ============================================================
-- Cleanup: delete expired slots
-- ============================================================

CREATE OR REPLACE FUNCTION expire_old_slots()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM slots
  WHERE expires_at IS NOT NULL
    AND expires_at < now();
END;
$$;

-- ============================================================
-- Cleanup: expired matches (slot passed > 2h ago)
-- ============================================================

CREATE OR REPLACE FUNCTION expire_old_matches()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM matches
  WHERE overlap_end < now() - INTERVAL '2 hours';
END;
$$;

-- ============================================================
-- Helper: compute fuzzy location (300–800m random offset)
-- Used when storing event.location_fuzzy
-- ============================================================

CREATE OR REPLACE FUNCTION fuzzy_point(coords point)
RETURNS point
LANGUAGE plpgsql
AS $$
DECLARE
  -- Earth radius in meters
  r_earth   float := 6371000;
  -- Random offset 300–800m in random direction
  distance  float := 300 + random() * 500;
  bearing   float := random() * 2 * pi();
  lat_rad   float := radians(coords[1]);
  lon_rad   float := radians(coords[0]);
  new_lat   float;
  new_lon   float;
BEGIN
  new_lat := asin(
    sin(lat_rad) * cos(distance / r_earth)
    + cos(lat_rad) * sin(distance / r_earth) * cos(bearing)
  );
  new_lon := lon_rad + atan2(
    sin(bearing) * sin(distance / r_earth) * cos(lat_rad),
    cos(distance / r_earth) - sin(lat_rad) * sin(new_lat)
  );
  RETURN point(degrees(new_lon), degrees(new_lat));
END;
$$;

-- ============================================================
-- Trigger: auto-set location_fuzzy when event.location_coords set
-- ============================================================

CREATE OR REPLACE FUNCTION set_event_fuzzy_location()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.location_coords IS NOT NULL THEN
    NEW.location_fuzzy := fuzzy_point(NEW.location_coords);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_event_fuzzy_location
  BEFORE INSERT OR UPDATE OF location_coords ON events
  FOR EACH ROW
  EXECUTE FUNCTION set_event_fuzzy_location();
