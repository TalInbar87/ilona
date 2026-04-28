-- migration-v3.sql
-- Add goals column to diagnoses table

ALTER TABLE diagnoses ADD COLUMN IF NOT EXISTS goals text;
