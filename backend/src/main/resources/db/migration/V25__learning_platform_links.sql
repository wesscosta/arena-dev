
create table activity_provider_links (
    id uuid primary key,
    activity_id uuid not null references activities(id) on delete cascade,
    provider varchar(32) not null,
    external_class_id varchar(255),
    external_assignment_id varchar(255) not null,
    external_web_url text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    version bigint not null default 0,
    constraint uk_activity_provider unique (activity_id, provider),
    constraint uk_provider_assignment unique (provider, external_assignment_id)
);

create table submission_provider_links (
    id uuid primary key,
    submission_id uuid not null references activity_submissions(id) on delete cascade,
    provider varchar(32) not null,
    external_submission_id varchar(255) not null,
    external_user_id varchar(255),
    sync_state varchar(24) not null default 'LINKED',
    imported_at timestamptz,
    last_synced_at timestamptz,
    last_error text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    version bigint not null default 0,
    constraint uk_submission_provider unique (submission_id, provider),
    constraint uk_provider_submission unique (provider, external_submission_id)
);

create index idx_activity_provider_links_activity on activity_provider_links(activity_id);
create index idx_submission_provider_links_submission on submission_provider_links(submission_id);
