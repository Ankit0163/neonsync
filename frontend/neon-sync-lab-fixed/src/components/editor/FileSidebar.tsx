import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Files,
  Search,
  GitBranch,
  Settings,
  ChevronRight,
  ChevronDown,
  FileCode,
  FileJson,
  FileText,
  Folder,
  FolderOpen,
  FilePlus2,
  FolderPlus,
  Pencil,
  Trash2,
} from "lucide-react";

type FileNode = {
  name: string;
  type: "file" | "folder";
  content?: string;
  children?: FileNode[];
};

interface Props {
  tree: FileNode;
  activeFile: string;
  onSelect: (path: string) => void;
  onRename: (path: string, newName: string) => boolean;
  onDelete: (path: string) => void;
  onCreate: (parentPath: string, type: "file" | "folder") => string;
  onMove: (sourcePath: string, targetFolderPath: string) => boolean;
}

const sidebarIcons = [
  { icon: Files, label: "Explorer", id: "files" },
  { icon: Search, label: "Search", id: "search" },
  { icon: GitBranch, label: "Git", id: "git" },
  { icon: Settings, label: "Settings", id: "settings" },
];

const joinPath = (...parts: string[]) =>
  parts.filter(Boolean).join("/").replace(/\/+/g, "/");

const isDescendantPath = (path: string, parent: string) =>
  path === parent || path.startsWith(`${parent}/`);

const collectFolderPaths = (node: FileNode, path = node.name): string[] => {
  if (node.type !== "folder") return [];

  return [
    path,
    ...(node.children || []).flatMap((child) =>
      collectFolderPaths(child, joinPath(path, child.name))
    ),
  ];
};

const sortNodes = (nodes: FileNode[] = []) =>
  [...nodes].sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });

const getFileIcon = (name: string) => {
  const ext = name.split(".").pop()?.toLowerCase();

  if (["ts", "tsx", "js", "jsx"].includes(ext || "")) {
    return <FileCode className="h-4 w-4 text-cyan-400 shrink-0" />;
  }

  if (ext === "json") {
    return <FileJson className="h-4 w-4 text-orange-400 shrink-0" />;
  }

  if (["md", "txt"].includes(ext || "")) {
    return <FileText className="h-4 w-4 text-blue-400 shrink-0" />;
  }

  if (["css", "scss", "sass"].includes(ext || "")) {
    return <FileCode className="h-4 w-4 text-pink-400 shrink-0" />;
  }

  return <FileText className="h-4 w-4 text-gray-400 shrink-0" />;
};

interface ContextMenuProps {
  x: number;
  y: number;
  node: FileNode;
  isRoot: boolean;
  onRename: () => void;
  onDelete: () => void;
  onNewFile: () => void;
  onNewFolder: () => void;
  onClose: () => void;
}

