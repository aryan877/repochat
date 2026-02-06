# AGENT.md

## What is this?
RepoChat - AI code review app with GitHub integration, WebContainers for live preview, and Tambo for generative UI.

## Stack
Next.js 15, Convex, Clerk, Tambo AI, WebContainers, Octokit

## Commands
```bash
npm run dev      # Next.js + Convex
npx tsc --noEmit # Type check
```

## Key Patterns

**Types:** All in `src/types/`. Use Octokit types for GitHub, Convex Doc types for DB. Don't create UI-specific types - just Pick<> what you need inline.

**Convex:** Returns full Octokit responses, no transformation. Types stay in sync automatically.

**Data Flow:**
```
GitHub API → Convex (full response) → Frontend → Components
```

**WebContainer Flow:**
```
GitHub → Convex files table → WebContainer mount → Live preview
```

## Don't
- Create wrapper types when Octokit/Convex types exist
- Transform API responses in Convex (return full data)
- Add backwards compatibility for unlaunched features
