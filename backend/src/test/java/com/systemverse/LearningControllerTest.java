// package com.systemverse;
// import com.fasterxml.jackson.databind.ObjectMapper;
// import org.junit.jupiter.api.BeforeEach;
// import org.junit.jupiter.api.Test;
// import org.springframework.jdbc.core.JdbcTemplate;
// import org.springframework.test.web.servlet.MockMvc;
// import org.springframework.test.web.servlet.setup.MockMvcBuilders;
// import java.util.*;
// import static org.mockito.Mockito.*;
// import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
// import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
// class LearningControllerTest {
//  private MockMvc api;
//  private JdbcTemplate db;
//  private final String learner="ef350610-5031-4f2c-bd35-d726d92c0bb4";
//  @BeforeEach void setup() throws Exception {db=mock(JdbcTemplate.class);api=MockMvcBuilders.standaloneSetup(new LearningController(db,new ObjectMapper())).build();}
//  @Test void catalogContainsBothLearningPathsAndPractice() throws Exception {api.perform(get("/api/catalog")).andExpect(status().isOk()).andExpect(jsonPath("$.lessons.length()").value(12)).andExpect(jsonPath("$.lessons[0].track").value("HLD")).andExpect(jsonPath("$.lessons[6].track").value("LLD")).andExpect(jsonPath("$.challenges.length()").value(6));}
//  @Test void rejectsUnknownItems() throws Exception {api.perform(put("/api/state/not-real").header("X-Learner-Id",learner).contentType("application/json").content("{\"completed\":true}")).andExpect(status().isNotFound());verifyNoInteractions(db);}
//  @Test void requiresValidWorkspaceId() throws Exception {api.perform(get("/api/state").header("X-Learner-Id","invalid")).andExpect(status().isBadRequest());api.perform(get("/api/state")).andExpect(status().isBadRequest());}
//  @Test void limitsSourceSize() throws Exception {api.perform(put("/api/state/practice-1").header("X-Learner-Id",learner).contentType("application/json").content(new ObjectMapper().writeValueAsString(Map.of("code","a".repeat(100001))))).andExpect(status().isBadRequest());verifyNoInteractions(db);}
//  @Test void scopesReadsToWorkspace() throws Exception {when(db.queryForList(anyString(),eq(UUID.fromString(learner)))).thenReturn(List.of(Map.of("id","hld-1","completed",true)));api.perform(get("/api/state").header("X-Learner-Id",learner)).andExpect(status().isOk()).andExpect(jsonPath("$[0].completed").value(true));verify(db).queryForList(anyString(),eq(UUID.fromString(learner)));}
//  @Test void savesLearningState() throws Exception {api.perform(put("/api/state/hld-1").header("X-Learner-Id",learner).contentType("application/json").content("{\"completed\":true,\"bookmarked\":true,\"notes\":\"Tradeoffs\",\"code\":\"\"}")).andExpect(status().isOk()).andExpect(jsonPath("$.completed").value(true));verify(db).update(anyString(),eq(UUID.fromString(learner)),eq("hld-1"),eq(true),eq(true),eq("Tradeoffs"),eq(""));}
// }
