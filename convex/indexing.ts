"use node";

import { v } from "convex/values";
import fs from "fs";
import path from "path";
import type Parser from "web-tree-sitter";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { internalAction } from "./_generated/server";
import { shouldSkipPath, computeFileDiff, type GitHubTreeItem } from "./shared";
import { workflow } from "./workflowManager";

/* eslint-disable @typescript-eslint/no-require-imports */
require("tree-sitter-wasms/package.json");
/* eslint-enable @typescript-eslint/no-require-imports */

const EXT_TO_LANG: Record<string, { wasm: string; query?: string }> = {
  ".js": { wasm: "tree-sitter-javascript", query: "javascript" },
  ".jsx": { wasm: "tree-sitter-javascript", query: "javascript" },
  ".mjs": { wasm: "tree-sitter-javascript", query: "javascript" },
  ".ts": { wasm: "tree-sitter-typescript", query: "typescript" },
  ".tsx": { wasm: "tree-sitter-tsx", query: "typescript" },
  ".py": { wasm: "tree-sitter-python", query: "python" },
  ".go": { wasm: "tree-sitter-go", query: "go" },
  ".rs": { wasm: "tree-sitter-rust", query: "rust" },
  ".java": { wasm: "tree-sitter-java", query: "java" },
  ".c": { wasm: "tree-sitter-c", query: "c" },
  ".h": { wasm: "tree-sitter-c", query: "c" },
  ".cpp": { wasm: "tree-sitter-cpp", query: "cpp" },
  ".cc": { wasm: "tree-sitter-cpp", query: "cpp" },
  ".cxx": { wasm: "tree-sitter-cpp", query: "cpp" },
  ".hpp": { wasm: "tree-sitter-cpp", query: "cpp" },
  ".cs": { wasm: "tree-sitter-c_sharp", query: "c-sharp" },
  ".rb": { wasm: "tree-sitter-ruby", query: "ruby" },
  ".kt": { wasm: "tree-sitter-kotlin" },
  ".kts": { wasm: "tree-sitter-kotlin" },
  ".sh": { wasm: "tree-sitter-bash" },
  ".bash": { wasm: "tree-sitter-bash" },
};

function getLanguageInfo(filePath: string): { wasm: string; query?: string } | null {
  const ext = path.extname(filePath).toLowerCase();
  return EXT_TO_LANG[ext] || null;
}

// ============================================================================
// Tree-sitter Initialization with Query Support
// ============================================================================

// Module-level cache
let ParserClass: typeof Parser | null = null;
let initialized = false;
const parserCache = new Map<
  string,
  { parser: Parser; language: Parser.Language; query: Parser.Query | null }
>();

async function initTreeSitter(): Promise<typeof Parser | null> {
  if (initialized && ParserClass) return ParserClass;

  try {
    const mod = await import("web-tree-sitter");
    ParserClass = mod.default || mod;

    const mainEntry = require.resolve("web-tree-sitter");
    const wasmPath = path.join(path.dirname(mainEntry), "tree-sitter.wasm");
    await ParserClass.init({
      locateFile: () => wasmPath,
    });

    initialized = true;
    return ParserClass;
  } catch (err) {
    console.error("Failed to init tree-sitter:", err);
    return null;
  }
}

