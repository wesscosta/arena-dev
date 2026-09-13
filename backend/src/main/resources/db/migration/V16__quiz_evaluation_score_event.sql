alter table quiz_participant_answers
    add column evaluated_at timestamptz,
    add column is_correct boolean,
    add column score_event_id uuid references score_events(id) on delete set null;

create unique index uk_quiz_answers_score_event
    on quiz_participant_answers(score_event_id)
    where score_event_id is not null;

alter table quiz_participant_answers
    add constraint ck_quiz_answers_evaluation_consistency
    check (
        (evaluated_at is null and is_correct is null and score_event_id is null)
        or
        (
            evaluated_at is not null
            and is_correct is not null
            and (is_correct or score_event_id is null)
        )
    );
