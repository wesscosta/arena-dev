create table journey_redemption_codes (
 id uuid primary key, journey_id uuid not null unique references journeys(id) on delete cascade,
 code varchar(24) not null unique, active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table student_journey_access (
 id uuid primary key, student_id uuid not null references students(id) on delete cascade,
 journey_id uuid not null references journeys(id) on delete cascade, source varchar(20) not null,
 redeemed_at timestamptz not null default now(),
 constraint uk_student_journey_access unique (student_id, journey_id),
 constraint ck_student_journey_access_source check (source in ('CODE'))
);
create table student_journey_stage_progress (
 id uuid primary key, journey_stage_id uuid not null references journey_stages(id) on delete cascade,
 student_journey_access_id uuid not null references student_journey_access(id) on delete cascade,
 started_at timestamptz, completed_at timestamptz, updated_at timestamptz not null default now(),
 constraint uk_student_journey_stage_progress unique (journey_stage_id, student_journey_access_id)
);
create index idx_student_journey_access_student on student_journey_access(student_id, redeemed_at desc);
create index idx_student_journey_progress_access on student_journey_stage_progress(student_journey_access_id, updated_at desc);
