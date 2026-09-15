create table activity_rubric_criteria (
    id uuid primary key,
    activity_id uuid not null references activities(id) on delete restrict,
    title varchar(160) not null,
    description text,
    max_points numeric(8,2) not null,
    position integer not null,
    active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    version bigint not null default 0,
    constraint ck_activity_rubric_max_points check (max_points > 0),
    constraint ck_activity_rubric_position check (position >= 0)
);

create index idx_activity_rubric_active
    on activity_rubric_criteria(activity_id, active, position);

create table assessment_criteria (
    id uuid primary key,
    assessment_id uuid not null references submission_assessments(id) on delete cascade,
    rubric_criterion_id uuid references activity_rubric_criteria(id) on delete set null,
    title_snapshot varchar(160) not null,
    description_snapshot text,
    max_points numeric(8,2) not null,
    awarded_points numeric(8,2),
    teacher_comment text,
    position integer not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    version bigint not null default 0,
    constraint ck_assessment_criterion_max_points check (max_points > 0),
    constraint ck_assessment_criterion_awarded check (
        awarded_points is null or (awarded_points >= 0 and awarded_points <= max_points)
    ),
    constraint uk_assessment_criterion_position unique (assessment_id, position)
);

create index idx_assessment_criteria_assessment
    on assessment_criteria(assessment_id, position);
