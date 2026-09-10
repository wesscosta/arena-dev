create table enrollment_device_claims (
    id uuid primary key,
    enrollment_id uuid not null references enrollments(id) on delete cascade,
    token_hash varchar(64) not null unique,
    created_at timestamptz not null default now(),
    last_used_at timestamptz not null default now(),
    expires_at timestamptz not null,
    revoked_at timestamptz
);

create index idx_enrollment_device_claims_enrollment
    on enrollment_device_claims(enrollment_id);

create index idx_enrollment_device_claims_active
    on enrollment_device_claims(token_hash, expires_at)
    where revoked_at is null;
