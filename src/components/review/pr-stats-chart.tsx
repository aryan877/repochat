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
      <div className="py-4">
        <div className="h-4 w-48 bg-[#1f1f1f] rounded animate-pulse mb-4" />
        <div className="h-48 bg-[#1f1f1f] rounded animate-pulse" />
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
    <div className="py-4">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm font-medium text-[#fafafa]">{title}</h3>
        <div className="flex gap-4 text-xs">
          <span className="text-[#4ade80]">+{totalAdditions}</span>
          <span className="text-[#f87171]">-{totalDeletions}</span>
        </div>
      </div>

      <div className="bg-[#0a0a0a] rounded-lg p-4 border border-[#1f1f1f]">
        {chartType === "bar" ? (
          <ResponsiveContainer width="100%" height={Math.max(180, files.length * 32)}>
            <BarChart
              data={barData}
              layout="vertical"
              margin={{ top: 0, right: 12, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#525252", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: "#a3a3a3", fontSize: 11 }}
                width={140}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#141414",
                  border: "1px solid #1f1f1f",
                  borderRadius: "6px",
                  fontSize: "12px",
                  color: "#a3a3a3",
                }}
              />
              <Bar dataKey="additions" fill="#4ade80" radius={[0, 2, 2, 0]} barSize={14} />
              <Bar dataKey="deletions" fill="#f87171" radius={[0, 2, 2, 0]} barSize={14} />
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
                  backgroundColor: "#141414",
                  border: "1px solid #1f1f1f",
                  borderRadius: "6px",
                  fontSize: "12px",
                  color: "#a3a3a3",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {chartType === "pie" && files.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
          {files.map((f, i) => (
            <div key={f.filename} className="flex items-center gap-1.5 text-xs text-[#a3a3a3]">
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
