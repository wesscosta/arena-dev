package br.com.arenadev.realtime;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

import java.util.Arrays;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {
    private final SessionSocketHandler sessionSocketHandler;
    private final String[] allowedOriginPatterns;

    public WebSocketConfig(
            SessionSocketHandler sessionSocketHandler,
            @Value("${app.allowed-origin-patterns:http://*:[3000]}") String allowedOriginPatterns
    ) {
        this.sessionSocketHandler = sessionSocketHandler;
        this.allowedOriginPatterns = Arrays.stream(allowedOriginPatterns.split(","))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .toArray(String[]::new);
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(sessionSocketHandler, "/ws/sessions/{sessionId}", "/ws/projector/{sessionId}")
                .setAllowedOriginPatterns(allowedOriginPatterns);
    }
}
