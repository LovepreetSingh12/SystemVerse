package com.systemverse;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.systemverse.controllers.LearningController;
import com.systemverse.services.LearningService;
import com.systemverse.security.SecurityConfig;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.BadJwtException;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(LearningController.class)
@Import({SecurityConfig.class, LearningService.class})
class LearningControllerTest {
    private static final Jwt USER = Jwt.withTokenValue("test").header("alg", "RS256")
            .issuer("https://securetoken.google.com/test-project").subject("alice").build();
    private static final UUID LEARNER = LearningController.workspaceId(USER);
    @Autowired private ObjectMapper mapper;
    @Autowired private MockMvc api;
    @MockitoBean private JdbcTemplate db;
    @MockitoBean private JwtDecoder decoder;

    @Test
    void catalogContainsBothLearningPathsAndPractice() throws Exception {
        api.perform(get("/api/catalog"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.lessons.length()").value(12))
                .andExpect(jsonPath("$.lessons[0].track").value("HLD"))
                .andExpect(jsonPath("$.lessons[6].track").value("LLD"))
                .andExpect(jsonPath("$.challenges.length()").value(6));
        verifyNoInteractions(db);
    }

    @Test
    void rejectsUnknownItems() throws Exception {
        api.perform(put("/api/state/not-real")
                        .with(jwt().jwt(USER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"completed\":true}"))
                .andExpect(status().isNotFound());
        verifyNoInteractions(db);
    }

    @Test
    void requiresAuthentication() throws Exception {
        api.perform(get("/api/state").header("X-Learner-Id", LEARNER.toString()))
                .andExpect(status().isUnauthorized());
        api.perform(put("/api/state/hld-1").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(db);
    }

    @Test
    void rejectsInvalidBearerToken() throws Exception {
        when(decoder.decode("invalid")).thenThrow(new BadJwtException("Invalid signature"));
        api.perform(get("/api/state").header("Authorization", "Bearer invalid"))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(db);
    }

    @Test
    void ignoresSpoofedWorkspaceHeader() throws Exception {
        Jwt bob = Jwt.withTokenValue("bob-token").header("alg", "RS256")
                .issuer("https://securetoken.google.com/test-project").subject("bob").build();
        api.perform(get("/api/state").with(jwt().jwt(bob))
                .header("X-Learner-Id", LEARNER.toString()))
                .andExpect(status().isOk());
        verify(db).queryForList(anyString(), eq(LearningController.workspaceId(bob)));
    }

    @Test
    void limitsSourceSize() throws Exception {
        api.perform(put("/api/state/practice-1")
                        .with(jwt().jwt(USER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of("code", "a".repeat(100001)))))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(db);
    }

    @Test
    void scopesReadsToWorkspace() throws Exception {
        when(db.queryForList(anyString(), eq(LEARNER)))
                .thenReturn(List.of(Map.of("id", "hld-1", "completed", true)));

        api.perform(get("/api/state").with(jwt().jwt(USER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value("hld-1"))
                .andExpect(jsonPath("$[0].completed").value(true));
        verify(db).queryForList(anyString(), eq(LEARNER));
    }

    @Test
    void savesLearningState() throws Exception {
        api.perform(put("/api/state/hld-1")
                        .with(jwt().jwt(USER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"completed":true,"bookmarked":true,"notes":"Tradeoffs","code":""}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.completed").value(true))
                .andExpect(jsonPath("$.bookmarked").value(true))
                .andExpect(jsonPath("$.notes").value("Tradeoffs"))
                .andExpect(jsonPath("$.code").value(""));
        verify(db).update(anyString(), eq(LEARNER), eq("hld-1"),
                eq(true), eq(true), eq("Tradeoffs"), eq(""));
    }
}
