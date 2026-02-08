"use client";

import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { useQuery, useAction } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "../../../convex/_generated/api";
import { useWebContainer } from "@/hooks/use-webcontainer";
import type { ContainerStatus, FileNode } from "@/types/webcontainer";
import { FileExplorer } from "./file-explorer";
import type { Id } from "../../../convex/_generated/dataModel";
import { Allotment } from "allotment";
import "allotment/dist/style.css";

const MonacoEditor = lazy(() =>
  import("@monaco-editor/react").then((mod) => ({ default: mod.Editor }))
);

const TerminalPanel = lazy(() =>
  import("./terminal").then((mod) => ({ default: mod.TerminalPanel }))
);

interface CodeViewProps {
  repoId: Id<"repos"> | null;
  repoName: string | null;
}

const RefreshIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
    <path d="M16 16h5v5" />
  </svg>
);

const TerminalIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 17 10 11 4 5" />
    <line x1="12" x2="20" y1="19" y2="19" />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" x2="21" y1="14" y2="3" />
  </svg>
);

const PlayIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="6 3 20 12 6 21 6 3" fill="currentColor" />
  </svg>
);

const PauseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" />
    <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" />
  </svg>
);

const DownloadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" x2="12" y1="15" y2="3" />
  </svg>
);

const GitBranchIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="6" x2="6" y1="3" y2="15" />
    <circle cx="18" cy="6" r="3" />
    <circle cx="6" cy="18" r="3" />
    <path d="M18 9a9 9 0 0 1-9 9" />
  </svg>
);

const FolderIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto block text-muted-foreground/40">
    <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
  </svg>
);

const StatusIndicator = ({ status }: { status: ContainerStatus }) => {
  const statusConfig: Record<ContainerStatus, { color: string; text: string }> = {
    idle: { color: "bg-zinc-500", text: "Idle" },
    booting: { color: "bg-amber-500 animate-pulse", text: "Booting" },
    mounting: { color: "bg-amber-500 animate-pulse", text: "Mounting" },
    ready: { color: "bg-emerald-500", text: "Ready" },
    error: { color: "bg-red-500", text: "Error" },
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className={`w-1.5 h-1.5 rounded-full ${config.color}`} />
      <span>{config.text}</span>
    </div>
  );
};

// Convert flat file list from Convex to nested tree structure
function buildFileTree(
  files: Array<{ path: string; name: string; type: "file" | "directory"; content?: string }>
): FileNode[] {
  const root: FileNode[] = [];
  const pathMap = new Map<string, FileNode>();

  // Sort files so directories come before their children
  const sortedFiles = [...files].sort((a, b) => a.path.localeCompare(b.path));

  for (const file of sortedFiles) {
    const parts = file.path.split("/");
    const fileName = parts[parts.length - 1];

    // Create directory nodes for all parent paths
    let currentPath = "";
    for (let i = 0; i < parts.length - 1; i++) {
      const dirName = parts[i];
      const parentPath = currentPath;
      currentPath = currentPath ? `${currentPath}/${dirName}` : dirName;

      if (!pathMap.has(currentPath)) {
        const dirNode: FileNode = {
          name: dirName,
          type: "directory",
          path: currentPath,
          children: [],
        };
        pathMap.set(currentPath, dirNode);

        if (parentPath) {
          const parent = pathMap.get(parentPath);
          parent?.children?.push(dirNode);
        } else {
          root.push(dirNode);
        }
      }
    }

    // Create the file node
    const fileNode: FileNode = {
      name: fileName,
      type: file.type,
      path: file.path,
      content: file.content,
      children: file.type === "directory" ? [] : undefined,
    };
    pathMap.set(file.path, fileNode);

    const parentPath = parts.slice(0, -1).join("/");
    if (parentPath) {
      const parent = pathMap.get(parentPath);
      parent?.children?.push(fileNode);
    } else {
      root.push(fileNode);
    }
  }

  return root;
}

// Convert FileNode tree to WebContainer format
function convertToHookFormat(
  nodes: FileNode[]
): { name: string; type: "file" | "directory"; content?: string; children?: ReturnType<typeof convertToHookFormat> }[] {
  return nodes.map((node) => ({
    name: node.name,
    type: node.type,
    content: node.content,
    children: node.children ? convertToHookFormat(node.children) : undefined,
  }));
}

