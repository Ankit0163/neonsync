import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MessageSquare } from 'lucide-react';
import { ChatMessage, CollabUser } from '@/hooks/use-collab';

interface ChatPanelProps {
  messages: ChatMessage[];
  users: CollabUser[];
  clientId: string | null;
  onSend: (text: string) => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ messages, users, clientId, onSend }) => {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSend(input.trim());
    setInput('');
  };

  const onlineCount = users.length;

  return (
    <div className="w-72 flex flex-col border-l border-border bg-card/30 shrink-0">
      <div className="h-9 flex items-center gap-2 px-3 border-b border-border shrink-0">
        <MessageSquare className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold text-foreground">Live Chat</span>
        <div className="ml-auto flex items-center gap-1">
          <div className="h-1.5 w-1.5 rounded-full bg-neon-green animate-pulse-neon" />
          <span className="text-[10px] text-muted-foreground">{onlineCount} online</span>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-3">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-2 ${msg.userId === clientId ? 'flex-row-reverse' : ''}`}
            >
              {msg.userId !== 'system' && (
                <div
                  className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5"
                  style={{ backgroundColor: `${msg.color}33`, color: msg.color, border: `1px solid ${msg.color}66` }}
                >
                  {msg.name[0]}
                </div>
              )}
              <div className={`flex-1 min-w-0 ${msg.userId === 'system' ? 'text-center' : ''}`}>
                {msg.userId === 'system' ? (
                  <p className="text-[10px] text-muted-foreground italic">{msg.text}</p>
                ) : (
                  <>
                    <div className={`flex items-baseline gap-2 ${msg.userId === clientId ? 'flex-row-reverse' : ''}`}>
                      <span className="text-xs font-semibold" style={{ color: msg.color }}>
                        {msg.userId === clientId ? 'You' : msg.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{msg.time}</span>
                    </div>
                    <p className={`text-xs text-foreground/80 mt-0.5 break-words px-2 py-1.5 rounded-lg ${
                      msg.userId === clientId
                        ? 'bg-primary/15 text-primary ml-auto'
                        : 'bg-muted/30'
                    }`}>
                      {msg.text}
                    </p>
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="p-2 border-t border-border shrink-0">
        <div className="flex items-center gap-1.5 bg-muted/30 rounded-lg px-2 py-1.5 border border-border focus-within:border-primary/50 transition-colors">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Type a message..."
            className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="p-1 rounded text-primary hover:bg-primary/10 transition-colors disabled:opacity-40"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