async function getParserWithQuery(
  wasmName: string,
  queryName?: string,
): Promise<{ parser: Parser; query: Parser.Query | null } | null> {
  const cacheKey = `${wasmName}:${queryName || ""}`;
  if (parserCache.has(cacheKey)) {
    const cached = parserCache.get(cacheKey)!;
    return { parser: cached.parser, query: cached.query };
  }

  const TSParser = await initTreeSitter();
  if (!TSParser) return null;

  try {
    const wasmsDir = path.join(
      path.dirname(require.resolve("tree-sitter-wasms/package.json")),
      "out",
    );
    const wasmPath = path.join(wasmsDir, `${wasmName}.wasm`);
    const wasmBuffer = fs.readFileSync(wasmPath);

    const TSMod = await import("web-tree-sitter");
    const TSLanguage = (TSMod.default || TSMod).Language;
    const language = await TSLanguage.load(wasmBuffer);

    const parser = new TSParser();
    parser.setLanguage(language);

    let query: Parser.Query | null = null;
    if (queryName) {
      try {
        const tagsPath = path.join(__dirname, "queries", `${queryName}.scm`);
        if (fs.existsSync(tagsPath)) {
          const tagsQuery = fs.readFileSync(tagsPath, "utf-8");
          const cleanedQuery = tagsQuery
            .replace(/#strip!.*$/gm, "")
            .replace(/#select-adjacent!.*$/gm, "");
          query = language.query(cleanedQuery);
        }
      } catch (qErr) {
        console.log(`No query for ${queryName}:`, qErr);
      }
    }

    parserCache.set(cacheKey, { parser, language, query });
    return { parser, query };
  } catch (err) {
    console.error(`Failed to load ${wasmName}:`, err);
    return null;
  }
}

// ============================================================================
// Code Chunk Extraction using Tree-sitter Queries
// ============================================================================

interface CodeChunk {
  chunkType:
    | "function"
    | "class"
    | "method"
    | "interface"
    | "type"
    | "variable"
    | "import"
    | "file_summary";
  name: string;
  code: string;
  startLine: number;
  endLine: number;
  docs?: string;
}

function extractChunksWithQuery(
  sourceCode: string,
  parser: Parser,
  query: Parser.Query | null,
): CodeChunk[] {
  const tree = parser.parse(sourceCode);
  if (!tree) return [];

  const chunks: CodeChunk[] = [];

  if (query && tree) {
    // Use tree-sitter query to find all definitions automatically
    const matches = query.matches(tree.rootNode);

    for (const match of matches) {
      // Find the definition and name captures
      let definitionNode: Parser.SyntaxNode | undefined;
      let nameNode: Parser.SyntaxNode | undefined;
      let docNode: Parser.SyntaxNode | undefined;
      let chunkType: CodeChunk["chunkType"] = "function";

      for (const capture of match.captures) {
        if (capture.name.startsWith("definition.")) {
          definitionNode = capture.node;
          // Extract type from capture name: definition.function → function
          const type = capture.name.replace(
            "definition.",
            "",
          ) as CodeChunk["chunkType"];
          if (
            [
              "function",
              "class",
              "method",
              "interface",
              "type",
              "variable",
            ].includes(type)
          ) {
            chunkType = type;
          }
        } else if (capture.name === "name") {
          nameNode = capture.node;
        } else if (capture.name === "doc") {
          docNode = capture.node;
        }
      }

      if (definitionNode && definitionNode.text.length > 20) {
        chunks.push({
          chunkType,
          name: nameNode?.text || "anonymous",
          code: definitionNode.text,
          startLine: definitionNode.startPosition.row + 1,
          endLine: definitionNode.endPosition.row + 1,
          docs: docNode?.text,
        });
      }
    }
  }

  // Fallback: If no query or no matches, use simple AST traversal
  if (chunks.length === 0 && tree) {
    extractChunksFallback(tree.rootNode, chunks);
  }

  // If still nothing, create file summary
  if (chunks.length === 0 && sourceCode.length < 10000) {
    chunks.push({
      chunkType: "file_summary",
      name: "file",
      code: sourceCode.slice(0, 5000),
      startLine: 1,
      endLine: sourceCode.split("\n").length,
    });
  }

  return chunks;
}

// Simple fallback for when queries aren't available
function extractChunksFallback(
  node: Parser.SyntaxNode,
  chunks: CodeChunk[],
  depth = 0,
): void {
  if (depth > 3) return;

  const t = node.type.toLowerCase();

  // Detect definitions by naming convention (tree-sitter grammars are consistent)
  let chunkType: CodeChunk["chunkType"] | null = null;
  if (
    t.includes("function") ||
    t.includes("method") ||
    t === "arrow_function"
  ) {
    chunkType = t.includes("method") ? "method" : "function";
  } else if (t.includes("class") && !t.includes("interface")) {
    chunkType = "class";
  } else if (
    t.includes("interface") ||
    t.includes("trait") ||
    t.includes("protocol")
  ) {
    chunkType = "interface";
  } else if (
    t.includes("type_alias") ||
    t.includes("struct") ||
    t.includes("enum")
  ) {
    chunkType = "type";
  }

  if (chunkType && node.text.length > 20) {
    // Extract name from first identifier child
    let name = "anonymous";
    for (const child of node.children) {
      if (
        ["identifier", "type_identifier", "property_identifier"].includes(
          child.type,
        )
      ) {
        name = child.text;
        break;
      }
    }

    chunks.push({
      chunkType,
      name,
      code: node.text,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
    });
  }

  // Recurse
  for (const child of node.children) {
    extractChunksFallback(child, chunks, chunkType ? depth + 1 : depth);
  }
}

// ============================================================================
// Main Extraction Function
// ============================================================================

async function extractChunks(
  sourceCode: string,
  filePath: string,
): Promise<CodeChunk[]> {
  const langInfo = getLanguageInfo(filePath);
  if (!langInfo) return [];

  const result = await getParserWithQuery(langInfo.wasm, langInfo.query);
  if (!result) return [];

  return extractChunksWithQuery(sourceCode, result.parser, result.query);
}

// ============================================================================
// OpenRouter API Functions
// ============================================================================

async function generateDocstring(
  code: string,
  language: string,
): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return `${language} code`;

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://repochat.dev",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-001",
        messages: [
          {
            role: "user",
            content: `Write a brief 1-2 sentence description of what this ${language} code does. Be concise.\n\n\`\`\`${language}\n${code.slice(0, 2000)}\n\`\`\``,
          },
        ],
        max_tokens: 100,
      }),
    });

    if (!res.ok) return `${language} code`;
    const data = await res.json();
    return data.choices[0]?.message?.content || `${language} code`;
  } catch {
    return `${language} code`;
  }
}

