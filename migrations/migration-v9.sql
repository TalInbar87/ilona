-- Migration v9: Add email to patients
alter table patients
  add column if not exists email text;
