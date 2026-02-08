"use client";

import { z } from "zod";

const PlanStepSchema = z.object({
  id: z.string().describe("Unique step identifier"),
  title: z.string().describe("Step title"),
  description: z.string().optional().describe("Detailed description"),
  status: z.enum(["pending", "in_progress", "completed"]).describe("Step status"),
  files: z.array(z.string()).optional().describe("Files affected by this step"),
});

export const planViewSchema = z.object({
  title: z.string().describe("Plan title"),
  description: z.string().optional().describe("Overall plan description"),
  steps: z.array(PlanStepSchema).describe("List of steps in the plan"),
  currentStep: z.number().optional().describe("Index of current step (0-based)"),
});

export type PlanStep = z.infer<typeof PlanStepSchema>;
export type PlanViewProps = z.infer<typeof planViewSchema>;

import { CheckCircleIcon, LoaderIcon } from "./icons";

export function PlanView({
  title = "Plan",
  description,
  steps = [],
  currentStep,
}: PlanViewProps) {
  const completedCount = steps.filter((s) => s.status === "completed").length;
  const progress = steps.length > 0 ? (completedCount / steps.length) * 100 : 0;

  return (
    <div className="rounded-xl bg-[#0a0a0a] overflow-hidden my-3 flex flex-col gap-px">
      {/* Tool label */}
      <div className="bg-[#161616] px-5 py-2.5">
        <span className="text-[10px] font-mono text-[#555] uppercase tracking-widest">PlanView</span>
      </div>

      {/* Header */}
      <div className="bg-[#111111] px-5 pt-4 pb-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[14px] font-semibold text-[#e5e5e5]">{title}</h3>
          <span className="text-xs font-mono text-[#666]">{completedCount}/{steps.length}</span>
        </div>
        {description && (
          <p className="text-[13px] text-[#999] leading-relaxed mb-3">{description}</p>
        )}

        {/* Progress bar */}
        <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              progress === 100
                ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                : "bg-gradient-to-r from-blue-500 to-blue-400"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="bg-[#111111]">
        {steps.map((step, idx) => {
          const isCurrentStep = currentStep === idx;
          const isCompleted = step.status === "completed";
          const isInProgress = step.status === "in_progress";

          return (
            <div
              key={step.id}
              className={`flex items-start gap-3 px-5 py-3 ${
                idx > 0 ? "" : ""
              } ${isCurrentStep ? "bg-[#0d1b2a]/30" : ""}`}
            >
              {/* Status indicator */}
              <div className="flex-shrink-0 mt-0.5">
                {isCompleted ? (
                  <div className="text-emerald-400">
                    <CheckCircleIcon />
                  </div>
                ) : isInProgress ? (
                  <div className="text-blue-400">
                    <LoaderIcon />
                  </div>
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-[#333] ml-0.5" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`text-[13px] ${
                    isCompleted ? "text-[#666] line-through" : "text-[#e5e5e5]"
                  }`}>
                    {step.title}
                  </p>
                  {isInProgress && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-medium">
                      Active
                    </span>
                  )}
                </div>
                {step.description && (
                  <p className="text-[12px] text-[#666] mt-1 leading-relaxed">{step.description}</p>
                )}

                {step.files && step.files.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {step.files.map((file) => (
                      <span
                        key={file}
                        className="text-[11px] font-mono text-[#666] bg-[#0a0a0a] px-1.5 py-0.5 rounded border border-[#1e1e1e]"
                      >
                        {file.split("/").pop()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Completion footer */}
      {progress === 100 && (
        <div className="bg-[#111111] px-5 py-3">
          <p className="text-[12px] text-emerald-400 font-medium">All steps completed</p>
        </div>
      )}
    </div>
  );
}

export default PlanView;
