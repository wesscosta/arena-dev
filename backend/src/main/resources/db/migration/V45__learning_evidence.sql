alter table interaction_definitions
    add constraint ck_interaction_definitions_evidence_contract
        check (
            not produces_evidence
            or (learning_target_id is not null and evaluation_mode <> 'NONE')
        );

create table learning_evidence (
    id uuid primary key,
    participant_id uuid not null references session_participants(id) on delete cascade,
    learning_target_id uuid not null references learning_targets(id) on delete restrict,
    evaluation_id uuid not null references interaction_evaluations(id) on delete cascade,
    source_type varchar(30) not null,
    source_id uuid not null,
    outcome varchar(30) not null,
    score numeric(8, 4),
    confidence numeric(8, 4),
    provenance_origin varchar(30) not null,
    provenance_source_ref text,
    provenance_created_by uuid,
    provenance_reviewed_by uuid,
    provenance_created_at timestamptz not null,
    observed_at timestamptz not null,
    created_at timestamptz not null default now(),
    constraint uk_learning_evidence_evaluation unique (evaluation_id),
    constraint ck_learning_evidence_source_type
        check (source_type in ('INTERACTION')),
    constraint ck_learning_evidence_outcome
        check (outcome in ('CORRECT', 'INCORRECT', 'PARTIAL', 'NOT_EVALUATED')),
    constraint ck_learning_evidence_score
        check (score is null or (score >= 0 and score <= 1)),
    constraint ck_learning_evidence_confidence
        check (confidence is null or (confidence >= 0 and confidence <= 1))
);

create index idx_learning_evidence_participant_target
    on learning_evidence(participant_id, learning_target_id, observed_at desc);

create index idx_learning_evidence_target
    on learning_evidence(learning_target_id, observed_at desc);

create index idx_learning_evidence_source
    on learning_evidence(source_type, source_id);

comment on table learning_evidence is
    'Observed learning evidence derived from evaluated interactions; it is not a mastery projection.';
comment on column learning_evidence.source_id is
    'For source_type INTERACTION, identifies the interaction_run that produced the observation.';
comment on column learning_evidence.confidence is
    'Optional confidence about the evidence interpretation; deterministic correctness does not imply mastery confidence.';
