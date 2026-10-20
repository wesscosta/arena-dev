package br.com.arenadev.dynamic;

import br.com.arenadev.support.SharedPostgres;
import br.com.arenadev.classroom.ClassroomService;
import br.com.arenadev.session.SessionService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

/** v0.11.0-rc.6: dynamic state is read and written under the session lock. */
@SpringBootTest
class MechanicsConcurrencyIT {
    @DynamicPropertySource static void db(DynamicPropertyRegistry registry) {
        SharedPostgres.register(registry, MechanicsConcurrencyIT.class);
    }

    @Autowired ClassroomService classrooms;
    @Autowired SessionService sessions;
    @Autowired MechanicsService mechanics;

    @Test
    void eightSimultaneousHitsOfFiveLeaveTheBossAtSixtyOfOneHundred() throws Exception {
        String marker = UUID.randomUUID().toString().substring(0, 7).toUpperCase();
        var classroom = classrooms.create("Boss concorrente " + marker, "BC" + marker);
        UUID sessionId = sessions.start(classroom.id(), "Boss sob cliques rápidos", Set.of()).id();
        mechanics.startBoss(sessionId, "Spaghetti Code", 100);

        int hits = 8;
        CountDownLatch ready = new CountDownLatch(hits);
        CountDownLatch go = new CountDownLatch(1);
        List<Future<?>> results = new ArrayList<>();
        try (var executor = Executors.newFixedThreadPool(hits)) {
            for (int i = 0; i < hits; i++) {
                results.add(executor.submit(() -> {
                    ready.countDown();
                    go.await(5, TimeUnit.SECONDS);
                    return mechanics.damageBoss(sessionId, 5);
                }));
            }
            assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
            go.countDown();
            for (Future<?> result : results) result.get(20, TimeUnit.SECONDS);
        }

        assertThat(mechanics.getRuntime(sessionId).boss().currentHp()).isEqualTo(60);
    }
}
