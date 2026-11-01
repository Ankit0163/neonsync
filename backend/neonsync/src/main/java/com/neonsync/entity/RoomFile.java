package com.neonsync.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "room_files_v2",
       uniqueConstraints = @UniqueConstraint(columnNames = {"room_id", "path"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RoomFile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "room_id", nullable = false)
    private String roomId;

    @Column(nullable = false, length = 500)
    private String path;

    @Column(columnDefinition = "LONGTEXT")
    private String content;
}