CREATE TABLE student_achievements (
    id UUID PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id),
    achievement_code VARCHAR(50) NOT NULL,
    source_type VARCHAR(40) NOT NULL,
    source_id UUID,
    unlocked_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT uk_student_achievement_code UNIQUE (student_id, achievement_code)
);

CREATE INDEX idx_student_achievements_student
    ON student_achievements(student_id);
