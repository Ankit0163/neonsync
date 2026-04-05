import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Files, Search, GitBranch, Settings, ChevronRight, ChevronDown,
  FileCode, FileJson, FileText, Folder, FolderOpen,
} from "lucide-react";

type FileItem = {
  name: string;
  type: "file" | "folder";
  icon?: "js" | "json" | "md" | "py";
  children?: FileItem[];
};

const fileTree: FileItem[] = [
  {
    name: "src", type: "folder", children: [
      {
        name: "components", type: "folder", children: [
          { name: "App.tsx", type: "file", icon: "js" },
          { name: "Editor.tsx", type: "file", icon: "js" },
          { name: "Chat.tsx", type: "file", icon: "js" },
        ],
      },
      { name: "index.tsx", type: "file", icon: "js" },
      { name: "styles.css", type: "file" },
      { name: "utils.py", type: "file", icon: "py" },
    ],
  },
  { name: "package.json", type: "file", icon: "json" },
  { name: "README.md", type: "file", icon: "md" },
  { name: "tsconfig.json", type: "file", icon: "json" },
];

const sidebarIcons = [
  { icon: Files, label: "Explorer", id: "files" },
  { icon: Search, label: "Search", id: "search" },
  { icon: GitBranch, label: "Git", id: "git" },
  { icon: Settings, label: "Settings", id: "settings" },
];

const getFileIcon = (icon?: string) => {
  switch (icon) {
    case "js": return <FileCode className="h-4 w-4 text-neon-cyan" />;
    case "json": return <FileJson className="h-4 w-4 text-neon-orange" />;
    case "md": return <FileText className="h-4 w-4 text-neon-blue" />;
    case "py": return <FileCode className="h-4 w-4 text-neon-green" />;
    default: return <FileText className="h-4 w-4 text-muted-foreground" />;
  }
};

const FileTreeItem = ({ item, depth = 0 }: { item: FileItem; depth?: number }) => {
  const [open, setOpen] = useState(item.name === "src");
  const [selected, setSelected] = useState(false);

  return (
    <div>
      <button
        onClick={() => {
          if (item.type === "folder") setOpen(!open);
          else setSelected(!selected);
        }}
        className={`w-full flex items-center gap-1.5 py-1 px-2 text-sm hover:bg-muted/40 rounded transition-colors duration-150 group ${selected ? "bg-primary/10 text-primary" : "text-foreground/80"}`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {item.type === "folder" ? (
          <>
            {open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
            {open ? <FolderOpen className="h-4 w-4 text-neon-purple" /> : <Folder className="h-4 w-4 text-neon-purple" />}
          </>
        ) : (
          <>
            <span className="w-3.5" />
            {getFileIcon(item.icon)}
          </>
        )}
        <span className="truncate text-xs">{item.name}</span>
      </button>
      <AnimatePresence>
        {item.type === "folder" && open && item.children && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {item.children.map((child) => (
              <FileTreeItem key={child.name} item={child} depth={depth + 1} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const FileSidebar = () => {
  const [activeTab, setActiveTab] = useState("files");
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-full">
      {/* Icon bar */}
      <div className="w-12 flex flex-col items-center py-3 gap-1 bg-background/80 border-r border-border">
        {sidebarIcons.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              if (activeTab === item.id) setCollapsed(!collapsed);
              else { setActiveTab(item.id); setCollapsed(false); }
            }}
            className={`p-2.5 rounded-lg transition-all duration-200 relative group ${
              activeTab === item.id && !collapsed
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
            }`}
          >
            <item.icon className="h-5 w-5" />
            {activeTab === item.id && !collapsed && (
              <motion.div
                layoutId="sidebar-indicator"
                className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r"
              />
            )}
            <div className="absolute left-12 top-1/2 -translate-y-1/2 px-2 py-1 rounded bg-card text-xs text-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-border pointer-events-none z-50">
              {item.label}
            </div>
          </button>
        ))}
      </div>

      {/* Panel */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 220, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-r border-border bg-card/40 overflow-hidden"
          >
            <div className="w-[220px]">
              <div className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Explorer
              </div>
              <div className="px-1 scrollbar-thin overflow-y-auto max-h-[calc(100vh-8rem)]">
                {fileTree.map((item) => (
                  <FileTreeItem key={item.name} item={item} />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FileSidebar;
