# voice-server

Claude Code project guidance for the voice-server TTS service.

## Project Overview

This is a Bun/TypeScript service that provides Text-to-Speech (TTS) capabilities using the Qwen TTS model.

## Development Guidelines

### Code Style
- Use TypeScript strict mode
- Follow functional programming patterns where applicable
- Use async/await for asynchronous operations
- Prefer Bun APIs over Node.js APIs when available

### Testing
- Write unit tests for all core functionality
- Use Bun's built-in test runner
- Mock external API calls (HuggingFace)

### API Integration
- The Qwen TTS model is accessed via HuggingFace Inference API
- Store API keys in environment variables
- Implement proper error handling and retry logic

## Project Commands

```bash
bun run dev       # Start development server
bun run build     # Build for production
bun run test      # Run tests
bun run lint      # Lint code
bun run typecheck # Type check only
```

## Configuration Files

- `tsconfig.json` - TypeScript configuration with strict mode
- `.codanna/settings.toml` - Codanna code intelligence settings
- `mkdocs.yml` - Documentation configuration

## Notes

- Codanna indexing is enabled for `src/ts` and `tests/ts` directories
- Semantic search is available for code queries
- Documentation is built with MkDocs Material theme

## Code navigation: Codanna

This repo is indexed by Codanna (local symbol graph + semantic search).

If the location of a symbol or the shape of a module is not already known, find it with
Codanna before reading files or grepping. A file already named in the issue or the error
is not a search: read it. A hook nudges once per session when a search starts with `rg`
before Codanna has been used, so the rule is not something to remember.

### Which interface
- **Main session:** use the `mcp__codanna__*` tools. The server runs `serve --watch` from the main checkout and stays current as files change.
- **Subagents:** use the `codanna` CLI through Bash (the `x-ray` skill wraps it). The CLI reads the index in its current directory, so it stays correct inside worktrees.
- **Whole-codebase shape** (module map, hubs, which modules talk to each other, history): use the `graph` skill.

### Workflow
1. **Rephrase first.** Search for what is meant, not the literal words (e.g. "the login stuff" → "authentication session token validation").
2. **Locate:** semantic search with context, limit 5. Focus on results with score > 0.6. Use `find_symbol` for exact names and `search_symbols` for partial ones.
3. **Read narrowly:** read only the returned line range (`sed -n 'A,Bp' file` or Read with offset/limit).
4. **Expand:** follow 1–2 important relationships per result (`retrieve describe`, callers, calls). Run `analyze_impact` **before** changing any public symbol, signature, or shared function.
5. **Docs:** `search_documents` for project docs and markdown.
6. **Refine or fall back:** if the scores are weak, rephrase once. Use `rg` for exact strings, config keys, HTML/CSS/templates, and any language Codanna doesn't parse.

CLI equivalents:
- `codanna mcp semantic_search_with_context query:"..." limit:5 --json`
- `codanna mcp find_symbol <Name> --json`
- `codanna mcp find_callers <Name> --json`
- `codanna mcp analyze_impact <Name> --json`
- `codanna retrieve describe <Name|symbol_id:N>`
- `codanna retrieve calls <Name>`

Add `lang:<language>` to a search to narrow it by language.

### Rules
- Codanna results are navigation hints, not ground truth. Confirm against the file before editing.
- Before renaming or changing a signature, list every caller in your plan.
- If a Codanna command exits with code 7 (stale index), run `codanna index .` in the current checkout and retry.
- Prefer `symbol_id:N` over names when available; it avoids ambiguity.

### Orca worktrees
- In Orca, each agent is a full Claude Code session whose working directory is its own worktree. Orca's `scripts.setup` builds that worktree's Codanna index, and the `.mcp.json` server indexes the worktree, so `mcp__codanna__*` tools are correct there.
- If a Codanna tool reports a missing or stale index (exit code 7) right after the worktree opens, setup may still be running: wait, or run `codanna index .` once.
- Never share `.codanna/` between worktrees (symlink or `sharedDirectories`).

### Subagents and worktrees
- A subagent in `.claude/worktrees/*` must **not** use `mcp__codanna__*`. Those tools read the main checkout's index, which doesn't match the worktree's files.
- Worktree subagents build their own index first (`codanna index .` from the worktree root), then use the CLI.
- Never point the CLI at the main checkout from inside a worktree (`--config ../..`, `cd` to the repo root). Worktree isolation blocks it anyway.
- Delegate read-only investigation to `codanna-explorer` and isolated edits to `codanna-implementer`.

## Recent Changes
- 001-fifo-notify-queue: Added TypeScript 5.x (Bun runtime) + Bun native APIs, MLX-audio CLI (existing)
- 001-qwen-tts: Added [if applicable, e.g., PostgreSQL, CoreData, files or N/A]

## Active Technologies
- TypeScript 5.x (Bun runtime) + Bun native APIs, MLX-audio CLI (existing) (001-fifo-notify-queue)
- In-memory array (no persistence per spec) (001-fifo-notify-queue)
