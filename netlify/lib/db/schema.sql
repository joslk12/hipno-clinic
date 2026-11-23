-- Esquema idempotente de Netlify DB (Postgres / Neon).
-- Cada sentencia se ejecuta por separado y es seguro repetirlo.
CREATE TABLE IF NOT EXISTS blog_posts (
  id text PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  excerpt text NOT NULL DEFAULT '',
  content_markdown text NOT NULL DEFAULT '',
  content_html text NOT NULL DEFAULT '',
  cover_image text,
  status text NOT NULL CHECK (status IN ('draft', 'published')),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  published_at timestamptz
);

CREATE TABLE IF NOT EXISTS review_clients (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL DEFAULT '',
  whatsapp text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS availability_rules (
  id text PRIMARY KEY,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time text NOT NULL,
  duration_minutes integer NOT NULL CHECK (duration_minutes BETWEEN 15 AND 480),
  service_id text,
  valid_from date,
  valid_until date,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS schedule_slots (
  slot_key text PRIMARY KEY,
  starts_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL,
  service_id text,
  blocked boolean NOT NULL DEFAULT false,
  source text NOT NULL CHECK (source IN ('rule', 'manual')),
  rule_id text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS appointments (
  id text PRIMARY KEY,
  slot_key text NOT NULL,
  starts_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL,
  service_id text,
  status text NOT NULL CHECK (status IN ('reserved', 'cancelled')),
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  cancelled_at timestamptz,
  notification jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS appointments_one_active_per_slot
  ON appointments (slot_key) WHERE status = 'reserved';

CREATE INDEX IF NOT EXISTS appointments_starts_at_idx ON appointments (starts_at DESC);

CREATE INDEX IF NOT EXISTS schedule_slots_starts_at_idx ON schedule_slots (starts_at);

CREATE TABLE IF NOT EXISTS migration_state (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL
);
