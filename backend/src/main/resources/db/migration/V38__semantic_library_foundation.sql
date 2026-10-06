alter table learning_resources
    add column subject varchar(160),
    add column language varchar(20),
    add column content_sha256 varchar(64),
    add column outline_json text,
    add column outline_parser_version varchar(40);

create table learning_resource_tags (
    resource_id uuid not null references learning_resources(id) on delete cascade,
    tag varchar(80) not null,
    primary key (resource_id, tag)
);

create index idx_learning_resource_subject
    on learning_resources (lower(subject))
    where subject is not null;

create index idx_learning_resource_language
    on learning_resources (lower(language))
    where language is not null;

create index idx_learning_resource_tags_tag
    on learning_resource_tags (lower(tag));

comment on column learning_resources.subject is
    'Flexible editorial subject for Library discovery. It is not a KnowledgeNode or rigid taxonomy.';
comment on column learning_resources.language is
    'BCP-47-like editorial language hint, for example pt-BR.';
comment on column learning_resources.content_sha256 is
    'SHA-256 of the current canonical content representation.';
comment on column learning_resources.outline_json is
    'Discardable/rebuildable structural outline derived from the current resource body.';
comment on column learning_resources.outline_parser_version is
    'Parser version that produced outline_json.';
