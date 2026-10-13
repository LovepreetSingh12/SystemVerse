package com.systemverse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.io.IOException;
import java.util.*;
@RestController
@RequestMapping("/api")
public class LearningController {
 private final JdbcTemplate db;
 private final JsonNode catalog;
 public LearningController(JdbcTemplate db, ObjectMapper mapper) throws IOException {
  this.db=db;
  try(var stream=new ClassPathResource("catalog.json").getInputStream()){catalog=mapper.readTree(stream);}
 }
 @GetMapping("/health") public Map<String,String> health(){db.queryForObject("SELECT 1",Integer.class);return Map.of("status","ok");}
 @GetMapping("/catalog") public JsonNode catalog(){return catalog;}
 @GetMapping("/state") public List<Map<String,Object>> state(@RequestHeader("X-Learner-Id") UUID learner){
  return db.queryForList("SELECT item_id AS id, completed, bookmarked, notes, source_code AS code FROM learning_state WHERE learner_id = ?",learner);
 }
 public record State(boolean completed, boolean bookmarked, @Size(max=20000) String notes, @Size(max=100000) String code) {}
 @PutMapping("/state/{id}") public State save(@RequestHeader("X-Learner-Id") UUID learner,@PathVariable String id,@Valid @RequestBody State state){
  boolean exists=false;
  for(String section:List.of("lessons","challenges"))for(JsonNode item:catalog.get(section)) if(item.get("id").asText().equals(id))exists=true;
  if(!exists)throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Unknown learning item");
  db.update("INSERT INTO learning_state (learner_id,item_id,completed,bookmarked,notes,source_code) VALUES (?,?,?,?,?,?) ON CONFLICT (learner_id,item_id) DO UPDATE SET completed=EXCLUDED.completed,bookmarked=EXCLUDED.bookmarked,notes=EXCLUDED.notes,source_code=EXCLUDED.source_code,updated_at=CURRENT_TIMESTAMP",learner,id,state.completed(),state.bookmarked(),Objects.requireNonNullElse(state.notes(),""),Objects.requireNonNullElse(state.code(),""));
  return state;
 }
}
