"use client";

import { z } from "zod";
import { useTamboStreamStatus } from "@tambo-ai/react";
import { useMemo } from "react";

const heatmapFileSchema = z.object({
  filename: z.string().describe("File path"),
  changes: z.number().describe("Total lines changed (additions + deletions)"),
  severity: z
    .enum(["none", "low", "medium", "high", "critical"])
    .optional()
    .describe("Issue severity found in this file, if any"),
  issues: z.number().optional().describe("Number of issues found"),
});

export const reviewHeatmapSchema = z.object({
  title: z.string().describe("Heatmap title, e.g. 'Change Hotspots'"),
  files: z
    .array(heatmapFileSchema)
    .describe("Array of files with change counts and optional severity"),
  totalChanges: z.number().describe("Total changes across all files"),
});

export type ReviewHeatmapProps = z.infer<typeof reviewHeatmapSchema>;

function getSeverityColor(severity: string | undefined, intensity: number): string {
  if (severity === "critical") return `rgba(239, 68, 68, ${0.3 + intensity * 0.7})`;
  if (severity === "high") return `rgba(249, 115, 22, ${0.3 + intensity * 0.7})`;
  if (severity === "medium") return `rgba(234, 179, 8, ${0.25 + intensity * 0.6})`;
  if (severity === "low") return `rgba(59, 130, 246, ${0.2 + intensity * 0.5})`;
  return `rgba(163, 163, 163, ${0.08 + intensity * 0.25})`;
}

function getSeverityBorder(severity: string | undefined): string {
  if (severity === "critical") return "border-red-500/40";
  if (severity === "high") return "border-orange-500/30";
  if (severity === "medium") return "border-yellow-500/25";
  if (severity === "low") return "border-blue-500/20";
  return "border-[#1e1e1e]";
}

function getFilename(path: string): string {
  const parts = path.split("/");
  return parts[parts.length - 1];
}

function getDirectory(path: string): string {
  const parts = path.split("/");
  if (parts.length <= 1) return "";
  return parts.slice(0, -1).join("/");
}

export function ReviewHeatmap({
  title = "Change Hotspots",
  files = [],
  totalChanges = 0,
}: ReviewHeatmapProps) {
  const { streamStatus } = useTamboStreamStatus();

  const sortedFiles = useMemo(
    () => [...files].sort((a, b) => b.changes - a.changes),
    [files]
  );

  const maxChanges = useMemo(
    () => Math.max(...sortedFiles.map((f) => f.changes), 1),
    [sortedFiles]
  );

  if (streamStatus?.isStreaming && files.length === 0) {
    return (
      <div className="rounded-xl bg-[#111111] p-5 animate-pulse my-3">
        <div className="h-4 w-48 bg-[#1a1a1a] rounded mb-4" />
        <div className="grid grid-cols-4 gap-1.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-16 bg-[#1a1a1a] rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (files.length === 0) return null;

  return (
    <div className="rounded-xl bg-[#0a0a0a] overflow-hidden my-3 flex flex-col gap-px">
      {/* Tool label */}
      <div className="bg-[#161616] px-5 py-2.5">
        <span className="text-[10px] font-mono text-[#555] uppercase tracking-widest">ReviewHeatmap</span>
      </div>

      {/* Header */}
      <div className="bg-[#111111] flex items-center justify-between px-5 py-3">
        <h3 className="text-[14px] font-semibold text-[#e5e5e5]">{title}</h3>
        <span className="text-xs text-[#666]">
          {totalChanges} changes across {files.length} files
        </span>
      </div>

      {/* Grid */}
      <div className="bg-[#111111] p-4">
        <div className="grid gap-1.5" style={{
          gridTemplateColumns: `repeat(auto-fill, minmax(${files.length > 8 ? "100px" : "140px"}, 1fr))`,
        }}>
          {sortedFiles.map((file) => {
            const intensity = file.changes / maxChanges;
            const bgColor = getSeverityColor(file.severity, intensity);
            const borderClass = getSeverityBorder(file.severity);

            return (
              <div
                key={file.filename}
                className={`relative rounded-lg border p-2.5 overflow-hidden cursor-default transition-colors hover:brightness-110 ${borderClass}`}
                style={{
                  backgroundColor: bgColor,
                  minHeight: `${Math.max(48, 32 + intensity * 40)}px`,
                }}
                title={`${file.filename}: ${file.changes} changes${file.issues ? `, ${file.issues} issues` : ""}`}
              >
                <p className="text-[11px] font-medium text-[#fafafa] truncate leading-tight">
                  {getFilename(file.filename)}
                </p>
                <p className="text-[10px] text-[#a3a3a3]/70 truncate leading-tight">
                  {getDirectory(file.filename)}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-[10px] text-[#a3a3a3]">{file.changes}L</span>
                  {file.issues != null && file.issues > 0 && (
                    <span className="text-[10px] text-[#f87171]">
                      {file.issues} {file.issues === 1 ? "issue" : "issues"}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="bg-[#111111] px-5 py-3 flex items-center gap-4 text-[10px] text-[#555]">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500/50" />
          <span>Critical</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-orange-500/40" />
          <span>High</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-yellow-500/35" />
          <span>Medium</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500/30" />
          <span>Low</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#a3a3a3]/20" />
          <span>No issues</span>
        </div>
      </div>
    </div>
  );
}
