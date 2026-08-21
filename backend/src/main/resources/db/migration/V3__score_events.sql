create table score_events (
    id uuid primary key,
    classroom_id uuid not null references classrooms(id),
    student_id uuid not null references students(id),
    session_id uuid references class_sessions(id),
    points integer not null,
    category varchar(30) not null,
    description varchar(300) not null,
    source varchar(30) not null,
    activity_ref varchar(120),
    question_ref varchar(120),
    reversal_of uuid references score_events(id),
    created_at timestamptz not null default now(),
    constraint ck_score_events_points_nonzero check (points <> 0)
);

create index idx_score_events_classroom_created_at on score_events(classroom_id, created_at);
create index idx_score_events_student_created_at on score_events(student_id, created_at);
create index idx_score_events_session on score_events(session_id);
create index idx_score_events_source on score_events(source);
create unique index uk_score_events_single_reversal
    on score_events(reversal_of)
    where reversal_of is not null;
