# CLAUDE.md

## Project Overview

**RepoChat** - AI-powered GitHub code review and editing app with Generative UI. Two modes: PR Review and Code View with WebContainers for instant file operations.

## Tech Stack

- Next.js 15 + Convex + Clerk + Tambo AI
- WebContainers for in-browser file system

## Commands

```bash
npm run dev          # Starts Next.js + Convex
npx convex dev       # Regenerate types
```

## Structure

```
src/
├── app/page.tsx           # Main split view (PR Review / Code View modes)
├── components/
│   ├── review/            # PRSummary, DiffViewer, CodeViewer, etc.
│   ├── tambo/             # Chat UI components
│   ├── content-panel.tsx  # Left panel (PR selector or file tree)
│   └── chat-panel.tsx     # Right panel (Tambo chat)
├── contexts/
│   └── webcontainer-context.tsx  # WebContainer sync provider
├── hooks/
│   └── use-webcontainer-sync.ts  # Convex → WebContainer sync
└── lib/
    ├── types.ts           # Shared types from Convex schema
    ├── tambo.ts           # Component + tool registration
    └── webcontainer/      # WebContainer instance & tools

convex/
├── schema.ts          # users, repos, reviews, files, importStatus
├── github.ts          # GitHub API actions (list PRs, get files)
├── files.ts           # File queries/mutations
├── fileActions.ts     # Import repo from GitHub, commit changes (Node.js actions)
└── users.ts           # User management
```

## Modes

- **PR Review**: Select repo → select PR → view diffs → chat about changes
- **Code View**: Select repo → auto-import to Convex → sync to WebContainer → browse/edit files

## WebContainer Flow

```
GitHub → importRepository → Convex files table → WebContainer (instant)
                                                       ↓
                                                  Edit files
                                                       ↓
                                              Convex (dirty flag)
                                                       ↓
                                         commitChangesToGitHub → GitHub
```

## Shared Types

Use types from `src/lib/types.ts`:
- `Repository`, `PullRequest`, `FileChange`, `FileTreeNode`
- Doc types: `User`, `Repo`, `File`, `ImportStatus`

## Tambo Features

- 9 generative components (PRSummary, SecurityAlert, DiffViewer, etc.)
- Interactable ReviewChecklist (AI can update)
- 6 GitHub tools + 6 WebContainer tools
- Voice input, suggestions, message images

<!-- tambo-docs-v1.0 -->
