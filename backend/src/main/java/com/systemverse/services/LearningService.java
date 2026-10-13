package com.systemverse.services;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.systemverse.records.State;

@Service
public class LearningService {
    private final JdbcTemplate db;
    private final JsonNode catalog;

    public LearningService(JdbcTemplate db, ObjectMapper mapper) throws IOException {
        this.db = db;
        try(var stream=new ClassPathResource("catalog.json").getInputStream()){
            this.catalog=mapper.readTree(stream);
        }
    }

    public Map<String,String> health() {
        db.queryForObject("SELECT 1",Integer.class);
        return Map.of("status","ok");
    }

    public JsonNode catalog(){
        return catalog;
    }

    public List<Map<String,Object>> state(UUID learner){
        return db.queryForList("SELECT item_id AS id, completed, bookmarked, notes, source_code AS code FROM learning_state WHERE learner_id = ?",learner);
    }

    public State save(UUID learner, String id, State state){
        boolean exists=false;
        for(String section:List.of("lessons","challenges")) {
            for(JsonNode item:catalog.get(section)) {
                if(item.get("id").asText().equals(id))
                    exists=true;
            }
                
        }
        
        if(!exists) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Unknown learning item");
        }

        db.update("INSERT INTO learning_state (learner_id,item_id,completed,bookmarked,notes,source_code) VALUES (?,?,?,?,?,?) ON CONFLICT (learner_id,item_id) DO UPDATE SET completed=EXCLUDED.completed,bookmarked=EXCLUDED.bookmarked,notes=EXCLUDED.notes,source_code=EXCLUDED.source_code",learner,id,state.completed(),state.bookmarked(),state.notes(),state.code());
        return state;
    }
}
