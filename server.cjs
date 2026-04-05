/**
 * NeonSync - Real-time Collaboration Server
 * - Serves built frontend (npm run build) on port 3001
 * - WebSocket on same port under /ws path
 * - Works with ngrok: ngrok http 3001
 */

const { WebSocketServer, WebSocket } = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3001;

// ── HTTP server (serves built frontend if dist/ exists) ──────────────────────
const server = http.createServer((req, res) => {
  const distDir = path.join(__dirname, 'dist');
  if (!fs.existsSync(distDir)) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('NeonSync WebSocket server is running. Build the frontend with: npm run build');
    return;
  }

  let filePath = path.join(distDir, req.url === '/' ? 'index.html' : req.url);
  if (!fs.existsSync(filePath)) filePath = path.join(distDir, 'index.html'); // SPA fallback

  const ext = path.extname(filePath);
  const mimeTypes = {
    '.html': 'text/html', '.js': 'application/javascript',
    '.css': 'text/css', '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon', '.png': 'image/png',
  };
  res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
  fs.createReadStream(filePath).pipe(res);
});

// ── WebSocket server on /ws path ─────────────────────────────────────────────
const wss = new WebSocketServer({ server, path: '/ws' });

const DEFAULT_CODE = `import React, { useState, useEffect } from 'react';

// NeonSync - Real-time Collaborative Editor
// Try editing this code! All connected users will see your changes live.

interface User {
  id: string;
  name: string;
  color: string;
}

const CollabEditor: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [code, setCode] = useState('');

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3001/ws');
    ws.onmessage = (event) => {
      const { type, payload } = JSON.parse(event.data);
      if (type === 'CODE_UPDATE') setCode(payload.code);
      if (type === 'USERS_UPDATE') setUsers(payload.users);
    };
    return () => ws.close();
  }, []);

  return (
    <div className="editor-container">
      <div className="users-bar">
        {users.map(user => (
          <span key={user.id} style={{ color: user.color }}>{user.name}</span>
        ))}
      </div>
      <pre>{code}</pre>
    </div>
  );
};

export default CollabEditor;
`;

const rooms = new Map();
const COLORS = ['#22d3ee', '#a855f7', '#4ade80', '#f97316', '#ec4899', '#60a5fa'];
const NAMES = ['Alex', 'Maya', 'Sam', 'Jordan', 'Riley', 'Casey', 'Morgan', 'Drew'];
let nextColorIdx = 0;
let nextNameIdx = 0;

function getNextId() { return Math.random().toString(36).slice(2, 9); }

function getOrCreateRoom(roomId) {
  if (!rooms.has(roomId)) rooms.set(roomId, { code: DEFAULT_CODE, clients: new Map() });
  return rooms.get(roomId);
}

function getUsersList(room) {
  return Array.from(room.clients.entries()).map(([id, c]) => ({
    id, name: c.name, color: c.color, cursor: c.cursor,
  }));
}

function broadcastToRoom(room, data, excludeId = null) {
  const msg = JSON.stringify(data);
  for (const [id, client] of room.clients.entries()) {
    if (id !== excludeId && client.ws.readyState === WebSocket.OPEN) client.ws.send(msg);
  }
}

function broadcastToAll(room, data) { broadcastToRoom(room, data, null); }

wss.on('connection', (ws) => {
  let clientId = null, clientRoom = null, clientName = null, clientColor = null;

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }

    if (!clientId) {
      if (msg.type !== 'JOIN_ROOM') return;
      const roomId = (msg.payload?.roomId || 'default').trim().toLowerCase();
      clientId = getNextId();
      clientName = NAMES[nextNameIdx++ % NAMES.length];
      clientColor = COLORS[nextColorIdx++ % COLORS.length];
      clientRoom = getOrCreateRoom(roomId);
      clientRoom.clients.set(clientId, { ws, name: clientName, color: clientColor, cursor: null });
      console.log(`[+] ${clientName} joined room "${roomId}". Size: ${clientRoom.clients.size}`);

      ws.send(JSON.stringify({
        type: 'INIT',
        payload: { clientId, clientName, clientColor, roomId, code: clientRoom.code, users: getUsersList(clientRoom) },
      }));
      broadcastToRoom(clientRoom, { type: 'USER_JOINED', payload: { id: clientId, name: clientName, color: clientColor } }, clientId);
      broadcastToAll(clientRoom, { type: 'USERS_UPDATE', payload: { users: getUsersList(clientRoom) } });
      return;
    }

    switch (msg.type) {
      case 'CODE_UPDATE':
        clientRoom.code = msg.payload.code;
        broadcastToRoom(clientRoom, { type: 'CODE_UPDATE', payload: { code: clientRoom.code, authorId: clientId } }, clientId);
        break;
      case 'CURSOR_UPDATE':
        if (clientRoom.clients.has(clientId)) clientRoom.clients.get(clientId).cursor = msg.payload.cursor;
        broadcastToRoom(clientRoom, { type: 'CURSOR_UPDATE', payload: { userId: clientId, cursor: msg.payload.cursor } }, clientId);
        break;
      case 'CHAT_MESSAGE':
        broadcastToAll(clientRoom, {
          type: 'CHAT_MESSAGE',
          payload: {
            id: getNextId(), userId: clientId, name: clientName, color: clientColor,
            text: msg.payload.text,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        });
        break;
    }
  });

  ws.on('close', () => {
    if (!clientId || !clientRoom) return;
    clientRoom.clients.delete(clientId);
    console.log(`[-] ${clientName} disconnected. Room size: ${clientRoom.clients.size}`);
    broadcastToRoom(clientRoom, { type: 'USER_LEFT', payload: { id: clientId, name: clientName } });
    broadcastToAll(clientRoom, { type: 'USERS_UPDATE', payload: { users: getUsersList(clientRoom) } });
    if (clientRoom.clients.size === 0) {
      for (const [rid, r] of rooms.entries()) { if (r === clientRoom) { rooms.delete(rid); break; } }
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 NeonSync server running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket available at ws://localhost:${PORT}/ws`);
  console.log(`🌍 For public access: ngrok http ${PORT}`);
});
