package com.systemverse.controllers;
import com.fasterxml.jackson.databind.JsonNode;
import com.systemverse.records.State;
import com.systemverse.services.LearningService;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import java.util.*;


@RestController
@RequestMapping("/api")
public class LearningController {
    private final LearningService learningService;

    public LearningController(LearningService learningService) {
        this.learningService = learningService;
    }

    @GetMapping("/health") 
    public Map<String,String> health() {
        return learningService.health();
    }

    @GetMapping("/catalog") 
    public JsonNode catalog(){
        return learningService.catalog();
    }

    @GetMapping("/state") 
    public List<Map<String,Object>> state(@RequestHeader("X-Learner-Id") UUID learner){
        return learningService.state(learner);
    }
    
    @PutMapping("/state/{id}") 
    public State save(@RequestHeader("X-Learner-Id") UUID learner,@PathVariable String id,@Valid @RequestBody State state){
        return learningService.save(learner,id,state);
    }
}
