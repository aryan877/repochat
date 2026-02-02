"use client";

import { createContext, useContext, ReactNode, useMemo } from "react";
import { Id } from "../../convex/_generated/dataModel";
import { useWebContainerSync } from "@/hooks/use-webcontainer-sync";

interface WebContainerContextValue {
  // Sync status
  syncStatus: {
    status: "idle" | "syncing" | "synced" | "error";
    error?: string;
    lastSyncedAt?: number;
  };
  isBooted: boolean;
  importStatus: {
    status: "pending" | "importing" | "completed" | "failed";
    progress?: number;
    totalFiles?: number;
    importedFiles?: number;
    error?: string;
  } | null | undefined;

  // File operations
  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<{ success: boolean }>;
  createFile: (path: string, content: string) => Promise<{ success: boolean }>;
  deleteFile: (path: string) => Promise<{ success: boolean }>;
  searchFiles: (query: string) => Promise<Array<{ path: string; line: number; content: string }>>;
  getFileTree: () => Promise<Array<{ name: string; path: string; type: "file" | "directory"; children?: unknown[] }>>;

  // Sync control
  resync: () => void;

  // Raw data
  files: Array<{
    _id: Id<"files">;
    path: string;
    name: string;
    type: "file" | "directory";
    content?: string;
    isDirty: boolean;
  }> | undefined;
}

const WebContainerContext = createContext<WebContainerContextValue | null>(null);

interface WebContainerProviderProps {
  children: ReactNode;
  repoId: Id<"repos"> | undefined;
  enabled?: boolean;
}

export function WebContainerProvider({ children, repoId, enabled = true }: WebContainerProviderProps) {
  const sync = useWebContainerSync({ repoId, enabled });

  const value = useMemo<WebContainerContextValue>(() => ({
    syncStatus: sync.syncStatus,
    isBooted: sync.isBooted,
    importStatus: sync.importStatus,
    readFile: sync.readFile,
    writeFile: sync.writeFile,
    createFile: sync.createFile,
    deleteFile: sync.deleteFile,
    searchFiles: sync.searchFiles,
    getFileTree: sync.getFileTree,
    resync: sync.resync,
    files: sync.files,
  }), [sync]);

  return (
    <WebContainerContext.Provider value={value}>
      {children}
    </WebContainerContext.Provider>
  );
}

export function useWebContainer() {
  const context = useContext(WebContainerContext);
  if (!context) {
    throw new Error("useWebContainer must be used within a WebContainerProvider");
  }
  return context;
}

// Optional hook that doesn't throw if outside provider
export function useWebContainerOptional() {
  return useContext(WebContainerContext);
}
