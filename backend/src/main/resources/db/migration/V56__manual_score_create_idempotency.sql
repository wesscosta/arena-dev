-- Additive request identity for single-event XP creation (manual/Buzzer), independent of V53 reversal identity.
-- Historical entries and batch imports remain unchanged (NULL means no client replay key).
alter table score_events add column create_request_id uuid;
create unique index uk_score_events_create_request_id
    on score_events(create_request_id)
    where create_request_id is not null;
alter table score_events add constraint ck_score_create_request_only_origins
    check (create_request_id is null or reversal_of is null);
comment on column score_events.create_request_id is
    'Idempotency key for single score creation. Repeated identical requests return original event; different payloads conflict.';
