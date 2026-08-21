create table activities (
    id uuid primary key,
    classroom_id uuid not null references classrooms(id),
    title varchar(180) not null,
    topic varchar(180),
    points integer not null default 0,
    on_time_bonus integer not null default 0,
    resource_kind varchar(20) not null default 'INTERNAL',
    resource_platform varchar(120),
    resource_url varchar(1000),
    copied_from_activity_id uuid references activities(id) on delete set null,
    copied_from_classroom_id uuid references classrooms(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint ck_activities_points_nonnegative check (points >= 0),
    constraint ck_activities_bonus_nonnegative check (on_time_bonus >= 0)
);

create table activity_questions (
    id uuid primary key,
    activity_id uuid not null references activities(id) on delete cascade,
    type varchar(30) not null,
    statement text not null,
    difficulty varchar(30) not null,
    points integer not null default 0,
    position integer not null,
    options_json text,
    answer_json text,
    expected_answer text,
    explanation text,
    code text,
    language varchar(80),
    expected_outcome text,
    evaluation_criteria_json text,
    constraint ck_activity_questions_points_nonnegative check (points >= 0)
);

create table session_dynamics (
    id uuid primary key,
    session_id uuid not null references class_sessions(id) on delete cascade,
    type varchar(30) not null,
    state_json text not null default '{}',
    started_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    ended_at timestamptz,
    constraint uk_session_dynamic_type unique (session_id, type)
);

create table group_history (
    id uuid primary key,
    classroom_id uuid not null references classrooms(id) on delete cascade,
    session_id uuid not null references class_sessions(id) on delete cascade,
    groups_json text not null,
    created_at timestamptz not null default now()
);

create index idx_activities_classroom_updated on activities(classroom_id, updated_at desc);
create index idx_activity_questions_activity on activity_questions(activity_id, position);
create index idx_session_dynamics_session on session_dynamics(session_id);
create index idx_group_history_classroom_created on group_history(classroom_id, created_at);
create index idx_group_history_session on group_history(session_id);
