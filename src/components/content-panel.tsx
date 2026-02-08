"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { ViewMode } from "./mode-tabs";
import { PRSelector } from "./pr-selector";
import { DiffViewer } from "./review/diff-viewer";
import { CodeViewer } from "./review/code-viewer";
import { FileExplorer } from "./review/file-explorer";
import type { Repo, GitHubPRListItem, GitHubPRFile, FileNode, ImportStatus } from "@/types";

type Repository = Pick<Repo, "_id" | "name" | "fullName">;

interface ContentPanelProps {
  mode: ViewMode;
  repositories: Repository[];
  selectedRepo?: Repository;
  onRepoChange?: (repo: Repository) => void;
  pullRequests?: GitHubPRListItem[];
  selectedPR?: GitHubPRListItem;
  onPRChange?: (pr: GitHubPRListItem) => void;
  isLoadingPRs?: boolean;
  fileChanges?: GitHubPRFile[];
  fileTree?: FileNode[];
  selectedFile?: {
    path: string;
    content: string;
  };
  onFileSelect?: (path: string) => void;
  importStatus?: ImportStatus | null;
  isImporting?: boolean;
  className?: string;
  minWidth?: number;
  maxWidth?: number;
  defaultWidth?: number;
}

const GripVerticalIcon = () => (
  <svg
    width="6"
    height="24"
    viewBox="0 0 6 24"
    fill="currentColor"
    className="text-[#525252]"
  >
    <circle cx="1.5" cy="6" r="1.5" />
    <circle cx="4.5" cy="6" r="1.5" />
    <circle cx="1.5" cy="12" r="1.5" />
    <circle cx="4.5" cy="12" r="1.5" />
    <circle cx="1.5" cy="18" r="1.5" />
    <circle cx="4.5" cy="18" r="1.5" />
  </svg>
);

