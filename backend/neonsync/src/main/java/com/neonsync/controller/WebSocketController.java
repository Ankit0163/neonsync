package com.neonsync.controller;

import com.neonsync.dto.WsMessage;
import com.neonsync.service.RoomService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Controller
@RequiredArgsConstructor
public class WebSocketController {

    private final SimpMessagingTemplate messagingTemplate;
    private final RoomService roomService;

    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("hh:mm a");

    // In-memory user presence: roomId -> list of connected users
    private final Map<String, List<Map<String, String>>> roomUsers = new ConcurrentHashMap<>();

    @MessageMapping("/join")
    public void handleJoin(@Payload WsMessage message) {
        String roomId = message.getRoomId();
        roomUsers.computeIfAbsent(roomId, k -> Collections.synchronizedList(new ArrayList<>()));

        List<Map<String, String>> users = roomUsers.get(roomId);
        boolean exists = users.stream().anyMatch(u -> u.get("name").equals(message.getSenderName()));
        if (!exists) {
            Map<String, String> user = new HashMap<>();
            user.put("id", message.getSenderName());
            user.put("name", message.getSenderName());
            user.put("color", message.getSenderColor() != null ? message.getSenderColor() : "#22d3ee");
            users.add(user);
        }

        messagingTemplate.convertAndSend("/topic/room/" + roomId + "/users", Map.of("users", users));

        // Send current saved code to ALL users (including late joiner)
        try {
            String currentCode = roomService.getCode(roomId);
            if (currentCode != null) {
                Map<String, Object> codeMsg = new HashMap<>();
                codeMsg.put("code", currentCode);
                codeMsg.put("senderName", "system");
                messagingTemplate.convertAndSend("/topic/room/" + roomId + "/code", codeMsg);
            }
        } catch (Exception ignored) {
        }

        // Broadcast join notification
        WsMessage joinMsg = new WsMessage();
        joinMsg.setType("CHAT_MESSAGE");
        joinMsg.setRoomId(roomId);
        joinMsg.setSenderName("System");
        joinMsg.setSenderColor("#6b7280");
        joinMsg.setText(message.getSenderName() + " joined the room");
        joinMsg.setTime(LocalTime.now().format(TIME_FMT));
        messagingTemplate.convertAndSend("/topic/room/" + roomId + "/chat", joinMsg);
    }

    @MessageMapping("/code")
    public void handleCodeUpdate(@Payload WsMessage message) {
        if (message.getRoomId() != null && message.getFileId() != null && message.getCode() != null) {
            roomService.saveFile(message.getRoomId(), message.getFileId(), message.getCode());
        }
        message.setType("CODE_UPDATE");
        messagingTemplate.convertAndSend("/topic/room/" + message.getRoomId() + "/code", message);
    }

    @MessageMapping("/chat")
    public void handleChat(@Payload WsMessage message) {
        message.setType("CHAT_MESSAGE");
        message.setTime(LocalTime.now().format(TIME_FMT));
        messagingTemplate.convertAndSend("/topic/room/" + message.getRoomId() + "/chat", message);
    }

    @MessageMapping("/cursor")
    public void handleCursor(@Payload WsMessage message) {
        message.setType("CURSOR_UPDATE");
        messagingTemplate.convertAndSend("/topic/room/" + message.getRoomId() + "/cursor", message);
    }
}