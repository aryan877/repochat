"use client";

import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

interface TerminalPanelProps {
  output: string;
  onData?: (data: string) => void;
}

export function TerminalPanel({ output, onData }: TerminalPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const lastLengthRef = useRef(0);

  useEffect(() => {
    if (!containerRef.current) return;

    const terminal = new Terminal({
      convertEol: true,
      disableStdin: false,
      fontSize: 13,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Menlo, Monaco, 'Courier New', monospace",
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

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      terminal.dispose();
    };
  }, []);

  // Wire onData callback for user input
  useEffect(() => {
    const terminal = terminalRef.current;
    if (!terminal || !onData) return;

    const disposable = terminal.onData(onData);
    return () => disposable.dispose();
  }, [onData]);

  // Write output incrementally
  useEffect(() => {
    const terminal = terminalRef.current;
    if (!terminal) return;

    // If output was cleared, clear terminal
    if (output.length < lastLengthRef.current) {
      terminal.clear();
      lastLengthRef.current = 0;
    }

    // Write new content
    const newData = output.slice(lastLengthRef.current);
    if (newData) {
      terminal.write(newData);
      lastLengthRef.current = output.length;
    }
  }, [output]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-[#0a0a0a] p-2 [&_.xterm]:!h-full [&_.xterm-viewport]:!h-full [&_.xterm-screen]:!h-full"
    />
  );
}
