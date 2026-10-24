-- Prazo de atividade por tentativa. Nulo = sem limite; aplicações anteriores preservadas.
alter table activities add column time_limit_minutes integer;
alter table activities add constraint chk_activity_time_limit_minutes
    check (time_limit_minutes is null or time_limit_minutes between 1 and 480);
alter table activity_submissions add column deadline_at timestamp with time zone;
create index idx_activity_submissions_deadline_at
    on activity_submissions (deadline_at) where deadline_at is not null;
