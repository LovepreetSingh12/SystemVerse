package com.systemverse.security;

import java.time.Instant;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.core.*;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {
    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
            // Authentication uses bearer headers only, never cookies.
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.GET, "/api/health", "/api/catalog").permitAll()
                .anyRequest().authenticated())
            .oauth2ResourceServer(oauth -> oauth.jwt(jwt -> {}))
            .build();
    }

    @Bean
    JwtDecoder jwtDecoder(@Value("${auth.firebase.project-id:}") String projectId) {
        if (projectId.isBlank()) {
            // Keep public catalog/health usable, but never allow unauthenticated state access.
            return token -> { throw new BadJwtException("Authentication is not configured"); };
        }
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(
            "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")
            .build();
        decoder.setJwtValidator(tokenValidator(projectId));
        return decoder;
    }

    public static OAuth2TokenValidator<Jwt> tokenValidator(String projectId) {
        OAuth2TokenValidator<Jwt> claims = jwt -> {
            Instant now = Instant.now();
            String subject = jwt.getSubject();
            Object authTime = jwt.getClaim("auth_time");
            boolean valid = jwt.getAudience() != null && jwt.getAudience().size() == 1 && jwt.getAudience().contains(projectId)
                && subject != null && !subject.isBlank() && subject.length() <= 128
                && jwt.getExpiresAt() != null && jwt.getExpiresAt().isAfter(now)
                && jwt.getIssuedAt() != null && !jwt.getIssuedAt().isAfter(now)
                && authTime instanceof Number time && time.longValue() <= now.getEpochSecond();
            return valid ? OAuth2TokenValidatorResult.success() : OAuth2TokenValidatorResult.failure(
                new OAuth2Error("invalid_token", "Invalid Firebase token claims", null));
        };
        return new DelegatingOAuth2TokenValidator<>(
            JwtValidators.createDefaultWithIssuer("https://securetoken.google.com/" + projectId), claims);
    }
}
