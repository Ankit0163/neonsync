import { useState, useCallback, useEffect } from 'react';
import Navbar from '@/components/editor/Navbar';
import FileSidebar from '@/components/editor/FileSidebar';
import CodeEditor from '@/components/editor/CodeEditor';
import ChatPanel from '@/components/editor/ChatPanel';
import BottomBar from '@/components/editor/BottomBar';
import Lobby from '@/pages/Lobby';
import { useCollab } from '@/hooks/use-collab';
import { AuthUser, RoomData, getStoredUser, apiLogout } from '@/lib/api';

interface EditorAppProps {
  roomId: string;
  currentUser: AuthUser;
  initialCode: string;
  onLeave: () => void;
}

const EditorApp = ({ roomId, currentUser, initialCode, onLeave }: EditorAppProps) => {
  const { state, sendCode, sendCursor, sendChat } = useCollab(roomId, currentUser);
  const [language, setLanguage] = useState('typescript');
  const [cursor, setCursor] = useState({ lineNumber: 1, column: 1 });
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  // Pre-fill code from DB if editor hasn't received a sync yet
  const displayCode = state.code.startsWith('// Connecting') && initialCode
    ? initialCode
    : state.code;

  const handleCodeChange = useCallback((code: string) => sendCode(code), [sendCode]);

  const handleCursorChange = useCallback((pos: { lineNumber: number; column: number } | null) => {
    sendCursor(pos);
    if (pos) setCursor(pos);
  }, [sendCursor]);

  const handleLeave = () => {
    apiLogout();
    onLeave();
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <Navbar
        users={state.users}
        clientId={currentUser.email}
        connected={state.connected}
        roomId={roomId}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode(d => !d)}
        onLeave={handleLeave}
      />
      <div className="flex flex-1 overflow-hidden">
        <FileSidebar />
        <CodeEditor
          code={displayCode}
          language={language}
          users={state.users}
          clientId={currentUser.email}
          lastCodeAuthor={state.lastCodeAuthor}
          onCodeChange={handleCodeChange}
          onCursorChange={handleCursorChange}
        />
        <ChatPanel
          messages={state.messages}
          users={state.users}
          clientId={currentUser.email}
          onSend={sendChat}
        />
      </div>
      <BottomBar
        connected={state.connected}
        language={language}
        onLanguageChange={setLanguage}
        cursorLine={cursor.lineNumber}
        cursorCol={cursor.column}
      />
    </div>
  );
};

const Index = () => {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => getStoredUser());
  const [initialCode, setInitialCode] = useState('');

  // If user is already logged in from a previous session, skip to room stage
  const handleEnterRoom = (rid: string, user: AuthUser, roomData: RoomData) => {
    setCurrentUser(user);
    setInitialCode(roomData.code || '');
    setRoomId(rid);
  };

  const handleLeave = () => {
    setRoomId(null);
    setCurrentUser(null);
    setInitialCode('');
  };

  if (!roomId || !currentUser) {
    return <Lobby onEnterRoom={handleEnterRoom} />;
  }

  return (
    <EditorApp
      roomId={roomId}
      currentUser={currentUser}
      initialCode={initialCode}
      onLeave={handleLeave}
    />
  );
};

export default Index;
