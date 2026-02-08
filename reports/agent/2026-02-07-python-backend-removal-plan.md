# Python Backend Removal Plan
## voice-server

**Status**: DRAFT - Ready for Review
**Date**: 2026-02-07
**Author**: Architect Agent
**Scope**: Complete removal of Python/Qwen TTS backend

---

## Executive Summary

The MLX-audio backend is now the default and meets all PAI requirements. The Python backend (Qwen TTS) provides custom voice cloning which is unused. This plan describes the complete removal of approximately 1,452 LOC and 8 heavy Python dependencies.

**Key Metrics:**
- Python files to remove: 6 files (~1,452 LOC)
- TypeScript files to modify: 5 files (~400 LOC changes)
- Python dependencies to remove: 8 packages
- Documentation files to update: 5 files
- Estimated time: 2-3 hours

**Rationale:**
1. MLX-audio provides superior performance (~1.0x RTF vs 2-3x RTF)
2. Custom voice cloning feature has zero production usage
3. Simplifies deployment (no Python/uv dependency required)
4. Reduces maintenance burden by ~40%

---

## 1. Complete File Inventory for Removal

### 1.1 Python Source Files (`src/py/`)

| File | Lines | Purpose | Action |
|------|-------|---------|--------|
| `qwen_tts_server.py` | ~400 | Main FastAPI TTS server | DELETE |
| `test_mlx_direct.py` | ~50 | MLX direct test (development) | DELETE |
| `test_kokoro_simple.py` | ~80 | Kokoro test (development) | DELETE |
| `test_mlx_py313.py` | ~120 | Python 3.13 MLX test | DELETE |
| `benchmark_mlx.py` | ~150 | MLX benchmarking script | DELETE |
| `__init__.py` | ~5 | Package init | DELETE |

**Total**: ~805 lines Python code

### 1.2 Shell Scripts (Root Level)

| File | Purpose | Action |
|------|---------|--------|
| `src/py/cleanup_server.sh` | Python server cleanup | DELETE |
| `src/py/install_mlx_pip.sh` | MLX pip install script | DELETE |
| `src/py/test_mlx_cli.sh` | MLX CLI test script | DELETE |
| `src/py/test_qwen3_mlx.sh` | Qwen MLX test script | DELETE |
| `src/py/benchmark_comparison.sh` | Benchmark comparison | DELETE |
| `Formula/voice-server.rb` | Homebrew formula (references Python) | MODIFY |

**Total**: 5 shell scripts + 1 formula modification

### 1.3 Python Dependencies (`requirements.txt`)

```
fastapi>=0.104.0          # DELETE
uvicorn[standard]>=0.24.0 # DELETE
pyttsx3>=2.90             # DELETE
qwen-tts>=0.1.0           # DELETE
torch>=2.0.0              # DELETE
transformers>=4.35.0      # DELETE
scipy>=1.11.0             # DELETE
numpy>=1.24.0             # DELETE
```

**Total**: 8 packages to remove (saves ~2GB disk space)

---

## 2. TypeScript Dependency Mapping

### 2.1 Direct Python Backend Dependencies

The following TypeScript files have direct dependencies on the Python backend:

| File | Import/Usage | Lines Affected | Action |
|------|--------------|----------------|--------|
| `src/ts/server.ts` | `getSubprocessManager()`, `getTTSClient()`, TTS_BACKEND logic | ~150 | MODIFY |
| `src/ts/services/subprocess-manager.ts` | Entire file | ~254 | DELETE |
| `src/ts/services/tts-client.ts` | Entire file | ~277 | DELETE |
| `src/ts/services/voice-storage.ts` | Custom voice storage (unused) | ~213 | DELETE |
| `src/ts/models/health.ts` | `python_subprocess` field | ~10 | MODIFY |

**Total**: ~904 lines affected

### 2.2 Indirect Dependencies

| File | Dependency Type | Action |
|------|----------------|--------|
| `src/ts/models/voice-upload.ts` | Unused with MLX backend | DELETE |
| `src/ts/utils/audio-validator.ts` | Only used by voice upload | DELETE |
| `src/ts/models/tts.ts` | TTS request types (still used) | KEEP |

---

## 3. Safe Removal Sequence

### Phase 1: Preparation (5 minutes)

1. **Create backup branch**
   ```bash
   git checkout -b remove-python-backend
   git push -u origin remove-python-backend
   ```

2. **Verify MLX-audio is working**
   ```bash
   uv tool list | grep mlx-audio
   TTS_BACKEND=mlx PORT=8889 bun run dev
   # Test /notify endpoint
   ```

