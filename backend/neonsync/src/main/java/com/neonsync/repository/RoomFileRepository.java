package com.neonsync.repository;

import com.neonsync.entity.RoomFile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RoomFileRepository extends JpaRepository<RoomFile, Long> {
    Optional<RoomFile> findByRoomIdAndPath(String roomId, String path);

    List<RoomFile> findByRoomId(String roomId);
}