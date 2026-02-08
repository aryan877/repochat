"use client";

import { useState, useCallback } from "react";
import { z } from "zod";
import Editor from "@monaco-editor/react";

export const codeViewerSchema = z.object({
  filePath: z.string().describe("Path to the file"),
  content: z.string().describe("File content to display"),
  language: z.string().optional().describe("Programming language for syntax highlighting"),
  startLine: z.number().optional().describe("Starting line number (for partial content)"),
  highlightLines: z.array(z.number()).optional().describe("Lines to highlight"),
  githubUrl: z.string().optional().describe("Link to file on GitHub"),
});

export type CodeViewerProps = z.infer<typeof codeViewerSchema>;

const getMonacoLanguage = (filePath: string, language?: string): string => {
  if (language) return language;
  const ext = filePath.split(".").pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
    py: "python", rb: "ruby", go: "go", rs: "rust", java: "java",
    kt: "kotlin", swift: "swift", cs: "csharp", cpp: "cpp", c: "c",
    h: "c", hpp: "cpp", json: "json", yaml: "yaml", yml: "yaml",
    md: "markdown", sql: "sql", sh: "shell", bash: "shell", css: "css",
    scss: "scss", html: "html", xml: "xml", graphql: "graphql", dockerfile: "dockerfile",
  };
  return languageMap[ext || ""] || "plaintext";
};

export function CodeViewer({
  filePath = "file.ts",
  content = "",
  language,
  startLine = 1,
  highlightLines = [],
  githubUrl,
}: CodeViewerProps) {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const monacoLanguage = getMonacoLanguage(filePath, language);
  const fileName = filePath.split("/").pop() || filePath;
  const lineCount = content.split("\n").length;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEditorDidMount = useCallback((editor: unknown, monaco: unknown) => {
    if (highlightLines.length > 0) {
      const m = monaco as { Range: new (a: number, b: number, c: number, d: number) => unknown };
      const decorations = highlightLines.map(line => ({
        range: new m.Range(line - startLine + 1, 1, line - startLine + 1, 1),
        options: {
          isWholeLine: true,
          className: "highlighted-line",
        },
      }));
      (editor as { deltaDecorations: (a: unknown[], b: unknown[]) => void }).deltaDecorations([], decorations);
    }
  }, [highlightLines, startLine]);

  return (
    <div className={`my-3 ${isExpanded ? "fixed inset-4 z-50 bg-[#0a0a0a]" : ""}`}>
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <span className="text-sm text-[#fafafa] font-mono">{fileName}</span>
          <span className="text-xs text-[#525252] font-mono">{filePath}</span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-[#525252]">{lineCount} lines</span>
          <span className="text-[#525252] uppercase">{monacoLanguage}</span>
          {githubUrl && (
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#525252] hover:text-[#a3a3a3] transition-colors"
            >
              GitHub
            </a>
          )}
          <button
            onClick={handleCopy}
            className="text-[#525252] hover:text-[#a3a3a3] transition-colors"
          >
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[#525252] hover:text-[#a3a3a3] transition-colors"
          >
            {isExpanded ? "Minimize" : "Expand"}
          </button>
        </div>
      </div>

      <div className={`bg-[#141414] rounded overflow-hidden ${isExpanded ? "h-[calc(100%-40px)]" : "h-[300px]"}`}>
        <Editor
          height="100%"
          language={monacoLanguage}
          value={content}
          theme="vs-dark"
          onMount={handleEditorDidMount}
          options={{
            readOnly: true,
            minimap: { enabled: isExpanded },
            scrollBeyondLastLine: false,
            fontSize: 12,
            lineNumbers: "on",
            lineNumbersMinChars: 4,
            renderLineHighlight: "all",
            scrollbar: { vertical: "auto", horizontal: "auto" },
            padding: { top: 8, bottom: 8 },
            folding: true,
            wordWrap: "off",
            automaticLayout: true,
            glyphMargin: highlightLines.length > 0,
          }}
        />
      </div>

      {startLine > 1 && (
        <div className="text-xs text-[#525252] mt-2">
          Starting at line {startLine}
        </div>
      )}

      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/80 -z-10"
          onClick={() => setIsExpanded(false)}
        />
      )}
    </div>
  );
}

export default CodeViewer;
