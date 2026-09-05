create table activity_steps (
    id uuid primary key,
    activity_id uuid not null references activities(id) on delete cascade,
    position integer not null,
    type varchar(30) not null,
    title varchar(180),
    instructions text,
    question_id uuid references activity_questions(id) on delete cascade,
    slide_content text,
    word_cloud_prompt varchar(280),
    word_cloud_max_words integer,
    word_cloud_live_reveal boolean,
    poll_prompt varchar(280),
    poll_options_json text,
    poll_live_results boolean,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint ck_activity_steps_position_nonnegative
        check (position >= 0),

    constraint ck_activity_steps_type
        check (type in ('SLIDE', 'QUESTION', 'WORD_CLOUD', 'POLL')),

    constraint ck_activity_steps_word_cloud_max_words
        check (
            word_cloud_max_words is null
            or word_cloud_max_words between 1 and 5
        )
);

create index idx_activity_steps_activity_position
    on activity_steps(activity_id, position);

create index idx_activity_steps_question
    on activity_steps(question_id)
    where question_id is not null;
