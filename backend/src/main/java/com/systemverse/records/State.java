package com.systemverse.records;

import jakarta.validation.constraints.Size;

public record State(boolean completed, boolean bookmarked, @Size(max=20000) String notes, @Size(max=100000) String code) {}
