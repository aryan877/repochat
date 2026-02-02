"use client";

import { TamboTool } from "@tambo-ai/react";
import { z } from "zod";

// These tools require a WebContainer sync context to be set up
// They operate on the in-memory WebContainer for instant operations

interface WebContainerOperations {
  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<{ success: boolean }>;
  createFile: (path: string, content: string) => Promise<{ success: boolean }>;
  deleteFile: (path: string) => Promise<{ success: boolean }>;
  searchFiles: (query: string) => Promise<Array<{ path: string; line: number; content: string }>>;
  getFileTree: () => Promise<Array<{ name: string; path: string; type: "file" | "directory"; children?: unknown[] }>>;
}

export function createWebContainerTools(ops: WebContainerOperations): TamboTool[] {
  // Read a file (instant from WebContainer)
  const readFileTool: TamboTool = {
    name: "readFile",
    description: "Read the contents of a file from the repository. Use this to understand existing code before making changes. This operation is instant.",
    tool: async (path: string): Promise<string> => {
      try {
        const content = await ops.readFile(path);
        return `File: ${path}\n\n${content}`;
      } catch (error) {
        return `Error reading file ${path}: ${error}`;
      }
    },
    inputSchema: z.string().describe("The file path to read (e.g., 'src/App.tsx')"),
    outputSchema: z.string(),
  };

  // Write/update a file (instant + persisted to Convex)
  const writeFileTool: TamboTool = {
    name: "writeFile",
    description: "Write or update a file in the repository. The file will be modified instantly and changes tracked for later commit to GitHub. Always read the file first before making changes.",
    tool: async ({ path, content }: { path: string; content: string }): Promise<string> => {
      try {
        await ops.writeFile(path, content);
        return `Successfully wrote to ${path}. Changes are tracked and can be committed to GitHub.`;
      } catch (error) {
        return `Error writing file ${path}: ${error}`;
      }
    },
    inputSchema: z.object({
      path: z.string().describe("The file path to write to (e.g., 'src/components/Button.tsx')"),
      content: z.string().describe("The complete file content to write"),
    }),
    outputSchema: z.string(),
  };

  // Create a new file
  const createFileTool: TamboTool = {
    name: "createFile",
    description: "Create a new file in the repository with the given content. The file is created instantly and tracked for commit.",
    tool: async ({ path, content }: { path: string; content: string }): Promise<string> => {
      try {
        await ops.createFile(path, content);
        return `Successfully created ${path}. The file is tracked and can be committed to GitHub.`;
      } catch (error) {
        return `Error creating file ${path}: ${error}`;
      }
    },
    inputSchema: z.object({
      path: z.string().describe("The file path to create (e.g., 'src/utils/helpers.ts')"),
      content: z.string().describe("The file content"),
    }),
    outputSchema: z.string(),
  };

  // Delete a file
  const deleteFileTool: TamboTool = {
    name: "deleteFile",
    description: "Delete a file from the repository. The deletion is tracked for commit.",
    tool: async (path: string): Promise<string> => {
      try {
        await ops.deleteFile(path);
        return `Successfully deleted ${path}. The deletion is tracked and can be committed to GitHub.`;
      } catch (error) {
        return `Error deleting file ${path}: ${error}`;
      }
    },
    inputSchema: z.string().describe("The file path to delete"),
    outputSchema: z.string(),
  };

  // Get file tree (instant from WebContainer)
  const getFileTreeTool: TamboTool = {
    name: "getFileTree",
    description: "Get the file tree structure of the repository. Use this to understand the project layout. This operation is instant.",
    tool: async (): Promise<string> => {
      try {
        const tree = await ops.getFileTree();

        function formatTree(nodes: typeof tree, indent = ""): string {
          return nodes
            .map((node) => {
              const prefix = node.type === "directory" ? "📁 " : "📄 ";
              const line = `${indent}${prefix}${node.name}`;
              if (node.children && Array.isArray(node.children) && node.children.length > 0) {
                return `${line}\n${formatTree(node.children as typeof tree, indent + "  ")}`;
              }
              return line;
            })
            .join("\n");
        }

        return formatTree(tree);
      } catch (error) {
        return `Error getting file tree: ${error}`;
      }
    },
    inputSchema: z.void(),
    outputSchema: z.string(),
  };

  // Search code (instant from WebContainer)
  const searchCodeTool: TamboTool = {
    name: "searchCode",
    description: "Search for text across all files in the repository. Returns matching lines with file paths and line numbers. This operation is instant.",
    tool: async (query: string): Promise<string> => {
      try {
        const results = await ops.searchFiles(query);

        if (results.length === 0) {
          return `No results found for "${query}"`;
        }

        const formatted = results
          .map((r) => `${r.path}:${r.line}: ${r.content}`)
          .join("\n");

        return `Found ${results.length} matches for "${query}":\n\n${formatted}`;
      } catch (error) {
        return `Error searching: ${error}`;
      }
    },
    inputSchema: z.string().describe("The search query"),
    outputSchema: z.string(),
  };

  return [
    readFileTool,
    writeFileTool,
    createFileTool,
    deleteFileTool,
    getFileTreeTool,
    searchCodeTool,
  ];
}

// Default empty tools for when WebContainer is not available
export const defaultWebContainerTools: TamboTool[] = [];
