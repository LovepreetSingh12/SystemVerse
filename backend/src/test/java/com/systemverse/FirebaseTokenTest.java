package com.systemverse;

import com.systemverse.security.SecurityConfig;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;
import static org.junit.jupiter.api.Assertions.*;

class FirebaseTokenTest {
    private Jwt.Builder validToken() {
        Instant now = Instant.now();
        return Jwt.withTokenValue("token").header("alg", "RS256")
            .issuer("https://securetoken.google.com/project")
            .audience(List.of("project")).subject("user-123")
            .issuedAt(now.minusSeconds(10)).expiresAt(now.plusSeconds(3600))
            .claim("auth_time", now.minusSeconds(10).getEpochSecond());
    }

    @Test
    void acceptsValidClaims() {
        assertFalse(SecurityConfig.tokenValidator("project").validate(validToken().build()).hasErrors());
    }

    @Test
    void rejectsWrongProjectIssuerExpiredAndMissingClaims() {
        List<Jwt> tokens = List.of(
            validToken().audience(List.of("another-project")).build(),
            validToken().issuer("https://attacker.example").build(),
            validToken().issuedAt(Instant.now().minusSeconds(200)).expiresAt(Instant.now().minusSeconds(100)).build(),
            validToken().subject("").build(),
            validToken().issuedAt(Instant.now().plusSeconds(100)).build(),
            validToken().claim("auth_time", Instant.now().plusSeconds(100).getEpochSecond()).build(),
            validToken().claims(claims -> claims.remove("exp")).build(),
            validToken().claims(claims -> claims.remove("auth_time")).build()
        );
        for (Jwt token : tokens) assertTrue(SecurityConfig.tokenValidator("project").validate(token).hasErrors());
    }
}
