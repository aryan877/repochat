/**
 * WebContainer Types
 *
 * Types for file trees and WebContainer lifecycle.
 *
 * DATA FLOW:
 *   Convex files → buildFileTree() → FileNode[] → WebContainer.mount() → Preview
 *
 * SYNC:
 *   - Read: GitHub → Convex → WebContainer (on import)
 *   - Write: WebContainer → Convex → GitHub (on commit)
 *   - WebContainer state is ephemeral, Convex is persistent
 */

// =============================================================================
// File Tree Types
// =============================================================================

/** File or directory node in a tree structure */
export interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  content?: string;
  children?: FileNode[];
}

// =============================================================================
// WebContainer Status
// =============================================================================

/** WebContainer lifecycle: idle → booting → mounting → ready | error */
export type ContainerStatus =
  | "idle"
  | "booting"
  | "mounting"
  | "ready"
  | "error";

// =============================================================================
// WebContainer Operations
// =============================================================================

/** Interface for WebContainer file operations used by Tambo tools */
export interface WebContainerOperations {
  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<{ success: boolean }>;
  createFile: (path: string, content: string) => Promise<{ success: boolean }>;
  deleteFile: (path: string) => Promise<{ success: boolean }>;
  searchFiles: (
    query: string,
  ) => Promise<Array<{ path: string; line: number; content: string }>>;
  getFileTree: () => Promise<
    Array<{
      name: string;
      path: string;
      type: "file" | "directory";
      children?: unknown[];
    }>
  >;
}
