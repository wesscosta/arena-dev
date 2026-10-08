-- One canonical Library reference in the live teacher session. No material body copies.
create table arena_session_resource_placements (
    session_id uuid primary key references class_sessions(id) on delete cascade,
    resource_id uuid not null references learning_resources(id) on delete restrict,
    updated_at timestamptz not null default now()
);
create index idx_arena_session_resource_placements_resource
    on arena_session_resource_placements(resource_id);
comment on table arena_session_resource_placements is
    'Teacher-only contextual Library placement: does not publish to projector/student or claim evidence/mastery.';