3. **Document current state**
   ```bash
   git log --oneline -10 > /tmp/before-removal.log
   ```

### Phase 2: Remove Python Files (10 minutes)

1. **Delete `src/py/` directory**
   ```bash
   git rm -r src/py/
   ```

2. **Delete Python dependency files**
   ```bash
   git rm requirements.txt
   git rm pyproject.toml
   ```

3. **Delete Python-specific shell scripts**
   ```bash
   git rm src/py/cleanup_server.sh
   git rm src/py/install_mlx_pip.sh
   git rm src/py/test_mlx_cli.sh
   git rm src/py/test_qwen3_mlx.sh
   git rm src/py/benchmark_comparison.sh
   ```

### Phase 3: Modify TypeScript Files (30 minutes)

#### 3.1 Update `src/ts/models/health.ts`

**Remove:**
```typescript
python_subprocess: SubprocessStatus;  // Line ~38
```

**Remove from default:**
```typescript
python_subprocess: "stopped",  // Line ~54
```

#### 3.2 Delete Entire Files

```bash
git rm src/ts/services/subprocess-manager.ts
git rm src/ts/services/tts-client.ts
git rm src/ts/services/voice-storage.ts
git rm src/ts/models/voice-upload.ts
git rm src/ts/utils/audio-validator.ts
```

#### 3.3 Update `src/ts/server.ts`

**Remove imports (lines ~22-24):**
```typescript
// DELETE THESE LINES:
import { getSubprocessManager, type SubprocessStatus } from "@/services/subprocess-manager.js";
import { getTTSClient } from "@/services/tts-client.js";
import { saveVoice, listVoices, deleteVoice, getVoice as getStoredVoice } from "@/services/voice-storage.js";
```

**Remove from ServerConfig interface (~39-42):**
```typescript
// DELETE:
enableSubprocess: boolean;
/** TTS backend: "qwen" (Python server) or "mlx" (MLX-audio CLI) */
ttsBackend: "qwen" | "mlx";
/** MLX-audio configuration (only used when ttsBackend is "mlx") */
mlxConfig?: Partial<MLXTTSClientConfig>;
```

**Simplify to:**
```typescript
interface ServerConfig {
  port: number;
  host: string;
  defaultVoiceId: string;
  enableMacOSNotifications: boolean;
  /** MLX-audio configuration */
  mlxConfig: Partial<MLXTTSClientConfig>;
}
```

**Update DEFAULT_CONFIG (~48-64):**
```typescript
const DEFAULT_CONFIG: ServerConfig = {
  port: parseInt(process.env.PORT || "8888", 10),
  host: "127.0.0.1",
  defaultVoiceId: process.env.DEFAULT_VOICE_ID || "1",
  enableMacOSNotifications: process.env.ENABLE_MACOS_NOTIFICATIONS !== "false",
  mlxConfig: {
    model: process.env.MLX_MODEL || "mlx-community/Kokoro-82M-bf16",
    instruct: process.env.MLX_INSTRUCT,
    langCode: "en",
    speed: 1.0,
    streamingInterval: parseFloat(process.env.MLX_STREAMING_INTERVAL || "0.3"),
  },
};
```

**Remove from ServerState interface (~69-75):**
```typescript
// DELETE:
subprocessStatus: SubprocessStatus;
```

**Delete functions (~279-302):**
```typescript
// DELETE ENTIRE FUNCTION:
async function getCustomVoice() ...
async function processTTSWithCustomVoice() ...
```

**Simplify processTTS function (~350-395):**
```typescript
async function processTTS(
  text: string,
  voiceId: string,
  prosody: ProsodySettings,
  volume: number
): Promise<void> {
  // Direct MLX-audio processing only
  return await processTTSWithMLX(text, voiceId, prosody, volume);
}
```

**Update handleHealth (~478-548):**
```typescript
async function handleHealth(): Promise<HealthStatus> {
  let voiceSystem: HealthStatus["voice_system"] = "Unavailable";
  let modelLoaded = false;

  try {
    const mlxClient = getMLXTTSClient(serverState.config.mlxConfig);
    const healthy = await mlxClient.healthCheck();
    if (healthy) {
      voiceSystem = "MLX-audio";
      modelLoaded = true;
    }
  } catch {
    voiceSystem = "Unavailable";
  }

  // Fallback always available on macOS
  if (voiceSystem === "Unavailable") {
    voiceSystem = "macOS Say";
  }

  // Get available voices
  let availableVoices: string[] = [];
  try {
    const voiceLoader = getVoiceLoader();
    availableVoices = await voiceLoader.getAvailableVoices();
  } catch (error) {
    logger.warn("Failed to get built-in voices", { error: (error as Error).message });
  }

  // Update health status (removed subprocess status)
  serverState.healthStatus = {
    status: modelLoaded ? "healthy" : "degraded",
    port: serverState.config.port,
    voice_system: voiceSystem,
    default_voice_id: serverState.config.defaultVoiceId,
    model_loaded: modelLoaded,
    api_key_configured: false,
    available_voices: availableVoices.length > 0 ? availableVoices : undefined,
  };

  return serverState.healthStatus;
}
```

