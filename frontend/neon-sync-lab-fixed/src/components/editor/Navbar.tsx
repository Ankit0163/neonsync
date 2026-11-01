import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, Settings, Sun, Moon, LogOut, X, Users, Wifi, WifiOff } from 'lucide-react';
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
      {/* VS Code style title bar */}
      <motion.nav
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="h-10 flex items-center justify-between px-3 shrink-0 select-none"
        style={{ background: 'hsl(var(--titlebar))', borderBottom: '1px solid hsl(var(--border))' }}
      >
        {/* Left — Logo + Room */}
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="flex items-center gap-1.5">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 8L6 4L10 8L14 4" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L6 8L10 12L14 8" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
            </svg>
            <span className="text-[13px] font-semibold tracking-tight text-foreground">
              NeonSync
            </span>
          </div>

          <div className="w-px h-4 bg-border" />

          {/* Room ID badge */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-muted/60 border border-border/60">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Room</span>
            <span className="text-[11px] code-font text-foreground">{roomId}</span>
            <button
              onClick={handleCopy}
              className="ml-0.5 text-muted-foreground hover:text-primary transition-colors"
              title="Copy invite link"
            >
              {copied
                ? <Check className="h-3 w-3 text-green-400" />
                : <Copy className="h-3 w-3" />
              }
            </button>
          </div>

          {/* Connection pill */}
          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[11px] font-medium ${
            connected
              ? 'text-green-400 bg-green-400/8 border border-green-400/20'
              : 'text-red-400 bg-red-400/8 border border-red-400/20'
          }`}>
            <div className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
            {connected ? 'Live' : 'Offline'}
          </div>
        </div>

        {/* Right — Users + Actions */}
        <div className="flex items-center gap-1">
          {/* User avatars */}
          <div className="flex items-center gap-2 mr-2">
            <div className="flex items-center -space-x-1.5">
              {users.slice(0, 5).map((user, i) => (
                <motion.div
                  key={user.id}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="relative group"
                  title={user.id === clientId ? `${user.name} (you)` : user.name}
                >
                  <div
                    className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold border border-background"
                    style={{
                      backgroundColor: user.color + '28',
                      color: user.color,
                      borderColor: user.color + '60',
                    }}
                  >
                    {user.name[0].toUpperCase()}
                  </div>
                  {/* Online dot */}
                  {user.id === clientId && (
                    <div className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-400 border border-background" />
                  )}
                  {/* Tooltip */}
                  <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-card text-[10px] text-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-border pointer-events-none z-50">
                    {user.id === clientId ? `${user.name} (you)` : user.name}
                  </div>
                </motion.div>
              ))}
            </div>
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" />
              {users.length}
            </span>
          </div>

          <div className="w-px h-4 bg-border mx-1" />

          {/* Action buttons — VS Code style icon buttons */}
          <button
            onClick={onToggleDark}
            className="h-7 w-7 flex items-center justify-center rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
            title={darkMode ? 'Light mode' : 'Dark mode'}
          >
            {darkMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </button>

          <button
            onClick={() => setShowSettings(true)}
            className="h-7 w-7 flex items-center justify-center rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
            title="Settings"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={onLeave}
            className="h-7 w-7 flex items-center justify-center rounded-sm text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-all"
            title="Leave room"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </motion.nav>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-50"
              onClick={() => setShowSettings(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="fixed top-14 right-3 w-64 z-50 rounded-md border border-border shadow-2xl overflow-hidden"
              style={{ background: 'hsl(var(--card))' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
                <span className="text-[12px] font-semibold text-foreground">Settings</span>
                <button onClick={() => setShowSettings(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">Dark Mode</span>
                  <button
                    onClick={onToggleDark}
                    className={`w-8 h-4 rounded-full transition-colors duration-200 relative ${darkMode ? 'bg-primary' : 'bg-muted'}`}
                  >
                    <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all duration-200 ${darkMode ? 'left-4' : 'left-0.5'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">Room ID</span>
                  <span className="text-[11px] code-font text-foreground bg-muted/60 px-2 py-0.5 rounded-sm">{roomId}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">Users Online</span>
                  <span className="text-[11px] text-foreground">{users.length}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">Connection</span>
                  <span className={`text-[11px] flex items-center gap-1 ${connected ? 'text-green-400' : 'text-red-400'}`}>
                    {connected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                    {connected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>

                <div className="pt-2 border-t border-border">
                  <button
                    onClick={handleCopy}
                    className="w-full text-[11px] text-primary hover:text-primary/80 transition-colors flex items-center justify-center gap-1.5 py-1.5 rounded-sm hover:bg-primary/5"
                  >
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copied ? 'Copied!' : 'Copy Invite Link'}
                  </button>
                </div>

                <div className="border-t border-border pt-2">
                  <button
                    onClick={onLeave}
                    className="w-full text-[11px] text-red-400 hover:text-red-300 transition-colors flex items-center justify-center gap-1.5 py-1.5 rounded-sm hover:bg-red-400/5"
                  >
                    <LogOut className="h-3 w-3" />
                    Leave Room
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