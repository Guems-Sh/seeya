-- ============================================================
-- Enums
-- ============================================================

CREATE TYPE mood_type AS ENUM ('cafe', 'biere', 'cine', 'restau', 'balade', 'sport');
CREATE TYPE circle_type AS ENUM ('proches', 'collegues', 'connaissances', 'custom');
CREATE TYPE event_type AS ENUM ('planned', 'spontaneous');
CREATE TYPE event_status AS ENUM ('open', 'confirmed', 'cancelled');
CREATE TYPE participant_status AS ENUM ('invited', 'confirmed', 'declined');
CREATE TYPE availability_type AS ENUM ('weekday_evenings', 'weekends', 'both');

-- ============================================================
-- Tables
-- ============================================================

CREATE TABLE profiles (
  id                        uuid        PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  first_name                text        NOT NULL,
  last_name_init            text        NOT NULL CHECK (last_name_init ~ '^[A-ZÀÂÉÈÊËÎÏÔÙÛÜŸ]\.$'),
  avatar_url                text,
  bio                       text        CHECK (char_length(bio) <= 100),
  preferred_arrondissements int[],
  preferred_moods           mood_type[],
  usual_availability        availability_type,
  is_online                 boolean     NOT NULL DEFAULT true,
  location_sharing          boolean     NOT NULL DEFAULT true,
  created_at                timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE circles (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    uuid        NOT NULL REFERENCES profiles ON DELETE CASCADE,
  name        text        NOT NULL,
  type        circle_type NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE circle_members (
  circle_id   uuid NOT NULL REFERENCES circles ON DELETE CASCADE,
  profile_id  uuid NOT NULL REFERENCES profiles ON DELETE CASCADE,
  PRIMARY KEY (circle_id, profile_id)
);

CREATE TABLE slots (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES profiles ON DELETE CASCADE,
  date             date        NOT NULL,
  start_time       time        NOT NULL,
  end_time         time        NOT NULL,
  moods            mood_type[] NOT NULL DEFAULT '{}',
  is_recurring     boolean     NOT NULL DEFAULT false,
  recurrence_days  int[],
  expires_at       timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

CREATE TABLE events (
  id               uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id       uuid         NOT NULL REFERENCES profiles ON DELETE CASCADE,
  title            text,
  mood             mood_type    NOT NULL,
  type             event_type   NOT NULL,
  status           event_status NOT NULL DEFAULT 'open',
  date             date,
  start_time       time,
  end_time         time,
  arrondissement   int          CHECK (arrondissement BETWEEN 1 AND 20),
  location_name    text,
  location_url     text,
  location_coords  point,
  location_fuzzy   point,
  max_participants int          CHECK (max_participants > 0),
  target_circles   uuid[],
  created_at       timestamptz  NOT NULL DEFAULT now()
);

CREATE TABLE event_participants (
  event_id    uuid               NOT NULL REFERENCES events ON DELETE CASCADE,
  profile_id  uuid               NOT NULL REFERENCES profiles ON DELETE CASCADE,
  status      participant_status NOT NULL DEFAULT 'invited',
  joined_at   timestamptz        NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, profile_id)
);

CREATE TABLE matches (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a         uuid        NOT NULL REFERENCES profiles ON DELETE CASCADE,
  user_b         uuid        NOT NULL REFERENCES profiles ON DELETE CASCADE,
  slot_a         uuid        NOT NULL REFERENCES slots ON DELETE CASCADE,
  slot_b         uuid        NOT NULL REFERENCES slots ON DELETE CASCADE,
  overlap_start  timestamptz NOT NULL,
  overlap_end    timestamptz NOT NULL,
  shared_moods   mood_type[] NOT NULL DEFAULT '{}',
  notified       boolean     NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE invitations (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by  uuid        NOT NULL REFERENCES profiles ON DELETE CASCADE,
  token       text        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'base64url'),
  circle_id   uuid        REFERENCES circles ON DELETE SET NULL,
  uses_count  int         NOT NULL DEFAULT 0,
  expires_at  timestamptz NOT NULL DEFAULT now() + INTERVAL '7 days',
  used_at     timestamptz
);

CREATE TABLE push_subscriptions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES profiles ON DELETE CASCADE,
  endpoint    text        NOT NULL UNIQUE,
  p256dh      text        NOT NULL,
  auth_key    text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX idx_circles_owner           ON circles           (owner_id);
CREATE INDEX idx_circle_members_circle   ON circle_members    (circle_id);
CREATE INDEX idx_circle_members_profile  ON circle_members    (profile_id);
CREATE INDEX idx_slots_user              ON slots             (user_id);
CREATE INDEX idx_slots_date              ON slots             (date);
CREATE INDEX idx_events_creator          ON events            (creator_id);
CREATE INDEX idx_events_status           ON events            (status);
CREATE INDEX idx_events_date             ON events            (date);
CREATE INDEX idx_event_participants_event   ON event_participants (event_id);
CREATE INDEX idx_event_participants_profile ON event_participants (profile_id);
CREATE INDEX idx_matches_user_a          ON matches           (user_a);
CREATE INDEX idx_matches_user_b          ON matches           (user_b);
CREATE INDEX idx_invitations_token       ON invitations       (token);
CREATE INDEX idx_invitations_created_by  ON invitations       (created_by);
CREATE INDEX idx_push_subs_user          ON push_subscriptions (user_id);
