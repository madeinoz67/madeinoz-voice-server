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

- Codanna indexing is enabled for `src/` directory
- Semantic search is available for code queries
- Documentation is built with MkDocs Material theme

## Recent Changes
- 001-fifo-notify-queue: Added TypeScript 5.x (Bun runtime) + Bun native APIs, MLX-audio CLI (existing)
- 001-qwen-tts: Added [if applicable, e.g., PostgreSQL, CoreData, files or N/A]

## Active Technologies
- TypeScript 5.x (Bun runtime) + Bun native APIs, MLX-audio CLI (existing) (001-fifo-notify-queue)
- In-memory array (no persistence per spec) (001-fifo-notify-queue)
