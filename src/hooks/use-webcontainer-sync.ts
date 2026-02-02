"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import {
  getWebContainer,
  mountFiles,
  readFile as wcReadFile,
  writeFile as wcWriteFile,
  searchFiles as wcSearchFiles,
  getFileTree as wcGetFileTree,
  githubTreeToFileSystemTree,
} from "@/lib/webcontainer/instance";

interface UseWebContainerSyncOptions {
  repoId: Id<"repos"> | undefined;
  enabled?: boolean;
}

interface SyncStatus {
  status: "idle" | "syncing" | "synced" | "error";
  error?: string;
  lastSyncedAt?: number;
}

interface FileRecord {
  _id: Id<"files">;
  path: string;
  name: string;
  type: "file" | "directory";
  content?: string;
  isDirty: boolean;
}

interface ImportStatusRecord {
  _id: Id<"importStatus">;
  status: "pending" | "importing" | "completed" | "failed";
  progress?: number;
  totalFiles?: number;
  importedFiles?: number;
  error?: string;
}

export function useWebContainerSync({ repoId, enabled = true }: UseWebContainerSyncOptions) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ status: "idle" });
  const [isBooted, setIsBooted] = useState(false);
  const syncedRepoRef = useRef<string | null>(null);

  // Convex queries - cast to expected types
  const files = useQuery(
    api.files.getRepoFiles,
    repoId && enabled ? { repoId } : "skip"
  ) as FileRecord[] | undefined;

  const importStatus = useQuery(
    api.files.getImportStatus,
    repoId && enabled ? { repoId } : "skip"
  ) as ImportStatusRecord | null | undefined;

  // Convex mutations
  const updateFileMutation = useMutation(api.files.updateFile);
  const createFileMutation = useMutation(api.files.createFile);
  const deleteFileMutation = useMutation(api.files.deleteFile);

  // Boot WebContainer
  useEffect(() => {
    if (!enabled) return;

    getWebContainer()
      .then(() => setIsBooted(true))
      .catch((error) => {
        console.error("Failed to boot WebContainer:", error);
        setSyncStatus({ status: "error", error: "Failed to boot WebContainer" });
      });
  }, [enabled]);

  // Sync files from Convex to WebContainer
  useEffect(() => {
    if (!isBooted || !files || !repoId || !enabled) return;

    // Skip if already synced this repo
    if (syncedRepoRef.current === repoId) return;

    // Skip if import is still in progress
    if (importStatus?.status === "pending" || importStatus?.status === "importing") {
      return;
    }

    const syncFiles = async () => {
      setSyncStatus({ status: "syncing" });

      try {
        // Convert Convex files to WebContainer FileSystemTree format
        const fileEntries = files
          .filter((f: FileRecord) => f.type === "file" && f.content)
          .map((f: FileRecord) => ({ path: f.path, content: f.content! }));

        if (fileEntries.length === 0) {
          setSyncStatus({ status: "synced", lastSyncedAt: Date.now() });
          syncedRepoRef.current = repoId;
          return;
        }

        const fsTree = githubTreeToFileSystemTree(fileEntries);
        await mountFiles(fsTree);

        setSyncStatus({ status: "synced", lastSyncedAt: Date.now() });
        syncedRepoRef.current = repoId;
      } catch (error) {
        console.error("Failed to sync files:", error);
        setSyncStatus({
          status: "error",
          error: error instanceof Error ? error.message : "Failed to sync files",
        });
      }
    };

    syncFiles();
  }, [isBooted, files, repoId, enabled, importStatus?.status]);

  // Read file from WebContainer (instant)
  const readFile = useCallback(async (path: string): Promise<string> => {
    if (!isBooted) throw new Error("WebContainer not ready");
    return wcReadFile(path);
  }, [isBooted]);

  // Write file - updates both WebContainer and Convex
  const writeFile = useCallback(
    async (path: string, content: string): Promise<{ success: boolean }> => {
      if (!isBooted) throw new Error("WebContainer not ready");
      if (!repoId) throw new Error("No repository selected");

      // Update WebContainer first (instant)
      await wcWriteFile(path, content);

      // Then update Convex (persists and marks dirty)
      await updateFileMutation({ repoId, path, content });

      return { success: true };
    },
    [isBooted, repoId, updateFileMutation]
  );

  // Create file - creates in both WebContainer and Convex
  const createFile = useCallback(
    async (path: string, content: string): Promise<{ success: boolean }> => {
      if (!isBooted) throw new Error("WebContainer not ready");
      if (!repoId) throw new Error("No repository selected");

      // Create in WebContainer first
      await wcWriteFile(path, content);

      // Then create in Convex
      await createFileMutation({ repoId, path, content });

      return { success: true };
    },
    [isBooted, repoId, createFileMutation]
  );

  // Delete file - deletes from both WebContainer and Convex
  const deleteFile = useCallback(
    async (path: string): Promise<{ success: boolean }> => {
      if (!repoId) throw new Error("No repository selected");

      // Delete from WebContainer
      const wc = await getWebContainer();
      try {
        await wc.fs.rm(path);
      } catch {
        // File might not exist in WebContainer
      }

      // Delete from Convex
      await deleteFileMutation({ repoId, path });

      return { success: true };
    },
    [repoId, deleteFileMutation]
  );

  // Search files in WebContainer (instant)
  const searchFiles = useCallback(
    async (query: string) => {
      if (!isBooted) throw new Error("WebContainer not ready");
      return wcSearchFiles(query);
    },
    [isBooted]
  );

  // Get file tree from WebContainer (instant)
  const getFileTree = useCallback(async () => {
    if (!isBooted) throw new Error("WebContainer not ready");
    return wcGetFileTree();
  }, [isBooted]);

  // Force re-sync from Convex
  const resync = useCallback(() => {
    syncedRepoRef.current = null;
    setSyncStatus({ status: "idle" });
  }, []);

  return {
    // Status
    syncStatus,
    isBooted,
    importStatus,

    // File operations (instant via WebContainer)
    readFile,
    writeFile,
    createFile,
    deleteFile,
    searchFiles,
    getFileTree,

    // Sync control
    resync,

    // Raw Convex data
    files,
  };
}
