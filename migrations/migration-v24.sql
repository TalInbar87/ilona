-- migration-v24: meeting_url for online meetings
ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS meeting_url text;