export function CodeView({ repoId, repoName }: CodeViewProps) {
  const { user } = useUser();
  const [isRunning, setIsRunning] = useState(false);
  const [showTerminal, setShowTerminal] = useState(true);
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Fetch repo data (for defaultBranch)
  const repoData = useQuery(
    api.repos.getRepo,
    repoId ? { repoId } : "skip"
  );

  // Fetch files from Convex
  const repoFiles = useQuery(
    api.files.getRepoFiles,
    repoId ? { repoId } : "skip"
  );

  // Fetch import status
  const importStatus = useQuery(
    api.files.getImportStatus,
    repoId ? { repoId } : "skip"
  );

  // Import action
  const importRepo = useAction(api.fileActions.importRepository);

  // Build file tree from flat file list
  const files = useMemo(() => {
    if (!repoFiles || repoFiles.length === 0) return [];
    return buildFileTree(
      repoFiles.map((f) => ({
        path: f.path,
        name: f.name,
        type: f.type,
        content: f.content ?? undefined,
      }))
    );
  }, [repoFiles]);

  // WebContainer hook — boots when user clicks Start
  const { status, previewUrl, error, startShell, restart } = useWebContainer({
    files: isRunning && files.length > 0 ? convertToHookFormat(files) : null,
    enabled: isRunning && files.length > 0,
  });

  // Auto-select first file when files change
  useEffect(() => {
    if (files.length > 0 && !selectedFile) {
      const findFirstFile = (nodes: FileNode[]): FileNode | null => {
        for (const node of nodes) {
          if (node.type === "file") return node;
          if (node.children) {
            const found = findFirstFile(node.children);
            if (found) return found;
          }
        }
        return null;
      };
      const first = findFirstFile(files);
      if (first) setSelectedFile(first);
    }
  }, [files, selectedFile]);

  // Reset selected file when repo changes
  useEffect(() => {
    setSelectedFile(null);
    setIsRunning(false);
  }, [repoId]);

  const handleStart = () => setIsRunning(true);
  const handleStop = () => {
    setIsRunning(false);
    restart();
  };

  const handleImport = async () => {
    if (!repoId || !user?.id) return;
    setIsImporting(true);
    try {
      await importRepo({ clerkId: user.id, repoId });
    } catch (err) {
      console.error("Import failed:", err);
    } finally {
      setIsImporting(false);
    }
  };

  const getLanguage = (filename: string) => {
    const ext = filename.split(".").pop()?.toLowerCase();
    const map: Record<string, string> = {
      js: "javascript",
      jsx: "javascript",
      ts: "typescript",
      tsx: "typescript",
      json: "json",
      html: "html",
      css: "css",
      scss: "scss",
      md: "markdown",
      py: "python",
      go: "go",
      rs: "rust",
      java: "java",
      yml: "yaml",
      yaml: "yaml",
    };
    return map[ext || ""] || "plaintext";
  };

  // No repo selected
  if (!repoId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center max-w-md px-6">
          <FolderIcon />
          <h3 className="text-lg font-medium text-foreground mt-4 mb-2">Select a Repository</h3>
          <p className="text-sm text-muted-foreground">
            Choose a repository from the dropdown above to browse files and run the dev server.
          </p>
        </div>
      </div>
    );
  }

  // Files not imported yet or importing
  const needsImport = !repoFiles || repoFiles.length === 0;
  const currentlyImporting = importStatus?.status === "importing" || isImporting;

  if (needsImport) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center max-w-md px-6">
          {currentlyImporting ? (
            <>
              <div className="w-12 h-12 mx-auto mb-4 relative">
                <svg className="animate-spin w-12 h-12 text-blue-500" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity="0.2" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">Importing Files</h3>
              {importStatus?.totalFiles && (
                <p className="text-sm text-muted-foreground mb-4">
                  {importStatus.importedFiles || 0} / {importStatus.totalFiles} files
                </p>
              )}
              <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${importStatus?.progress || 0}%` }}
                />
              </div>
            </>
          ) : (
            <>
              <FolderIcon />
              <h3 className="text-lg font-medium text-foreground mt-4 mb-2">{repoName}</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Import repository files to browse code and run the dev server.
              </p>
              <button
                onClick={handleImport}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-foreground text-background rounded-lg hover:bg-foreground/90 transition-colors"
              >
                <DownloadIcon />
                Import Files
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden">
      {/* Toolbar */}
      <div className="h-10 px-3 flex items-center justify-between border-b border-border bg-card/50 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={isRunning ? handleStop : handleStart}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              isRunning
                ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
            }`}
          >
            {isRunning ? <PauseIcon /> : <PlayIcon />}
            {isRunning ? "Stop" : "Run"}
          </button>

          {isRunning && (
            <button
              onClick={restart}
              className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:text-foreground rounded-md hover:bg-muted/50 transition-colors"
              title="Restart"
            >
              <RefreshIcon />
            </button>
          )}

          <StatusIndicator status={isRunning ? status : "idle"} />
        </div>

        <div className="flex items-center gap-2">
          {repoData?.defaultBranch && (
            <span className="flex items-center gap-1 px-2 py-1 text-[11px] text-muted-foreground bg-muted/40 rounded-md">
              <GitBranchIcon />
              {repoData.defaultBranch}
            </span>
          )}

          <button
            onClick={handleImport}
            disabled={isImporting || currentlyImporting}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground rounded-md hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:pointer-events-none"
            title="Re-import files from GitHub"
          >
            {isImporting || currentlyImporting ? (
              <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity="0.2" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              <DownloadIcon />
            )}
            Re-import
          </button>

          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:text-foreground rounded-md hover:bg-muted/50 transition-colors"
            >
              <ExternalLinkIcon />
              Open
            </a>
          )}

          <button
            onClick={() => setShowTerminal(!showTerminal)}
            className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded-md transition-colors ${
              showTerminal
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <TerminalIcon />
            Terminal
          </button>
        </div>
      </div>

      {/* Main content — Allotment split panes */}
      <div className="flex-1 min-h-0">
        <Allotment>
          {/* File Explorer pane */}
          <Allotment.Pane minSize={180} maxSize={400} preferredSize={224} snap>
            <div className="h-full flex flex-col bg-card/30 border-r border-border">
              <div className="h-9 px-3 flex items-center justify-between border-b border-border flex-shrink-0">
                <span className="text-xs font-medium text-muted-foreground truncate">
                  {repoName}
                </span>
                <span className="text-[10px] text-muted-foreground/60">
                  {repoFiles?.length || 0} files
                </span>
              </div>
              <FileExplorer
                files={files}
                selectedPath={selectedFile?.path || null}
                onFileSelect={setSelectedFile}
              />
            </div>
          </Allotment.Pane>

          {/* Editor + Preview + Terminal pane */}
          <Allotment.Pane>
            <Allotment vertical>
              {/* Editor + Preview (top area) */}
              <Allotment.Pane>
                <Allotment>
                  {/* Editor */}
                  <Allotment.Pane>
                    <div className="h-full flex flex-col min-w-0">
                      {selectedFile ? (
                        <>
                          <div className="h-9 px-3 flex items-center border-b border-border bg-card/50 flex-shrink-0">
                            <span className="text-xs text-muted-foreground truncate">
                              {selectedFile.path}
                            </span>
                          </div>
                          <div className="flex-1 min-h-0">
                            <Suspense
                              fallback={
                                <div className="flex-1 flex items-center justify-center text-muted-foreground/60">
                                  Loading editor...
                                </div>
                              }
                            >
                              <MonacoEditor
                                height="100%"
                                language={getLanguage(selectedFile.name)}
                                value={selectedFile.content || ""}
                                theme="vs-dark"
                                options={{
                                  readOnly: true,
                                  minimap: { enabled: false },
                                  fontSize: 13,
                                  lineHeight: 20,
                                  padding: { top: 12, bottom: 12 },
                                  scrollBeyondLastLine: false,
                                  wordWrap: "on",
                                  renderLineHighlight: "none",
                                  overviewRulerBorder: false,
                                  hideCursorInOverviewRuler: true,
                                  automaticLayout: true,
                                  scrollbar: {
                                    vertical: "auto",
                                    horizontal: "auto",
                                    verticalScrollbarSize: 8,
                                    horizontalScrollbarSize: 8,
                                  },
                                }}
                              />
                            </Suspense>
                          </div>
                        </>
                      ) : (
                        <div className="flex-1 flex items-center justify-center text-muted-foreground/60 text-sm">
                          Select a file to view
                        </div>
                      )}
                    </div>
                  </Allotment.Pane>

                  {/* Preview */}
                  <Allotment.Pane>
                    <div className="h-full flex flex-col border-l border-border">
                      <div className="h-9 px-3 flex items-center border-b border-border bg-card/50 flex-shrink-0">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Preview
                        </span>
                      </div>
                      <div className="flex-1 bg-white min-h-0">
                        {previewUrl ? (
                          <iframe
                            src={previewUrl}
                            className="w-full h-full border-0"
                            title="Preview"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-[#0a0a0a] text-muted-foreground/60 text-sm">
                            {error ? (
                              <div className="text-center px-4">
                                <div className="text-red-400 mb-2">Error</div>
                                <div className="text-xs">{error}</div>
                              </div>
                            ) : isRunning ? (
                              "Run a dev server in the terminal to preview"
                            ) : (
                              "Click Start to boot the container"
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </Allotment.Pane>
                </Allotment>
              </Allotment.Pane>

              {/* Terminal (bottom area) */}
              {showTerminal && (
                <Allotment.Pane minSize={80} maxSize={500} preferredSize={192}>
                  <div className="h-full border-t border-border">
                    <Suspense
                      fallback={
                        <div className="w-full h-full bg-[#0a0a0a] flex items-center justify-center text-muted-foreground/60 text-sm">
                          Loading terminal...
                        </div>
                      }
                    >
                      <TerminalPanel status={status} startShell={startShell} />
                    </Suspense>
                  </div>
                </Allotment.Pane>
              )}
            </Allotment>
          </Allotment.Pane>
        </Allotment>
      </div>
    </div>
  );
}
