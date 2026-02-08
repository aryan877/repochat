"use client";

import { useState, useMemo } from "react";
import { z } from "zod";

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

type DiffLine = {
  type: "add" | "del" | "ctx" | "hunk";
  content: string;
  oldNum?: number;
  newNum?: number;
};

function parsePatch(patch: string): DiffLine[] {
  const lines = patch.split("\n");
  const result: DiffLine[] = [];
  let oldLine = 0;
  let newLine = 0;

  for (const line of lines) {
    if (line.startsWith("@@")) {
      const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@(.*)/);
      if (match) {
        oldLine = parseInt(match[1], 10);
        newLine = parseInt(match[2], 10);
        result.push({ type: "hunk", content: line });
      }
      continue;
    }

    if (line.startsWith("+++") || line.startsWith("---")) continue;
    if (line.startsWith("\\")) continue;

    if (line.startsWith("+")) {
      result.push({ type: "add", content: line.slice(1), newNum: newLine });
      newLine++;
    } else if (line.startsWith("-")) {
      result.push({ type: "del", content: line.slice(1), oldNum: oldLine });
      oldLine++;
    } else {
      const content = line.startsWith(" ") ? line.slice(1) : line;
      result.push({ type: "ctx", content, oldNum: oldLine, newNum: newLine });
      oldLine++;
      newLine++;
    }
  }

  return result;
}

import { ChevronIcon, FileIcon } from "./icons";

export function DiffViewer({
  filePath = "file.ts",
  additions = 0,
  deletions = 0,
  patch = "",
}: DiffViewerProps) {
  const [expanded, setExpanded] = useState(true);
  const diffLines = useMemo(() => parsePatch(patch), [patch]);
  const fileName = filePath.split("/").pop() || filePath;

  return (
    <div className="rounded-xl bg-[#111111] overflow-hidden my-3">
      {/* Tool label */}
      <div className="px-4 py-2">
        <span className="text-[10px] font-mono text-[#444] uppercase tracking-widest">DiffViewer</span>
      </div>
      {/* File header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#161616] transition-colors"
      >
        <ChevronIcon open={expanded} />
        <FileIcon />
        <span className="text-[13px] font-mono text-[#ccc] truncate">{fileName}</span>
        {filePath !== fileName && (
          <span className="text-[11px] font-mono text-[#444] truncate hidden sm:inline">{filePath}</span>
        )}
        <div className="ml-auto flex items-center gap-3 flex-shrink-0">
          <span className="text-xs font-mono text-emerald-400">+{additions}</span>
          <span className="text-xs font-mono text-red-400">-{deletions}</span>
        </div>
      </button>

      {/* Diff body */}
      {expanded && (
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] leading-[20px] font-mono border-collapse">
            <tbody>
              {diffLines.map((line, i) => {
                if (line.type === "hunk") {
                  return (
                    <tr key={i} className="bg-[#0d1b2a]">
                      <td className="w-[1px] px-2 text-right text-[#334155] select-none whitespace-nowrap border-r border-[#1e1e1e]" />
                      <td className="w-[1px] px-2 text-right text-[#334155] select-none whitespace-nowrap border-r border-[#1e1e1e]" />
                      <td className="px-4 py-0.5 text-[#4a7fb5] select-none">{line.content}</td>
                    </tr>
                  );
                }

                const bgClass =
                  line.type === "add" ? "bg-[#0a2118]" :
                  line.type === "del" ? "bg-[#200a0a]" :
                  "";

                const numClass =
                  line.type === "add" ? "text-[#2d6b4f]" :
                  line.type === "del" ? "text-[#6b2d2d]" :
                  "text-[#333]";

                const textClass =
                  line.type === "add" ? "text-[#7ee787]" :
                  line.type === "del" ? "text-[#f47067]" :
                  "text-[#999]";

                const marker =
                  line.type === "add" ? "+" :
                  line.type === "del" ? "-" :
                  " ";

                const markerClass =
                  line.type === "add" ? "text-emerald-500" :
                  line.type === "del" ? "text-red-500" :
                  "text-transparent";

                return (
                  <tr key={i} className={`${bgClass} hover:brightness-125 transition-[filter]`}>
                    <td className={`w-[1px] px-2 text-right select-none whitespace-nowrap border-r border-[#1e1e1e] ${numClass}`}>
                      {line.type !== "add" ? line.oldNum : ""}
                    </td>
                    <td className={`w-[1px] px-2 text-right select-none whitespace-nowrap border-r border-[#1e1e1e] ${numClass}`}>
                      {line.type !== "del" ? line.newNum : ""}
                    </td>
                    <td className="whitespace-pre">
                      <span className={`inline-block w-5 text-center select-none ${markerClass}`}>{marker}</span>
                      <span className={textClass}>{line.content}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default DiffViewer;
