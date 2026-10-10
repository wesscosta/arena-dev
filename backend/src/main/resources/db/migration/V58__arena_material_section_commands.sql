-- v0.11 / 11.3: durable idempotent teacher commands for synchronized material sections.
-- The active section is stored in LIVE_STAGE's versioned state; not in the immutable body snapshot.
create table arena_material_section_commands (
  session_id uuid not null references class_sessions(id) on delete cascade,
  request_id uuid not null,
  publication_id uuid not null references arena_material_publications(id) on delete cascade,
  section_anchor varchar(220),
  expected_stage_version bigint not null check (expected_stage_version >= 0),
  applied_stage_version bigint not null check (applied_stage_version > 0),
  created_at timestamptz not null default now(),
  primary key (session_id, request_id)
);
create index idx_arena_material_section_commands_publication
  on arena_material_section_commands(publication_id);
comment on table arena_material_section_commands is
  'Immutable record of section navigation commands; session lock and stageVersion provide CAS. No Library body copies.';
