"use client";

import { z } from "zod";
import { useMemo, useCallback } from "react";
import { useTamboStreamStatus } from "@tambo-ai/react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  MarkerType,
  type Node,
  type Edge,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

const fileNodeSchema = z.object({
  id: z.string().describe("Unique file identifier"),
  filename: z.string().describe("File path"),
  additions: z.number().optional().describe("Lines added"),
  deletions: z.number().optional().describe("Lines deleted"),
  severity: z
    .enum(["none", "low", "medium", "high", "critical"])
    .optional()
    .describe("Security issue severity if any"),
  issues: z.number().optional().describe("Number of issues found"),
});

const dependencySchema = z.object({
  source: z.string().describe("Source file ID (the file that imports)"),
  target: z.string().describe("Target file ID (the file being imported)"),
  type: z
    .enum(["import", "extends", "implements", "uses"])
    .optional()
    .describe("Type of dependency"),
});

export const codeFlowSchema = z.object({
  title: z.string().describe("Diagram title, e.g. 'PR #42 Code Flow'"),
  files: z.array(fileNodeSchema).describe("Files in the PR as nodes"),
  dependencies: z
    .array(dependencySchema)
    .optional()
    .describe("Dependencies between files as edges"),
});

export type CodeFlowProps = z.infer<typeof codeFlowSchema>;
type FileNodeData = z.infer<typeof fileNodeSchema>;

const severityColors: Record<string, { bg: string; border: string; glow: string }> = {
  critical: { bg: "#450a0a", border: "#dc2626", glow: "0 0 12px rgba(220, 38, 38, 0.4)" },
  high: { bg: "#431407", border: "#ea580c", glow: "0 0 10px rgba(234, 88, 12, 0.3)" },
  medium: { bg: "#422006", border: "#ca8a04", glow: "0 0 8px rgba(202, 138, 4, 0.25)" },
  low: { bg: "#172554", border: "#3b82f6", glow: "0 0 6px rgba(59, 130, 246, 0.2)" },
  none: { bg: "#0a0a0a", border: "#262626", glow: "none" },
};

function getFilename(path: string): string {
  const parts = path.split("/");
  return parts[parts.length - 1];
}

function getDirectory(path: string): string {
  const parts = path.split("/");
  if (parts.length <= 1) return "";
  return parts.slice(0, -1).join("/");
}

