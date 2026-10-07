create table interaction_definitions (
    id uuid primary key,
    prompt text not null,
    response_kind varchar(20) not null,
    response_config_json text not null default '{}',
    evaluation_mode varchar(30) not null,
    evaluation_config_json text not null default '{}',
    presentation_mode varchar(30) not null default 'DEFAULT',
    learning_target_id uuid references learning_targets(id) on delete restrict,
    produces_evidence boolean not null default false,
    content_source_type varchar(80),
    content_source_id varchar(255),
    content_source_version integer,
    content_anchor text,
    provenance_origin varchar(30) not null,
    provenance_source_ref text,
    provenance_created_by uuid,
    provenance_reviewed_by uuid,
    provenance_created_at timestamptz not null,
    status varchar(20) not null default 'DRAFT',
    schema_version integer not null default 1,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint ck_interaction_definitions_response_kind
        check (response_kind in ('CHOICE', 'TEXT')),
    constraint ck_interaction_definitions_evaluation_mode
        check (evaluation_mode in ('NONE', 'CORRECT_ANSWER')),
    constraint ck_interaction_definitions_presentation_mode
        check (presentation_mode in ('DEFAULT', 'WORD_CLOUD')),
    constraint ck_interaction_definitions_status
        check (status in ('DRAFT', 'ACTIVE', 'ARCHIVED')),
    constraint ck_interaction_definitions_schema_version
        check (schema_version >= 1),
    constraint ck_interaction_definitions_content_ref
        check (
            (content_source_type is null and content_source_id is null)
            or
            (content_source_type is not null and content_source_id is not null)
        ),
    constraint ck_interaction_definitions_content_version
        check (content_source_version is null or content_source_version >= 1),
    constraint ck_interaction_definitions_word_cloud_text
        check (presentation_mode <> 'WORD_CLOUD' or response_kind = 'TEXT')
);

create index idx_interaction_definitions_learning_target
    on interaction_definitions(learning_target_id);

create index idx_interaction_definitions_status
    on interaction_definitions(status, response_kind);

create table interaction_options (
    id uuid primary key,
    interaction_definition_id uuid not null references interaction_definitions(id) on delete cascade,
    option_key varchar(100) not null,
    label text not null,
    position integer not null,
    metadata_json text not null default '{}',
    constraint uk_interaction_options_key unique (interaction_definition_id, option_key),
    constraint uk_interaction_options_position unique (interaction_definition_id, position),
    constraint ck_interaction_options_position check (position >= 0)
);

create index idx_interaction_options_definition
    on interaction_options(interaction_definition_id, position);

comment on table interaction_definitions is
    'Reusable Arena interaction definitions independent from ActivityQuestion and legacy runtime tables.';
comment on column interaction_options.option_key is
    'Stable logical key used by responses/evaluation; it is not the database UUID.';
