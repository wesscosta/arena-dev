
create table activity_submissions (
    id uuid primary key,
    activity_id uuid not null references activities(id) on delete cascade,
    enrollment_id uuid not null references enrollments(id) on delete restrict,
    status varchar(24) not null,
    source varchar(24) not null,
    attempt_number integer not null default 1,
    started_at timestamptz not null default now(),
    submitted_at timestamptz,
    returned_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    version bigint not null default 0,
    constraint ck_activity_submission_attempt_positive check (attempt_number > 0),
    constraint ck_activity_submission_status check (status in ('IN_PROGRESS', 'SUBMITTED', 'UNDER_REVIEW', 'GRADED', 'RETURNED')),
    constraint ck_activity_submission_source check (source in ('ARENA', 'TEAMS', 'GOOGLE_CLASSROOM', 'IMPORT')),
    constraint ck_activity_submission_submitted_at check ((status = 'IN_PROGRESS' and submitted_at is null) or (status <> 'IN_PROGRESS' and submitted_at is not null)),
    constraint ck_activity_submission_returned_at check (status <> 'RETURNED' or returned_at is not null),
    constraint uk_activity_submission_attempt unique (activity_id, enrollment_id, attempt_number)
);

create index idx_activity_submissions_activity_status
    on activity_submissions(activity_id, status, updated_at desc);

create index idx_activity_submissions_enrollment
    on activity_submissions(enrollment_id, updated_at desc);
