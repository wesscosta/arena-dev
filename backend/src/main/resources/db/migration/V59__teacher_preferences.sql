-- v0.11.0-rc.5: teacher-chosen defaults. One row per teacher account.
create table teacher_preferences (
    username varchar(120) primary key,
    session_timeout_minutes integer not null
        constraint ck_teacher_preferences_session_timeout check (session_timeout_minutes between 30 and 720),
    updated_at timestamptz not null default now()
);