const LoadingSpinner = () => (
  <svg
    className="animate-spin w-5 h-5 text-[#525252]"
    viewBox="0 0 24 24"
    fill="none"
  >
    <circle
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="2"
      strokeOpacity="0.2"
    />
    <path
      d="M12 2a10 10 0 0 1 10 10"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

export function ContentPanel({
  mode,
  repositories,
  selectedRepo,
  onRepoChange,
  pullRequests = [],
  selectedPR,
  onPRChange,
  isLoadingPRs = false,
  fileChanges = [],
  fileTree = [],
  selectedFile,
  onFileSelect,
  importStatus,
  isImporting = false,
  className,
  minWidth = 320,
  maxWidth = 800,
  defaultWidth = 480,
}: ContentPanelProps) {
  const [width, setWidth] = useState(defaultWidth);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (panelRef.current) {
        const panelRect = panelRef.current.getBoundingClientRect();
        const newWidth = e.clientX - panelRect.left;
        setWidth(Math.min(maxWidth, Math.max(minWidth, newWidth)));
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, minWidth, maxWidth]);

  return (
    <div
      ref={panelRef}
      className={cn(
        "relative flex flex-col bg-[#0a0a0a] border-r border-[#1f1f1f] overflow-hidden",
        isResizing && "select-none",
        className
      )}
      style={{ width: `${width}px`, minWidth: `${minWidth}px`, maxWidth: `${maxWidth}px` }}
    >
      {/* Panel Content */}
      <div className="flex-1 overflow-y-auto">
        {mode === "pr-review" ? (
          <div className="p-4 space-y-4">
            {/* PR Selector */}
            <PRSelector
              repositories={repositories}
              selectedRepo={selectedRepo}
              onRepoChange={onRepoChange}
              pullRequests={pullRequests}
              selectedPR={selectedPR}
              onPRChange={onPRChange}
              isLoadingPRs={isLoadingPRs}
            />

            {/* File Changes / Diffs */}
            {selectedPR && fileChanges.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs text-[#525252] uppercase tracking-wide">
                  Changed Files ({fileChanges.length})
                </h3>
                {fileChanges.map((file) => (
                  <DiffViewer
                    key={file.filename}
                    filePath={file.filename}
                    additions={file.additions}
                    deletions={file.deletions}
                    patch={file.patch ?? ""}
                  />
                ))}
              </div>
            )}

            {/* Empty State */}
            {!selectedPR && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 rounded-full bg-[#141414] flex items-center justify-center mb-4">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-[#525252]"
                  >
                    <circle cx="18" cy="18" r="3" />
                    <circle cx="6" cy="6" r="3" />
                    <path d="M13 6h3a2 2 0 0 1 2 2v7" />
                    <line x1="6" y1="9" x2="6" y2="21" />
                  </svg>
                </div>
                <p className="text-sm text-[#525252]">
                  Select a repository and PR to review
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {/* Repository selector for code view */}
            <div className="relative">
              <label className="block text-xs text-[#525252] mb-1.5">
                Repository
              </label>
              <select
                value={selectedRepo?._id || ""}
                onChange={(e) => {
                  const repo = repositories.find((r) => r._id === e.target.value);
                  if (repo) onRepoChange?.(repo);
                }}
                className="w-full px-3 py-2 bg-[#141414] border border-[#1f1f1f] rounded-lg text-sm text-[#fafafa] hover:border-[#292929] transition-colors appearance-none cursor-pointer"
              >
                <option value="">Select a repository</option>
                {repositories.map((repo) => (
                  <option key={repo._id} value={repo._id}>
                    {repo.fullName}
                  </option>
                ))}
              </select>
            </div>

            {/* Import Status */}
            {selectedRepo && (isImporting || importStatus?.status === "importing") && (
              <div className="flex items-center gap-3 p-3 bg-[#141414] rounded-lg">
                <LoadingSpinner />
                <div className="flex-1">
                  <p className="text-sm text-[#a3a3a3]">Importing repository...</p>
                  {importStatus?.progress !== undefined && (
                    <div className="mt-2">
                      <div className="h-1 bg-[#1f1f1f] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#525252] transition-all duration-300"
                          style={{ width: `${importStatus.progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-[#525252] mt-1">
                        {importStatus.importedFiles || 0} / {importStatus.totalFiles || 0} files
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Import Error */}
            {importStatus?.status === "failed" && (
              <div className="p-3 bg-[#2a1515] border border-[#4a2020] rounded-lg">
                <p className="text-sm text-[#ff6b6b]">Import failed</p>
                {importStatus.error && (
                  <p className="text-xs text-[#a36b6b] mt-1">{importStatus.error}</p>
                )}
              </div>
            )}

            {/* File Tree */}
            {selectedRepo && importStatus?.status === "completed" && fileTree.length > 0 && (
              <FileExplorer
                repoName={selectedRepo.name}
                branch="main"
                tree={fileTree}
                selectedPath={selectedFile?.path}
                onFileSelect={onFileSelect}
              />
            )}

            {/* Code Viewer */}
            {selectedFile && (
              <CodeViewer
                filePath={selectedFile.path}
                content={selectedFile.content}
              />
            )}

            {/* Empty State */}
            {!selectedRepo && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 rounded-full bg-[#141414] flex items-center justify-center mb-4">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-[#525252]"
                  >
                    <polyline points="16 18 22 12 16 6" />
                    <polyline points="8 6 2 12 8 18" />
                  </svg>
                </div>
                <p className="text-sm text-[#525252]">
                  Select a repository to browse code
                </p>
              </div>
            )}

            {/* Waiting for import */}
            {selectedRepo && !importStatus && !isImporting && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <LoadingSpinner />
                <p className="text-sm text-[#525252] mt-4">
                  Preparing to import...
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Resize Handle */}
      <div
        onMouseDown={handleMouseDown}
        className={cn(
          "absolute top-0 right-0 w-2 h-full cursor-col-resize flex items-center justify-center hover:bg-[#1f1f1f] transition-colors",
          isResizing && "bg-[#292929]"
        )}
      >
        <GripVerticalIcon />
      </div>
    </div>
  );
}

export default ContentPanel;
