package com.neonsync.service;

import com.neonsync.entity.ChatMessage;
import com.neonsync.entity.Room;
import com.neonsync.entity.User;
import com.neonsync.repository.ChatMessageRepository;
import com.neonsync.repository.RoomRepository;
import com.neonsync.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatMessageRepository chatMessageRepository;
    private final RoomRepository roomRepository;
    private final UserRepository userRepository;

    public void saveMessage(String roomId, String userEmail, String text) {
        Room room = roomRepository.findByRoomId(roomId).orElse(null);
        User user = userRepository.findByEmail(userEmail).orElse(null);
        if (room == null || user == null) return;

        ChatMessage message = ChatMessage.builder()
                .room(room)
                .sender(user)
                .text(text)
                .build();

        chatMessageRepository.save(message);
    }

    public List<ChatMessage> getMessages(String roomId) {
        Room room = roomRepository.findByRoomId(roomId)
                .orElseThrow(() -> new RuntimeException("Room not found"));
        return chatMessageRepository.findByRoomOrderBySentAtAsc(room);
    }
}
