-- Arena Dev v0.7 / 15.0C
-- Materializa o Integration Core sem remover as estruturas legadas do V25.

create table integration_connections (
    id uuid primary key,
    provider varchar(40) not null,
    display_name varchar(160) not null,
    external_tenant_id varchar(255),
    credential_reference varchar(500),
    status varchar(24) not null default 'DRAFT',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    version bigint not null default 0,
    constraint ck_integration_connections_provider
        check (provider in ('MICROSOFT_TEAMS', 'GOOGLE_CLASSROOM')),
    constraint ck_integration_connections_status
        check (status in ('DRAFT', 'ACTIVE', 'DISABLED')),
    constraint uk_integration_connection_tenant unique (provider, external_tenant_id)
);

create table external_classroom_links (
    id uuid primary key,
    connection_id uuid not null references integration_connections(id) on delete cascade,
    classroom_id uuid not null references classrooms(id) on delete cascade,
    external_classroom_id varchar(255) not null,
    external_web_url text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    version bigint not null default 0,
    constraint uk_external_classroom_internal unique (connection_id, classroom_id),
    constraint uk_external_classroom_external unique (connection_id, external_classroom_id)
);

create table external_student_links (
    id uuid primary key,
    connection_id uuid not null references integration_connections(id) on delete cascade,
    external_classroom_link_id uuid not null references external_classroom_links(id) on delete cascade,
    enrollment_id uuid not null references enrollments(id) on delete cascade,
    external_user_id varchar(255) not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    version bigint not null default 0,
    constraint uk_external_student_internal unique (connection_id, enrollment_id),
    constraint uk_external_student_external unique (connection_id, external_classroom_link_id, external_user_id)
);

create table external_activity_links (
    id uuid primary key,
    connection_id uuid not null references integration_connections(id) on delete cascade,
    external_classroom_link_id uuid not null references external_classroom_links(id) on delete cascade,
    activity_id uuid not null references activities(id) on delete cascade,
    external_activity_id varchar(255) not null,
    external_web_url text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    version bigint not null default 0,
    constraint uk_external_activity_internal unique (connection_id, activity_id),
    constraint uk_external_activity_external unique (connection_id, external_activity_id)
);

create table external_submission_links (
    id uuid primary key,
    connection_id uuid not null references integration_connections(id) on delete cascade,
    external_activity_link_id uuid not null references external_activity_links(id) on delete cascade,
    external_student_link_id uuid references external_student_links(id) on delete set null,
    submission_id uuid not null references activity_submissions(id) on delete cascade,
    external_submission_id varchar(255) not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    version bigint not null default 0,
    constraint uk_external_submission_internal unique (connection_id, submission_id),
    constraint uk_external_submission_external unique (connection_id, external_submission_id)
);

create table sync_executions (
    id uuid primary key,
    connection_id uuid not null references integration_connections(id) on delete cascade,
    scope varchar(80) not null,
    direction varchar(24) not null,
    status varchar(32) not null default 'PENDING',
    error_summary text,
    created_at timestamptz not null default now(),
    started_at timestamptz,
    finished_at timestamptz,
    version bigint not null default 0,
    constraint ck_sync_execution_direction
        check (direction in ('IMPORT', 'EXPORT', 'BIDIRECTIONAL')),
    constraint ck_sync_execution_status
        check (status in ('PENDING', 'RUNNING', 'PARTIALLY_SUCCEEDED', 'SUCCEEDED', 'FAILED', 'CANCELLED'))
);

create table sync_items (
    id uuid primary key,
    execution_id uuid not null references sync_executions(id) on delete cascade,
    item_type varchar(80) not null,
    item_key varchar(500) not null,
    status varchar(24) not null default 'PENDING',
    error_message text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    version bigint not null default 0,
    constraint ck_sync_item_status
        check (status in ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'SKIPPED')),
    constraint uk_sync_item_key unique (execution_id, item_type, item_key)
);

