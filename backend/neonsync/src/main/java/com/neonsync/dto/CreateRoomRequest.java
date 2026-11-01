package com.neonsync.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

// ── Create room request ───────────────────────────────────
@Data
public class CreateRoomRequest {
    @NotBlank(message = "Room name is required")
    private String name;

    // Optional: caller can supply a specific room ID (e.g. from the Lobby)
    private String roomId;
}

// Not a separate file — kept together for simplicity
// Use RoomResponse.java for the response
