create table ai_assessment_suggestions (
    id uuid primary key,
    assessment_id uuid not null references submission_assessments(id) on delete cascade,
    provider varchar(40) not null,
    model varchar(120) not null,
    prompt_version varchar(40) not null,
    summary_feedback text,
    raw_response_json text,
    created_at timestamptz not null default now()
);

create index idx_ai_assessment_suggestions_assessment_created
    on ai_assessment_suggestions(assessment_id, created_at desc);

create table ai_assessment_criterion_suggestions (
    id uuid primary key,
    suggestion_id uuid not null references ai_assessment_suggestions(id) on delete cascade,
    assessment_criterion_id uuid not null references assessment_criteria(id) on delete cascade,
    suggested_points numeric(8,2) not null,
    suggested_comment text,
    evidence text,
    confidence numeric(5,4),
    created_at timestamptz not null default now(),
    constraint uk_ai_suggestion_criterion unique (suggestion_id, assessment_criterion_id),
    constraint ck_ai_suggested_points_non_negative check (suggested_points >= 0),
    constraint ck_ai_confidence check (confidence is null or (confidence >= 0 and confidence <= 1))
);

alter table assessment_criteria
    add column applied_ai_suggestion_id uuid references ai_assessment_suggestions(id) on delete set null;
