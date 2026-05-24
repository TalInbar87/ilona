-- migration-v23: Payment tracking
-- patients: requires_payment flag
-- treatments: payment_received, invoice_issued (nullable — null = old treatment, not tracked)

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS requires_payment boolean NOT NULL DEFAULT false;

ALTER TABLE treatments
  ADD COLUMN IF NOT EXISTS payment_received boolean,
  ADD COLUMN IF NOT EXISTS invoice_issued   boolean;
