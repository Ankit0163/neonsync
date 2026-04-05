import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, ArrowRight, Users, Copy, Check, LogIn, UserPlus, Loader2 } from 'lucide-react';
import { apiLogin, apiRegister, apiCreateRoom, apiJoinRoom, AuthUser, RoomData } from '@/lib/api';

interface LobbyProps {
  onEnterRoom: (roomId: string, user: AuthUser, roomData: RoomData) => void;
}

type AuthTab = 'login' | 'register';
type Stage = 'auth' | 'room';

function generateRoomId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

const Lobby: React.FC<LobbyProps> = ({ onEnterRoom }) => {
  // ── auth stage ────────────────────────────────────────────
  const [authTab, setAuthTab] = useState<AuthTab>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  // ── room stage ────────────────────────────────────────────
  const [stage, setStage] = useState<Stage>('auth');
  const [roomInput, setRoomInput] = useState('');
  const [roomName, setRoomName] = useState('');
  const [generated, setGenerated] = useState('');
  const [copied, setCopied] = useState(false);
  const [roomError, setRoomError] = useState('');
  const [roomLoading, setRoomLoading] = useState(false);

  // ── Auth handlers ─────────────────────────────────────────
  const handleAuth = async () => {
    setAuthError('');
    setAuthLoading(true);
    try {
      let user: AuthUser;
      if (authTab === 'login') {
        user = await apiLogin(email, password);
      } else {
        if (!username.trim()) { setAuthError('Username is required'); setAuthLoading(false); return; }
        user = await apiRegister(username, email, password);
      }
      setCurrentUser(user);
      setStage('room');
    } catch (err: any) {
      setAuthError(err.message || 'Something went wrong');
    } finally {
      setAuthLoading(false);
    }
  };

  // ── Room handlers ─────────────────────────────────────────
  const handleGenerate = () => {
    const id = generateRoomId();
    setGenerated(id);
    setRoomInput(id);
    setRoomName(`Room ${id.slice(0, 4).toUpperCase()}`);
    setRoomError('');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generated);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEnterRoom = async () => {
    const id = roomInput.trim().toLowerCase();
    if (!id) { setRoomError('Please enter or generate a Room ID.'); return; }
    if (!/^[a-z0-9\-]+$/.test(id)) { setRoomError('Only letters, numbers and hyphens allowed.'); return; }
    setRoomError('');
    setRoomLoading(true);
    try {
      let roomData: RoomData;
      // Try joining first — if not found, create it
      try {
        roomData = await apiJoinRoom(id);
      } catch {
        const name = roomName.trim() || `Room ${id.slice(0, 4).toUpperCase()}`;
        roomData = await apiCreateRoom(name, id);
      }
      onEnterRoom(id, currentUser!, roomData);
    } catch (err: any) {
      setRoomError(err.message || 'Could not enter room');
    } finally {
      setRoomLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="relative">
              <Zap className="h-8 w-8 text-primary" />
              <div className="absolute inset-0 blur-xl bg-primary/40" />
            </div>
            <span className="text-3xl font-bold tracking-tight">
              <span className="text-primary neon-text-cyan">Neon</span>
              <span className="text-foreground">Sync</span>
            </span>
          </div>
          <p className="text-muted-foreground text-sm">Real-time collaborative code editor</p>
        </div>

        <AnimatePresence mode="wait">
          {/* ── Stage 1: Auth ── */}
          {stage === 'auth' && (
            <motion.div
              key="auth"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="glass-strong rounded-2xl border border-border p-8 space-y-5"
            >
              {/* Tabs */}
              <div className="flex rounded-lg bg-muted/30 p-1 gap-1">
                {(['login', 'register'] as AuthTab[]).map(tab => (
                  <button
                    key={tab}
                    onClick={() => { setAuthTab(tab); setAuthError(''); }}
                    className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all duration-200 flex items-center justify-center gap-1.5 ${
                      authTab === tab
                        ? 'bg-primary text-primary-foreground shadow'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab === 'login' ? <LogIn className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
                    {tab === 'login' ? 'Login' : 'Register'}
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                {authTab === 'register' && (
                  <input
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Username"
                    className="w-full px-3 py-2.5 rounded-lg bg-muted/30 border border-border text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/60 transition-colors"
                  />
                )}
                <input
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Email"
                  type="email"
                  className="w-full px-3 py-2.5 rounded-lg bg-muted/30 border border-border text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/60 transition-colors"
                />
                <input
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAuth()}
                  placeholder="Password"
                  type="password"
                  className="w-full px-3 py-2.5 rounded-lg bg-muted/30 border border-border text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/60 transition-colors"
                />
              </div>

              {authError && (
                <p className="text-xs text-destructive">{authError}</p>
              )}

              <button
                onClick={handleAuth}
                disabled={authLoading}
                className="w-full py-2.5 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {authLoading
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : authTab === 'login' ? 'Sign In' : 'Create Account'
                }
              </button>
            </motion.div>
          )}

          {/* ── Stage 2: Room ── */}
          {stage === 'room' && (
            <motion.div
              key="room"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="glass-strong rounded-2xl border border-border p-8 space-y-6"
            >
              {/* Welcome banner */}
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary/10 border border-primary/20">
                <div
                  className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                  style={{ backgroundColor: `${currentUser?.color}33`, color: currentUser?.color }}
                >
                  {currentUser?.username?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">{currentUser?.username}</p>
                  <p className="text-[10px] text-muted-foreground">{currentUser?.email}</p>
                </div>
              </div>

              {/* Create room */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted-foreground uppercase tracking-widest">Create a Room</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <button
                  onClick={handleGenerate}
                  className="w-full py-2.5 px-4 rounded-lg border border-primary/40 text-primary text-sm font-medium hover:bg-primary/10 hover:border-primary transition-all duration-200"
                >
                  Generate Room ID
                </button>
                {generated && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border"
                  >
                    <span className="flex-1 text-sm code-font text-foreground">{generated}</span>
                    <button onClick={handleCopy} className="text-muted-foreground hover:text-primary transition-colors">
                      {copied ? <Check className="h-4 w-4 text-neon-green" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </motion.div>
                )}
              </div>

              {/* Join room */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted-foreground uppercase tracking-widest">Join a Room</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <input
                  value={roomInput}
                  onChange={e => { setRoomInput(e.target.value); setRoomError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleEnterRoom()}
                  placeholder="Enter Room ID..."
                  className="w-full px-3 py-2.5 rounded-lg bg-muted/30 border border-border text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/60 transition-colors code-font"
                />
                {roomError && <p className="text-xs text-destructive">{roomError}</p>}
                <button
                  onClick={handleEnterRoom}
                  disabled={roomLoading}
                  className="w-full py-2.5 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all duration-200 flex items-center justify-center gap-2 group disabled:opacity-60"
                >
                  {roomLoading
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <>Enter Room <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" /></>
                  }
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border">
                <Users className="h-3.5 w-3.5 shrink-0" />
                <span>Share the Room ID with others to code together in real-time</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default Lobby;
