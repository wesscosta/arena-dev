-- Preserve the immutable score ledger and the original unique reversal guard from V3.
-- A UUID command provides safe retries of one reversal, without permitting a second reversal.
alter table score_events add column reversal_request_id uuid;
create unique index uk_score_events_reversal_request_id
    on score_events(reversal_request_id)
    where reversal_request_id is not null;
alter table score_events add constraint ck_score_reversal_request_only_reversals
    check (reversal_request_id is null or reversal_of is not null);
comment on column score_events.reversal_request_id is
    'Client idempotency key for reversing an event; null for historical reversals and ordinary score entries.';
