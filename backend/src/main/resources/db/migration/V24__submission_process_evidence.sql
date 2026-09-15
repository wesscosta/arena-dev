create table submission_process_events (
    id uuid primary key,
    submission_id uuid not null references activity_submissions(id) on delete cascade,
    item_id uuid null references submission_items(id) on delete set null,
    event_type varchar(32) not null,
    metadata_json text,
    occurred_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    constraint ck_submission_process_event_type check (event_type in (
        'ITEM_SAVED', 'PASTE', 'SUBMITTED'
    ))
);

create index idx_submission_process_events_submission
    on submission_process_events(submission_id, occurred_at);
