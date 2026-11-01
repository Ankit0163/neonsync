import { useState, useCallback, useEffect, useMemo } from "react";
import Navbar from "@/components/editor/Navbar";
import FileSidebar from "@/components/editor/FileSidebar";
import CodeEditor from "@/components/editor/CodeEditor";
import ChatPanel from "@/components/editor/ChatPanel";
import BottomBar from "@/components/editor/BottomBar";
import Lobby from "@/pages/Lobby";
import { useCollab } from "@/hooks/use-collab";
import { AuthUser, RoomData, getStoredUser, apiLogout } from "@/lib/api";

export type FileNode = {
  name: string;
  type: "file" | "folder";
  content?: string;
  children?: FileNode[];
};

interface EditorAppProps {
  roomId: string;
  currentUser: AuthUser;
  initialCode: string;
  onLeave: () => void;
}

type FlatFiles = Record<string, string>;
type SetFilesAction = FlatFiles | ((prev: FlatFiles) => FlatFiles);

const ROOT_NAME = "root";

const joinPath = (...parts: string[]) =>
  parts.filter(Boolean).join("/").replace(/\/+/g, "/");

const APP_PATH = joinPath(ROOT_NAME, "src", "App.tsx");

const basename = (path: string) => path.split("/").pop() || path;

const dirname = (path: string) => {
  const parts = path.split("/");
  parts.pop();
  return parts.join("/") || ROOT_NAME;
};

const isDescendantPath = (path: string, parent: string) =>
  path === parent || path.startsWith(`${parent}/`);

const sortNodes = (nodes: FileNode[] = []) =>
  [...nodes].sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });

const flattenTree = (node: FileNode, currentPath = node.name): FlatFiles => {
  if (node.type === "file") {
    return { [currentPath]: node.content || "" };
  }

  return (node.children || []).reduce<FlatFiles>(
    (acc, child) => ({
      ...acc,
      ...flattenTree(child, joinPath(currentPath, child.name)),
    }),
    {}
  );
};


const collectFilePaths = (node: FileNode, currentPath = node.name): string[] => {
  if (node.type === "file") return [currentPath];

  return (node.children || []).flatMap((child) =>
    collectFilePaths(child, joinPath(currentPath, child.name))
  );
};

const findNode = (
  node: FileNode,
  targetPath: string,
  currentPath = node.name
): FileNode | null => {
  if (currentPath === targetPath) return node;
  if (node.type !== "folder") return null;

  for (const child of node.children || []) {
    const found = findNode(child, targetPath, joinPath(currentPath, child.name));
    if (found) return found;
  }

  return null;
};

const updateNode = (
  node: FileNode,
  targetPath: string,
  updater: (node: FileNode) => FileNode,
  currentPath = node.name
): FileNode => {
  if (currentPath === targetPath) return updater(node);
  if (node.type !== "folder") return node;

  return {
    ...node,
    children: (node.children || []).map((child) =>
      updateNode(child, targetPath, updater, joinPath(currentPath, child.name))
    ),
  };
};

const updateFileContent = (
  node: FileNode,
  targetPath: string,
  content: string
): FileNode =>
  updateNode(node, targetPath, (target) =>
    target.type === "file" ? { ...target, content } : target
  );

const hasDuplicateName = (
  tree: FileNode,
  parentPath: string,
  name: string,
  ignorePath?: string
) => {
  const parent = findNode(tree, parentPath);
  if (!parent || parent.type !== "folder") return true;

  return (parent.children || []).some((child) => {
    const childPath = joinPath(parentPath, child.name);
    return (
      child.name.toLowerCase() === name.toLowerCase() && childPath !== ignorePath
    );
  });
};

