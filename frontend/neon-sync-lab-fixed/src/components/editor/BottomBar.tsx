import { motion } from 'framer-motion';
import { Wifi, WifiOff, GitBranch, AlertCircle } from 'lucide-react';

interface BottomBarProps {
  connected: boolean;
  language: string;
  onLanguageChange: (lang: string) => void;
  cursorLine?: number;
  cursorCol?: number;
}

const BottomBar: React.FC<BottomBarProps> = ({ connected, language, onLanguageChange, cursorLine = 1, cursorCol = 1 }) => {
  return (
    <motion.div
      initial={{ y: 10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="h-7 flex items-center justify-between px-3 bg-card/60 border-t border-border text-[11px] shrink-0"
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          {connected ? (
            <><Wifi className="h-3 w-3 text-neon-green" /><span className="text-neon-green">Connected</span></>
          ) : (
            <><WifiOff className="h-3 w-3 text-destructive" /><span className="text-destructive">Reconnecting...</span></>
          )}
        </div>
        <div className="h-3 w-px bg-border" />
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <GitBranch className="h-3 w-3" />
          <span>main</span>
        </div>
        <div className="h-3 w-px bg-border" />
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <div className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-neon-cyan animate-pulse' : 'bg-muted-foreground'}`} />
          <span>{connected ? 'Syncing' : 'Offline'}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 text-muted-foreground">
          <AlertCircle className="h-3 w-3" />
          <span>0 errors</span>
        </div>
        <div className="h-3 w-px bg-border" />
        <select
          value={language}
          onChange={(e) => onLanguageChange(e.target.value)}
          className="bg-transparent text-muted-foreground text-[11px] outline-none cursor-pointer hover:text-foreground transition-colors"
        >
          <option value="typescript">TypeScript React</option>
          <option value="javascript">JavaScript</option>
          <option value="python">Python</option>
          <option value="java">Java</option>
          <option value="css">CSS</option>
        </select>
        <div className="h-3 w-px bg-border" />
        <span className="text-muted-foreground">Ln {cursorLine}, Col {cursorCol}</span>
      </div>
    </motion.div>
  );
};

export default BottomBar;
