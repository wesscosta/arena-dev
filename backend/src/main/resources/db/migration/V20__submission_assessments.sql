
create table submission_assessments (
    id uuid primary key,
    submission_id uuid not null unique references activity_submissions(id) on delete cascade,
    teacher_notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    version bigint not null default 0
);

create index idx_submission_assessments_submission
    on submission_assessments(submission_id);