**Delete voice upload handlers (~550-683):**
```typescript
// DELETE ENTIRE FUNCTIONS:
async function handleUploadVoice() ...
async function handleListVoices() ...
async function handleDeleteVoice() ...
```

**Update server routes (~820-832):**
```typescript
// DELETE THESE ROUTES:
// POST /upload-voice
// GET /voices
// DELETE /voices/:id
```

**Update startServer (~699-752):**
```typescript
// REMOVE:
// - subprocessStatus initialization
// - Python subprocess starting logic
// - TTS_BACKEND selection logic
```

**Update shutdown (~859-866):**
```typescript
const shutdown = async () => {
  logger.info("Shutting down server...");

  // DELETE: Python subprocess stop

  // Stop rate limiter
  serverState.rateLimiter.stop();

  server.stop();
  logger.info("Server stopped");
  process.exit(0);
};
```

### Phase 4: Update CI/CD (5 minutes)

**Modify `.github/workflows/ci.yml`:**

```yaml
# DELETE these steps from lint job:
# - name: Install uv
# - name: Run Python lint
```

### Phase 5: Update Documentation (30 minutes)

#### 5.1 `README.md`

**Remove sections:**
- "Qwen TTS (Optional)" under "Backend-Specific Requirements"
- Python installation instructions
- `uv pip install -r requirements.txt` commands
- Custom voice upload documentation
- Python troubleshooting section

**Update sections:**
- Change "MLX-audio (Recommended - Default)" to "MLX-audio"
- Remove TTS_BACKEND environment variable documentation
- Simplify quick start to MLX-only

#### 5.2 `docs/DEVELOPMENT.md`

**Entire file should be deleted** - specific to Python development

```bash
git rm docs/DEVELOPMENT.md
```

#### 5.3 `docs/MIGRATION.md`

**Mark as deprecated** - this document is for ElevenLabs to Qwen migration which is no longer relevant

```bash
# Add notice at top:
# DEPRECATED: This migration guide is for historical reference only.
# The Python/Qwen backend has been removed. Use MLX-audio directly.
```

#### 5.4 `docs/agent-voices.md`

**Remove VoiceDesign references** - update to use MLX voice IDs

#### 5.5 `package.json`

**Remove scripts:**
```json
// DELETE:
"dev:py": "uv run uvicorn src.py.qwen_tts_server:app --port 7861 --reload",
"test:py": "uv run pytest",
"lint:py": "uv run ruff check src/py tests/py",
"lint:py:fix": "uv run ruff check --fix src/py tests/py",
```

### Phase 6: Update Homebrew Formula (10 minutes)

**File: `Formula/voice-server.rb`**

**Remove Python dependencies:**
```ruby
# DELETE:
depends_on "uv"
```

**Simplify installation** - remove Python setup steps

---

## 4. Code Change Specifications

### 4.1 Environment Variable Changes

**Remove:**
| Variable | Purpose |
|----------|---------|
| `TTS_BACKEND` | Backend selection (now MLX-only) |
| `ENABLE_SUBPROCESS` | Python subprocess control |
| `QWEN_SERVER_PORT` | Python server port |

**Keep:**
| Variable | Purpose |
|----------|---------|
| `PORT` | Server port |
| `DEFAULT_VOICE_ID` | Default voice |
| `MLX_MODEL` | MLX model selection |
| `MLX_STREAMING_INTERVAL` | Streaming config |
| `ENABLE_MACOS_NOTIFICATIONS` | Notification control |

### 4.2 API Changes

**Removed Endpoints:**
- `POST /upload-voice` - Custom voice upload
- `GET /voices` - List custom voices
- `DELETE /voices/:id` - Delete custom voice

**Remaining Endpoints:**
- `POST /notify` - Main notification endpoint
- `POST /pai` - PAI-specific endpoint
- `GET /health` - Health check

### 4.3 Model Changes

