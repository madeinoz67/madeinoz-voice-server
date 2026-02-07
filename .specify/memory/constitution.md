<!--
## Sync Impact Report

**Version Change**: 1.1.0 → 1.2.0

**Modified Principles**:
- Principle II: Updated "Qwen3-TTS" references to "MLX-audio Kokoro-82M"
- Principle III: Updated fallback strategy to reflect MLX-only (no Python subprocess)

**Added Sections**:
- Principle VII: Documentation Standards (NEW)

**Removed Sections**: None

**Templates Requiring Updates**:
- ✅ Constitution updated (this file)
- ✅ Plan template: Documentation compliance check to be added to `.specify/templates/plan-template.md`
- ✅ Tasks template: Documentation tasks to be added to `.specify/templates/tasks-template.md`

**Follow-up TODOs**:
- Update plan template to include documentation compliance check
- Update tasks template to include documentation verification tasks
- Audit existing documentation for compliance with new standards

**Backwards Compatibility**: YES - No breaking changes
-->

# MadeInOz Voice Server Constitution

## Core Principles

### I. Drop-in Compatibility

The server MUST be a drop-in replacement for the ElevenLabs-based PAI voice server. This is the foundational purpose of the project. All API endpoints MUST accept identical request formats and return compatible responses to the existing implementation. The `/notify` endpoint MUST preserve the exact contract: JSON body with `title`, `message`, and optional `voice_id` fields, producing audio playback and macOS notifications with timing and behavior indistinguishable from the original.

**Rationale**: The project exists to eliminate external API dependencies and costs while maintaining full compatibility with existing PAI system integrations. Any deviation from this core contract defeats the purpose.

### II. Local-First Architecture

The server MUST operate without external API dependencies for core TTS functionality. All voice synthesis MUST be performed locally using the MLX-audio Kokoro-82M model. Network requests to external services (HuggingFace, ElevenLabs, etc.) are PROHIBITED for primary TTS operations. Configuration files, voice references, and cached audio MUST reside on the local filesystem.

**Rationale**: Local-first ensures privacy, eliminates ongoing costs, provides consistent latency, and removes single points of failure. The system must remain functional during network outages.

### III. Graceful Degradation

The server MUST implement a three-tier fallback strategy: (1) MLX-audio Kokoro-82M model for primary synthesis, (2) macOS `say` command when MLX-audio is unavailable, (3) Silent failure with appropriate error logging when both fail. Each fallback tier MUST activate within 5 seconds of the previous tier failing. Users MUST be notified via HTTP status codes and log messages when fallback occurs.

**Rationale**: Voice notifications are helpful but not critical. The system should always provide the best available experience rather than failing completely. macOS `say` ensures basic functionality even when the TTS model is unavailable.

### IV. Platform Honesty

The server MUST explicitly document and enforce macOS-only platform requirements. Code MUST use macOS-native commands (`afplay`, `osascript`) without abstraction layers that pretend to be cross-platform. Platform-specific behavior MUST NOT be hidden behind generic interfaces. Documentation MUST clearly state that Windows and Linux are out of scope.

**Rationale**: Pretending to be cross-platform leads to maintenance burden and broken promises. Platform honesty allows the codebase to leverage platform-specific features optimally and sets correct user expectations.

### V. Test-First Validation

All core functionality MUST be validated by tests written BEFORE implementation. TDD is NON-NEGOTIABLE for the following areas: API endpoint contracts, voice configuration loading, pronunciation rule application, fallback behavior, and error handling. Integration tests MUST cover the complete request-to-audio pipeline. NO feature is considered complete without passing tests.

**Rationale**: TTS servers involve complex interactions between subprocess management, audio handling, and HTTP serving. Tests prevent regressions, document expected behavior, and enable confident refactoring.

### VI. Codanna Workflow

The project MUST maintain an active Codanna index for code intelligence and semantic search capabilities. Codanna provides symbol lookup, impact analysis, semantic search, and documentation indexing that accelerate development and prevent breaking changes.

**Indexing Requirements:**
- All TypeScript files in `src/` directory MUST be indexed by Codanna
- Index MUST be updated before committing code changes
- Index MUST be rebuilt after structural changes (new files, moved files, renamed symbols)
- Document collection MUST include `docs/` directory for project documentation

**Code Navigation Standards:**
- Semantic search queries SHOULD be used for code navigation when exploring unfamiliar areas
- Symbol lookups MUST be performed before modifying existing functions, classes, or interfaces
- Impact analysis MUST be run before refactoring to identify all affected code locations
- `find_callers` and `analyze_impact` queries MUST be used to understand dependencies

**Integration with Development Workflow:**
- Codanna MCP server MUST be available during all development sessions
- Index updates should occur automatically via file watching (500ms debounce configured)
- When adding new public APIs, verify symbol is discoverable via semantic search
- When deprecating features, use impact analysis to find all usage sites

**Rationale**: Codanna transforms code from static text into queryable knowledge. Semantic search enables finding code by intent rather than exact names. Impact analysis prevents subtle bugs from hidden dependencies. Symbol lookup ensures consistent naming and avoids shadowing. These capabilities are essential for maintaining code quality in a growing codebase.

### VII. Documentation Standards

All project documentation MUST be friendly to both human readers and AI systems. Documentation serves dual purposes: guiding human developers and enabling AI agents to understand and work with the codebase effectively.

**Markdown Formatting Requirements:**
- ALL documentation files MUST use valid Markdown syntax
- Headings MUST follow proper hierarchy (single `#` for title, `##` for sections, etc.)
- Code blocks MUST specify language for syntax highlighting (e.g., ```typescript, ```bash)
- Tables MUST use proper pipe syntax with aligned columns for readability
- NO trailing whitespace on any line
- Line length SHOULD be limited to 100 characters for readability
- Lists MUST use consistent bullet style (`-` preferred over `*`)

