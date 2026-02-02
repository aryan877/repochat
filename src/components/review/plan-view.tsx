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

export function PlanView({
  title,
  description,
  steps,
  currentStep,
}: PlanViewProps) {
  const completedCount = steps.filter((s) => s.status === "completed").length;
  const progress = steps.length > 0 ? (completedCount / steps.length) * 100 : 0;

  return (
    <div className="my-3">
      <div className="py-3 border-b border-[#1f1f1f]">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[#fafafa] text-sm font-medium">{title}</h3>
          <span className="text-xs text-[#525252]">{completedCount}/{steps.length}</span>
        </div>
        {description && (
          <p className="text-sm text-[#a3a3a3] mb-3">{description}</p>
        )}

        <div className="h-1 bg-[#1f1f1f] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#525252] transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="py-3 space-y-3">
        {steps.map((step, idx) => {
          const isCurrentStep = currentStep === idx;
          const isCompleted = step.status === "completed";
          const isInProgress = step.status === "in_progress";

          return (
            <div
              key={step.id}
              className={`flex items-start gap-3 p-3 rounded ${
                isCurrentStep ? "bg-[#141414]" : ""
              }`}
            >
              <div className="flex items-center gap-2 mt-0.5">
                <span className="w-5 h-5 rounded-full bg-[#1f1f1f] flex items-center justify-center text-xs text-[#525252]">
                  {isCompleted ? "✓" : idx + 1}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`text-sm ${isCompleted ? "text-[#525252] line-through" : "text-[#fafafa]"}`}>
                    {step.title}
                  </p>
                  {isInProgress && (
                    <span className="text-xs text-[#525252]">in progress</span>
                  )}
                </div>
                {step.description && (
                  <p className="text-xs text-[#525252] mt-1">{step.description}</p>
                )}

                {step.files && step.files.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {step.files.map((file) => (
                      <span
                        key={file}
                        className="text-xs text-[#525252] font-mono"
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

      {progress === 100 && (
        <div className="py-2 border-t border-[#1f1f1f] text-xs text-[#525252]">
          Plan completed
        </div>
      )}
    </div>
  );
}

export default PlanView;
