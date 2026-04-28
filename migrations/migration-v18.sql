-- migration-v18: recurring appointment series
-- Run in Supabase SQL Editor

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS series_id    uuid;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS series_total integer;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS series_index integer;

-- Index for fast series lookup
CREATE INDEX IF NOT EXISTS appointments_series_id_idx ON appointments(series_id)
  WHERE series_id IS NOT NULL;
