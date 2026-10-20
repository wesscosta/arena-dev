-- v0.11.0-rc.5: removing a student keeps the class history (XP ledger,
-- aggregated evidence) but drops personal data. anonymized_at marks it.
alter table students add column anonymized_at timestamptz;
