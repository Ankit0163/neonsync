import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, Settings, Sun, Moon, Zap, LogOut, X } from 'lucide-react';
import { CollabUser } from '@/hooks/use-collab';

interface NavbarProps {
  users: CollabUser[];
  clientId: string | null;
  connected: boolean;
  roomId: string;
  darkMode: boolean;
  onToggleDark: () => void;
  onLeave: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ users, clientId, connected, roomId, darkMode, onToggleDark, onLeave }) => {
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(`${window.location.origin}?room=${roomId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="h-14 glass-strong flex items-center justify-between px-4 border-b border-border z-50 relative shrink-0"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <Zap className="h-6 w-6 text-primary" />
            <div className="absolute inset-0 blur-lg bg-primary/30" />
          </div>
          <span className="text-lg font-bold tracking-tight">
            <span className="text-primary neon-text-cyan">Neon</span>
            <span className="text-foreground">Sync</span>
          </span>
          <div className="h-4 w-px bg-border mx-1" />
          {/* Room ID with copy */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/50 border border-border">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider mr-0.5">Room</span>
            <span className="text-xs text-foreground code-font">{roomId}</span>
            <button onClick={handleCopy} className="p-0.5 hover:text-primary transition-colors duration-200" title="Copy invite link">
              {copied ? <Check className="h-3.5 w-3.5 text-neon-green" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
            </button>
          </div>
          {/* Connection status */}
          <div className={`flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full ${connected ? 'text-neon-green bg-neon-green/10' : 'text-red-400 bg-red-400/10'}`}>
            <div className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-neon-green animate-pulse' : 'bg-red-400'}`} />
            {connected ? 'Live' : 'Offline'}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* User avatars */}
          <div className="flex items-center -space-x-2">
            {users.map((user, i) => (
              <motion.div
                key={user.id}
                initial={{ scale: 0, x: -10 }}
                animate={{ scale: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="relative group"
                title={user.id === clientId ? `${user.name} (you)` : user.name}
              >
                <div
                  className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 border-background cursor-pointer transition-transform duration-200 hover:scale-110 hover:z-10"
                  style={{ backgroundColor: `${user.color}33`, color: user.color, borderColor: user.color + '55' }}
                >
                  {user.name[0]}
                </div>
                {user.id === clientId && (
                  <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-neon-green border-2 border-background" />
                )}
                <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-card text-xs text-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-border pointer-events-none z-50">
                  {user.id === clientId ? `${user.name} (you)` : user.name}
                </div>
              </motion.div>
            ))}
            <div className="ml-3 text-xs text-muted-foreground pl-2">{users.length} online</div>
          </div>

          <div className="h-4 w-px bg-border" />

          {/* Dark mode toggle — actually works now */}
          <button
            onClick={onToggleDark}
            className="p-2 rounded-lg hover:bg-muted/50 transition-all duration-200 text-muted-foreground hover:text-foreground"
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* Settings button — now opens panel */}
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-lg hover:bg-muted/50 transition-all duration-200 text-muted-foreground hover:text-foreground"
            title="Settings"
          >
            <Settings className="h-4 w-4" />
          </button>

          {/* Leave room */}
          <button
            onClick={onLeave}
            className="p-2 rounded-lg hover:bg-red-500/10 transition-all duration-200 text-muted-foreground hover:text-red-400"
            title="Leave room"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </motion.nav>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => setShowSettings(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="fixed top-20 right-4 w-72 glass-strong border border-border rounded-xl p-5 z-50 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-foreground">Settings</span>
                <button onClick={() => setShowSettings(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Dark Mode</span>
                  <button
                    onClick={onToggleDark}
                    className={`w-10 h-5 rounded-full transition-colors duration-200 relative ${darkMode ? 'bg-primary' : 'bg-muted'}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-200 ${darkMode ? 'left-5' : 'left-0.5'}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Room ID</span>
                  <span className="text-xs code-font text-foreground bg-muted/40 px-2 py-0.5 rounded">{roomId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Users Online</span>
                  <span className="text-xs text-foreground">{users.length}</span>
                </div>
                <div className="pt-2 border-t border-border">
                  <button
                    onClick={handleCopy}
                    className="w-full text-xs text-primary hover:text-primary/80 transition-colors flex items-center justify-center gap-1.5 py-1.5"
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? 'Copied!' : 'Copy Invite Link'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