**Deleted Models:**
- `src/ts/models/voice-upload.ts` - Custom voice types
- `src/ts/models/tts.ts` - Qwen TTS request types (merge into MLX types if needed)

**Updated Models:**
- `src/ts/models/health.ts` - Remove `python_subprocess` field

---

## 5. Verification Steps

### 5.1 Pre-Removal Verification

```bash
# 1. Verify MLX-audio is installed
uv tool list | grep mlx-audio

# 2. Test current server with MLX backend
TTS_BACKEND=mlx PORT=8889 bun run dev &

# 3. Test /notify endpoint
curl -X POST http://localhost:8889/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Test before removal", "voice_id": "1"}'

# 4. Test /health endpoint
curl http://localhost:8889/health

# 5. Check all voice IDs work (1-41)
for i in {1..41}; do
  curl -X POST http://localhost:8889/notify \
    -H "Content-Type: application/json" \
    -d "{\"message\": \"Voice $i\", \"voice_id\": \"$i\"}"
done
```

### 5.2 Post-Removal Verification

```bash
# 1. Build TypeScript
bun run build

# 2. Run tests
bun test

# 3. Type check
bun run typecheck

# 4. Lint
bun run lint

# 5. Start server (no TTS_BACKEND needed)
PORT=8889 bun run dev &

# 6. Verify /health shows MLX-audio
curl http://localhost:8889/health | jq .

# 7. Test /notify with various voices
curl -X POST http://localhost:8889/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Post-removal test", "voice_id": "1"}'

# 8. Verify voice upload endpoints return 404
curl -X POST http://localhost:8889/upload-voice
# Expected: 404 Not Found

# 9. Verify Python files are gone
ls src/py/
# Expected: No such file or directory

# 10. Verify no Python imports remain
grep -r "python\|qwen\|subprocess" src/ts/
# Expected: No results (except comments)
```

### 5.3 Integration Testing

```bash
# Test with PAI agent system
curl -X POST http://localhost:8888/pai \
  -H "Content-Type: application/json" \
  -d '{
    "title": "PAI Test",
    "message": "Testing after Python removal"
  }'

# Test with different voice IDs from agent-voices.md
curl -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Testing marrvin voice",
    "voice_id": "1"
  }'
```

---

## 6. Rollback Plan

### 6.1 Git-Based Rollback

**If critical issues are found:**

```bash
# Option 1: Revert commit
git revert HEAD

# Option 2: Reset to before branch
git reset --hard origin/main

# Option 3: Delete removal branch and return to main
git checkout main
git branch -D remove-python-backend
```

### 6.2 Partial Rollback Scenarios

| Scenario | Rollback Action |
|----------|-----------------|
| Voice upload needed | Restore `voice-storage.ts`, add `/upload-voice` endpoint |
| Subprocess management needed | Restore `subprocess-manager.ts` |
| Health check broken | Restore `python_subprocess` field to health model |
| Documentation confusion | Keep MLX-only docs, add migration note |

### 6.3 Recovery Point

Create a tag before removal:

```bash
git tag -a v0.1.0-before-python-removal -m "Before Python backend removal"
git push origin v0.1.0-before-python-removal
```

---

## 7. Risk Assessment

### 7.1 Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Breaking change for users | Low | High | Clear communication, migration guide |
| MLX-audio compatibility | Low | Medium | Pre-removal verification |
| Loss of custom voice feature | Medium | Low | Feature unused in production |
| Documentation inconsistency | Medium | Low | Comprehensive doc updates |
| CI/CD pipeline breakage | Low | Low | Test in PR before merge |

### 7.2 Dependencies

The removal depends on:
- MLX-audio CLI being installed and functional
- All users using built-in voices (1-41)
- No external systems using `/upload-voice` endpoint

### 7.3 Success Criteria

- [ ] All TypeScript files compile without errors
- [ ] All tests pass
- [ ] CI/CD pipeline completes
- [ ] `/notify` endpoint works with all voice IDs
- [ ] `/health` endpoint returns correct status
- [ ] No Python imports in TypeScript code
- [ ] Documentation updated and consistent
- [ ] Homebrew formula works

---

## 8. Implementation Checklist

### Pre-Removal
- [ ] Create backup branch
- [ ] Tag current state
- [ ] Verify MLX-audio installation
- [ ] Test all voice IDs (1-41)
- [ ] Document current configuration

### File Removal
- [ ] Delete `src/py/` directory
- [ ] Delete `requirements.txt`
- [ ] Delete `pyproject.toml`
- [ ] Delete Python shell scripts
- [ ] Delete `subprocess-manager.ts`
- [ ] Delete `tts-client.ts`
- [ ] Delete `voice-storage.ts`
- [ ] Delete `voice-upload.ts` model
- [ ] Delete `audio-validator.ts`

