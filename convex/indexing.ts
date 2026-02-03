"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import path from "path";
import fs from "fs";
import type { Parser, Language, Query, Node } from "web-tree-sitter";

// ============================================================================
// Tree-sitter Setup - Using official language packages with built-in queries
// ============================================================================

// Extension → Language package name mapping
// These packages include: WASM grammar + queries/tags.scm
const EXT_TO_PACKAGE: Record<string, string> = {
  // JavaScript/TypeScript
  ".js": "tree-sitter-javascript",
  ".jsx": "tree-sitter-javascript",
  ".mjs": "tree-sitter-javascript",
  ".ts": "tree-sitter-typescript/typescript",
  ".tsx": "tree-sitter-typescript/tsx",
  // Python
  ".py": "tree-sitter-python",
  // Go
  ".go": "tree-sitter-go",
  // Rust
  ".rs": "tree-sitter-rust",
  // Java
  ".java": "tree-sitter-java",
  // C/C++
  ".c": "tree-sitter-c",
  ".h": "tree-sitter-c",
  ".cpp": "tree-sitter-cpp",
  ".cc": "tree-sitter-cpp",
  ".cxx": "tree-sitter-cpp",
  ".hpp": "tree-sitter-cpp",
  // C#
  ".cs": "tree-sitter-c-sharp",
  // Ruby
  ".rb": "tree-sitter-ruby",
  // Kotlin
  ".kt": "tree-sitter-kotlin",
  ".kts": "tree-sitter-kotlin",
  // Shell/Bash
  ".sh": "tree-sitter-bash",
  ".bash": "tree-sitter-bash",
};

// Skip patterns for indexing
const SKIP_PATTERNS = [
  "node_modules", ".git", ".next", "dist", "build", "__pycache__",
  ".venv", "venv", ".cache", "coverage", ".DS_Store",
  "package-lock.json", "yarn.lock", "pnpm-lock.yaml", ".min.js",
];

function getLanguagePackage(filePath: string): string | null {
  const ext = path.extname(filePath).toLowerCase();
  return EXT_TO_PACKAGE[ext] || null;
}

function shouldSkip(filePath: string): boolean {
  return SKIP_PATTERNS.some((p) => filePath.includes(p));
}

// ============================================================================
// Tree-sitter Initialization with Query Support
// ============================================================================

// Module-level cache
let ParserClass: typeof Parser | null = null;
let initialized = false;
const parserCache = new Map<string, { parser: Parser; language: Language; query: Query | null }>();

async function initTreeSitter(): Promise<typeof Parser | null> {
  if (initialized && ParserClass) return ParserClass;

  try {
    const mod = await import("web-tree-sitter");
    ParserClass = mod.Parser;

    const wasmPath = require.resolve("web-tree-sitter/web-tree-sitter.wasm");
    await ParserClass.init({
      locateFile: (file: string) => (file === "tree-sitter.wasm" ? wasmPath : file),
    });

    initialized = true;
    return ParserClass;
  } catch (err) {
    console.error("Failed to init tree-sitter:", err);
    return null;
  }
}