create table sync_checkpoints (
    connection_id uuid not null references integration_connections(id) on delete cascade,
    scope varchar(80) not null,
    cursor text not null,
    updated_at timestamptz not null default now(),
    version bigint not null default 0,
    primary key (connection_id, scope)
);

create index idx_external_classroom_links_classroom on external_classroom_links(classroom_id);
create index idx_external_student_links_enrollment on external_student_links(enrollment_id);
create index idx_external_activity_links_activity on external_activity_links(activity_id);
create index idx_external_submission_links_submission on external_submission_links(submission_id);
create index idx_sync_executions_connection_created on sync_executions(connection_id, created_at desc);
create index idx_sync_items_execution_status on sync_items(execution_id, status);

insert into integration_connections (
    id, provider, display_name, status, created_at, updated_at, version
)
select distinct
    case provider
        when 'TEAMS' then '00000000-0000-0000-0000-000000000701'::uuid
        when 'GOOGLE_CLASSROOM' then '00000000-0000-0000-0000-000000000702'::uuid
    end,
    case provider
        when 'TEAMS' then 'MICROSOFT_TEAMS'
        when 'GOOGLE_CLASSROOM' then 'GOOGLE_CLASSROOM'
    end,
    case provider
        when 'TEAMS' then 'Legacy Microsoft Teams'
        when 'GOOGLE_CLASSROOM' then 'Legacy Google Classroom'
    end,
    'DRAFT',
    now(),
    now(),
    0
from (
    select provider from activity_provider_links
    union
    select provider from submission_provider_links
) legacy_providers
where provider in ('TEAMS', 'GOOGLE_CLASSROOM')
on conflict (id) do nothing;

do $$
begin
    if exists (
        select 1
        from activity_provider_links apl
        join activities a on a.id = apl.activity_id
        where apl.external_class_id is not null
        group by apl.provider, a.classroom_id
        having count(distinct apl.external_class_id) > 1
    ) then
        raise exception 'V26: multiple external_class_id values found for the same provider/classroom';
    end if;
end $$;

with legacy_classroom_pairs as (
    select apl.provider, a.classroom_id, max(apl.external_class_id) as external_class_id
    from activity_provider_links apl
    join activities a on a.id = apl.activity_id
    group by apl.provider, a.classroom_id
    union
    select spl.provider, a.classroom_id, max(apl.external_class_id) as external_class_id
    from submission_provider_links spl
    join activity_submissions s on s.id = spl.submission_id
    join activities a on a.id = s.activity_id
    left join activity_provider_links apl
        on apl.activity_id = s.activity_id
       and apl.provider = spl.provider
    group by spl.provider, a.classroom_id
),
normalized as (
    select
        p.provider,
        p.classroom_id,
        coalesce(max(p.external_class_id), 'legacy-classroom:' || p.classroom_id::text) as external_classroom_id,
        case p.provider
            when 'TEAMS' then '00000000-0000-0000-0000-000000000701'::uuid
            when 'GOOGLE_CLASSROOM' then '00000000-0000-0000-0000-000000000702'::uuid
        end as connection_id
    from legacy_classroom_pairs p
    where p.provider in ('TEAMS', 'GOOGLE_CLASSROOM')
    group by p.provider, p.classroom_id
)
insert into external_classroom_links (
    id, connection_id, classroom_id, external_classroom_id,
    external_web_url, created_at, updated_at, version
)
select
    md5(connection_id::text || ':' || classroom_id::text)::uuid,
    connection_id,
    classroom_id,
    external_classroom_id,
    null,
    now(),
    now(),
    0
from normalized
on conflict (connection_id, classroom_id) do nothing;