const ContextMenu = ({
  x,
  y,
  node,
  isRoot,
  onRename,
  onDelete,
  onNewFile,
  onNewFolder,
  onClose,
}: ContextMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const canCreate = node.type === "folder";

  useEffect(() => {
    const handleClickOutside = (e: globalThis.MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[160px] overflow-hidden rounded-md border border-zinc-700 bg-[#1e1e2e] py-1 shadow-xl"
      style={{ top: y, left: x }}
    >
      {canCreate && (
        <>
          <button
            onClick={() => {
              onNewFile();
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-700/60 text-left"
          >
            <FilePlus2 className="h-3.5 w-3.5" />
            New File
          </button>

          <button
            onClick={() => {
              onNewFolder();
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-700/60 text-left"
          >
            <FolderPlus className="h-3.5 w-3.5" />
            New Folder
          </button>

          <div className="h-px bg-zinc-700/50 mx-2 my-1" />
        </>
      )}

      {!isRoot && (
        <button
          onClick={() => {
            onRename();
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-700/60 text-left"
        >
          <Pencil className="h-3.5 w-3.5" />
          Rename
        </button>
      )}

      {!isRoot && (
        <button
          onClick={() => {
            onDelete();
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 text-left"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
      )}
    </div>
  );
};

interface FileTreeItemProps {
  node: FileNode;
  path: string;
  depth: number;
  activeFile: string;
  expandedPaths: Set<string>;
  setExpandedPaths: React.Dispatch<React.SetStateAction<Set<string>>>;
  pendingRenamePath: string | null;
  setPendingRenamePath: (path: string | null) => void;
  onSelect: (path: string) => void;
  onRename: (path: string, newName: string) => boolean;
  onDelete: (path: string) => void;
  onCreate: (parentPath: string, type: "file" | "folder") => string;
  onMove: (sourcePath: string, targetFolderPath: string) => boolean;
}

const FileTreeItem = memo(
  ({
    node,
    path,
    depth,
    activeFile,
    expandedPaths,
    setExpandedPaths,
    pendingRenamePath,
    setPendingRenamePath,
    onSelect,
    onRename,
    onDelete,
    onCreate,
    onMove,
  }: FileTreeItemProps) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isRenaming, setIsRenaming] = useState(false);
    const [renameValue, setRenameValue] = useState(node.name);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(
      null
    );
    const [isDragOver, setIsDragOver] = useState(false);

    const isFolder = node.type === "folder";
    const isRoot = depth === 0;
    const isOpen = expandedPaths.has(path);
    const isActive = activeFile === path;
    const sortedChildren = useMemo(() => sortNodes(node.children), [node.children]);

    useEffect(() => {
      setRenameValue(node.name);
    }, [node.name]);

    useEffect(() => {
      if (pendingRenamePath === path) {
        setIsRenaming(true);
        setPendingRenamePath(null);
      }
    }, [path, pendingRenamePath, setPendingRenamePath]);

    useEffect(() => {
      if (isRenaming) {
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }, [isRenaming]);

    const toggleFolder = () => {
      if (!isFolder) return;

      setExpandedPaths((prev) => {
        const next = new Set(prev);
        if (next.has(path)) next.delete(path);
        else next.add(path);
        return next;
      });
    };

    const startRename = () => {
      if (isRoot) return;
      setRenameValue(node.name);
      setIsRenaming(true);
    };

    const commitRename = () => {
      const trimmed = renameValue.trim();

      if (!trimmed || trimmed === node.name) {
        setRenameValue(node.name);
        setIsRenaming(false);
        return;
      }

      const renamed = onRename(path, trimmed);

      if (!renamed) {
        setRenameValue(node.name);
      }

      setIsRenaming(false);
    };

    const createChild = (type: "file" | "folder") => {
      if (!isFolder) return;

      setExpandedPaths((prev) => new Set(prev).add(path));
      const newPath = onCreate(path, type);
      if (newPath) setPendingRenamePath(newPath);
    };

    const handleContextMenu = (e: MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY });
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (isFolder) toggleFolder();
        else onSelect(path);
      }

      if (e.key === "F2") {
        e.preventDefault();
        startRename();
      }

      if (e.key === "Delete" && !isRoot) {
        e.preventDefault();
        onDelete(path);
      }

      if (e.key === "ArrowRight" && isFolder && !isOpen) {
        e.preventDefault();
        toggleFolder();
      }

      if (e.key === "ArrowLeft" && isFolder && isOpen) {
        e.preventDefault();
        toggleFolder();
      }
    };

    const handleDragStart = (e: DragEvent<HTMLButtonElement>) => {
      if (isRoot) return;
      e.dataTransfer.setData("application/x-file-node-path", path);
      e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: DragEvent<HTMLButtonElement>) => {
      if (!isFolder) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setIsDragOver(true);
    };

    const handleDrop = (e: DragEvent<HTMLButtonElement>) => {
      if (!isFolder) return;

      e.preventDefault();
      setIsDragOver(false);

      const sourcePath = e.dataTransfer.getData("application/x-file-node-path");
      if (!sourcePath || sourcePath === path || isDescendantPath(path, sourcePath)) {
        return;
      }

      const moved = onMove(sourcePath, path);
      if (moved) setExpandedPaths((prev) => new Set(prev).add(path));
    };

    return (
      <div>
        <div className="relative group" onContextMenu={handleContextMenu}>
          {isRenaming ? (
            <div
              className="flex items-center gap-1.5 py-1 px-2"
              style={{ paddingLeft: `${depth * 14 + 8}px` }}
            >
              {isFolder ? (
                <ChevronDown className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <span className="w-3.5 shrink-0" />
              )}

              {isFolder ? (
                <FolderOpen className="h-4 w-4 text-purple-400 shrink-0" />
              ) : (
                getFileIcon(node.name)
              )}

              <input
                ref={inputRef}
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename();
                  if (e.key === "Escape") {
                    setRenameValue(node.name);
                    setIsRenaming(false);
                  }
                }}
                className="min-w-0 flex-1 rounded border border-cyan-500/60 bg-zinc-900 px-1.5 py-0.5 text-xs text-white outline-none focus:ring-1 focus:ring-cyan-500/40"
              />
            </div>
          ) : (
            <button
              draggable={!isRoot}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => {
                if (isFolder) toggleFolder();
                else onSelect(path);
              }}
              onDoubleClick={startRename}
              onKeyDown={handleKeyDown}
              title={path}
              className={`w-full flex items-center gap-1.5 py-1 px-2 text-sm rounded transition outline-none ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-foreground/80 hover:bg-muted/40"
              } ${isDragOver ? "ring-1 ring-cyan-500/60 bg-cyan-500/10" : ""}`}
              style={{ paddingLeft: `${depth * 14 + 8}px` }}
            >
              {isFolder ? (
                <>
                  {isOpen ? (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                  )}
                  {isOpen ? (
                    <FolderOpen className="h-4 w-4 text-purple-400 shrink-0" />
                  ) : (
                    <Folder className="h-4 w-4 text-purple-400 shrink-0" />
                  )}
                </>
              ) : (
                <>
                  <span className="w-3.5 shrink-0" />
                  {getFileIcon(node.name)}
                </>
              )}

              <span className="truncate text-xs">{node.name}</span>
            </button>
          )}

          {contextMenu && (
            <ContextMenu
              x={contextMenu.x}
              y={contextMenu.y}
              node={node}
              isRoot={isRoot}
              onRename={startRename}
              onDelete={() => onDelete(path)}
              onNewFile={() => createChild("file")}
              onNewFolder={() => createChild("folder")}
              onClose={() => setContextMenu(null)}
            />
          )}
        </div>

        <AnimatePresence initial={false}>
          {isFolder && isOpen && sortedChildren.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.16 }}
              className="overflow-hidden"
            >
              {sortedChildren.map((child) => {
  const childPath = joinPath(path, child.name);

  return (
    <FileTreeItem
      key={childPath}
      node={child}
      path={childPath}
      depth={depth + 1}
      activeFile={activeFile}
      expandedPaths={expandedPaths}
      setExpandedPaths={setExpandedPaths}
      pendingRenamePath={pendingRenamePath}
      setPendingRenamePath={setPendingRenamePath}
      onSelect={onSelect}
      onRename={onRename}
      onDelete={onDelete}
      onCreate={onCreate}
      onMove={onMove}
    />
  );
})}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

FileTreeItem.displayName = "FileTreeItem";

const FileSidebar = ({
  tree,
  activeFile,
  onSelect,
  onRename,
  onDelete,
  onCreate,
  onMove,
}: Props) => {
  const [activeTab, setActiveTab] = useState("files");
  const [collapsed, setCollapsed] = useState(false);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(
  () => new Set(
    tree.children?.map(child => `${tree.name}/${child.name}`) || []
  )
);
  const [pendingRenamePath, setPendingRenamePath] = useState<string | null>(null);

  const allFolderPaths = useMemo(() => collectFolderPaths(tree), [tree]);

  const expandAll = () => {
    setExpandedPaths(new Set(allFolderPaths));
  };

  const collapseAll = () => {
    setExpandedPaths(new Set([tree.name]));
  };

  const createAtRoot = (type: "file" | "folder") => {
    setExpandedPaths((prev) => new Set(prev).add(tree.name));
    const newPath = onCreate(tree.name, type);
    if (newPath) setPendingRenamePath(newPath);
  };

  return (
    <div className="flex h-full">
      <div className="w-12 flex flex-col items-center py-3 gap-1 border-r border-border">
        {sidebarIcons.map((item) => (
          <button
            key={item.id}
            title={item.label}
            onClick={() => {
              if (activeTab === item.id) setCollapsed(!collapsed);
              else {
                setActiveTab(item.id);
                setCollapsed(false);
              }
            }}
            className={`p-2 rounded ${
              activeTab === item.id && !collapsed
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:bg-muted/30"
            }`}
          >
            <item.icon className="h-5 w-5" />
          </button>
        ))}
      </div>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: 260 }}
            exit={{ width: 0 }}
            className="border-r border-border bg-card/40 overflow-hidden"
          >
            <div className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-muted-foreground">
              <span>Explorer</span>

              <div className="flex items-center gap-1">
                <button
                  title="New File"
                  onClick={() => createAtRoot("file")}
                  className="rounded p-1 hover:bg-muted/50 hover:text-foreground"
                >
                  <FilePlus2 className="h-3.5 w-3.5" />
                </button>

                <button
                  title="New Folder"
                  onClick={() => createAtRoot("folder")}
                  className="rounded p-1 hover:bg-muted/50 hover:text-foreground"
                >
                  <FolderPlus className="h-3.5 w-3.5" />
                </button>

                <button
                  title="Expand All"
                  onClick={expandAll}
                  className="rounded p-1 hover:bg-muted/50 hover:text-foreground"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>

                <button
                  title="Collapse All"
                  onClick={collapseAll}
                  className="rounded p-1 hover:bg-muted/50 hover:text-foreground"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="px-1 overflow-y-auto">
              <FileTreeItem
                node={tree}
                path={tree.name}
                depth={0}
                activeFile={activeFile}
                expandedPaths={expandedPaths}
                setExpandedPaths={setExpandedPaths}
                pendingRenamePath={pendingRenamePath}
                setPendingRenamePath={setPendingRenamePath}
                onSelect={onSelect}
                onRename={onRename}
                onDelete={onDelete}
                onCreate={onCreate}
                onMove={onMove}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FileSidebar;
