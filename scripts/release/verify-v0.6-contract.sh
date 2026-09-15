#!/usr/bin/env bash
set -Eeuo pipefail
fail(){ printf 'ERRO: %s\n' "$*" >&2; exit 1; }

for migration in {18..25}; do
  ls backend/src/main/resources/db/migration/V${migration}__*.sql >/dev/null 2>&1 || fail "migration V${migration} ausente"
done

for required in   backend/src/main/java/br/com/arenadev/submission/ActivitySubmission.java   backend/src/main/java/br/com/arenadev/submission/SubmissionItem.java   backend/src/main/java/br/com/arenadev/submission/SubmissionAssessment.java   backend/src/main/java/br/com/arenadev/submission/ActivityRubricCriterion.java   backend/src/main/java/br/com/arenadev/submission/AiAssessmentSuggestion.java   backend/src/main/java/br/com/arenadev/submission/SubmissionProcessEvent.java   backend/src/main/java/br/com/arenadev/submission/LearningPlatformGateway.java   frontend/components/StudentActivitiesPanel.tsx   frontend/components/ActivitySubmissionDashboard.tsx   frontend/components/SubmissionReviewPanel.tsx   frontend/components/AssessmentRubricPanel.tsx   frontend/components/AssessmentFeedbackPanel.tsx   frontend/components/SubmissionEvidencePanel.tsx; do
  [[ -f "$required" ]] || fail "contrato v0.6 ausente: $required"
done

grep -q 'TEAMS' backend/src/main/java/br/com/arenadev/submission/SubmissionSource.java || fail "SubmissionSource TEAMS ausente"
grep -q 'GOOGLE_CLASSROOM' backend/src/main/java/br/com/arenadev/submission/SubmissionSource.java || fail "SubmissionSource GOOGLE_CLASSROOM ausente"
grep -q 'publishedFeedback' backend/src/main/java/br/com/arenadev/submission/SubmissionAssessment.java || fail "feedback publicado ausente"

printf 'Contrato funcional mínimo da v0.6 validado.\n'
