"use client";

import { useState } from "react";
import { z } from "zod";
import type { FileNode } from "@/types/webcontainer";

const FileNodeSchema: z.ZodType<FileNode> = z.lazy(() =>
  z.object({
    name: z.string().describe("File or folder name"),
    path: z.string().describe("Full path from repo root"),
    type: z.enum(["file", "directory"]).describe("Node type"),
    children: z.array(FileNodeSchema).optional().describe("Child nodes for directories"),
  })
);

export const fileExplorerSchema = z.object({
  repoName: z.string().describe("Repository name"),
  branch: z.string().optional().describe("Current branch"),
  tree: z.array(FileNodeSchema).describe("File tree structure"),
  selectedPath: z.string().optional().describe("Currently selected file path"),
  showChangesOnly: z.boolean().optional().describe("Only show changed files"),
});

export interface FileExplorerProps {
  repoName: string;
  branch?: string;
  tree: FileNode[];
  selectedPath?: string;
  showChangesOnly?: boolean;
  onFileSelect?: (path: string) => void;
}

import { FolderIcon, FileDocIcon, GitBranchIcon } from "./icons";

function FileNodeComponent({
  node,
  depth = 0,
  selectedPath,
  onSelect,
}: {
  node: FileNode;
  depth?: number;
  selectedPath?: string;
  onSelect?: (path: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(depth < 2);
  const isSelected = selectedPath === node.path;

  const handleClick = () => {
    if (node.type === "directory") {
      setIsOpen(!isOpen);
    } else {
      onSelect?.(node.path);
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition-colors ${
          isSelected
            ? "bg-[#1a1a1a] text-[#e5e5e5]"
            : "text-[#999] hover:bg-[#161616] hover:text-[#e5e5e5]"
        }`}
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
      >
        {node.type === "directory" ? (
          <FolderIcon open={isOpen} />
        ) : (
          <FileDocIcon />
        )}
        <span className="text-[13px] font-mono truncate">{node.name}</span>
      </button>

      {node.type === "directory" && isOpen && node.children && (
        <div>
          {node.children.map((child) => (
            <FileNodeComponent
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileExplorer({
  repoName,
  branch = "main",
  tree = [],
  selectedPath,
  onFileSelect,
}: FileExplorerProps) {
  const [selected, setSelected] = useState<string | undefined>(selectedPath);

  const handleSelect = (path: string) => {
    setSelected(path);
    onFileSelect?.(path);
  };

  return (
    <div className="rounded-xl bg-[#0a0a0a] overflow-hidden my-3 flex flex-col gap-px">
      {/* Tool label */}
      <div className="bg-[#161616] px-4 py-2.5">
        <span className="text-[10px] font-mono text-[#555] uppercase tracking-widest">FileExplorer</span>
      </div>

      {/* Header */}
      <div className="bg-[#111111] flex items-center justify-between px-4 py-2.5">
        <span className="text-[13px] font-medium text-[#e5e5e5]">{repoName}</span>
        <div className="flex items-center gap-1.5 text-[#666]">
          <GitBranchIcon />
          <span className="text-[11px] font-mono">{branch}</span>
        </div>
      </div>

      {/* Tree */}
      <div className="bg-[#111111] py-1 max-h-[400px] overflow-y-auto">
        {tree.length > 0 ? (
          tree.map((node) => (
            <FileNodeComponent
              key={node.path}
              node={node}
              selectedPath={selected}
              onSelect={handleSelect}
            />
          ))
        ) : (
          <div className="text-center py-8 text-[#555] text-[13px]">
            No files to display
          </div>
        )}
      </div>

      {/* Selected file path */}
      {selected && (
        <div className="bg-[#111111] px-4 py-2 text-[12px] font-mono text-[#666] truncate">
          {selected}
        </div>
      )}
    </div>
  );
}

export default FileExplorer;
