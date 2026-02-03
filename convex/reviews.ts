"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

// Generate PR review using LLM
async function generateReview(
  prTitle: string,
  prDescription: string | null,
  files: Array<{ filename: string; patch?: string; status: string }>,
  codebaseContext: Array<{ name: string; docstring: string; code: string; filePath: string }>
): Promise<{
  summary: string;
  findings: Array<{
    type: string;
    severity: string;
    title: string;
    description: string;
    filePath: string;
    line?: number;
    suggestion?: string;
  }>;
}> {
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  if (!openrouterKey) {
    throw new Error("OPENROUTER_API_KEY not configured");
  }

  // Build context from codebase
  const contextStr = codebaseContext
    .slice(0, 10)
    .map((c) => `### ${c.filePath} - ${c.name}\n${c.docstring}\n\`\`\`\n${c.code.slice(0, 500)}\n\`\`\``)
    .join("\n\n");

  // Build diff context
  const diffStr = files
    .slice(0, 20)
    .map((f) => `### ${f.filename} (${f.status})\n\`\`\`diff\n${f.patch?.slice(0, 1000) || "No diff available"}\n\`\`\``)
    .join("\n\n");

  const prompt = `You are an expert code reviewer. Review this pull request with full codebase context.

## PR Title
${prTitle}

## PR Description
${prDescription || "No description provided"}

## Relevant Codebase Context
${contextStr || "No codebase context available"}

## Changed Files
${diffStr}

## Instructions
1. Analyze the changes in context of the existing codebase
2. Identify any bugs, security issues, performance problems, or code quality concerns
3. Check for consistency with existing patterns in the codebase
4. Provide a brief summary and specific findings

Respond in this exact JSON format:
{
  "summary": "Brief 2-3 sentence summary of the PR and overall assessment",
  "findings": [
    {
      "type": "bug|security|performance|code_quality|test|documentation",
      "severity": "critical|high|medium|low",
      "title": "Short title",
      "description": "Detailed explanation",
      "filePath": "path/to/file.ts",
      "line": 42,
      "suggestion": "Optional code suggestion"
    }
  ]
}

If the PR looks good with no issues, return an empty findings array.
Only respond with valid JSON, no markdown or explanation.`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openrouterKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://repochat.dev",
    },
    body: JSON.stringify({
      model: "deepseek/deepseek-v3.2", // Latest DeepSeek V3.2 - top tier for code review
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2000,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Review generation failed: ${error}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;

  if (!content) {
    throw new Error("Empty response from LLM");
  }

  try {
    return JSON.parse(content);
  } catch {
    // Try to extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error("Failed to parse review response");
  }
}

// Format review as GitHub comment
function formatReviewComment(
  summary: string,
  findings: Array<{
    type: string;
    severity: string;
    title: string;
    description: string;
    filePath: string;
    line?: number;
    suggestion?: string;
  }>
): string {
  let comment = `## 🤖 RepoChat AI Review\n\n${summary}\n\n`;

  if (findings.length === 0) {
    comment += "✅ **No issues found!** This PR looks good to merge.\n";
  } else {
    comment += `### Findings (${findings.length})\n\n`;

    const severityEmoji: Record<string, string> = {
      critical: "🔴",
      high: "🟠",
      medium: "🟡",
      low: "🔵",
    };

    const typeEmoji: Record<string, string> = {
      bug: "🐛",
      security: "🔒",
      performance: "⚡",
      code_quality: "✨",
      test: "🧪",
      documentation: "📝",
    };

    for (const finding of findings) {
      const emoji = `${severityEmoji[finding.severity] || "⚪"} ${typeEmoji[finding.type] || "📌"}`;
      comment += `#### ${emoji} ${finding.title}\n\n`;
      comment += `**Severity:** ${finding.severity} | **Type:** ${finding.type}\n`;
      comment += `**File:** \`${finding.filePath}\`${finding.line ? `:${finding.line}` : ""}\n\n`;
      comment += `${finding.description}\n\n`;

      if (finding.suggestion) {
        comment += `<details>\n<summary>💡 Suggestion</summary>\n\n\`\`\`\n${finding.suggestion}\n\`\`\`\n</details>\n\n`;
      }
    }
  }

  comment += "\n---\n*Reviewed by [RepoChat](https://repochat.dev) - AI Code Review with full codebase context*";

  return comment;
}

// Main review action
export const startReview = internalAction({
  args: {
    repoId: v.id("repos"),
    installationId: v.number(),
    prNumber: v.number(),
    prTitle: v.string(),
    prAuthor: v.string(),
    prUrl: v.string(),
    baseBranch: v.string(),
    headBranch: v.string(),
    headSha: v.string(),
  },
  handler: async (ctx, args) => {
    const { repoId, installationId, prNumber, prTitle, prUrl, baseBranch, headBranch } = args;

    // Create review record
    const reviewId = await ctx.runMutation(internal.reviewsMutations.createReview, {
      repoId,
      prNumber,
      prTitle,
      prAuthor: args.prAuthor,
      prUrl,
      baseBranch,
      headBranch,
    });

    try {
      // Get repo details
      const repo = await ctx.runQuery(internal.repos.getRepoInternal, { repoId });
      if (!repo) throw new Error("Repo not found");

      // Update status to analyzing
      await ctx.runMutation(internal.reviewsMutations.updateReview, {
        reviewId,
        status: "analyzing",
      });

      // Get PR files
      const files = await ctx.runAction(internal.github.getPullRequestFiles, {
        installationId,
        owner: repo.owner,
        repo: repo.name,
        prNumber,
      });

      // Get codebase context via vector search
      // Search for context related to the changed files
      const changedPaths = files.map((f: { filename: string }) => f.filename).join(" ");
      let codebaseContext: Array<{ name: string; docstring: string; code: string; filePath: string }> = [];

      try {
        const chunks = await ctx.runAction(internal.indexing.searchCodeChunks, {
          repoId,
          branch: baseBranch,
          query: `${prTitle} ${changedPaths}`,
          limit: 10,
        });
        codebaseContext = chunks.map((c: any) => ({
          name: c.name,
          docstring: c.docstring,
          code: c.code,
          filePath: c.filePath,
        }));
      } catch (error) {
        console.log("No codebase index available, reviewing without context");
      }

      // Update status to reviewing
      await ctx.runMutation(internal.reviewsMutations.updateReview, {
        reviewId,
        status: "reviewing",
      });

      // Get PR description
      const pr = await ctx.runAction(internal.github.getPullRequest, {
        installationId,
        owner: repo.owner,
        repo: repo.name,
        prNumber,
      });

      // Generate review
      const review = await generateReview(prTitle, pr.body, files, codebaseContext);

      // Store findings
      await ctx.runMutation(internal.reviewsMutations.updateReview, {
        reviewId,
        summary: review.summary,
        findings: review.findings,
        status: "posting",
      });

      // Post review to GitHub
      const reviewComment = formatReviewComment(review.summary, review.findings);
      const event = review.findings.some((f) => f.severity === "critical" || f.severity === "high")
        ? "REQUEST_CHANGES"
        : review.findings.length > 0
        ? "COMMENT"
        : "APPROVE";

      const postedReview = await ctx.runAction(internal.github.postReviewComment, {
        installationId,
        owner: repo.owner,
        repo: repo.name,
        prNumber,
        body: reviewComment,
        event: event as "APPROVE" | "REQUEST_CHANGES" | "COMMENT",
      });

      // Complete
      await ctx.runMutation(internal.reviewsMutations.updateReview, {
        reviewId,
        githubReviewId: postedReview.id,
        status: "completed",
        completedAt: Date.now(),
      });
    } catch (error) {
      await ctx.runMutation(internal.reviewsMutations.updateReview, {
        reviewId,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
        completedAt: Date.now(),
      });
      throw error;
    }
  },
});