async function getParserWithQuery(packageName: string): Promise<{ parser: Parser; query: Query | null } | null> {
  if (parserCache.has(packageName)) {
    const cached = parserCache.get(packageName)!;
    return { parser: cached.parser, query: cached.query };
  }

  const TSParser = await initTreeSitter();
  if (!TSParser) return null;

  try {
    // Resolve the package path
    let packagePath: string;
    let wasmFile: string;

    if (packageName.includes("/")) {
      // TypeScript has subfolders: tree-sitter-typescript/typescript or /tsx
      const [pkg, sub] = packageName.split("/");
      packagePath = require.resolve(`${pkg}/package.json`).replace("/package.json", "");
      wasmFile = `tree-sitter-${sub}.wasm`;
    } else {
      packagePath = require.resolve(`${packageName}/package.json`).replace("/package.json", "");
      wasmFile = `${packageName}.wasm`;
    }

    // Load WASM
    const wasmPath = path.join(packagePath, wasmFile);
    const wasmBuffer = fs.readFileSync(wasmPath);

    // Import Language class dynamically
    const { Language: TSLanguage, Query: TSQuery } = await import("web-tree-sitter");
    const language = await TSLanguage.load(wasmBuffer);

    // Create parser
    const parser = new TSParser();
    parser.setLanguage(language);

    // Load tags.scm query (for automatic definition extraction)
    let query: Query | null = null;
    try {
      const tagsPath = path.join(packagePath, "queries", "tags.scm");
      if (fs.existsSync(tagsPath)) {
        const tagsQuery = fs.readFileSync(tagsPath, "utf-8");
        // Filter out unsupported predicates for web-tree-sitter
        const cleanedQuery = tagsQuery
          .replace(/#strip!.*$/gm, "")
          .replace(/#select-adjacent!.*$/gm, "");
        query = new TSQuery(language, cleanedQuery);
      }
    } catch (qErr) {
      console.log(`No tags.scm query for ${packageName}:`, qErr);
    }

    parserCache.set(packageName, { parser, language, query });
    return { parser, query };
  } catch (err) {
    console.error(`Failed to load ${packageName}:`, err);
    return null;
  }
}

// ============================================================================
// Code Chunk Extraction using Tree-sitter Queries
// ============================================================================

interface CodeChunk {
  chunkType: "function" | "class" | "method" | "interface" | "type" | "variable" | "import" | "file_summary";
  name: string;
  code: string;
  startLine: number;
  endLine: number;
  docs?: string;
}

function extractChunksWithQuery(
  sourceCode: string,
  parser: Parser,
  query: Query | null
): CodeChunk[] {
  const tree = parser.parse(sourceCode);
  if (!tree) return [];

  const chunks: CodeChunk[] = [];

  if (query && tree) {
    // Use tree-sitter query to find all definitions automatically
    const matches = query.matches(tree.rootNode);

    for (const match of matches) {
      // Find the definition and name captures
      let definitionNode: Node | undefined;
      let nameNode: Node | undefined;
      let docNode: Node | undefined;
      let chunkType: CodeChunk["chunkType"] = "function";

      for (const capture of match.captures) {
        if (capture.name.startsWith("definition.")) {
          definitionNode = capture.node;
          // Extract type from capture name: definition.function → function
          const type = capture.name.replace("definition.", "") as CodeChunk["chunkType"];
          if (["function", "class", "method", "interface", "type", "variable"].includes(type)) {
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
function extractChunksFallback(node: Node, chunks: CodeChunk[], depth = 0): void {
  if (depth > 3) return;

  const t = node.type.toLowerCase();

  // Detect definitions by naming convention (tree-sitter grammars are consistent)
  let chunkType: CodeChunk["chunkType"] | null = null;
  if (t.includes("function") || t.includes("method") || t === "arrow_function") {
    chunkType = t.includes("method") ? "method" : "function";
  } else if (t.includes("class") && !t.includes("interface")) {
    chunkType = "class";
  } else if (t.includes("interface") || t.includes("trait") || t.includes("protocol")) {
    chunkType = "interface";
  } else if (t.includes("type_alias") || t.includes("struct") || t.includes("enum")) {
    chunkType = "type";
  }

  if (chunkType && node.text.length > 20) {
    // Extract name from first identifier child
    let name = "anonymous";
    for (const child of node.children) {
      if (["identifier", "type_identifier", "property_identifier"].includes(child.type)) {
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

async function extractChunks(sourceCode: string, filePath: string): Promise<CodeChunk[]> {
  const packageName = getLanguagePackage(filePath);
  if (!packageName) return [];

  const result = await getParserWithQuery(packageName);
  if (!result) return [];

  return extractChunksWithQuery(sourceCode, result.parser, result.query);
}

// ============================================================================
// OpenRouter API Functions
// ============================================================================

async function generateDocstring(code: string, language: string): Promise<string> {
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
        messages: [{
          role: "user",
          content: `Write a brief 1-2 sentence description of what this ${language} code does. Be concise.\n\n\`\`\`${language}\n${code.slice(0, 2000)}\n\`\`\``,
        }],
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
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY not configured");

  const res = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/text-embedding-3-small",
      input: text.slice(0, 8000),
    }),
  });

  if (!res.ok) throw new Error(`Embedding error: ${await res.text()}`);
  const data = await res.json();
  return data.data[0].embedding;
}

// ============================================================================
// Convex Actions
// ============================================================================

export const startIndexing = internalAction({
  args: {
    repoId: v.id("repos"),
    branch: v.string(),
    triggerType: v.union(v.literal("manual"), v.literal("push"), v.literal("initial")),
    commitSha: v.optional(v.string()),
  },
  handler: async (ctx, { repoId, branch, triggerType, commitSha }) => {
    const jobId = await ctx.runMutation(internal.indexingMutations.createIndexingJob, {
      repoId, branch, triggerType, commitSha,
    });

    try {
      const repo = await ctx.runQuery(internal.indexingMutations.getRepoInternal, { repoId });
      if (!repo) throw new Error("Repo not found");

      const installationId = await ctx.runQuery(internal.repos.getRepoInstallationId, { repoId });
      if (!installationId) throw new Error("Installation not found");

      await ctx.runMutation(internal.indexingMutations.updateIndexingJob, {
        jobId, status: "cloning",
      });

      // Get repo tree
      const tree = await ctx.runAction(internal.github.getRepoContent, {
        installationId, owner: repo.owner, repo: repo.name, branch,
      });

      // Filter to supported files
      const files = tree.tree.filter((item: { path: string; type: string }) =>
        item.type === "blob" &&
        !shouldSkip(item.path) &&
        getLanguagePackage(item.path) !== null
      );

      await ctx.runMutation(internal.indexingMutations.updateIndexingJob, {
        jobId, status: "parsing", totalFiles: files.length, processedFiles: 0,
      });

      await ctx.runMutation(internal.indexingMutations.clearBranchChunks, { repoId, branch });

      let totalChunks = 0;
      let processedFiles = 0;

      for (const file of files) {
        try {
          const { content } = await ctx.runAction(internal.github.getFileContent, {
            installationId, owner: repo.owner, repo: repo.name, path: file.path, ref: branch,
          });

          const chunks = await extractChunks(content, file.path);
          const lang = path.extname(file.path).slice(1) || "code";

          if (chunks.length > 0) {
            await ctx.runMutation(internal.indexingMutations.updateIndexingJob, {
              jobId, status: "embedding",
            });
          }

          for (const chunk of chunks) {
            const docstring = chunk.docs || await generateDocstring(chunk.code, lang);
            const embedding = await generateEmbedding(
              `${chunk.name}: ${docstring}\n\n${chunk.code.slice(0, 1000)}`
            );

            await ctx.runMutation(internal.indexingMutations.storeCodeChunk, {
              repoId, branch, filePath: file.path,
              chunkType: chunk.chunkType, name: chunk.name,
              code: chunk.code, docstring,
              startLine: chunk.startLine, endLine: chunk.endLine,
              embedding, language: lang,
            });

            totalChunks++;
          }

          processedFiles++;
          await ctx.runMutation(internal.indexingMutations.updateIndexingJob, {
            jobId, processedFiles, totalChunks, storedChunks: totalChunks,
          });
        } catch (fileErr) {
          console.error(`Error processing ${file.path}:`, fileErr);
        }
      }

      await ctx.runMutation(internal.repos.markBranchIndexed, { repoId, branch });
      await ctx.runMutation(internal.indexingMutations.updateIndexingJob, {
        jobId, status: "completed", completedAt: Date.now(),
      });
    } catch (err) {
      await ctx.runMutation(internal.indexingMutations.updateIndexingJob, {
        jobId, status: "failed",
        error: err instanceof Error ? err.message : "Unknown error",
        completedAt: Date.now(),
      });
      throw err;
    }
  },
});

// Code chunk with score type
type CodeChunkWithScore = {
  _id: Id<"codeChunks">;
  _creationTime: number;
  repoId: Id<"repos">;
  branch: string;
  repoBranchKey: string;
  filePath: string;
  chunkType: "function" | "class" | "method" | "interface" | "type" | "variable" | "import" | "file_summary";
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
  handler: async (ctx, { repoId, branch, query, limit = 10 }): Promise<CodeChunkWithScore[]> => {
    const queryEmbedding = await generateEmbedding(query);
    const repoBranchKey = `${repoId}:${branch}`;

    const results = await ctx.vectorSearch("codeChunks", "by_embedding", {
      vector: queryEmbedding,
      limit,
      filter: (q) => q.eq("repoBranchKey", repoBranchKey),
    });

    const chunks: CodeChunkWithScore[] = [];
    for (const result of results) {
      const chunk = await ctx.runQuery(internal.indexingMutations.getChunkById, {
        chunkId: result._id as Id<"codeChunks">,
      });
      if (chunk) {
        chunks.push({ ...chunk, score: result._score });
      }
    }

    return chunks;
  },
});
