package br.com.arenadev.auth;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;

class LoginRateLimitServiceTest {
    @Test
    void blocksAfterConfiguredFailuresAndAllowsAgainAfterBlock() {
        MutableClock clock = new MutableClock(Instant.parse("2026-09-09T18:00:00Z"));
        LoginRateLimitService service = new LoginRateLimitService(
                3,
                Duration.ofMinutes(1),
                Duration.ofMinutes(5),
                clock
        );
        String key = "127.0.0.1|teacher";

        assertThat(service.beforeAttempt(key).allowed()).isTrue();
        service.recordFailure(key);
        service.recordFailure(key);
        assertThat(service.beforeAttempt(key).allowed()).isTrue();

        service.recordFailure(key);
        var blocked = service.beforeAttempt(key);
        assertThat(blocked.allowed()).isFalse();
        assertThat(blocked.retryAfterSeconds()).isEqualTo(300);

        clock.advance(Duration.ofMinutes(5));
        assertThat(service.beforeAttempt(key).allowed()).isTrue();
    }

    @Test
    void successClearsPreviousFailuresAndWindowExpirationResetsCounter() {
        MutableClock clock = new MutableClock(Instant.parse("2026-09-09T18:00:00Z"));
        LoginRateLimitService service = new LoginRateLimitService(
                2,
                Duration.ofSeconds(30),
                Duration.ofMinutes(1),
                clock
        );
        String key = "127.0.0.1|teacher";

        service.recordFailure(key);
        service.recordSuccess(key);
        service.recordFailure(key);
        assertThat(service.beforeAttempt(key).allowed()).isTrue();

        clock.advance(Duration.ofSeconds(31));
        assertThat(service.beforeAttempt(key).allowed()).isTrue();
        service.recordFailure(key);
        assertThat(service.beforeAttempt(key).allowed()).isTrue();
    }

    private static final class MutableClock extends Clock {
        private Instant instant;

        private MutableClock(Instant instant) {
            this.instant = instant;
        }

        void advance(Duration duration) {
            instant = instant.plus(duration);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return instant;
        }
    }
}
