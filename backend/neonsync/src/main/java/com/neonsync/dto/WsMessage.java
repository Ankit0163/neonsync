package com.neonsync.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Generic WebSocket message envelope.
 * type: CODE_UPDATE | CHAT_MESSAGE | CURSOR_UPDATE
 * roomId: which room this message belongs to
 * payload: the actual content (code string, chat text, cursor position)
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class WsMessage {
    private String type;
    private String roomId;
    private String fileId;
    private String senderName;
    private String senderColor;
    private String text; // for CHAT_MESSAGE
    private String code; // for CODE_UPDATE
    private Integer line; // for CURSOR_UPDATE
    private Integer column; // for CURSOR_UPDATE
    private String time;
}
