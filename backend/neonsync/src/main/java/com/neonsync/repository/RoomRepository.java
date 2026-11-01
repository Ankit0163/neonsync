package com.neonsync.repository;

import com.neonsync.entity.Room;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface RoomRepository extends JpaRepository<Room, Long> {
    Optional<Room> findByRoomId(String roomId);
    boolean existsByRoomId(String roomId);
}
