-- Teacher-authored annotations of incorrect options; append-only and no PII.
-- Never infer a learner misconception from an answer automatically.
create table learning_error_clinic_notes (
    id uuid primary key,
    session_id uuid not null references class_sessions(id) on delete cascade,
    run_id uuid not null references interaction_runs(id) on delete restrict,
    option_key varchar(100) not null,
    command_id uuid not null,
    teacher_note varchar(1200) not null,
    created_at timestamptz not null default now(),
    constraint ck_error_clinic_nonblank_note check (length(btrim(teacher_note)) > 0),
    constraint uk_error_clinic_command unique (run_id, command_id)
);
create index idx_error_clinic_run_notes on learning_error_clinic_notes(run_id, created_at desc);
comment on table learning_error_clinic_notes is
    'Append-only teacher explanation for an incorrect choice in a closed evaluated run; not an automatic diagnosis or grade.';