async function generateEmbedding(text: string): Promise<number[]> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY not configured");

  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text.slice(0, 8000),
    }),
  });

  if (!res.ok) throw new Error(`Embedding error: ${await res.text()}`);
  const data = await res.json();
  return data.data[0].embedding;
}

// ============================================================================
// Discrete Workflow Action Steps
// ============================================================================

/** Fetch the repo tree from GitHub and compute the diff against existing indexed files. */
export const fetchRepoTreeAndDiff = internalAction({
  args: {
    repoId: v.id("repos"),
    branch: v.string(),
    installationId: v.number(),
    owner: v.string(),
    repoName: v.string(),
  },
  handler: async (ctx, { repoId, branch, installationId, owner, repoName }) => {
    const tree = await ctx.runAction(internal.github.getRepoContent, {
      installationId,
      owner,
      repo: repoName,
      branch,
    });

    const githubFiles: GitHubTreeItem[] = tree.tree.filter(
      (item: GitHubTreeItem) =>
        item.type === "blob" &&
        !shouldSkipPath(item.path) &&
        getLanguageInfo(item.path) !== null,
    );

    const existingFileShas: { filePath: string; fileSha: string | undefined }[] =
      await ctx.runQuery(internal.indexingMutations.getBranchFileShas, {
        repoId,
        branch,
      });

    const { toFetch, toDelete, skippedCount } = computeFileDiff(
      githubFiles,
      existingFileShas,
      (item) => item.filePath,
      (item) => item.fileSha,
    );

    console.log(
      `Incremental index: ${toFetch.length} changed, ${toDelete.length} removed, ${skippedCount} unchanged`,
    );

    return {
      toFetch: toFetch.map((f) => ({ path: f.path, sha: f.sha })),
      toDelete: toDelete.map((f) => ({ filePath: f.filePath })),
      skippedCount,
    };
  },
});

/** Process a batch of files: fetch content, parse with tree-sitter, generate embeddings, store chunks. */
export const processFileBatch = internalAction({
  args: {
    repoId: v.id("repos"),
    branch: v.string(),
    installationId: v.number(),
    owner: v.string(),
    repoName: v.string(),
    files: v.array(v.object({ path: v.string(), sha: v.string() })),
    jobId: v.id("indexingJobs"),
  },
  handler: async (ctx, { repoId, branch, installationId, owner, repoName, files, jobId }) => {
    let processedCount = 0;
    let chunkCount = 0;

    for (const file of files) {
      try {
        await ctx.runMutation(internal.indexingMutations.deleteFileChunks, {
          repoId,
          branch,
          filePath: file.path,
        });

        const { content } = await ctx.runAction(
          internal.github.getFileContent,
          {
            installationId,
            owner,
            repo: repoName,
            path: file.path,
            ref: branch,
          },
        );

        const chunks = await extractChunks(content, file.path);
        const lang = path.extname(file.path).slice(1) || "code";

        for (const chunk of chunks) {
          const docstring =
            chunk.docs || (await generateDocstring(chunk.code, lang));
          const embedding = await generateEmbedding(
            `${chunk.name}: ${docstring}\n\n${chunk.code.slice(0, 1000)}`,
          );

          await ctx.runMutation(internal.indexingMutations.storeCodeChunk, {
            repoId,
            branch,
            filePath: file.path,
            chunkType: chunk.chunkType,
            name: chunk.name,
            code: chunk.code,
            docstring,
            startLine: chunk.startLine,
            endLine: chunk.endLine,
            embedding,
            language: lang,
            fileSha: file.sha,
          });

          chunkCount++;
        }

        processedCount++;
      } catch (fileErr) {
        console.error(`Error processing ${file.path}:`, fileErr);
      }
    }

    return { processedCount, chunkCount };
  },
});

