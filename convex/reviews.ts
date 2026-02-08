"use node";

import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { workflow } from "./workflowManager";

// Generate PR review using LLM
async function generateReview(
  prTitle: string,
  prDescription: string | null,
  files: Array<{ filename: string; patch?: string; status: string }>,
  codebaseContext: Array<{
    name: string;
    docstring: string;
    code: string;
    filePath: string;
  }>,
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
    .map(
      (c) =>
        `### ${c.filePath} - ${c.name}\n${c.docstring}\n\`\`\`\n${c.code.slice(0, 500)}\n\`\`\``,
    )
    .join("\n\n");

  // Build diff context
  const diffStr = files
    .slice(0, 20)
    .map(
      (f) =>
        `### ${f.filename} (${f.status})\n\`\`\`diff\n${f.patch?.slice(0, 1000) || "No diff available"}\n\`\`\``,
    )
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

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openrouterKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://repochat.dev",
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-v3.2", // Latest DeepSeek V3.2
        messages: [{ role: "user", content: prompt }],
        max_tokens: 2000,
        response_format: { type: "json_object" },
      }),
    },
  );

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
  }>,
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

  comment +=
    "\n---\n*Reviewed by [RepoChat](https://repochat.dev) - AI Code Review with full codebase context*";

  return comment;
}

// ============================================================================
// Discrete Workflow Action Steps
// ============================================================================

/** Fetch PR files, details, and codebase context via vector search. */
export const fetchPRData = internalAction({
  args: {
    installationId: v.number(),
    owner: v.string(),
    repoName: v.string(),
    prNumber: v.number(),
    prTitle: v.string(),
    repoId: v.id("repos"),
    baseBranch: v.string(),
  },
  handler: async (ctx, { installationId, owner, repoName, prNumber, prTitle, repoId, baseBranch }): Promise<{
    files: Array<{ filename: string; status: string; additions: number; deletions: number; patch?: string }>;
    prBody: string | null;
    codebaseContext: Array<{ name: string; docstring: string; code: string; filePath: string }>;
  }> => {
    // Get PR files
    const files: Array<{ filename: string; status: string; additions: number; deletions: number; patch?: string }> = await ctx.runAction(internal.github.getPullRequestFiles, {
      installationId,
      owner,
      repo: repoName,
      prNumber,
    });

    // Get PR description
    const pr: { body: string | null } = await ctx.runAction(internal.github.getPullRequest, {
      installationId,
      owner,
      repo: repoName,
      prNumber,
    });

    // Get codebase context via vector search
    const changedPaths = files
      .map((f: { filename: string }) => f.filename)
      .join(" ");
    let codebaseContext: Array<{
      name: string;
      docstring: string;
      code: string;
      filePath: string;
    }> = [];

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

    return { files, prBody: pr.body, codebaseContext };
  },
});

/** Generate the LLM review and post it to GitHub. */
export const generateAndPostReview = internalAction({
  args: {
    installationId: v.number(),
    owner: v.string(),
    repoName: v.string(),
    prNumber: v.number(),
    prTitle: v.string(),
    prBody: v.optional(v.string()),
    files: v.array(
      v.object({
        filename: v.string(),
        status: v.string(),
        additions: v.number(),
        deletions: v.number(),
        patch: v.optional(v.string()),
      }),
    ),
    codebaseContext: v.array(
      v.object({
        name: v.string(),
        docstring: v.string(),
        code: v.string(),
        filePath: v.string(),
      }),
    ),
    reviewId: v.id("reviews"),
  },
  handler: async (ctx, args): Promise<{
    summary: string;
    findings: Array<{ type: string; severity: string; title: string; description: string; filePath: string; line?: number; suggestion?: string }>;
    githubReviewId: number;
  }> => {
    const {
      installationId,
      owner,
      repoName,
      prNumber,
      prTitle,
      prBody,
      files,
      codebaseContext,
    } = args;

    // Generate review
    const review = await generateReview(
      prTitle,
      prBody ?? null,
      files,
      codebaseContext,
    );

    // Store findings
    await ctx.runMutation(internal.reviewsMutations.updateReview, {
      reviewId: args.reviewId,
      summary: review.summary,
      findings: review.findings,
      status: "posting",
    });

    // Post review to GitHub
    const reviewComment = formatReviewComment(
      review.summary,
      review.findings,
    );
    const event = review.findings.some(
      (f) => f.severity === "critical" || f.severity === "high",
    )
      ? "REQUEST_CHANGES"
      : review.findings.length > 0
        ? "COMMENT"
        : "APPROVE";

    const postedReview: { id: number } = await ctx.runAction(
      internal.github.postReviewComment,
      {
        installationId,
        owner,
        repo: repoName,
        prNumber,
        body: reviewComment,
        event: event as "APPROVE" | "REQUEST_CHANGES" | "COMMENT",
      },
    );

    return {
      summary: review.summary,
      findings: review.findings,
      githubReviewId: postedReview.id,
    };
  },
});

// ============================================================================
// Launcher — called by webhooks.ts (interface unchanged)
// ============================================================================

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
    const {
      repoId,
      installationId,
      prNumber,
      prTitle,
      prUrl,
      baseBranch,
      headBranch,
    } = args;

    // Create review record
    const reviewId = await ctx.runMutation(
      internal.reviewsMutations.createReview,
      {
        repoId,
        prNumber,
        prTitle,
        prAuthor: args.prAuthor,
        prUrl,
        baseBranch,
        headBranch,
      },
    );

    // Get repo details
    const repo = await ctx.runQuery(internal.repos.getRepoInternal, {
      repoId,
    });
    if (!repo) throw new Error("Repo not found");

    const workflowId = await workflow.start(
      ctx,
      internal.reviewWorkflow.reviewWorkflow,
      {
        repoId,
        installationId,
        prNumber,
        prTitle,
        prAuthor: args.prAuthor,
        prUrl,
        baseBranch,
        headBranch,
        reviewId,
        owner: repo.owner,
        repoName: repo.name,
      },
      {
        onComplete: internal.reviewWorkflow.onReviewComplete,
        context: { reviewId },
      },
    );

    await ctx.runMutation(internal.reviewsMutations.updateReview, {
      reviewId,
      workflowId,
    });
  },
});
