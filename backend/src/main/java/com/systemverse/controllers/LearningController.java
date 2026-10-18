package com.systemverse.controllers;
import com.fasterxml.jackson.databind.JsonNode;
import com.systemverse.records.State;
import com.systemverse.services.LearningService;

import jakarta.validation.Valid;
import java.nio.charset.StandardCharsets;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
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
    public List<Map<String,Object>> state(@AuthenticationPrincipal Jwt user){
        return learningService.state(workspaceId(user));
    }
    
    @PutMapping("/state/{id}") 
    public State save(@AuthenticationPrincipal Jwt user,@PathVariable String id,@Valid @RequestBody State state){
        return learningService.save(workspaceId(user),id,state);
    }

    public static UUID workspaceId(Jwt user) {
        return UUID.nameUUIDFromBytes((user.getIssuer() + ":" + user.getSubject()).getBytes(StandardCharsets.UTF_8));
    }
}
