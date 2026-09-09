package br.com.arenadev.config;

import br.com.arenadev.auth.LoginRateLimitService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;

import java.time.Clock;
import java.time.Duration;

@Configuration
public class SecurityConfig {
    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    UserDetailsService teacherUserDetailsService(
            PasswordEncoder encoder,
            @Value("${app.teacher.username:professor}") String username,
            @Value("${app.teacher.password:arena-dev-change-me}") String password
    ) {
        return new InMemoryUserDetailsManager(
                User.withUsername(username)
                        .password(encoder.encode(password))
                        .roles("TEACHER")
                        .build()
        );
    }

    @Bean
    AuthenticationManager authenticationManager(AuthenticationConfiguration configuration) throws Exception {
        return configuration.getAuthenticationManager();
    }

    @Bean
    LoginRateLimitService loginRateLimitService(
            @Value("${app.security.login-rate-limit.max-failures:5}") int maxFailures,
            @Value("${app.security.login-rate-limit.window-seconds:60}") long windowSeconds,
            @Value("${app.security.login-rate-limit.block-seconds:300}") long blockSeconds
    ) {
        return new LoginRateLimitService(
                maxFailures,
                Duration.ofSeconds(windowSeconds),
                Duration.ofSeconds(blockSeconds),
                Clock.systemUTC()
        );
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(Customizer.withDefaults())
                .csrf(csrf -> csrf
                        .csrfTokenRepository(new CookieCsrfTokenRepository())
                        .csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler())
                        .ignoringRequestMatchers("/api/join/**")
                )
                .formLogin(form -> form.disable())
                .httpBasic(basic -> basic.disable())
                .logout(logout -> logout.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint((request, response, error) -> response.sendError(401))
                        .accessDeniedHandler((request, response, error) -> response.sendError(403))
                )
                .headers(headers -> headers
                        .frameOptions(frame -> frame.deny())
                        .referrerPolicy(referrer -> referrer.policy(
                                org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy.NO_REFERRER
                        ))
                )
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/health", "/api/health/**", "/api/auth/csrf", "/api/auth/login", "/api/join/**", "/api/projector/**", "/ws/**").permitAll()
                        .requestMatchers("/api/**").hasRole("TEACHER")
                        .anyRequest().permitAll()
                );
        return http.build();
    }
}