with source_pairs as (
    select apl.activity_id, apl.provider
    from activity_provider_links apl
    union
    select s.activity_id, spl.provider
    from submission_provider_links spl
    join activity_submissions s on s.id = spl.submission_id
),
normalized as (
    select
        sp.activity_id,
        sp.provider,
        case sp.provider
            when 'TEAMS' then '00000000-0000-0000-0000-000000000701'::uuid
            when 'GOOGLE_CLASSROOM' then '00000000-0000-0000-0000-000000000702'::uuid
        end as connection_id,
        apl.id as legacy_link_id,
        coalesce(apl.external_assignment_id, 'legacy-activity:' || sp.activity_id::text) as external_activity_id,
        apl.external_web_url
    from source_pairs sp
    left join activity_provider_links apl
        on apl.activity_id = sp.activity_id
       and apl.provider = sp.provider
    where sp.provider in ('TEAMS', 'GOOGLE_CLASSROOM')
)
insert into external_activity_links (
    id, connection_id, external_classroom_link_id, activity_id,
    external_activity_id, external_web_url, created_at, updated_at, version
)
select
    coalesce(
        legacy_link_id,
        md5(n.connection_id::text || ':activity:' || n.activity_id::text)::uuid
    ),
    n.connection_id,
    ecl.id,
    n.activity_id,
    n.external_activity_id,
    n.external_web_url,
    now(),
    now(),
    0
from normalized n
join activities a on a.id = n.activity_id
join external_classroom_links ecl
  on ecl.connection_id = n.connection_id
 and ecl.classroom_id = a.classroom_id
on conflict (connection_id, activity_id) do nothing;

insert into external_student_links (
    id, connection_id, external_classroom_link_id, enrollment_id,
    external_user_id, created_at, updated_at, version
)
select distinct
    md5(c.connection_id::text || ':student:' || s.enrollment_id::text)::uuid,
    c.connection_id,
    ecl.id,
    s.enrollment_id,
    spl.external_user_id,
    coalesce(spl.created_at, now()),
    coalesce(spl.updated_at, now()),
    0
from submission_provider_links spl
join activity_submissions s on s.id = spl.submission_id
join activities a on a.id = s.activity_id
cross join lateral (
    select case spl.provider
        when 'TEAMS' then '00000000-0000-0000-0000-000000000701'::uuid
        when 'GOOGLE_CLASSROOM' then '00000000-0000-0000-0000-000000000702'::uuid
    end as connection_id
) c
join external_classroom_links ecl
  on ecl.connection_id = c.connection_id
 and ecl.classroom_id = a.classroom_id
where spl.provider in ('TEAMS', 'GOOGLE_CLASSROOM')
  and spl.external_user_id is not null
on conflict (connection_id, enrollment_id) do nothing;

insert into external_submission_links (
    id, connection_id, external_activity_link_id, external_student_link_id,
    submission_id, external_submission_id, created_at, updated_at, version
)
select
    spl.id,
    c.connection_id,
    eal.id,
    esl.id,
    spl.submission_id,
    spl.external_submission_id,
    coalesce(spl.created_at, now()),
    coalesce(spl.updated_at, now()),
    0
from submission_provider_links spl
join activity_submissions s on s.id = spl.submission_id
cross join lateral (
    select case spl.provider
        when 'TEAMS' then '00000000-0000-0000-0000-000000000701'::uuid
        when 'GOOGLE_CLASSROOM' then '00000000-0000-0000-0000-000000000702'::uuid
    end as connection_id
) c
join external_activity_links eal
  on eal.connection_id = c.connection_id
 and eal.activity_id = s.activity_id
left join external_student_links esl
  on esl.connection_id = c.connection_id
 and esl.enrollment_id = s.enrollment_id
where spl.provider in ('TEAMS', 'GOOGLE_CLASSROOM')
on conflict (connection_id, submission_id) do nothing;

alter table activity_submissions
    drop constraint ck_activity_submission_source;

update activity_submissions
set source = 'EXTERNAL'
where source in ('TEAMS', 'GOOGLE_CLASSROOM');

alter table activity_submissions
    add constraint ck_activity_submission_source
    check (source in ('ARENA', 'EXTERNAL', 'IMPORT'));

-- activity_provider_links e submission_provider_links permanecem como histórico V25.
