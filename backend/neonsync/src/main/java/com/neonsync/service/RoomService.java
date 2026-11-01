package com.neonsync.service;

import com.neonsync.dto.CreateRoomRequest;
import com.neonsync.dto.RoomResponse;
import com.neonsync.entity.Room;
import com.neonsync.entity.RoomFile;
import com.neonsync.entity.User;
import com.neonsync.repository.RoomFileRepository;
import com.neonsync.repository.RoomRepository;
import com.neonsync.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RoomService {

    private final RoomRepository roomRepository;
    private final UserRepository userRepository;
    private final RoomFileRepository roomFileRepository;

    private static final String DEFAULT_CODE = "import React, { useState, useEffect } from 'react';\n\n" +
            "// NeonSync - Real-time Collaborative Editor\n" +
            "// Start coding here — all connected users see changes live!\n\n" +
            "const App = () => {\n" +
            "  const [message, setMessage] = useState('Hello, World!');\n\n" +
            "  return (\n" +
            "    <div>\n" +
            "      <h1>{message}</h1>\n" +
            "    </div>\n" +
            "  );\n" +
            "};\n\n" +
            "export default App;\n";

    public RoomResponse createRoom(CreateRoomRequest request, String userEmail) {
        User owner = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Use provided roomId or generate one
        String roomId = (request.getRoomId() != null && !request.getRoomId().isBlank())
                ? request.getRoomId().trim().toLowerCase()
                : generateRoomId();

        if (roomRepository.existsByRoomId(roomId)) {
            throw new RuntimeException("Room ID already exists: " + roomId);
        }

        Room room = Room.builder()
                .roomId(roomId)
                .name(request.getName())
                .code(DEFAULT_CODE)
                .owner(owner)
                .build();

        roomRepository.save(room);
        return toResponse(room);
    }

    public RoomResponse joinRoom(String roomId) {
        Room room = roomRepository.findByRoomId(roomId)
                .orElseThrow(() -> new RuntimeException("Room not found: " + roomId));
        return toResponse(room);
    }

    public void saveCode(String roomId, String code) {
        Room room = roomRepository.findByRoomId(roomId)
                .orElseThrow(() -> new RuntimeException("Room not found: " + roomId));
        room.setCode(code);
        roomRepository.save(room);
    }

    public String getCode(String roomId) {
        return roomRepository.findByRoomId(roomId)
                .map(Room::getCode)
                .orElse(null);
    }

    public void saveFile(String roomId, String path, String content) {
        RoomFile file = roomFileRepository.findByRoomIdAndPath(roomId, path)
                .orElseGet(() -> RoomFile.builder().roomId(roomId).path(path).build());
        file.setContent(content);
        roomFileRepository.save(file);

        // Late joiner abhi sirf App.tsx room.code se load karta hai
        if (path.equals("root/src/App.tsx")) {
            saveCode(roomId, content);
        }
    }

    private RoomResponse toResponse(Room room) {
        return new RoomResponse(
                room.getRoomId(),
                room.getName(),
                room.getCode(),
                room.getOwner() != null ? room.getOwner().getUsername() : "Unknown",
                room.getCreatedAt() != null ? room.getCreatedAt().toString() : "");
    }

    private String generateRoomId() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 8);
    }
}