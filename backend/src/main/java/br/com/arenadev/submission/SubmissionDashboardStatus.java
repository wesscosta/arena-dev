
package br.com.arenadev.submission;

public enum SubmissionDashboardStatus {
    NOT_STARTED,
    IN_PROGRESS,
    SUBMITTED,
    UNDER_REVIEW,
    GRADED,
    RETURNED;

    static SubmissionDashboardStatus from(ActivitySubmissionStatus status) {
        return SubmissionDashboardStatus.valueOf(status.name());
    }
}
