"use client";

import { z } from "zod";
import { useTamboStreamStatus } from "@tambo-ai/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const fileStatSchema = z.object({
  filename: z.string().describe("File name or path"),
  additions: z.number().describe("Lines added"),
  deletions: z.number().describe("Lines deleted"),
});

export const prStatsChartSchema = z.object({
  title: z.string().describe("Chart title, e.g. 'PR #42 File Changes'"),
  chartType: z
    .enum(["bar", "pie"])
    .describe("Type of chart: 'bar' for file breakdown, 'pie' for proportions"),
  files: z
    .array(fileStatSchema)
    .describe("Array of file change statistics"),
  totalAdditions: z.number().describe("Total lines added across all files"),
  totalDeletions: z.number().describe("Total lines deleted across all files"),
});

export type PRStatsChartProps = z.infer<typeof prStatsChartSchema>;

const COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
];

function truncateFilename(name: string, max = 20): string {
  if (name.length <= max) return name;
  const parts = name.split("/");
  const file = parts[parts.length - 1];
  if (file.length <= max) return file;
  return file.slice(0, max - 3) + "...";
}

export function PRStatsChart({
  title = "PR File Changes",
  chartType = "bar",
  files = [],
  totalAdditions = 0,
  totalDeletions = 0,
}: PRStatsChartProps) {
  const { streamStatus } = useTamboStreamStatus();

  if (streamStatus?.isStreaming && files.length === 0) {
    return (
      <div className="rounded-xl bg-[#111111] p-5 animate-pulse my-3">
        <div className="h-4 w-48 bg-[#1a1a1a] rounded mb-4" />
        <div className="h-48 bg-[#1a1a1a] rounded" />
      </div>
    );
  }

  const barData = files.map((f) => ({
    name: truncateFilename(f.filename),
    additions: f.additions,
    deletions: f.deletions,
  }));

  const pieData = files.map((f) => ({
    name: truncateFilename(f.filename),
    value: f.additions + f.deletions,
  }));

  return (
    <div className="rounded-xl bg-[#0a0a0a] overflow-hidden my-3 flex flex-col gap-px">
      {/* Tool label */}
      <div className="bg-[#161616] px-5 py-2.5">
        <span className="text-[10px] font-mono text-[#555] uppercase tracking-widest">PRStatsChart</span>
      </div>

      {/* Header */}
      <div className="bg-[#111111] flex items-center justify-between px-5 py-3">
        <h3 className="text-[14px] font-semibold text-[#e5e5e5]">{title}</h3>
        <div className="flex gap-4 text-xs">
          <span className="font-semibold text-emerald-400">+{totalAdditions}</span>
          <span className="font-semibold text-red-400">-{totalDeletions}</span>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-[#111111] p-5">
        {chartType === "bar" ? (
          <ResponsiveContainer width="100%" height={Math.max(180, files.length * 32)}>
            <BarChart
              data={barData}
              layout="vertical"
              margin={{ top: 0, right: 12, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#555", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: "#999", fontSize: 11 }}
                width={140}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#111111",
                  border: "1px solid #1e1e1e",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "#999",
                }}
              />
              <Bar dataKey="additions" fill="#10b981" radius={[0, 2, 2, 0]} barSize={14} />
              <Bar dataKey="deletions" fill="#ef4444" radius={[0, 2, 2, 0]} barSize={14} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {pieData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#111111",
                  border: "1px solid #1e1e1e",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "#999",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Pie legend */}
      {chartType === "pie" && files.length > 0 && (
        <div className="bg-[#111111] px-5 pb-4 flex flex-wrap gap-x-4 gap-y-1">
          {files.map((f, i) => (
            <div key={f.filename} className="flex items-center gap-1.5 text-xs text-[#999]">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              <span className="truncate max-w-[120px]">{truncateFilename(f.filename)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