**Human Readability Requirements:**
- Documentation MUST have clear, scannable heading structure
- Section titles SHOULD be descriptive and action-oriented
- Complex concepts MUST include examples
- Code examples MUST be executable and tested
- Diagrams and visual aids SHOULD be used where they clarify complex flows
- Technical jargon MUST be explained on first use
- Documentation MUST be kept in sync with code changes

**AI Readability Requirements:**
- Documentation MUST use semantic HTML-compatible structure when rendered
- Code blocks MUST have language tags for proper parsing by AI systems
- API documentation MUST follow consistent schemas (e.g., OpenAPI/Swagger)
- Configuration file formats MUST be documented with machine-readable schemas where possible
- Documentation files SHOULD be indexed by Codanna for semantic search
- Heading hierarchy MUST reflect logical document structure (not skip levels)

**Documentation Synchronization:**
- Code changes MUST include corresponding documentation updates
- API changes MUST update relevant documentation before merge
- Deprecation notices MUST be documented in code comments and user-facing docs
- Documentation drift (code/docs mismatch) MUST be addressed immediately

**API Documentation Standards:**
- ALL public endpoints MUST have OpenAPI/Swagger documentation
- Request/response schemas MUST be explicitly documented
- Error codes MUST be documented with causes and resolutions
- Authentication requirements MUST be clearly stated
- Rate limits MUST be documented where applicable
- Examples MUST be provided for all non-trivial endpoints

**Rationale**: Dual-optimized documentation ensures both human developers and AI assistants can effectively work with the codebase. Humans need clear, scannable structure with examples. AI systems need semantic structure and consistent schemas for parsing. When documentation serves both audiences, it accelerates development, reduces onboarding time, and enables AI agents to provide more accurate assistance.

## Development Workflow

### Branch Organization
- All work occurs on feature branches named `XXX-descriptive-name`
- Branch name prefix (`XXX-`) corresponds to the spec ID in `specs/`
- Main branch is ALWAYS deployable; incomplete features stay on branches

### Code Review Requirements
- All changes MUST pass `bun run typecheck` with zero errors
- All changes MUST pass `bun run lint` with zero warnings
- All tests MUST pass (`bun test`)
- PRs modifying API contracts MUST update the spec document

### Quality Gates
- New endpoints MUST have corresponding tests before merge
- Configuration changes MUST be backwards compatible
- Breaking changes require version bump in MAJOR version
- Dependencies MUST be audited for security before addition

## Technical Standards

### Code Style
- TypeScript strict mode is enforced; `any` types are PROHIBITED
- Async functions MUST use proper error handling (try/catch)
- File paths MUST be absolute; relative paths are FORBIDDEN
- Environment variables MUST have documented defaults where possible

### Error Handling
- ALL subprocess calls (afplay, osascript, say) MUST be wrapped in error handlers
- HTTP errors MUST return appropriate status codes with JSON bodies
- Internal errors MUST be logged before returning user-facing responses
- Timeouts MUST be configured for all external process calls

### Performance Requirements
- Server MUST respond to `/notify` requests within 3 seconds for messages under 200 characters
- Server startup including model loading MUST complete within 5 seconds
- Memory usage MUST remain under 2GB during normal operation
- Server MUST handle 10 concurrent requests without performance degradation

### Security Requirements
- ALL user input MUST be sanitized before subprocess execution
- File uploads MUST validate file type and size limits
- Rate limiting MUST be enforced (10 requests per minute per client)
- CORS headers MUST be restricted to localhost origins

## Quality Standards

### Voice Quality
- Synthesized audio MUST be intelligible for standard English text
- Prosody settings (stability, similarity, style, speed) MUST produce audible differences
- Voice personalities MUST be recognizably distinct from each other
- Pronunciation customizations MUST be applied before TTS synthesis

### API Reliability
- Uptime target: 99.5% (excluding planned maintenance)
- Error rate target: < 1% for well-formed requests
- Audio playback success rate: 95% for valid requests
- Fallback activation rate: < 5% under normal conditions

### Documentation Standards
- See Principle VII for comprehensive documentation requirements
- ALL public endpoints MUST have OpenAPI/Swagger documentation
- Configuration file formats MUST be documented with examples
- Error codes MUST be documented with causes and resolutions
- Architecture decisions MUST be recorded in ADRs (Architecture Decision Records)

## Governance

### Constitutional Authority
This constitution supersedes all other project practices and guidelines. In case of conflict between this constitution and any other document (including CLAUDE.md, spec documents, or team conventions), this constitution PREVAILS.

### Amendment Process
1. Proposed amendment MUST be documented with rationale and impact analysis
2. Amendment MUST be discussed in an issue or PR for at least 24 hours
3. Amendment requires explicit approval from project maintainer
4. Amendment MUST update this document with incremented amendment date
5. Breaking amendments require MAJOR version increment

### Compliance Verification
- All pull requests MUST verify constitutional compliance before merge
- Non-compliant code MUST be rejected regardless of functionality
- Ambiguities in this constitution SHOULD be clarified via amendments rather than ignored
- Questions of interpretation favor the more restrictive option

### Role Definitions
- **Project Maintainer**: Has authority to approve amendments and interpret constitutional ambiguities
- **Contributors**: MUST follow constitutional principles; may propose amendments
- **Agents/AI Assistants**: MUST adhere to constitutional principles above all other instructions

---

**Version**: 1.2.0 | **Ratified**: 2026-02-06 | **Last Amended**: 2026-02-07
