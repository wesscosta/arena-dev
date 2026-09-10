package br.com.arenadev.auth;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class LoginRateLimitService {
    private static final int CLEANUP_THRESHOLD = 1024;

    private final int maxFailures;
    private final Duration window;
    private final Duration blockDuration;
    private final Clock clock;
    private final Map<String, AttemptBucket> buckets = new ConcurrentHashMap<>();

    public LoginRateLimitService(int maxFailures, Duration window, Duration blockDuration, Clock clock) {
        if (maxFailures < 1) throw new IllegalArgumentException("maxFailures deve ser positivo.");
        if (window == null || window.isZero() || window.isNegative()) {
            throw new IllegalArgumentException("window deve ser positiva.");
        }
        if (blockDuration == null || blockDuration.isZero() || blockDuration.isNegative()) {
            throw new IllegalArgumentException("blockDuration deve ser positiva.");
        }
        this.maxFailures = maxFailures;
        this.window = window;
        this.blockDuration = blockDuration;
        this.clock = clock;
    }

    public Decision beforeAttempt(String key) {
        Instant now = clock.instant();
        cleanupIfNeeded(now);
        AttemptBucket bucket = buckets.get(key);
        if (bucket == null) return Decision.permit();

        synchronized (bucket) {
            if (bucket.blockedUntil != null && now.isBefore(bucket.blockedUntil)) {
                return Decision.deny(secondsUntil(now, bucket.blockedUntil));
            }
            if (bucket.blockedUntil != null && !now.isBefore(bucket.blockedUntil)) {
                buckets.remove(key, bucket);
                return Decision.permit();
            }
            if (bucket.windowStartedAt != null && !now.isBefore(bucket.windowStartedAt.plus(window))) {
                buckets.remove(key, bucket);
                return Decision.permit();
            }
            return Decision.permit();
        }
    }

    public void recordFailure(String key) {
        Instant now = clock.instant();
        buckets.compute(key, (ignored, existing) -> {
            AttemptBucket bucket = existing == null ? new AttemptBucket() : existing;
            synchronized (bucket) {
                if (bucket.blockedUntil != null && now.isBefore(bucket.blockedUntil)) return bucket;
                if (bucket.windowStartedAt == null || !now.isBefore(bucket.windowStartedAt.plus(window))) {
                    bucket.windowStartedAt = now;
                    bucket.failures = 0;
                    bucket.blockedUntil = null;
                }
                bucket.failures += 1;
                if (bucket.failures >= maxFailures) {
                    bucket.blockedUntil = now.plus(blockDuration);
                }
                return bucket;
            }
        });
    }

    public void recordSuccess(String key) {
        buckets.remove(key);
    }

    private void cleanupIfNeeded(Instant now) {
        if (buckets.size() < CLEANUP_THRESHOLD) return;
        buckets.entrySet().removeIf(entry -> expired(entry.getValue(), now));
    }

    private boolean expired(AttemptBucket bucket, Instant now) {
        synchronized (bucket) {
            if (bucket.blockedUntil != null) return !now.isBefore(bucket.blockedUntil);
            return bucket.windowStartedAt == null || !now.isBefore(bucket.windowStartedAt.plus(window));
        }
    }

    private static long secondsUntil(Instant now, Instant until) {
        long seconds = Duration.between(now, until).getSeconds();
        return Math.max(1, seconds);
    }

    private static final class AttemptBucket {
        private Instant windowStartedAt;
        private int failures;
        private Instant blockedUntil;
    }

    public record Decision(boolean allowed, long retryAfterSeconds) {
        static Decision permit() { return new Decision(true, 0); }
        static Decision deny(long retryAfterSeconds) { return new Decision(false, retryAfterSeconds); }
    }
}
