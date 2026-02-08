"use client";

import { useEffect, useRef, useCallback } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import type { WebContainerProcess } from "@webcontainer/api";
import type { ContainerStatus } from "@/types/webcontainer";
import "@xterm/xterm/css/xterm.css";

interface TerminalPanelProps {
  status: ContainerStatus;
  startShell: (cols: number, rows: number) => Promise<WebContainerProcess>;
}

export function TerminalPanel({ status, startShell }: TerminalPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const shellRef = useRef<WebContainerProcess | null>(null);
  const connectedRef = useRef(false);

  // Create xterm instance on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const terminal = new Terminal({
      convertEol: true,
      disableStdin: false,
      fontSize: 13,
      fontFamily:
        "'JetBrains Mono', 'Fira Code', 'SF Mono', Menlo, Monaco, 'Courier New', monospace",
      lineHeight: 1.4,
      cursorBlink: true,
      theme: {
        background: "#0a0a0a",
        foreground: "#a3a3a3",
        cursor: "#a3a3a3",
        selectionBackground: "#333333",
        black: "#171717",
        red: "#f87171",
        green: "#4ade80",
        yellow: "#fbbf24",
        blue: "#60a5fa",
        magenta: "#c084fc",
        cyan: "#22d3ee",
        white: "#e5e5e5",
        brightBlack: "#404040",
        brightRed: "#fca5a5",
        brightGreen: "#86efac",
        brightYellow: "#fcd34d",
        brightBlue: "#93c5fd",
        brightMagenta: "#d8b4fe",
        brightCyan: "#67e8f9",
        brightWhite: "#f5f5f5",
      },
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(containerRef.current);

    // Initial fit
    setTimeout(() => fitAddon.fit(), 0);

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Resize observer — fit xterm and resize the shell process
    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
      if (shellRef.current) {
        shellRef.current.resize({ cols: terminal.cols, rows: terminal.rows });
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      connectedRef.current = false;
      shellRef.current?.kill();
      shellRef.current = null;
      terminal.dispose();
    };
  }, []);

  // Connect shell when container is ready
  const connectShell = useCallback(async () => {
    const terminal = terminalRef.current;
    if (!terminal || connectedRef.current) return;

    connectedRef.current = true;

    try {
      const shell = await startShell(terminal.cols, terminal.rows);
      shellRef.current = shell;

      // Pipe shell output → xterm (catch abort when container tears down)
      shell.output.pipeTo(
        new WritableStream({
          write(data) {
            terminal.write(data);
          },
        })
      ).catch(() => {
        // Stream closed — container was torn down
      });

      // Pipe xterm input → shell stdin
      const writer = shell.input.getWriter();
      const disposable = terminal.onData((data) => {
        writer.write(data).catch(() => {
          // Writer closed — shell was killed
        });
      });

      // If shell exits, allow reconnection
      shell.exit.then(() => {
        disposable.dispose();
        connectedRef.current = false;
        shellRef.current = null;
      });
    } catch {
      connectedRef.current = false;
      terminal.writeln("\r\n\x1b[31mFailed to start shell.\x1b[0m");
    }
  }, [startShell]);

  // Reset connection state when container stops so shell can reconnect on next Run
  useEffect(() => {
    if (status !== "ready") {
      shellRef.current?.kill();
      shellRef.current = null;
      connectedRef.current = false;
    }
  }, [status]);

  // Connect shell when container is ready
  useEffect(() => {
    if (status === "ready") {
      // Clear previous terminal content for a fresh session
      terminalRef.current?.clear();
      connectShell();
    }
  }, [status, connectShell]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-[#0a0a0a] p-2 [&_.xterm]:!h-full [&_.xterm-viewport]:!h-full [&_.xterm-screen]:!h-full"
    />
  );
}
