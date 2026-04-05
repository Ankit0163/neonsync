import { useRef, useEffect, useCallback } from 'react';
import Editor, { OnMount, OnChange } from '@monaco-editor/react';
import type * as MonacoType from 'monaco-editor';
import { CollabUser } from '@/hooks/use-collab';

interface CodeEditorProps {
  code: string;
  language: string;
  users: CollabUser[];
  clientId: string | null;
  lastCodeAuthor: string | null;
  onCodeChange: (code: string) => void;
  onCursorChange: (cursor: { lineNumber: number; column: number } | null) => void;
}

const decorationMap = new Map<string, string[]>();

const CodeEditor: React.FC<CodeEditorProps> = ({
  code,
  language,
  users,
  clientId,
  lastCodeAuthor,
  onCodeChange,
  onCursorChange,
}) => {
  const editorRef = useRef<MonacoType.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof MonacoType | null>(null);
  const isRemoteUpdate = useRef(false);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || lastCodeAuthor === clientId || lastCodeAuthor === null) return;
    const model = editor.getModel();
    if (!model) return;
    if (model.getValue() === code) return;
    const position = editor.getPosition();
    isRemoteUpdate.current = true;
    model.setValue(code);
    isRemoteUpdate.current = false;
    if (position) editor.setPosition(position);
  }, [code, lastCodeAuthor, clientId]);

  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;
    const remoteUsers = users.filter(u => u.id !== clientId && u.cursor);

    for (const user of remoteUsers) {
      const cursor = user.cursor!;
      const decorations: MonacoType.editor.IModelDeltaDecoration[] = [{
        range: new monaco.Range(cursor.lineNumber, cursor.column, cursor.lineNumber, cursor.column + 1),
        options: {
          className: `remote-cursor-line-${user.id}`,
          beforeContentClassName: `remote-cursor-caret-${user.id}`,
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
        },
      }];
      const prev = decorationMap.get(user.id) || [];
      const newIds = editor.deltaDecorations(prev, decorations);
      decorationMap.set(user.id, newIds);

      const styleId = `rcursor-${user.id}`;
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          .remote-cursor-caret-${user.id}::before {
            content: '';
            display: inline-block;
            width: 2px;
            height: 1.1em;
            background: ${user.color};
            margin-right: -2px;
            vertical-align: text-bottom;
            border-radius: 1px;
            box-shadow: 0 0 8px ${user.color};
            animation: cursorBlink 1s step-end infinite;
          }
          .remote-cursor-line-${user.id} { background: ${user.color}15; }
          @keyframes cursorBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        `;
        document.head.appendChild(style);
      }
    }

    const activeIds = new Set(remoteUsers.map(u => u.id));
    for (const [uid, decs] of decorationMap.entries()) {
      if (!activeIds.has(uid)) {
        editor.deltaDecorations(decs, []);
        decorationMap.delete(uid);
      }
    }
  }, [users, clientId]);

  const handleMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    editor.onDidChangeCursorPosition((e) => {
      onCursorChange({ lineNumber: e.position.lineNumber, column: e.position.column });
    });
    editor.onDidBlurEditorText(() => { onCursorChange(null); });
  }, [onCursorChange]);

  const handleChange: OnChange = useCallback((value) => {
    if (isRemoteUpdate.current) return;
    onCodeChange(value ?? '');
  }, [onCodeChange]);

  return (
    <div className="flex-1 flex flex-col bg-background/60 overflow-hidden relative">
      <div className="flex items-center h-9 border-b border-border bg-card/30 px-2 gap-0.5 shrink-0">
        {['App.tsx', 'utils.ts', 'styles.css'].map((tab, i) => (
          <button
            key={tab}
            className={`px-3 py-1.5 text-xs rounded-t-md transition-all duration-200 code-font ${
              i === 0
                ? 'bg-background/80 text-foreground border-t-2 border-t-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/20'
            }`}
          >
            {tab}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 pr-2">
          {users.filter(u => u.id !== clientId && u.cursor).map(u => (
            <span key={u.id} className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: `${u.color}22`, color: u.color, border: `1px solid ${u.color}44` }}>
              {u.name}
            </span>
          ))}
          <div className="h-1.5 w-1.5 rounded-full bg-neon-green animate-pulse-neon" />
          <span className="text-xs text-muted-foreground">synced</span>
        </div>
      </div>

      <Editor
        height="100%"
        language={language}
        value={code}
        onChange={handleChange}
        onMount={handleMount}
        theme="vs-dark"
        options={{
          fontSize: 13,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          fontLigatures: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          lineNumbers: 'on',
          glyphMargin: false,
          folding: true,
          lineDecorationsWidth: 4,
          lineNumbersMinChars: 3,
          renderLineHighlight: 'line',
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          smoothScrolling: true,
          automaticLayout: true,
          tabSize: 2,
          padding: { top: 8, bottom: 8 },
        }}
      />
    </div>
  );
};

export default CodeEditor;