function FileNode({ data }: NodeProps<Node<FileNodeData>>) {
  const severity = data.severity || "none";
  const colors = severityColors[severity] || severityColors.none;
  const hasChanges = (data.additions || 0) > 0 || (data.deletions || 0) > 0;

  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-[#525252] !w-2 !h-2" />
      <div
        className="px-3 py-2 rounded-lg border min-w-[140px] max-w-[200px]"
        style={{
          backgroundColor: colors.bg,
          borderColor: colors.border,
          boxShadow: colors.glow,
        }}
      >
        <p className="text-xs font-medium text-[#fafafa] truncate">
          {getFilename(data.filename)}
        </p>
        <p className="text-[10px] text-[#525252] truncate">{getDirectory(data.filename)}</p>

        {hasChanges && (
          <div className="mt-1.5 flex items-center gap-2 text-[10px]">
            {data.additions != null && data.additions > 0 && (
              <span className="text-emerald-400">+{data.additions}</span>
            )}
            {data.deletions != null && data.deletions > 0 && (
              <span className="text-red-400">-{data.deletions}</span>
            )}
          </div>
        )}

        {data.issues != null && data.issues > 0 && (
          <div className="mt-1 text-[10px] text-red-400">
            {data.issues} {data.issues === 1 ? "issue" : "issues"}
          </div>
        )}

        {severity !== "none" && (
          <div
            className="mt-1 text-[9px] uppercase tracking-wider"
            style={{ color: colors.border }}
          >
            {severity}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-[#525252] !w-2 !h-2" />
    </>
  );
}

const nodeTypes = { file: FileNode };

export function CodeFlow({
  title = "Code Flow",
  files = [],
  dependencies = [],
}: CodeFlowProps) {
  const { streamStatus } = useTamboStreamStatus();

  const { nodes, edges } = useMemo(() => {
    if (files.length === 0) return { nodes: [], edges: [] };

    const cols = Math.ceil(Math.sqrt(files.length));
    const cellWidth = 220;
    const cellHeight = 120;

    const nodes: Node<FileNodeData>[] = files.map((file, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      return {
        id: file.id,
        type: "file",
        position: { x: col * cellWidth + 50, y: row * cellHeight + 50 },
        data: file,
      };
    });

    const edges: Edge[] = (dependencies || []).map((dep, i) => ({
      id: `edge-${i}`,
      source: dep.source,
      target: dep.target,
      animated: dep.type === "import",
      style: { stroke: "#525252", strokeWidth: 1.5 },
      markerEnd: { type: MarkerType.ArrowClosed, color: "#525252", width: 16, height: 16 },
      label: dep.type || undefined,
      labelStyle: { fill: "#525252", fontSize: 9 },
      labelBgStyle: { fill: "#0a0a0a" },
    }));

    return { nodes, edges };
  }, [files, dependencies]);

  const onInit = useCallback(() => {}, []);

  if (streamStatus?.isStreaming && files.length === 0) {
    return (
      <div className="rounded-xl bg-[#111111] p-5 animate-pulse my-3">
        <div className="h-4 w-48 bg-[#1a1a1a] rounded mb-4" />
        <div className="h-64 bg-[#1a1a1a] rounded" />
      </div>
    );
  }

  if (files.length === 0) return null;

  return (
    <div className="rounded-xl bg-[#0a0a0a] overflow-hidden my-3 flex flex-col gap-px">
      {/* Tool label */}
      <div className="bg-[#161616] px-5 py-2.5">
        <span className="text-[10px] font-mono text-[#555] uppercase tracking-widest">CodeFlow</span>
      </div>

      {/* Header */}
      <div className="bg-[#111111] px-5 py-3">
        <h3 className="text-[14px] font-semibold text-[#e5e5e5]">{title}</h3>
      </div>

      {/* Graph */}
      <div
        className="bg-[#111111]"
        style={{ height: Math.min(400, Math.max(200, Math.ceil(files.length / 3) * 120 + 100)) }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onInit={onInit}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          proOptions={{ hideAttribution: true }}
          minZoom={0.3}
          maxZoom={1.5}
        >
          <Background color="#1e1e1e" gap={20} />
          <Controls
            className="!bg-[#111111] !border-[#1e1e1e] !rounded-lg [&>button]:!bg-[#111111] [&>button]:!border-[#1e1e1e] [&>button]:!text-[#999] [&>button:hover]:!bg-[#1a1a1a]"
            showInteractive={false}
          />
          <MiniMap
            className="!bg-[#111111] !border-[#1e1e1e] !rounded"
            nodeColor={(node) => {
              const severity = (node.data as FileNodeData)?.severity || "none";
              return severityColors[severity]?.border || "#262626";
            }}
            maskColor="rgba(0, 0, 0, 0.7)"
          />
        </ReactFlow>
      </div>

      {/* Legend */}
      <div className="bg-[#111111] px-5 py-3 flex items-center gap-4 text-[10px] text-[#555]">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded border border-[#dc2626] bg-[#450a0a]" />
          <span>Critical</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded border border-[#ea580c] bg-[#431407]" />
          <span>High</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded border border-[#ca8a04] bg-[#422006]" />
          <span>Medium</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded border border-[#3b82f6] bg-[#172554]" />
          <span>Low</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded border border-[#262626] bg-[#0a0a0a]" />
          <span>Clean</span>
        </div>
      </div>
    </div>
  );
}
