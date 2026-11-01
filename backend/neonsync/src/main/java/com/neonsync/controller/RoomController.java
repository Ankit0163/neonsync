package com.neonsync.controller;

import com.neonsync.dto.CreateRoomRequest;
import com.neonsync.dto.RoomResponse;
import com.neonsync.service.RoomService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/rooms")
@RequiredArgsConstructor
public class RoomController {

    private final RoomService roomService;

    // POST /api/rooms/create  (requires JWT)
    @PostMapping("/create")
    public ResponseEntity<RoomResponse> createRoom(
            @Valid @RequestBody CreateRoomRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(roomService.createRoom(request, userDetails.getUsername()));
    }

    // GET /api/rooms/join/{roomId}  (requires JWT)
    @GetMapping("/join/{roomId}")
    public ResponseEntity<RoomResponse> joinRoom(@PathVariable String roomId) {
        return ResponseEntity.ok(roomService.joinRoom(roomId));
    }
}
