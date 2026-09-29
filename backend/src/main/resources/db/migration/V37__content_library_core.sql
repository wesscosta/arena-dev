alter table learning_resources
    alter column classroom_id drop not null,
    add column library_visible boolean not null default false,
    add column revision integer not null default 1,
    add column archived_at timestamptz;

alter table learning_resources
    add constraint ck_learning_resource_revision check (revision >= 1);

create index idx_learning_resources_library_updated
    on learning_resources(library_visible, updated_at desc)
    where library_visible = true;

alter table journey_stages
    add column resource_snapshot_body text,
    add column resource_snapshot_format varchar(30),
    add column resource_snapshot_source_url text,
    add column resource_snapshot_source_label varchar(255),
    add column resource_snapshot_revision integer;

update journey_stages stage
set resource_snapshot_body = resource.body,
    resource_snapshot_format = resource.format,
    resource_snapshot_source_url = resource.source_url,
    resource_snapshot_source_label = resource.source_label,
    resource_snapshot_revision = resource.revision
from learning_resources resource
where stage.learning_resource_id = resource.id;

comment on column learning_resources.library_visible is
    'Exposes the resource in the teacher Content Library. Existing Journey-owned resources remain false.';
comment on column learning_resources.revision is
    'Monotonic revision used to identify the source revision captured by a Journey snapshot.';
comment on column journey_stages.resource_snapshot_revision is
    'LearningResource revision materialized into this Journey stage; runtime study content reads the snapshot.';