/** Delete stale file chunks in a batch. */
export const deleteStaleBatch = internalAction({
  args: {
    repoId: v.id("repos"),
    branch: v.string(),
    filePaths: v.array(v.string()),
  },
  handler: async (ctx, { repoId, branch, filePaths }) => {
    let deletedCount = 0;
    for (const filePath of filePaths) {
      const count = await ctx.runMutation(internal.indexingMutations.deleteFileChunks, {
        repoId,
        branch,
        filePath,
      });
      deletedCount += count;
    }
    return { deletedCount };
  },
});

// ============================================================================
// Launcher — called by webhooks.ts (interface unchanged)
// ============================================================================

export const startIndexing = internalAction({
  args: {
    repoId: v.id("repos"),
    branch: v.string(),
    triggerType: v.union(
      v.literal("manual"),
      v.literal("push"),
      v.literal("initial"),
    ),
    commitSha: v.optional(v.string()),
  },
  handler: async (ctx, { repoId, branch, triggerType, commitSha }) => {
    const jobId = await ctx.runMutation(
      internal.indexingMutations.createIndexingJob,
      { repoId, branch, triggerType, commitSha },
    );

    const repo = await ctx.runQuery(
      internal.indexingMutations.getRepoInternal,
      { repoId },
    );
    if (!repo) throw new Error("Repo not found");

    const installationId = await ctx.runQuery(
      internal.repos.getRepoInstallationId,
      { repoId },
    );
    if (!installationId) throw new Error("Installation not found");

    const workflowId = await workflow.start(
      ctx,
      internal.indexingWorkflow.indexingWorkflow,
      {
        repoId,
        branch,
        triggerType,
        commitSha,
        jobId,
        installationId,
        owner: repo.owner,
        repoName: repo.name,
      },
      {
        onComplete: internal.indexingWorkflow.onIndexingComplete,
        context: { jobId },
      },
    );

    await ctx.runMutation(internal.indexingMutations.updateIndexingJob, {
      jobId,
      workflowId,
    });
  },
});

// ============================================================================
// Vector Search
// ============================================================================

// Code chunk with score type
type CodeChunkWithScore = {
  _id: Id<"codeChunks">;
  _creationTime: number;
  repoId: Id<"repos">;
  branch: string;
  repoBranchKey: string;
  filePath: string;
  chunkType:
    | "function"
    | "class"
    | "method"
    | "interface"
    | "type"
    | "variable"
    | "import"
    | "file_summary";
  name: string;
  code: string;
  docstring: string;
  startLine: number;
  endLine: number;
  embedding: number[];
  language: string;
  indexedAt: number;
  score: number;
};

export const searchCodeChunks = internalAction({
  args: {
    repoId: v.id("repos"),
    branch: v.string(),
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (
    ctx,
    { repoId, branch, query, limit = 10 },
  ): Promise<CodeChunkWithScore[]> => {
    const queryEmbedding = await generateEmbedding(query);
    const repoBranchKey = `${repoId}:${branch}`;

    const results = await ctx.vectorSearch("codeChunks", "by_embedding", {
      vector: queryEmbedding,
      limit,
      filter: (q) => q.eq("repoBranchKey", repoBranchKey),
    });

    const chunks: CodeChunkWithScore[] = [];
    for (const result of results) {
      const chunk = await ctx.runQuery(
        internal.indexingMutations.getChunkById,
        {
          chunkId: result._id as Id<"codeChunks">,
        },
      );
      if (chunk) {
        chunks.push({ ...chunk, score: result._score });
      }
    }

    return chunks;
  },
});
