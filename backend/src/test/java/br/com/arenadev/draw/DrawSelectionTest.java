package br.com.arenadev.draw;

import org.junit.jupiter.api.Test;
import java.util.List;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;

class DrawSelectionTest {
    @Test void uniformSelectionRespectsBoundaries() {
        UUID a=UUID.randomUUID(),b=UUID.randomUUID(),c=UUID.randomUUID();
        List<UUID> ids=List.of(a,b,c);
        assertThat(DrawService.pickUniform(ids,0)).isEqualTo(a);
        assertThat(DrawService.pickUniform(ids,0.34)).isEqualTo(b);
        assertThat(DrawService.pickUniform(ids,0.9999)).isEqualTo(c);
        assertThatThrownBy(()->DrawService.pickUniform(ids,1)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(()->DrawService.pickUniform(List.of(),0)).isInstanceOf(IllegalArgumentException.class);
    }
}
