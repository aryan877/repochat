"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { FileNode } from "@/types/webcontainer";

interface FileExplorerProps {
  files: FileNode[];
  selectedPath: string | null;
  onFileSelect: (file: FileNode) => void;
}

const FolderIcon = ({ open }: { open: boolean }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("flex-shrink-0", open ? "text-amber-400" : "text-amber-500/70")}
  >
    {open ? (
      <>
        <path d="M5 19a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4l2 2h9a2 2 0 0 1 2 2v1" />
        <path d="M5 19h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2Z" />
      </>
    ) : (
      <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
    )}
  </svg>
);

const FileIcon = ({ name }: { name: string }) => {
  const ext = name.split(".").pop()?.toLowerCase() || "";

  const colors: Record<string, string> = {
    ts: "text-blue-400",
    tsx: "text-blue-400",
    js: "text-yellow-400",
    jsx: "text-yellow-400",
    json: "text-yellow-300",
    md: "text-gray-400",
    css: "text-pink-400",
    scss: "text-pink-400",
    html: "text-orange-400",
    svg: "text-emerald-400",
    png: "text-purple-400",
    jpg: "text-purple-400",
    git: "text-orange-500",
  };

  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("flex-shrink-0", colors[ext] || "text-muted-foreground")}
    >
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    </svg>
  );
};

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn(
      "flex-shrink-0 text-muted-foreground transition-transform duration-150",
      open && "rotate-90"
    )}
  >
    <path d="m9 18 6-6-6-6" />
  </svg>
);

function FileTreeNode({
  node,
  level,
  selectedPath,
  onFileSelect,
}: {
  node: FileNode;
  level: number;
  selectedPath: string | null;
  onFileSelect: (file: FileNode) => void;
}) {
  const [isOpen, setIsOpen] = useState(level < 1);
  const isSelected = selectedPath === node.path;

  if (node.type === "directory") {
    return (
      <div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full flex items-center gap-1.5 py-1 px-2 text-sm rounded-md transition-colors",
            "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
        >
          <ChevronIcon open={isOpen} />
          <FolderIcon open={isOpen} />
          <span className="truncate">{node.name}</span>
        </button>
        {isOpen && node.children && (
          <div>
            {node.children
              .sort((a, b) => {
                if (a.type === b.type) return a.name.localeCompare(b.name);
                return a.type === "directory" ? -1 : 1;
              })
              .map((child) => (
                <FileTreeNode
                  key={child.path}
                  node={child}
                  level={level + 1}
                  selectedPath={selectedPath}
                  onFileSelect={onFileSelect}
                />
              ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => onFileSelect(node)}
      className={cn(
        "w-full flex items-center gap-1.5 py-1 px-2 text-sm rounded-md transition-colors",
        isSelected
          ? "bg-accent text-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      )}
      style={{ paddingLeft: `${level * 12 + 20}px` }}
    >
      <FileIcon name={node.name} />
      <span className="truncate">{node.name}</span>
    </button>
  );
}

export function FileExplorer({ files, selectedPath, onFileSelect }: FileExplorerProps) {
  if (files.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground/60 text-sm p-4">
        No files
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto py-2">
      {files
        .sort((a, b) => {
          if (a.type === b.type) return a.name.localeCompare(b.name);
          return a.type === "directory" ? -1 : 1;
        })
        .map((node) => (
          <FileTreeNode
            key={node.path}
            node={node}
            level={0}
            selectedPath={selectedPath}
            onFileSelect={onFileSelect}
          />
        ))}
    </div>
  );
}

export type { FileNode } from "@/types/webcontainer";
