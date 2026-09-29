alter table learning_resources
    add column source_reference text,
    add column source_snapshot_at timestamptz,
    add column source_content_sha256 varchar(64);

comment on column learning_resources.source_reference is
    'Stable reference to the imported source at snapshot time (URL or filename/label).';
comment on column learning_resources.source_snapshot_at is
    'When the external/imported source became an Arena-owned snapshot.';
comment on column learning_resources.source_content_sha256 is
    'SHA-256 of the materialized content snapshot for audit and future versioning.';
