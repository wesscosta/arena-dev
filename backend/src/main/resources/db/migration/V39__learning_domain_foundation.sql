create table learning_targets (
    id uuid primary key,
    title varchar(180) not null,
    type varchar(30) not null,
    parent_id uuid references learning_targets(id) on delete restrict,
    status varchar(20) not null default 'ACTIVE',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint ck_learning_targets_type
        check (type in ('TOPIC', 'OBJECTIVE', 'COMPETENCY')),
    constraint ck_learning_targets_status
        check (status in ('ACTIVE', 'ARCHIVED')),
    constraint ck_learning_targets_not_self
        check (parent_id is null or parent_id <> id)
);

create index idx_learning_targets_parent
    on learning_targets(parent_id);

create index idx_learning_targets_type_status
    on learning_targets(type, status);

comment on table learning_targets is
    'Semantic learning targets observed by interactions and future learning evidence; distinct from editorial subject/tags.';
comment on column learning_targets.parent_id is
    'Optional hierarchy only; v0.9 does not introduce a knowledge or prerequisite graph.';
