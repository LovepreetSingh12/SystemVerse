package com.systemverse;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.systemverse.controllers.LearningController;
import com.systemverse.services.LearningService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class LearningControllerTest {
    private static final UUID LEARNER = UUID.fromString("ef350610-5031-4f2c-bd35-d726d92c0bb4");

    private final ObjectMapper mapper = new ObjectMapper();
    private MockMvc api;
    private JdbcTemplate db;

    @BeforeEach
    void setup() throws Exception {
        db = mock(JdbcTemplate.class);
        // Exercise the real service and catalog while keeping these tests database-free.
        LearningService service = new LearningService(db, mapper);
        api = MockMvcBuilders.standaloneSetup(new LearningController(service)).build();
    }

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
                        .header("X-Learner-Id", LEARNER.toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"completed\":true}"))
                .andExpect(status().isNotFound());
        verifyNoInteractions(db);
    }

    @Test
    void requiresValidWorkspaceId() throws Exception {
        api.perform(get("/api/state").header("X-Learner-Id", "invalid"))
                .andExpect(status().isBadRequest());
        api.perform(get("/api/state"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(db);
    }

    @Test
    void limitsSourceSize() throws Exception {
        api.perform(put("/api/state/practice-1")
                        .header("X-Learner-Id", LEARNER.toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of("code", "a".repeat(100001)))))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(db);
    }

    @Test
    void scopesReadsToWorkspace() throws Exception {
        when(db.queryForList(anyString(), eq(LEARNER)))
                .thenReturn(List.of(Map.of("id", "hld-1", "completed", true)));

        api.perform(get("/api/state").header("X-Learner-Id", LEARNER.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value("hld-1"))
                .andExpect(jsonPath("$[0].completed").value(true));
        verify(db).queryForList(anyString(), eq(LEARNER));
    }

    @Test
    void savesLearningState() throws Exception {
        api.perform(put("/api/state/hld-1")
                        .header("X-Learner-Id", LEARNER.toString())
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
