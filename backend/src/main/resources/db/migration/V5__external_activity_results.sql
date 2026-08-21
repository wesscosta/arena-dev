create table external_result_imports (
    id uuid primary key,
    classroom_id uuid not null references classrooms(id) on delete cascade,
    activity_id uuid not null references activities(id) on delete cascade,
    platform varchar(120),
    source_name varchar(255),
    fingerprint varchar(64) not null,
    scoring_mode varchar(30) not null default 'PROPORTIONAL',
    fallback_max_score numeric(12,4),
    row_count integer not null,
    matched_count integer not null,
    imported_count integer not null,
    created_at timestamptz not null default now(),
    constraint uk_external_result_import_activity_fingerprint unique (activity_id, fingerprint),
    constraint ck_external_result_import_counts check (
        row_count >= 0 and matched_count >= 0 and imported_count >= 0
        and matched_count <= row_count and imported_count <= matched_count
    )
);

create table external_result_rows (
    id uuid primary key,
    import_id uuid not null references external_result_imports(id) on delete cascade,
    row_index integer not null,
    participant_name varchar(180),
    participant_registration varchar(120),
    raw_score numeric(12,4),
    max_score numeric(12,4),
    percentage numeric(8,4),
    matched_student_id uuid references students(id) on delete set null,
    xp_awarded integer not null default 0,
    status varchar(30) not null,
    note varchar(300),
    raw_payload text,
    constraint uk_external_result_row_index unique (import_id, row_index)
);

create index idx_external_result_imports_activity_created on external_result_imports(activity_id, created_at desc);
create index idx_external_result_imports_classroom_created on external_result_imports(classroom_id, created_at desc);
create index idx_external_result_rows_import on external_result_rows(import_id, row_index);
create index idx_external_result_rows_student on external_result_rows(matched_student_id);
