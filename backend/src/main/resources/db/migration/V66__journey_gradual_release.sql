-- Nullable to preserve existing published Journey progress rules until explicitly configured.
ALTER TABLE journeys ADD COLUMN released_chapter_count integer;
ALTER TABLE journeys ADD CONSTRAINT journeys_released_chapter_count_non_negative
    CHECK (released_chapter_count IS NULL OR released_chapter_count >= 0);
