"use client";

import {
  WebContainer,
  type WebContainerProcess,
  type FileSystemTree,
} from "@webcontainer/api";
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
}

interface UseWebContainerReturn {
  status: ContainerStatus;
  previewUrl: string | null;
  error: string | null;
  startShell: (cols: number, rows: number) => Promise<WebContainerProcess>;
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
}: UseWebContainerOptions): UseWebContainerReturn {
  const [status, setStatus] = useState<ContainerStatus>("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
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

  // Boot and mount files — no auto-install or auto-dev-server
  useEffect(() => {
    if (!enabled || !files || files.length === 0 || hasStartedRef.current) {
      return;
    }

    hasStartedRef.current = true;

    const start = async () => {
      try {
        setStatus("booting");
        const container = await getWebContainer();
        containerRef.current = container;

        if (!mountedRef.current) return;

        setStatus("mounting");
        const fileTree = buildFileSystemTree(files);
        await container.mount(fileTree);

        if (!mountedRef.current) return;

        // Listen for server-ready (fires when user runs a dev server)
        container.on("server-ready", (_port, url) => {
          if (mountedRef.current) {
            setPreviewUrl(url);
          }
        });

        setStatus("ready");
      } catch (err) {
        if (mountedRef.current) {
          const message = err instanceof Error ? err.message : "Unknown error";
          setError(message);
          setStatus("error");
        }
      }
    };

    start();
  }, [enabled, files, restartKey]);

  // Reset when disabled
  useEffect(() => {
    if (!enabled) {
      hasStartedRef.current = false;
      setStatus("idle");
      setPreviewUrl(null);
      setError(null);
    }
  }, [enabled]);

  // Spawn an interactive jsh shell connected to the terminal
  const startShell = useCallback(
    async (cols: number, rows: number): Promise<WebContainerProcess> => {
      const container = containerRef.current;
      if (!container) {
        throw new Error("Container not ready");
      }

      const shellProcess = await container.spawn("jsh", [], {
        terminal: { cols, rows },
      });

      return shellProcess;
    },
    []
  );

  const restart = useCallback(() => {
    teardownWebContainer();
    containerRef.current = null;
    hasStartedRef.current = false;
    setStatus("idle");
    setPreviewUrl(null);
    setError(null);
    setRestartKey((k) => k + 1);
  }, []);

  return {
    status,
    previewUrl,
    error,
    startShell,
    restart,
  };
}
