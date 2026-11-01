package com.neonsync.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class RoomResponse {
    private String roomId;
    private String name;
    private String code;
    private String ownerUsername;
    private String createdAt;
}
