# Feature Specification: Qwen TTS Voice Server

**Feature Branch**: `001-qwen-tts`
**Created**: 2026-02-06
**Status**: Draft
**Input**: User description: "I want to buld a bun TTS server using recent released qwen tts model, its to be a drop in replacemnt for the current PAI voice server that uses elevenlabs.  use https://github.com/ValyrianTech/Qwen3-TTS_server as an example. PAI voice server can be foudn here vice server can be foudn at https://github.com/danielmiessler/Personal_AI_Infrastructure/tree/main/Packs/pai-voice-system/src/VoiceServer"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Drop-in Replacement for ElevenLabs Voice Server (Priority: P1)

As a PAI system user, I want to replace the ElevenLabs-based voice server with a Qwen TTS-based server so that I can eliminate dependency on external API services and associated costs while maintaining identical functionality.

**Why this priority**: This is the core value proposition - removing the ElevenLabs dependency while keeping full compatibility. Without this, the feature has no purpose.

**Independent Test**: Can be fully tested by sending requests to the new server's `/notify` endpoint with various voice configurations and verifying audio playback and notification behavior matches the existing implementation.

**Acceptance Scenarios**:

1. **Given** the Qwen TTS server is running on port 8888, **When** a client sends a POST request to `/notify` with title, message, and voice_id, **Then** the server generates speech using Qwen TTS and plays it via afplay with identical timing and behavior to the ElevenLabs version
2. **Given** a voice_id that corresponds to a configured agent personality, **When** a TTS request is made, **Then** the server uses the prosody settings (stability, similarity, style, speed) defined for that agent
3. **Given** no API key is configured, **When** a TTS request is made, **Then** the server falls back to macOS `say` command for audio synthesis
4. **Given** the `/pai` endpoint is called, **When** a request is received, **Then** the server responds with notification using the default DA voice settings
5. **Given** the `/health` endpoint is queried, **When** a GET request is made, **Then** the server returns status indicating Qwen TTS is the active voice system (or fallback if unavailable)

---

### User Story 2 - Voice Configuration and Personalities (Priority: P2)

As a PAI system administrator, I want to configure multiple voice personalities with different prosody settings so that each AI agent can have a distinct voice and speaking style.

**Why this priority**: Voice personalities are essential for the PAI user experience but can be added incrementally after basic TTS works.

**Independent Test**: Can be tested by configuring multiple voice entries and sending requests with different voice_id values, then verifying the audio output reflects the different prosody settings.

**Acceptance Scenarios**:

1. **Given** voice personalities are defined in the agent configuration, **When** a request specifies a voice_id or voice_name, **Then** the server loads and applies the corresponding prosody settings
2. **Given** a voice configuration includes stability, similarity_boost, style, and speed values, **When** TTS is generated, **Then** these values are passed to the Qwen TTS model
3. **Given** a volume setting is specified in the voice config or request, **When** audio plays, **Then** the playback volume matches the specified level (0.0 to 1.0)
4. **Given** pronunciation customizations exist, **When** text is synthesized, **Then** specified terms are replaced with their custom pronunciations before TTS

---

### User Story 3 - Custom Voice Upload and Cloning (Priority: P3)

As a PAI system user, I want to upload custom voice samples so that I can create personalized voices for specific agents or use cases.

**Why this priority**: Voice cloning is an enhancement that adds value but is not required for basic drop-in replacement functionality.

**Independent Test**: Can be tested by uploading a reference audio file, then sending a TTS request using the uploaded voice label, and verifying the output matches the reference voice characteristics.

**Acceptance Scenarios**:

1. **Given** a voice upload endpoint exists, **When** a user POSTs an audio file with a label, **Then** the server stores the reference audio for voice cloning
2. **Given** an uploaded voice label is used in a TTS request, **When** synthesis occurs, **Then** the output matches the voice characteristics of the reference audio
3. **Given** an invalid audio file is uploaded, **When** the upload request is processed, **Then** the server returns an appropriate error message

---

### Edge Cases

- What happens when the Qwen TTS model is unavailable or returns an error?
- How does the system handle malformed or empty text input?
- What happens when a specified voice_id does not exist in the configuration?
- How does the system behave when rate limits are exceeded?
- What happens when macOS notification subsystem fails (afplay/osascript errors)?
- How are very long text messages handled (current limit is 500 characters)?
- What happens when audio playback is interrupted (user manually stops afplay)?
- How does the system handle concurrent notification requests?
- What happens when pronunciation substitutions conflict or overlap?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST accept POST requests to `/notify` endpoint with title, message, and optional voice configuration
- **FR-002**: System MUST generate speech audio using Qwen TTS model when available
- **FR-003**: System MUST play generated audio using macOS afplay command
- **FR-004**: System MUST display macOS notification with title and message
- **FR-005**: System MUST support voice configuration via agent personalities file
- **FR-006**: System MUST apply prosody settings (stability, style, speed) from voice configuration
- **FR-007**: System MUST fall back to macOS say command when TTS model is unavailable
- **FR-008**: System MUST validate and sanitize all user input before processing
- **FR-009**: System MUST rate limit requests to prevent abuse (10 requests per minute per client)
- **FR-010**: System MUST return appropriate HTTP status codes and error messages
- **FR-011**: System MUST support the `/pai` endpoint for default DA notifications
- **FR-012**: System MUST provide `/health` endpoint for status monitoring
- **FR-013**: System MUST load voice configurations from AGENTPERSONALITIES.md
- **FR-014**: System MUST apply pronunciation customizations before text synthesis
- **FR-015**: System MUST support CORS headers for localhost requests
- **FR-016**: System MUST handle volume control at both configuration and request level

### Key Entities

- **Voice Configuration**: Represents a voice personality with identifier, prosody settings (stability, similarity_boost, style, speed), volume, and description
- **Notification Request**: Contains title, message, optional voice identifier, optional voice settings override, and volume preference
- **Pronunciation Rule**: Maps a term to its custom pronunciation for text-to-speech
- **Health Status**: Reports current TTS system (Qwen or fallback), default voice ID, and API availability

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Existing PAI voice server clients can switch to the new server by changing only the base URL, with no code modifications required
- **SC-002**: Server responds to notification requests within 3 seconds for messages under 200 characters
- **SC-003**: Audio playback completes successfully for 95% of well-formed requests
- **SC-004**: Server handles 10 concurrent requests without performance degradation
- **SC-005**: All existing agent voice personalities produce audio output with Qwen TTS that is recognizably distinct from each other
- **SC-006**: Server recovers gracefully from TTS model failures by falling back to macOS say within 5 seconds
- **SC-007**: Zero external API dependencies (ElevenLabs) remain in the implementation
- **SC-008**: Server startup time is under 5 seconds including model loading
- **SC-009**: Memory usage remains under 2GB during normal operation

## Assumptions

- Qwen TTS model can be accessed locally or via an API that does not require per-request billing
- macOS environment with afplay and osascript commands available
- Existing AGENTPERSONALITIES.md configuration file structure remains valid
- Port 8888 is available for the voice server
- User has ~/.env file for optional configuration
- Voice cloning feature uses Qwen3-TTS's built-in voice cloning capabilities
- The server runs on macOS (given the use of afplay/osascript)
- Default voice quality from Qwen TTS is acceptable for PAI system use

## Out of Scope

This feature does NOT include:
- Windows or Linux support (macOS only)
- Real-time streaming synthesis (current ElevenLabs implementation is not streaming)
- Voice conversion (transforming existing audio files)
- Web UI for voice management
- Persistent storage of generated audio files
- Multi-user authentication or authorization
- Cloud deployment configuration