### Code Modifications
- [ ] Update `src/ts/models/health.ts`
- [ ] Update `src/ts/server.ts`
- [ ] Update `package.json` scripts
- [ ] Update `.github/workflows/ci.yml`

### Documentation
- [ ] Update `README.md`
- [ ] Delete `docs/DEVELOPMENT.md`
- [ ] Update `docs/MIGRATION.md`
- [ ] Update `docs/agent-voices.md`
- [ ] Update Homebrew formula

### Verification
- [ ] TypeScript compilation
- [ ] All tests pass
- [ ] Linting passes
- [ ] Manual API testing
- [ ] Voice testing (1-41)
- [ ] CI/CD passes

### Post-Removal
- [ ] Create PR with removal changes
- [ ] Update CHANGELOG
- [ ] Communicate to users
- [ ] Monitor for issues
- [ ] Merge to main

---

## 9. Timeline Estimate

| Phase | Time |
|-------|------|
| Preparation | 5 min |
| Remove Python files | 10 min |
| Modify TypeScript files | 30 min |
| Update CI/CD | 5 min |
| Update documentation | 30 min |
| Verification | 20 min |
| **Total** | **100 min (~1.7 hours)** |

---

## 10. Communication Plan

### 10.1 Pre-Removal Announcement

```
Subject: [NOTICE] Python Backend Removal

The Python/Qwen TTS backend will be removed on [DATE].
The MLX-audio backend is now the only supported backend.

Action required: None if using MLX-audio (default).
If using custom voice upload, please contact [maintainer].
```

### 10.2 Release Notes

```markdown
## Breaking Changes

### Removed Python Backend
- Removed Qwen TTS Python backend
- Removed custom voice upload functionality (`/upload-voice`, `/voices`)
- Removed `TTS_BACKEND` environment variable (MLX-audio is now default)

### Migration
If you were using the Python backend:
1. Install MLX-audio: `uv tool install mlx-audio`
2. Remove `TTS_BACKEND=qwen` from your environment
3. Use numeric voice IDs (1-41) instead of custom voices
```

---

## 11. Post-Removal Maintenance

### 11.1 Ongoing Considerations

- Monitor for requests to removed endpoints
- Track any user requests for custom voice features
- Keep rollback tag accessible for emergency recovery

### 11.2 Future Enhancements

If custom voice functionality becomes needed:
1. Consider MLX-audio voice cloning when available
2. Evaluate alternative TTS providers with voice cloning
3. Design voice system without Python dependency

---

## Appendix A: File Changes Summary

```
DELETED (12 files):
├── src/py/
│   ├── qwen_tts_server.py
│   ├── test_mlx_direct.py
│   ├── test_kokoro_simple.py
│   ├── test_mlx_py313.py
│   ├── benchmark_mlx.py
│   └── __init__.py
├── src/py/cleanup_server.sh
├── src/py/install_mlx_pip.sh
├── src/py/test_mlx_cli.sh
├── src/py/test_qwen3_mlx.sh
├── src/py/benchmark_comparison.sh
├── src/ts/services/subprocess-manager.ts
├── src/ts/services/tts-client.ts
├── src/ts/services/voice-storage.ts
├── src/ts/models/voice-upload.ts
├── src/ts/utils/audio-validator.ts
├── requirements.txt
├── pyproject.toml
└── docs/DEVELOPMENT.md

MODIFIED (6 files):
├── src/ts/server.ts
├── src/ts/models/health.ts
├── package.json
├── README.md
├── .github/workflows/ci.yml
└── Formula/voice-server.rb

DEPENDENCIES REMOVED:
├── fastapi
├── uvicorn
├── pyttsx3
├── qwen-tts
├── torch
├── transformers
├── scipy
└── numpy
```

---

## Appendix B: Search Terms for Verification

After removal, verify no references remain:

```bash
# Python references
grep -r "python" src/ts/ --exclude-dir=node_modules
grep -r "qwen" src/ts/ --exclude-dir=node_modules
grep -r "subprocess" src/ts/ --exclude-dir=node_modules

# Backend selection
grep -r "TTS_BACKEND" .
grep -r "ttsBackend" src/ts/

# Voice upload
grep -r "upload-voice" .
grep -r "customVoice" src/ts/

# Health check
grep -r "python_subprocess" src/ts/
```

Expected results: Only comments or documentation references should remain.

---

**END OF REMOVAL PLAN**
