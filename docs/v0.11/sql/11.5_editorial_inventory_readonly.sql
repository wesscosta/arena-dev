-- v0.11 / 11.5: aggregate-only editorial audit. No private titles, bodies or identifiers.
-- Run in psql: \i docs/v0.11/sql/11.5_editorial_inventory_readonly.sql
-- Snapshot scoped to the currently connected self-hosted database. NOT a population estimate.
BEGIN TRANSACTION READ ONLY;

SELECT 'library_all_resources' AS metric, count(*) AS value FROM learning_resources
UNION ALL SELECT 'library_active_global', count(*) FROM learning_resources
  WHERE library_visible AND archived_at IS NULL AND classroom_id IS NULL
UNION ALL SELECT 'library_active_missing_source_ref', count(*) FROM learning_resources
  WHERE library_visible AND archived_at IS NULL AND source_reference IS NULL
UNION ALL SELECT 'library_active_missing_source_snapshot_at', count(*) FROM learning_resources
  WHERE library_visible AND archived_at IS NULL AND source_snapshot_at IS NULL
UNION ALL SELECT 'library_active_missing_source_hash', count(*) FROM learning_resources
  WHERE library_visible AND archived_at IS NULL AND source_content_sha256 IS NULL
UNION ALL SELECT 'library_active_missing_current_hash', count(*) FROM learning_resources
  WHERE library_visible AND archived_at IS NULL AND content_sha256 IS NULL
UNION ALL SELECT 'library_active_missing_subject', count(*) FROM learning_resources
  WHERE library_visible AND archived_at IS NULL AND subject IS NULL
UNION ALL SELECT 'library_active_missing_language', count(*) FROM learning_resources
  WHERE library_visible AND archived_at IS NULL AND language IS NULL
UNION ALL SELECT 'activity_questions', count(*) FROM activity_questions
UNION ALL SELECT 'learning_targets', count(*) FROM learning_targets
ORDER BY metric;

SELECT 'resource_source_type' AS dimension, source_type AS key, count(*) AS total
  FROM learning_resources WHERE library_visible AND archived_at IS NULL
  GROUP BY source_type ORDER BY source_type;

SELECT 'learning_target_type' AS dimension, type AS key, count(*) AS total
  FROM learning_targets GROUP BY type ORDER BY type;

SELECT 'activity_question_type' AS dimension, type AS key, count(*) AS total
  FROM activity_questions GROUP BY type ORDER BY type;

-- Duplicate fingerprints indicate repeated statements, not automatically duplicated rights.
SELECT 'identical_statement_fingerprint_groups' AS metric, count(*) AS total
FROM (
  SELECT md5(lower(btrim(statement))) AS fingerprint
  FROM activity_questions
  GROUP BY fingerprint HAVING count(*) > 1
) duplicates;

COMMIT;
