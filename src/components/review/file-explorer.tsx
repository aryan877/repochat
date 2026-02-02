"use client";

import { useState } from "react";
import { z } from "zod";
import type { FileTreeNode } from "@/lib/types";

const FileNodeSchema: z.ZodType<FileTreeNode> = z.lazy(() =>
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
  tree: FileTreeNode[];
  selectedPath?: string;
  showChangesOnly?: boolean;
  onFileSelect?: (path: string) => void;
}

function FileTreeNodeComponent({
  node,
  depth = 0,
  selectedPath,
  onSelect,
}: {
  node: FileTreeNode;
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
        className={`w-full flex items-center gap-2 px-2 py-1.5 text-left transition-colors text-sm ${
          isSelected
            ? "bg-[#1f1f1f] text-[#fafafa]"
            : "text-[#a3a3a3] hover:bg-[#141414] hover:text-[#fafafa]"
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {node.type === "directory" && (
          <span className="text-[#525252] w-4">{isOpen ? "▼" : "▶"}</span>
        )}
        {node.type === "file" && <span className="w-4" />}

        <span className="flex-1 truncate">
          {node.name}
        </span>
      </button>

      {node.type === "directory" && isOpen && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeNodeComponent
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
  tree,
  selectedPath,
  onFileSelect,
}: FileExplorerProps) {
  const [selected, setSelected] = useState<string | undefined>(selectedPath);

  const handleSelect = (path: string) => {
    setSelected(path);
    onFileSelect?.(path);
  };

  return (
    <div className="my-3">
      <div className="flex items-center justify-between py-2 border-b border-[#1f1f1f]">
        <span className="text-sm text-[#fafafa]">{repoName}</span>
        <span className="text-xs text-[#525252] font-mono">{branch}</span>
      </div>

      <div className="py-2 max-h-[400px] overflow-y-auto">
        {tree.length > 0 ? (
          tree.map((node) => (
            <FileTreeNodeComponent
              key={node.path}
              node={node}
              selectedPath={selected}
              onSelect={handleSelect}
            />
          ))
        ) : (
          <div className="text-center py-8 text-[#525252] text-sm">
            No files to display
          </div>
        )}
      </div>

      {selected && (
        <div className="py-2 border-t border-[#1f1f1f] text-xs text-[#525252] truncate">
          {selected}
        </div>
      )}
    </div>
  );
}

export default FileExplorer;
