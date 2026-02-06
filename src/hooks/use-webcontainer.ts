"use client";

import { WebContainer, type FileSystemTree } from "@webcontainer/api";
import { useState, useEffect, useCallback, useRef } from "react";
import type { ContainerStatus } from "@/types/webcontainer";

export type { ContainerStatus };

interface FileNode {
  name: string;
  type: "file" | "directory";
  content?: string;
  children?: FileNode[];
}

interface UseWebContainerOptions {
  files: FileNode[] | null;
  enabled: boolean;
  installCommand?: string;
  devCommand?: string;
}

interface UseWebContainerReturn {
  status: ContainerStatus;
  previewUrl: string | null;
  terminalOutput: string;
  error: string | null;
  restart: () => void;
}

// Singleton WebContainer instance
let webcontainerInstance: WebContainer | null = null;
let bootPromise: Promise<WebContainer> | null = null;

const getWebContainer = async (): Promise<WebContainer> => {
  if (webcontainerInstance) {
    return webcontainerInstance;
  }

  if (!bootPromise) {
    bootPromise = WebContainer.boot({ coep: "credentialless" });
  }

  webcontainerInstance = await bootPromise;
  return webcontainerInstance;
};

const teardownWebContainer = () => {
  if (webcontainerInstance) {
    webcontainerInstance.teardown();
    webcontainerInstance = null;
  }
  bootPromise = null;
};

// Convert FileNode[] to WebContainer FileSystemTree
function buildFileSystemTree(nodes: FileNode[]): FileSystemTree {
  const tree: FileSystemTree = {};

  for (const node of nodes) {
    if (node.type === "directory") {
      tree[node.name] = {
        directory: node.children ? buildFileSystemTree(node.children) : {},
      };
    } else {
      tree[node.name] = {
        file: {
          contents: node.content || "",
        },
      };
    }
  }

  return tree;
}

export function useWebContainer({
  files,
  enabled,
  installCommand = "npm install",
  devCommand = "npm run dev",
}: UseWebContainerOptions): UseWebContainerReturn {
  const [status, setStatus] = useState<ContainerStatus>("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [terminalOutput, setTerminalOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [restartKey, setRestartKey] = useState(0);

  const containerRef = useRef<WebContainer | null>(null);
  const hasStartedRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled || !files || files.length === 0 || hasStartedRef.current) {
      return;
    }

    hasStartedRef.current = true;

    const start = async () => {
      try {
        // Boot
        setStatus("booting");
        setTerminalOutput("Booting WebContainer...\n");
        const container = await getWebContainer();
        containerRef.current = container;

        if (!mountedRef.current) return;

        // Mount files
        setStatus("mounting");
        setTerminalOutput((prev) => prev + "Mounting files...\n");
        const fileTree = buildFileSystemTree(files);
        await container.mount(fileTree);

        if (!mountedRef.current) return;

        // Listen for server-ready
        container.on("server-ready", (_port, url) => {
          if (mountedRef.current) {
            setPreviewUrl(url);
            setStatus("running");
            setTerminalOutput((prev) => prev + `\n✓ Server ready at ${url}\n`);
          }
        });

        // Install dependencies
        setStatus("installing");
        setTerminalOutput((prev) => prev + `\n$ ${installCommand}\n`);

        const [installCmd, ...installArgs] = installCommand.split(" ");
        const installProcess = await container.spawn(installCmd, installArgs);

        installProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              if (mountedRef.current) {
                setTerminalOutput((prev) => prev + data);
              }
            },
          })
        );

        const installExitCode = await installProcess.exit;

        if (!mountedRef.current) return;

        if (installExitCode !== 0) {
          throw new Error(`Install failed with exit code ${installExitCode}`);
        }

        // Start dev server
        setStatus("starting");
        setTerminalOutput((prev) => prev + `\n$ ${devCommand}\n`);

        const [devCmd, ...devArgs] = devCommand.split(" ");
        const devProcess = await container.spawn(devCmd, devArgs);

        devProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              if (mountedRef.current) {
                setTerminalOutput((prev) => prev + data);
              }
            },
          })
        );
      } catch (err) {
        if (mountedRef.current) {
          const message = err instanceof Error ? err.message : "Unknown error";
          setError(message);
          setStatus("error");
          setTerminalOutput((prev) => prev + `\n✗ Error: ${message}\n`);
        }
      }
    };

    start();
  }, [enabled, files, restartKey, installCommand, devCommand]);

  // Reset when disabled
  useEffect(() => {
    if (!enabled) {
      hasStartedRef.current = false;
      setStatus("idle");
      setPreviewUrl(null);
      setError(null);
      setTerminalOutput("");
    }
  }, [enabled]);

  const restart = useCallback(() => {
    teardownWebContainer();
    containerRef.current = null;
    hasStartedRef.current = false;
    setStatus("idle");
    setPreviewUrl(null);
    setError(null);
    setTerminalOutput("");
    setRestartKey((k) => k + 1);
  }, []);

  return {
    status,
    previewUrl,
    terminalOutput,
    error,
    restart,
  };
}