const getUniqueName = (
  tree: FileNode,
  parentPath: string,
  desiredName: string
) => {
  const parent = findNode(tree, parentPath);
  const children = parent?.children || [];
  const existing = new Set(children.map((child) => child.name.toLowerCase()));

  if (!existing.has(desiredName.toLowerCase())) return desiredName;

  const dotIndex = desiredName.lastIndexOf(".");
  const hasExtension = dotIndex > 0 && dotIndex < desiredName.length - 1;
  const base = hasExtension ? desiredName.slice(0, dotIndex) : desiredName;
  const ext = hasExtension ? desiredName.slice(dotIndex) : "";

  let index = 1;
  let candidate = `${base}-${index}${ext}`;

  while (existing.has(candidate.toLowerCase())) {
    index += 1;
    candidate = `${base}-${index}${ext}`;
  }

  return candidate;
};

const insertNode = (
  tree: FileNode,
  parentPath: string,
  nodeToInsert: FileNode
): FileNode =>
  updateNode(tree, parentPath, (target) => {
    if (target.type !== "folder") return target;

    return {
      ...target,
      children: sortNodes([...(target.children || []), nodeToInsert]),
    };
  });

const deleteNode = (
  node: FileNode,
  targetPath: string,
  currentPath = node.name
): FileNode | null => {
  if (currentPath === targetPath) return null;
  if (node.type !== "folder") return node;

  const children = (node.children || [])
    .map((child) => deleteNode(child, targetPath, joinPath(currentPath, child.name)))
    .filter(Boolean) as FileNode[];

  return { ...node, children };
};

const removeNode = (
  tree: FileNode,
  targetPath: string
): { tree: FileNode; removed: FileNode | null } => {
  let removed: FileNode | null = null;

  const walk = (node: FileNode, currentPath = node.name): FileNode | null => {
    if (currentPath === targetPath) {
      removed = node;
      return null;
    }

    if (node.type !== "folder") return node;

    return {
      ...node,
      children: (node.children || [])
        .map((child) => walk(child, joinPath(currentPath, child.name)))
        .filter(Boolean) as FileNode[],
    };
  };

  return { tree: walk(tree) || tree, removed };
};

const mergeFlatFilesIntoTree = (tree: FileNode, nextFiles: FlatFiles) => {
  let nextTree = tree;
  const currentFiles = flattenTree(tree);

  Object.entries(nextFiles).forEach(([rawPath, content]) => {
    const path = rawPath.includes("/") ? rawPath : joinPath(ROOT_NAME, rawPath);

    if (currentFiles[path] !== undefined) {
      nextTree = updateFileContent(nextTree, path, content);
      return;
    }

    const parentPath = dirname(path);
    const parent = findNode(nextTree, parentPath);

    if (parent?.type === "folder") {
      const name = getUniqueName(nextTree, parentPath, basename(path));
      nextTree = insertNode(nextTree, parentPath, {
        name,
        type: "file",
        content,
      });
    }
  });

  return nextTree;
};

const buildInitialTree = (initialCode: string): FileNode => ({
  name: "root",
  type: "folder",
  children: [
    {
      name: "src",
      type: "folder",
      children: sortNodes([
        {
          name: "App.tsx",
          type: "file",
          content: initialCode || "// App code...",
        },
        {
          name: "utils.ts",
          type: "file",
          content: "// utils code...",
        },
        {
          name: "styles.css",
          type: "file",
          content: "/* styles */",
        },
      ]),
    },
  ],
});
const getLanguageFromFile = (filePath: string): string => {
  const ext = filePath.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    ts: "typescript", tsx: "typescript",
    js: "javascript", jsx: "javascript",
    java: "java",
    py: "python",
    css: "css",
    html: "html",
  };
  return map[ext || ""] || "typescript";
};

