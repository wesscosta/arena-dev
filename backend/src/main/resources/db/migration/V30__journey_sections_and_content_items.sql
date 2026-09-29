create table journey_sections (
    id uuid primary key,
    journey_id uuid not null references journeys(id) on delete cascade,
    position integer not null,
    title varchar(180) not null,
    description text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint ck_journey_section_position check (position >= 0)
);

alter table journey_stages
    add column section_id uuid references journey_sections(id) on delete set null,
    add column item_type varchar(30) not null default 'ACTIVITY',
    add column learning_resource_id uuid references learning_resources(id) on delete set null;

alter table journey_stages
    add constraint ck_journey_stage_item_type
        check (item_type in ('CONTENT', 'ACTIVITY', 'QUIZ', 'CHALLENGE', 'CHECKPOINT', 'EXTERNAL_RESOURCE'));

create index idx_journey_sections_journey_position
    on journey_sections(journey_id, position);

create index idx_journey_stages_section_position
    on journey_stages(section_id, position);

create index idx_journey_stages_learning_resource
    on journey_stages(learning_resource_id);
