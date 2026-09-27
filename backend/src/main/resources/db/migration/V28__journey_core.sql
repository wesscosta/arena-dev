create table journeys (
    id uuid primary key,
    classroom_id uuid not null references classrooms(id) on delete cascade,
    title varchar(180) not null,
    description text,
    status varchar(20) not null default 'DRAFT',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint ck_journeys_status check (status in ('DRAFT', 'PUBLISHED', 'ARCHIVED'))
);

create table journey_stages (
    id uuid primary key,
    journey_id uuid not null references journeys(id) on delete cascade,
    activity_id uuid references activities(id),
    position integer not null,
    title varchar(180) not null,
    description text,
    unlock_rule varchar(40) not null default 'PREVIOUS_STAGE_COMPLETED',
    completion_rule varchar(40) not null default 'MANUAL',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint ck_journey_stage_position check (position >= 0),
    constraint ck_journey_stage_unlock_rule check (unlock_rule in ('IMMEDIATE', 'PREVIOUS_STAGE_COMPLETED')),
    constraint ck_journey_stage_completion_rule check (completion_rule in ('MANUAL', 'ACTIVITY_SUBMITTED', 'ACTIVITY_GRADED'))
);

create table journey_stage_progress (
    id uuid primary key,
    journey_stage_id uuid not null references journey_stages(id) on delete cascade,
    enrollment_id uuid not null references enrollments(id) on delete cascade,
    started_at timestamptz,
    completed_at timestamptz,
    updated_at timestamptz not null default now(),
    constraint uk_journey_stage_progress unique (journey_stage_id, enrollment_id)
);

create index idx_journeys_classroom_updated on journeys(classroom_id, updated_at desc);
create index idx_journey_stages_journey_position on journey_stages(journey_id, position);
create index idx_journey_stage_progress_enrollment on journey_stage_progress(enrollment_id, updated_at desc);
