create table classrooms (
    id uuid primary key,
    name varchar(120) not null,
    code varchar(40) unique,
    active boolean not null default true,
    created_at timestamptz not null default now()
);

create table students (
    id uuid primary key,
    registration varchar(60) unique,
    name varchar(140) not null,
    nickname varchar(80),
    active boolean not null default true,
    created_at timestamptz not null default now()
);

create table enrollments (
    id uuid primary key,
    classroom_id uuid not null references classrooms(id),
    student_id uuid not null references students(id),
    active boolean not null default true,
    joined_at timestamptz not null default now(),
    constraint uk_enrollment_classroom_student unique (classroom_id, student_id)
);

create table class_sessions (
    id uuid primary key,
    classroom_id uuid not null references classrooms(id),
    title varchar(160) not null,
    status varchar(20) not null,
    started_at timestamptz not null default now(),
    ended_at timestamptz
);

create table session_participants (
    id uuid primary key,
    session_id uuid not null references class_sessions(id),
    student_id uuid not null references students(id),
    present boolean not null default false,
    connected boolean not null default false,
    joined_at timestamptz,
    left_at timestamptz,
    constraint uk_session_participant unique (session_id, student_id)
);

create index idx_enrollments_classroom on enrollments(classroom_id);
create index idx_enrollments_student on enrollments(student_id);
create index idx_class_sessions_classroom on class_sessions(classroom_id);
create index idx_session_participants_session on session_participants(session_id);
create index idx_session_participants_student on session_participants(student_id);
