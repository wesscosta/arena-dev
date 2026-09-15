create table submission_items (
    id uuid primary key,
    submission_id uuid not null references activity_submissions(id) on delete cascade,
    kind varchar(32) not null,
    question_id uuid references activity_questions(id) on delete restrict,
    position integer not null default 0,
    content_json text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    version bigint not null default 0,

    constraint ck_submission_item_kind
        check (kind in ('QUESTION_RESPONSE', 'TEXT', 'LINK', 'CODE', 'FILE', 'ARTIFACT')),

    constraint ck_submission_item_position
        check (position >= 0),

    constraint ck_submission_item_question_reference
        check (
            (kind = 'QUESTION_RESPONSE' and question_id is not null)
            or
            (kind <> 'QUESTION_RESPONSE' and question_id is null)
        )
);

create index idx_submission_items_submission_position
    on submission_items(submission_id, position, created_at);

create unique index uk_submission_item_question
    on submission_items(submission_id, question_id)
    where question_id is not null;
