-- Nullable to preserve existing published Journey progress rules until explicitly configured.
ALTER TABLE journeys ADD COLUMN released_stage_count integer;
ALTER TABLE journeys ADD CONSTRAINT journeys_released_stage_count_non_negative
    CHECK (released_stage_count IS NULL OR released_stage_count >= 0);
