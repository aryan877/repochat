"use client";

import { useState, useCallback } from "react";
import { z } from "zod";
import { DiffEditor } from "@monaco-editor/react";

export const diffViewerSchema = z.object({
  filePath: z.string().describe("Path of the file being changed"),
  additions: z.number().describe("Number of lines added"),
  deletions: z.number().describe("Number of lines deleted"),
  patch: z.string().describe("The unified diff patch content"),
  language: z.string().optional().describe("Programming language for syntax highlighting"),
  originalContent: z.string().optional().describe("Original file content (before changes)"),
  modifiedContent: z.string().optional().describe("Modified file content (after changes)"),
});

export type DiffViewerProps = z.infer<typeof diffViewerSchema>;

const getMonacoLanguage = (filePath: string, language?: string): string => {
  if (language) return language;
  const ext = filePath.split(".").pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
    py: "python", go: "go", rs: "rust", java: "java", json: "json",
    yaml: "yaml", yml: "yaml", md: "markdown", sql: "sql", css: "css", html: "html",
  };
  return languageMap[ext || ""] || "plaintext";
};

function parsePatchToContents(patch: string): { original: string; modified: string } {
  const lines = patch.split("\n");
  const originalLines: string[] = [];
  const modifiedLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith("@@")) continue;
    else if (line.startsWith("+") && !line.startsWith("+++")) {
      modifiedLines.push(line.slice(1));
    } else if (line.startsWith("-") && !line.startsWith("---")) {
      originalLines.push(line.slice(1));
    } else if (!line.startsWith("\\")) {
      const content = line.startsWith(" ") ? line.slice(1) : line;
      originalLines.push(content);
      modifiedLines.push(content);
    }
  }

  return { original: originalLines.join("\n"), modified: modifiedLines.join("\n") };
}

function PatchViewer({ patch }: { patch: string }) {
  return (
    <pre className="text-xs font-mono text-[#a3a3a3] overflow-x-auto p-3">
      {patch.split("\n").map((line, i) => {
        let color = "text-[#a3a3a3]";
        if (line.startsWith("+") && !line.startsWith("+++")) color = "text-[#a3a3a3]";
        else if (line.startsWith("-") && !line.startsWith("---")) color = "text-[#525252]";
        return <div key={i} className={color}>{line}</div>;
      })}
    </pre>
  );
}

export function DiffViewer({
  filePath = "file.ts",
  additions = 0,
  deletions = 0,
  patch = "",
  language,
  originalContent,
  modifiedContent,
}: DiffViewerProps) {
  const [expanded, setExpanded] = useState(true);
  const [viewMode, setViewMode] = useState<"side-by-side" | "inline">("inline");

  const monacoLanguage = getMonacoLanguage(filePath, language);
  const fileName = filePath.split("/").pop() || filePath;

  const { original, modified } = originalContent && modifiedContent
    ? { original: originalContent, modified: modifiedContent }
    : parsePatchToContents(patch);

  const hasSufficientContent = original.length > 0 || modified.length > 0;

  const handleMount = useCallback((editor: unknown) => {
    (editor as { updateOptions: (opts: object) => void }).updateOptions({
      renderSideBySide: viewMode === "side-by-side",
    });
  }, [viewMode]);

  return (
    <div className="my-3">
      <div className="flex items-center justify-between py-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-sm text-[#fafafa] font-mono hover:text-[#a3a3a3] transition-colors"
        >
          {fileName}
        </button>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-[#a3a3a3]">+{additions} -{deletions}</span>
          {hasSufficientContent && (
            <button
              onClick={() => setViewMode(viewMode === "inline" ? "side-by-side" : "inline")}
              className="text-[#525252] hover:text-[#a3a3a3] transition-colors"
            >
              {viewMode === "inline" ? "Split" : "Unified"}
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="bg-[#141414] rounded overflow-hidden">
          {hasSufficientContent ? (
            <DiffEditor
              height="300px"
              language={monacoLanguage}
              original={original}
              modified={modified}
              theme="vs-dark"
              onMount={handleMount}
              options={{
                readOnly: true,
                renderSideBySide: viewMode === "side-by-side",
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 12,
                lineNumbers: "off",
                renderIndicators: false,
                scrollbar: { vertical: "auto", horizontal: "auto" },
                padding: { top: 8, bottom: 8 },
              }}
            />
          ) : (
            <PatchViewer patch={patch} />
          )}
        </div>
      )}
    </div>
  );
}

export default DiffViewer;
