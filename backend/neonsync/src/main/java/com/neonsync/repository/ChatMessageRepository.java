package com.neonsync.repository;

import com.neonsync.entity.ChatMessage;
import com.neonsync.entity.Room;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findByRoomOrderBySentAtAsc(Room room);
}
