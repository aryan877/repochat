"use client";

import { WebContainer, FileSystemTree } from "@webcontainer/api";

let webcontainerInstance: WebContainer | null = null;
let bootPromise: Promise<WebContainer> | null = null;

export async function getWebContainer(): Promise<WebContainer> {
  if (webcontainerInstance) {
    return webcontainerInstance;
  }

  if (bootPromise) {
    return bootPromise;
  }

  bootPromise = WebContainer.boot();
  webcontainerInstance = await bootPromise;
  return webcontainerInstance;
}

export async function mountFiles(files: FileSystemTree): Promise<void> {
  const wc = await getWebContainer();
  await wc.mount(files);
}

export async function readFile(path: string): Promise<string> {
  const wc = await getWebContainer();
  try {
    const content = await wc.fs.readFile(path, "utf-8");
    return content;
  } catch (error) {
    throw new Error(`Failed to read file ${path}: ${error}`);
  }
}

export async function writeFile(path: string, content: string): Promise<void> {
  const wc = await getWebContainer();

  // Ensure parent directory exists
  const parts = path.split("/");
  if (parts.length > 1) {
    const dir = parts.slice(0, -1).join("/");
    try {
      await wc.fs.mkdir(dir, { recursive: true });
    } catch {
      // Directory might already exist
    }
  }

  await wc.fs.writeFile(path, content);
}

export async function deleteFile(path: string): Promise<void> {
  const wc = await getWebContainer();
  await wc.fs.rm(path);
}

export async function readDir(path: string): Promise<string[]> {
  const wc = await getWebContainer();
  const entries = await wc.fs.readdir(path, { withFileTypes: true });
  return entries.map((entry) => {
    const name = typeof entry === "string" ? entry : entry.name;
    const isDir = typeof entry === "string" ? false : entry.isDirectory();
    return isDir ? `${name}/` : name;
  });
}

export interface FileTreeNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileTreeNode[];
}

export async function getFileTree(basePath: string = "."): Promise<FileTreeNode[]> {
  const wc = await getWebContainer();

  async function buildTree(currentPath: string): Promise<FileTreeNode[]> {
    const entries = await wc.fs.readdir(currentPath, { withFileTypes: true });
    const nodes: FileTreeNode[] = [];

    for (const entry of entries) {
      const name = typeof entry === "string" ? entry : entry.name;
      const isDir = typeof entry === "string" ? false : entry.isDirectory();
      const fullPath = currentPath === "." ? name : `${currentPath}/${name}`;

      // Skip node_modules and hidden files
      if (name === "node_modules" || name.startsWith(".")) continue;

      const node: FileTreeNode = {
        name,
        path: fullPath,
        type: isDir ? "directory" : "file",
      };

      if (isDir) {
        node.children = await buildTree(fullPath);
      }

      nodes.push(node);
    }

    // Sort: directories first, then files, alphabetically
    return nodes.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "directory" ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }

  return buildTree(basePath);
}

export async function searchFiles(query: string): Promise<Array<{ path: string; line: number; content: string }>> {
  const wc = await getWebContainer();
  const results: Array<{ path: string; line: number; content: string }> = [];

  async function searchInDir(dirPath: string) {
    const entries = await wc.fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const name = typeof entry === "string" ? entry : entry.name;
      const isDir = typeof entry === "string" ? false : entry.isDirectory();
      const fullPath = dirPath === "." ? name : `${dirPath}/${name}`;

      // Skip node_modules and hidden files
      if (name === "node_modules" || name.startsWith(".")) continue;

      if (isDir) {
        await searchInDir(fullPath);
      } else {
        // Only search text files
        const ext = name.split(".").pop()?.toLowerCase();
        const textExtensions = ["ts", "tsx", "js", "jsx", "json", "md", "css", "html", "yaml", "yml", "txt", "env"];
        if (!ext || !textExtensions.includes(ext)) continue;

        try {
          const content = await wc.fs.readFile(fullPath, "utf-8");
          const lines = content.split("\n");

          lines.forEach((line, index) => {
            if (line.toLowerCase().includes(query.toLowerCase())) {
              results.push({
                path: fullPath,
                line: index + 1,
                content: line.trim().slice(0, 200),
              });
            }
          });
        } catch {
          // Skip files that can't be read
        }
      }
    }
  }

  await searchInDir(".");
  return results.slice(0, 50); // Limit results
}

export type SpawnProcess = Awaited<ReturnType<WebContainer["spawn"]>>;

export async function runCommand(
  command: string,
  args: string[] = [],
  onOutput?: (data: string) => void
): Promise<{ exitCode: number; output: string }> {
  const wc = await getWebContainer();
  const process = await wc.spawn(command, args);

  let output = "";

  process.output.pipeTo(
    new WritableStream({
      write(data) {
        output += data;
        onOutput?.(data);
      },
    })
  );

  const exitCode = await process.exit;
  return { exitCode, output };
}

export async function startDevServer(
  command: string = "npm",
  args: string[] = ["run", "dev"],
  onOutput?: (data: string) => void,
  onServerReady?: (url: string) => void
): Promise<SpawnProcess> {
  const wc = await getWebContainer();
  const process = await wc.spawn(command, args);

  process.output.pipeTo(
    new WritableStream({
      write(data) {
        onOutput?.(data);
      },
    })
  );

  // Listen for server-ready event
  wc.on("server-ready", (port, url) => {
    onServerReady?.(url);
  });

  return process;
}

export async function installDependencies(
  onOutput?: (data: string) => void
): Promise<{ exitCode: number; output: string }> {
  return runCommand("npm", ["install"], onOutput);
}

// Convert GitHub tree to WebContainer FileSystemTree format
export function githubTreeToFileSystemTree(
  files: Array<{ path: string; content: string }>
): FileSystemTree {
  const tree: FileSystemTree = {};

  for (const file of files) {
    const parts = file.path.split("/");
    let current = tree;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;

      if (isLast) {
        current[part] = {
          file: {
            contents: file.content,
          },
        };
      } else {
        if (!current[part]) {
          current[part] = {
            directory: {},
          };
        }
        current = (current[part] as { directory: FileSystemTree }).directory;
      }
    }
  }

  return tree;
}
