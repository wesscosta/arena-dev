alter table submission_assessments
    add column feedback_draft text,
    add column published_feedback text,
    add column feedback_published_at timestamptz;