const EditorApp = ({
  roomId,
  currentUser,
  initialCode,
  onLeave,
}: EditorAppProps) => {
  const [language, setLanguage] = useState("typescript");
  const [cursor, setCursor] = useState({ lineNumber: 1, column: 1 });
  const [darkMode, setDarkMode] = useState(true);
  const [fileTree, setFileTree] = useState<FileNode>(() =>
    buildInitialTree(initialCode)
  );
  const [activeFile, setActiveFile] = useState(APP_PATH);
  const [openTabs, setOpenTabs] = useState<string[]>([APP_PATH]);
  const [output, setOutput] = useState("");
  const [showTerminal, setShowTerminal] = useState(true);

  const handleRemoteCode = useCallback((fileId: string, code: string) => {
    setFileTree((prev) => mergeFlatFilesIntoTree(prev, { [fileId]: code }));
  }, []);

  const { state, sendCode, sendCursor, sendChat } = useCollab(
    roomId,
    currentUser,
    handleRemoteCode
  );

  const files = useMemo(() => flattenTree(fileTree), [fileTree]);

  const setFilesFromEditor = useCallback((action: SetFilesAction) => {
    setFileTree((prevTree) => {
      const currentFiles = flattenTree(prevTree);
      const nextFiles =
        typeof action === "function" ? action(currentFiles) : action;

      return mergeFlatFilesIntoTree(prevTree, nextFiles);
    });
  }, []);
  useEffect(() => {
  setLanguage(getLanguageFromFile(activeFile));
}, [activeFile]);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [darkMode]);

 useEffect(() => {
  if (!initialCode) return;

  setFileTree((prev) =>
    updateFileContent(prev, APP_PATH, initialCode)
  );
  // ✅ Make sure late joiner sees the code immediately
  setActiveFile(APP_PATH);
}, [initialCode]);

  const handleCodeChange = useCallback(
    (code: string) => {
      setFileTree((prev) => updateFileContent(prev, activeFile, code));
      sendCode(activeFile, code);
    },
    [activeFile, sendCode]
  );

  const handleCursorChange = useCallback(
    (pos: { lineNumber: number; column: number } | null) => {
      sendCursor(pos);
      if (pos) setCursor(pos);
    },
    [sendCursor]
  );

  const handleLeave = () => {
    apiLogout();
    onLeave();
  };

  const handleSelectFile = useCallback((path: string) => {
    setActiveFile(path);
    setOpenTabs((prev) => (prev.includes(path) ? prev : [...prev, path]));
  }, []);

  const handleCreateItem = useCallback(
    (parentPath: string, type: "file" | "folder") => {
      const parent = findNode(fileTree, parentPath);
      if (!parent || parent.type !== "folder") return "";

      const fallbackName = type === "file" ? "untitled.ts" : "new-folder";
      const name = getUniqueName(fileTree, parentPath, fallbackName);
      const newPath = joinPath(parentPath, name);

      setFileTree((prev) =>
        insertNode(prev, parentPath, {
          name,
          type,
          content: type === "file" ? "// New file" : undefined,
          children: type === "folder" ? [] : undefined,
        })
      );

      if (type === "file") {
        setActiveFile(newPath);
        setOpenTabs((prev) => (prev.includes(newPath) ? prev : [...prev, newPath]));
      }

      return newPath;
    },
    [fileTree]
  );

  const handleRenameNode = useCallback(
    (oldPath: string, newName: string) => {
      const trimmed = newName.trim();
      if (!trimmed || trimmed.includes("/") || trimmed.includes("\\")) return false;
      if (oldPath === ROOT_NAME) return false;

      const oldNode = findNode(fileTree, oldPath);
      if (!oldNode || trimmed === oldNode.name) return false;

      const parentPath = dirname(oldPath);
      if (hasDuplicateName(fileTree, parentPath, trimmed, oldPath)) {
        return false;
      }

      const newPath = joinPath(parentPath, trimmed);

      setFileTree((prev) =>
        updateNode(prev, oldPath, (target) => ({ ...target, name: trimmed }))
      );

      setOpenTabs((prev) =>
        prev.map((tab) =>
          isDescendantPath(tab, oldPath)
            ? tab.replace(oldPath, newPath)
            : tab
        )
      );

      setActiveFile((prev) =>
        isDescendantPath(prev, oldPath) ? prev.replace(oldPath, newPath) : prev
      );

      return true;
    },
    [fileTree]
  );

  const handleDeleteNode = useCallback(
    (path: string) => {
      if (path === ROOT_NAME) return;

      const node = findNode(fileTree, path);
      if (!node) return;

      const deletedFiles = collectFilePaths(node, path);
      const nextTree = deleteNode(fileTree, path) || fileTree;
      const remainingFiles = collectFilePaths(nextTree);

      setFileTree(nextTree);

      setOpenTabs((prev) => {
        const nextTabs = prev.filter((tab) => !deletedFiles.includes(tab));

        setActiveFile((current) => {
          if (!deletedFiles.includes(current)) return current;
          return nextTabs[0] || remainingFiles[0] || "";
        });

        return nextTabs;
      });
    },
    [fileTree]
  );

  const handleMoveNode = useCallback(
    (sourcePath: string, targetFolderPath: string) => {
      if (sourcePath === ROOT_NAME) return false;
      if (isDescendantPath(targetFolderPath, sourcePath)) return false;

      const sourceNode = findNode(fileTree, sourcePath);
      const targetFolder = findNode(fileTree, targetFolderPath);

      if (!sourceNode || !targetFolder || targetFolder.type !== "folder") {
        return false;
      }

      if (
        hasDuplicateName(
          fileTree,
          targetFolderPath,
          sourceNode.name,
          sourcePath
        )
      ) {
        return false;
      }

      const oldParent = dirname(sourcePath);
      if (oldParent === targetFolderPath) return true;

      const newPath = joinPath(targetFolderPath, sourceNode.name);
      const { tree: withoutSource, removed } = removeNode(fileTree, sourcePath);

      if (!removed) return false;

      const nextTree = insertNode(withoutSource, targetFolderPath, removed);
      setFileTree(nextTree);

      setOpenTabs((prev) =>
        prev.map((tab) =>
          isDescendantPath(tab, sourcePath)
            ? tab.replace(sourcePath, newPath)
            : tab
        )
      );

      setActiveFile((prev) =>
        isDescendantPath(prev, sourcePath)
          ? prev.replace(sourcePath, newPath)
          : prev
      );

      return true;
    },
    [fileTree]
  );

  const runCode = async () => {
    try {
      setOutput("Running...\n");

      const res = await fetch("http://localhost:8080/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: files[activeFile] || "",
          language,
        }),
      });

      const data = await res.json();
      setOutput((prev) => prev + "\n" + data.output);
    } catch (err) {
      console.error(err);
      setOutput("Error running code");
    }
  };

  const handleOpenFile = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "*";

    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;

      const reader = new FileReader();

      reader.onload = (event) => {
        const content = String(event.target?.result || "");
        const name = getUniqueName(fileTree, ROOT_NAME, file.name);
        const path = joinPath(ROOT_NAME, name);

        setFileTree((prev) =>
          insertNode(prev, ROOT_NAME, {
            name,
            type: "file",
            content,
          })
        );

        setActiveFile(path);
        setOpenTabs((prev) => (prev.includes(path) ? prev : [...prev, path]));
      };

      reader.readAsText(file);
    };

    input.click();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(files[activeFile] || "");
  };

  const handleDownload = () => {
    const blob = new Blob([files[activeFile] || ""], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = basename(activeFile);
    a.click();

    URL.revokeObjectURL(url);
  };

  const handleCreateRootFile = () => {
    handleCreateItem(ROOT_NAME, "file");
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <div className="flex items-center gap-1.5 bg-[#0d0d0f] px-4 py-2 border-b border-zinc-800/60">
        <button onClick={handleCreateRootFile}>➕ New File</button>

        <button
          onClick={runCode}
          className="group relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white overflow-hidden transition-all duration-200"
          style={{
            background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
            boxShadow:
              "0 0 12px rgba(22,163,74,0.35), inset 0 1px 0 rgba(255,255,255,0.1)",
          }}
        >
          <span className="relative z-10 flex items-center gap-1.5">
            <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor">
              <path d="M0 0L10 6L0 12V0Z" />
            </svg>
            Run
          </span>
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
        </button>

        <div className="w-px h-5 bg-zinc-700/60 mx-0.5" />

        <button
          onClick={handleOpenFile}
          className="group flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-zinc-300 hover:text-white border border-zinc-700/50 hover:border-zinc-500/70 bg-zinc-800/40 hover:bg-zinc-700/50 transition-all duration-150"
          style={{ backdropFilter: "blur(4px)" }}
        >
          Open
        </button>

        <button
          onClick={handleCopy}
          className="group flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-zinc-300 hover:text-white border border-zinc-700/50 hover:border-zinc-500/70 bg-zinc-800/40 hover:bg-zinc-700/50 transition-all duration-150"
          style={{ backdropFilter: "blur(4px)" }}
        >
          Copy
        </button>

        <button
          onClick={handleDownload}
          className="group flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-zinc-300 hover:text-white border border-zinc-700/50 hover:border-zinc-500/70 bg-zinc-800/40 hover:bg-zinc-700/50 transition-all duration-150"
          style={{ backdropFilter: "blur(4px)" }}
        >
          Download
        </button>

        <div className="w-px h-5 bg-zinc-700/60 mx-0.5" />

        <button
          onClick={() => setShowTerminal((prev) => !prev)}
          className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-all duration-150 ${
            showTerminal
              ? "text-cyan-300 border-cyan-700/50 bg-cyan-900/20 hover:bg-cyan-900/30"
              : "text-zinc-400 border-zinc-700/50 bg-zinc-800/40 hover:text-white hover:bg-zinc-700/50 hover:border-zinc-500/70"
          }`}
          style={{ backdropFilter: "blur(4px)" }}
        >
          Terminal
        </button>
      </div>

      <Navbar
        users={state.users}
        clientId={currentUser.email}
        connected={state.connected}
        roomId={roomId}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode((d) => !d)}
        onLeave={handleLeave}
      />

      <div className="flex flex-1 overflow-hidden">
        <FileSidebar
          tree={fileTree}
          activeFile={activeFile}
          onSelect={handleSelectFile}
          onRename={handleRenameNode}
          onDelete={handleDeleteNode}
          onCreate={handleCreateItem}
          onMove={handleMoveNode}
        />

        {state.typingUser && state.typingUser !== currentUser?.username && (
  <div className="px-3 py-1 text-xs text-cyan-400 bg-cyan-900/20 border-b border-cyan-800/30 flex items-center gap-2">
    <span className="flex gap-0.5">
      <span className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce" style={{animationDelay:'0ms'}}/>
      <span className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce" style={{animationDelay:'150ms'}}/>
      <span className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce" style={{animationDelay:'300ms'}}/>
    </span>
    <span>{state.typingUser} is typing...</span>
  </div>
)}

        <CodeEditor
          code={files[activeFile] || ""}
          language={language}
          users={state.users}
          clientId={currentUser.email}
          lastCodeAuthor={state.lastCodeAuthor}
          onCodeChange={handleCodeChange}
          onCursorChange={handleCursorChange}
          activeFile={activeFile}
          setActiveFile={setActiveFile}
          files={files}
          setFiles={setFilesFromEditor}
          openTabs={openTabs}
          setOpenTabs={setOpenTabs}
        />

        <ChatPanel
          messages={state.messages}
          users={state.users}
          clientId={currentUser.email}
          onSend={sendChat}
        />
      </div>

      {showTerminal && (
        <div className="h-48 bg-zinc-950 border-t border-zinc-800 flex flex-col">
          <div className="flex items-center justify-between px-3 py-1.5 text-xs text-zinc-400 border-b border-zinc-800">
            <span>TERMINAL</span>
            <div className="flex gap-2">
              <button onClick={() => setOutput("")} className="hover:text-white">
                Clear
              </button>
              <button
                onClick={() => setShowTerminal(false)}
                className="hover:text-red-400"
              >
                ✕
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto px-3 py-2 text-sm font-mono text-zinc-200">
            <pre className="whitespace-pre-wrap leading-relaxed">
              {output || "No output yet..."}
            </pre>
          </div>
        </div>
      )}

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
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() =>
    getStoredUser()
  );
  const [initialCode, setInitialCode] = useState("");

  const handleEnterRoom = (
    rid: string,
    user: AuthUser,
    roomData: RoomData
  ) => {
    setCurrentUser(user);
    setInitialCode(roomData.code || "");
    setRoomId(rid);
  };

  const handleLeave = () => {
    setRoomId(null);
    setCurrentUser(null);
    setInitialCode("");
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
