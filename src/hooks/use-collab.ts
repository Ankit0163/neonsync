import { useState, useEffect, useRef, useCallback } from 'react';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { AuthUser } from '@/lib/api';

export interface CollabUser {
  id: string;
  name: string;
  color: string;
  cursor?: { lineNumber: number; column: number } | null;
}

export interface ChatMessage {
  id: string;
  userId: string;
  name: string;
  color: string;
  text: string;
  time: string;
}

export interface CollabState {
  connected: boolean;
  clientId: string | null;
  clientName: string | null;
  clientColor: string | null;
  roomId: string | null;
  code: string;
  users: CollabUser[];
  messages: ChatMessage[];
  lastCodeAuthor: string | null;
}

const SPRING_BOOT_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export function useCollab(roomId: string, currentUser: AuthUser | null) {
  const stompClient = useRef<Client | null>(null);
  const [state, setState] = useState<CollabState>({
    connected: false,
    clientId: null,
    clientName: currentUser?.username ?? null,
    clientColor: currentUser?.color ?? null,
    roomId: null,
    code: '// Connecting to collaboration server...\n// Open this app in multiple tabs to collaborate in real-time!\n',
    users: [],
    messages: [],
    lastCodeAuthor: null,
  });

  useEffect(() => {
    const token = localStorage.getItem('neonsync_token');

    const client = new Client({
      // Use SockJS so it works over HTTP/HTTPS (needed for ngrok)
      webSocketFactory: () => new SockJS(`${SPRING_BOOT_URL}/ws`),
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      reconnectDelay: 3000,

      onConnect: () => {
        setState(s => ({ ...s, connected: true, roomId }));

        // Subscribe to code updates for this room
        client.subscribe(`/topic/room/${roomId}/code`, (msg: IMessage) => {
          const data = JSON.parse(msg.body);
          setState(s => ({
            ...s,
            code: data.code,
            lastCodeAuthor: data.senderName,
          }));
        });

        // Subscribe to chat messages
        client.subscribe(`/topic/room/${roomId}/chat`, (msg: IMessage) => {
          const data = JSON.parse(msg.body);
          setState(s => ({
            ...s,
            messages: [...s.messages, {
              id: Math.random().toString(36).slice(2),
              userId: data.senderName,
              name: data.senderName,
              color: data.senderColor || '#22d3ee',
              text: data.text,
              time: data.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            }],
          }));
        });

        // Subscribe to cursor updates
        client.subscribe(`/topic/room/${roomId}/cursor`, (msg: IMessage) => {
          const data = JSON.parse(msg.body);
          setState(s => ({
            ...s,
            users: s.users.map(u =>
              u.name === data.senderName
                ? { ...u, cursor: { lineNumber: data.line, column: data.column } }
                : u
            ),
          }));
        });

        // Subscribe to user presence
        client.subscribe(`/topic/room/${roomId}/users`, (msg: IMessage) => {
          const data = JSON.parse(msg.body);
          setState(s => ({ ...s, users: data.users }));
        });

        // Announce joining
        client.publish({
          destination: `/app/join`,
          body: JSON.stringify({
            roomId,
            senderName: currentUser?.username,
            senderColor: currentUser?.color,
          }),
        });

        // Add system join message locally
        setState(s => ({
          ...s,
          clientId: currentUser?.email ?? null,
          clientName: currentUser?.username ?? null,
          clientColor: currentUser?.color ?? null,
          messages: [...s.messages, {
            id: Math.random().toString(36).slice(2),
            userId: 'system',
            name: 'System',
            color: '#6b7280',
            text: `You joined room "${roomId}"`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }],
        }));
      },

      onDisconnect: () => {
        setState(s => ({ ...s, connected: false }));
      },

      onStompError: (frame) => {
        console.error('STOMP error:', frame.headers['message']);
        setState(s => ({ ...s, connected: false }));
      },
    });

    client.activate();
    stompClient.current = client;

    return () => {
      client.deactivate();
    };
  }, [roomId, currentUser]);

  const sendCode = useCallback((code: string) => {
    if (stompClient.current?.connected) {
      stompClient.current.publish({
        destination: '/app/code',
        body: JSON.stringify({
          roomId,
          code,
          senderName: currentUser?.username,
          senderColor: currentUser?.color,
        }),
      });
    }
  }, [roomId, currentUser]);

  const sendCursor = useCallback((cursor: { lineNumber: number; column: number } | null) => {
    if (stompClient.current?.connected && cursor) {
      stompClient.current.publish({
        destination: '/app/cursor',
        body: JSON.stringify({
          roomId,
          senderName: currentUser?.username,
          senderColor: currentUser?.color,
          line: cursor.lineNumber,
          column: cursor.column,
        }),
      });
    }
  }, [roomId, currentUser]);

  const sendChat = useCallback((text: string) => {
    if (stompClient.current?.connected) {
      stompClient.current.publish({
        destination: '/app/chat',
        body: JSON.stringify({
          roomId,
          text,
          senderName: currentUser?.username,
          senderColor: currentUser?.color,
        }),
      });
    }
  }, [roomId, currentUser]);

  return { state, sendCode, sendCursor, sendChat };
}
