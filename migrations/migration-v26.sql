-- migration-v26: Payment tracking + meeting URL for supervision
ALTER TABLE supervisees
  ADD COLUMN IF NOT EXISTS requires_payment boolean NOT NULL DEFAULT false;

ALTER TABLE supervision_sessions
  ADD COLUMN IF NOT EXISTS payment_received boolean,
  ADD COLUMN IF NOT EXISTS invoice_issued   boolean,
  ADD COLUMN IF NOT EXISTS meeting_url      text;
