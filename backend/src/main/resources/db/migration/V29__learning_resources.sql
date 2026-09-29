create table learning_resources (
    id uuid primary key,
    classroom_id uuid not null references classrooms(id) on delete cascade,
    title varchar(180) not null,
    summary text,
    body text,
    format varchar(30) not null default 'MARKDOWN',
    source_type varchar(30) not null default 'MANUAL',
    source_url text,
    source_label varchar(255),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint ck_learning_resource_format check (format in ('MARKDOWN', 'PLAIN_TEXT', 'LINK')),
    constraint ck_learning_resource_source check (source_type in ('MANUAL', 'AI', 'TEMPLATE', 'TEXT', 'MARKDOWN', 'URL', 'NOTION'))
);

create index idx_learning_resources_classroom_updated
    on learning_resources(classroom_id, updated_at desc);
