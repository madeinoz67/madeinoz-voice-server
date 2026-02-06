# Tasks: Qwen TTS Voice Server

**Input**: Design documents from `/specs/001-qwen-tts/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.yaml

**Tests**: Tests are OPTIONAL - not explicitly requested in feature specification, so test tasks are marked as optional.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

This is a hybrid TypeScript/Python single project:
- TypeScript main server: `src/` at repository root
- Python TTS server: `src/qwen-tts-server.py`
- Tests: `tests/` at repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create project directory structure per plan.md (src/, src/models/, src/services/, src/utils/, tests/)
- [x] T002 Initialize Bun project with TypeScript dependencies in package.json
- [x] T003 [P] Create tsconfig.json with strict mode configuration
- [x] T004 [P] Create requirements.txt for Python dependencies (fastapi, uvicorn, transformers, torch)
- [x] T005 [P] Setup .gitignore for node_modules, .cache, __pycache__, .env
- [x] T006 [P] Create example .env file with PORT, QWEN_MODEL_PATH, QWEN_SERVER_PORT variables

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T007 [P] Create VoiceConfig type definition in src/models/voice-config.ts
- [x] T008 [P] Create NotificationRequest type definition in src/models/notification.ts
- [x] T009 [P] Create HealthStatus type definition in src/models/health.ts
- [x] T010 [P] Create TTSRequest/TTSResponse types in src/models/tts.ts
- [x] T011 [P] Create PronunciationRule type in src/models/pronunciation.ts
- [x] T012 Create text sanitizer utility in src/utils/text-sanitizer.ts
- [x] T013 [P] Create structured logger utility in src/utils/logger.ts
- [x] T014 Create subprocess manager for Python process in src/services/subprocess-manager.ts
- [x] T015 Create prosody translator service in src/services/prosody-translator.ts
- [x] T016 Create pronunciation service in src/services/pronunciation.ts
- [x] T017 [P] Create Python FastAPI TTS server stub in src/qwen-tts-server.py
- [x] T018 [P] Create TTS HTTP client in src/services/tts-client.ts
- [x] T019 Create main Bun HTTP server stub in src/server.ts with /notify, /pai, /health routes
- [x] T020 Create rate limiting middleware in src/middleware/rate-limiter.ts
- [x] T021 [P] Create CORS middleware configuration in src/middleware/cors.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Drop-in Replacement for ElevenLabs (Priority: P1) 🎯 MVP

**Goal**: Basic drop-in replacement with Qwen TTS using built-in voices

**Independent Test**: Send POST requests to /notify endpoint with various voice configurations and verify audio playback and notification behavior matches the existing ElevenLabs implementation.

### Tests for User Story 1 (OPTIONAL)

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T022 [P] [US1] Contract test for /notify endpoint in tests/contract/notify-api.test.ts
- [ ] T023 [P] [US1] Contract test for /pai endpoint in tests/contract/pai-api.test.ts
- [ ] T024 [P] [US1] Contract test for /health endpoint in tests/contract/health-api.test.ts
- [ ] T025 [P] [US1] Integration test for notification flow in tests/integration/notification-flow.test.ts
- [ ] T026 [P] [US1] Integration test for fallback behavior in tests/integration/fallback-behavior.test.ts

### Implementation for User Story 1

- [x] T027 [US1] Implement Python Qwen3-TTS model loading in src/qwen-tts-server.py
- [x] T028 [US1] Implement Python TTS synthesis endpoint in src/qwen-tts-server.py
- [x] T029 [US1] Implement subprocess startup/shutdown logic in src/services/subprocess-manager.ts
- [x] T030 [US1] Implement TTS client request/response handling in src/services/tts-client.ts
- [x] T031 [US1] Implement prosody translation (numerical → natural language) in src/services/prosody-translator.ts
- [x] T032 [US1] Implement text sanitization in src/utils/text-sanitizer.ts
- [x] T033 [US1] Implement /notify endpoint handler in src/server.ts
- [x] T034 [US1] Implement /pai endpoint handler in src/server.ts
- [x] T035 [US1] Implement /health endpoint handler in src/server.ts
- [x] T036 [US1] Implement macOS notification display (osascript) in src/server.ts
- [x] T037 [US1] Implement audio playback with afplay in src/server.ts
- [x] T038 [US1] Implement fallback to macOS say command in src/server.ts
- [x] T039 [US1] Implement rate limiting in src/middleware/rate-limiter.ts
- [x] T040 [US1] Implement CORS headers (localhost only) in src/middleware/cors.ts
- [x] T041 [US1] Implement error handling and logging across all endpoints in src/server.ts

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently. Existing PAI clients should work with just the base URL change.

---

## Phase 4: User Story 2 - Voice Configuration and Personalities (Priority: P2)

**Goal**: Support configured agent voices with prosody from AGENTPERSONALITIES.md

**Independent Test**: Configure multiple voice entries and send requests with different voice_id values, then verify audio output reflects different prosody settings.

### Tests for User Story 2 (OPTIONAL)

- [ ] T042 [P] [US2] Unit test for voice loader in tests/unit/voice-loader.test.ts
- [ ] T043 [P] [US2] Unit test for prosody translator in tests/unit/prosody-translator.test.ts
- [ ] T044 [P] [US2] Integration test for voice personality selection in tests/integration/voice-personalities.test.ts

### Implementation for User Story 2

- [x] T045 [US2] Create AGENTPERSONALITIES.md parser in src/services/voice-loader.ts
- [x] T046 [US2] Implement voice configuration caching in src/services/voice-loader.ts
- [x] T047 [US2] Implement pronunciation rule loader in src/services/pronunciation.ts
- [x] T048 [US2] Implement pronunciation text substitution in src/services/pronunciation.ts
- [x] T049 [US2] Integrate voice loader with /notify endpoint in src/server.ts
- [x] T050 [US2] Integrate pronunciation substitution with TTS pipeline in src/server.ts
- [x] T051 [US2] Implement volume control from config/request in src/server.ts
- [x] T052 [US2] Update /health endpoint to report loaded voices in src/server.ts

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently. Each agent voice should have distinct characteristics.

---

## Phase 5: User Story 3 - Custom Voice Upload and Cloning (Priority: P3)

**Goal**: User-uploaded reference audio for custom voice cloning

**Independent Test**: Upload a reference audio file, send TTS request using the uploaded voice label, verify output matches reference voice characteristics.

### Tests for User Story 3 (OPTIONAL)

- [ ] T053 [P] [US3] Integration test for voice upload in tests/integration/voice-upload.test.ts
- [ ] T054 [P] [US3] Integration test for voice cloning in tests/integration/voice-cloning.test.ts

### Implementation for User Story 3

- [x] T055 [US3] Create voice upload endpoint POST /upload-voice in src/server.ts
- [x] T056 [US3] Implement reference audio storage in ~/.claude/voices/ in src/server.ts
- [x] T057 [US3] Implement audio file validation (format, duration) in src/server.ts
- [x] T058 [US3] Implement voice cloning integration in src/qwen-tts-server.py
- [x] T059 [US3] Integrate custom voice selection with TTS pipeline in src/server.ts
- [x] T060 [US3] Implement voice list endpoint GET /voices in src/server.ts
- [x] T061 [US3] Implement voice deletion endpoint DELETE /voices/:id in src/server.ts

**Checkpoint**: All user stories should now be independently functional. Users can upload custom voices and use them for TTS.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T062 [P] Update README.md with Qwen TTS server documentation
- [ ] T063 [P] Update CLAUDE.md project guidance for new architecture
- [x] T064 [P] Create migration guide from ElevenLabs to Qwen TTS in docs/MIGRATION.md
- [ ] T065 [P] Update Codanna index for src/ directory
- [x] T066 Code cleanup and refactoring based on test coverage
- [ ] T067 [P] Add additional unit tests for edge cases (empty input, very long text, concurrent requests)
- [x] T068 Security hardening (input validation limits, CORS enforcement)
- [ ] T069 Run quickstart.md validation and update if needed
- [ ] T070 [P] Create performance benchmarks (<3s response, <5s startup, <2GB memory)
- [x] T071 [P] Add structured logging levels (DEBUG, INFO, WARN, ERROR)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Extends US1 but independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Extends US1/US2 but independently testable

### Within Each User Story

- Tests (if included) MUST be written and FAIL before implementation
- Python TTS server (T017) before TTS client (T018)
- Models (T007-T011) before services (T012-T016)
- Services before main server (T019)
- Core implementation before integration

### Parallel Opportunities

**Phase 1 (Setup)**:
- T003, T004, T005 can run in parallel

**Phase 2 (Foundational)**:
- T007, T008, T009, T010, T011 (all models) can run in parallel
- T013, T017, T018, T021 (utilities and stubs) can run in parallel after types defined

**Phase 3 (User Story 1)**:
- T022, T023, T024, T025, T026 (all tests) can run in parallel

**Phase 4 (User Story 2)**:
- T042, T043, T044 (all tests) can run in parallel

**Phase 5 (User Story 3)**:
- T053, T054 (all tests) can run in parallel

**Phase 6 (Polish)**:
- T062, T063, T064, T065, T067, T070, T071 can run in parallel

**Cross-Story Parallelism**:
- Once Foundational phase completes, US1, US2, US3 can all be worked on in parallel by different developers

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Contract test for /notify endpoint in tests/contract/notify-api.test.ts"
Task: "Contract test for /pai endpoint in tests/contract/pai-api.test.ts"
Task: "Contract test for /health endpoint in tests/contract/health-api.test.ts"
Task: "Integration test for notification flow in tests/integration/notification-flow.test.ts"
Task: "Integration test for fallback behavior in tests/integration/fallback-behavior.test.ts"

# Launch all foundational type models together:
Task: "Create VoiceConfig type definition in src/models/voice-config.ts"
Task: "Create NotificationRequest type definition in src/models/notification.ts"
Task: "Create HealthStatus type definition in src/models/health.ts"
Task: "Create TTSRequest/TTSResponse types in src/models/tts.ts"
Task: "Create PronunciationRule type in src/models/pronunciation.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T006)
2. Complete Phase 2: Foundational (T007-T021) — CRITICAL
3. Complete Phase 3: User Story 1 (T022-T041)
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

**At this point you have**: A working Qwen TTS voice server that replaces ElevenLabs with zero client code changes required.

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (P1 - MVP)
   - Developer B: User Story 2 (P2 - Voices)
   - Developer C: User Story 3 (P3 - Cloning)
3. Stories complete and integrate independently

---

## Summary

**Total Tasks**: 71 tasks
**Tasks per User Story**:
- Setup: 6 tasks
- Foundational: 15 tasks
- US1 (P1): 20 tasks (5 tests + 15 implementation)
- US2 (P2): 11 tasks (3 tests + 8 implementation)
- US3 (P3): 9 tasks (2 tests + 7 implementation)
- Polish: 10 tasks

**Parallel Opportunities**: 30+ tasks marked [P] for parallel execution

**Independent Test Criteria**:
- US1: Send /notify requests, verify audio playback and macOS notifications
- US2: Configure voices, test with different voice_id values
- US3: Upload reference audio, test cloned voice synthesis

**Suggested MVP Scope**: Phase 1 + Phase 2 + Phase 3 (US1) = 41 tasks for a fully functional drop-in replacement

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Tests are OPTIONAL - not explicitly requested in spec, but recommended for quality
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Format validated: All tasks follow `- [ ] [TaskID] [P?] [Story?] Description with file path`
