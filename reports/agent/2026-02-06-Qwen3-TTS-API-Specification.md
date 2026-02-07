# Research Report: Qwen3-TTS Server API Specification

**Date**: 2026-02-06
**Agent**: Research-Agent
**Source**: https://github.com/ValyrianTech/Qwen3-TTS_server
**Purpose**: Specification for creating a drop-in replacement for ElevenLabs-based voice server using Qwen TTS

---

## Executive Summary

The Qwen3-TTS_server is a FastAPI-based text-to-speech server providing voice cloning, voice conversion, and multi-language support. This specification documents the API contract and functionality needed to build a drop-in replacement server.

---

## 1. API Endpoints

### 1.1 GET /base_tts/
**Purpose**: Generate speech using the default English voice.

**Query Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `text` | string | Yes | - | Text to synthesize |
| `speed` | float | No | 1.0 | Speech speed multiplier |

**Response**:
- Content-Type: `audio/wav`
- Body: WAV audio stream
- Headers: Same as `/synthesize_speech/`

**Source**: `server.py:207-213` (README.md)

---

### 1.2 GET /synthesize_speech/
**Purpose**: Synthesize speech from text using a specified voice.

**Query Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `text` | string | Yes | - | Text to synthesize |
| `voice` | string | Yes | - | Voice label (filename prefix in `resources/`) |
| `speed` | float | No | 1.0 | Speech speed multiplier |

**Response**:
- Content-Type: `audio/wav`
- Body: WAV audio stream

**Response Headers**:
| Header | Description |
|--------|-------------|
| `X-Elapsed-Time` | Time taken for synthesis (seconds) |
| `X-Device-Used` | Device used (`cuda:0` or `cpu`) |
| `Access-Control-Allow-Origin` | `*` |
| `Access-Control-Allow-Credentials` | `true` |
| `Access-Control-Allow-Headers` | `Origin, Content-Type, X-Amz-Date, Authorization, X-Api-Key, X-Amz-Security-Token, locale` |
| `Access-Control-Allow-Methods` | `POST, OPTIONS` |

**Error Responses**:
| Status | Condition |
|--------|-----------|
| 400 | No matching voice found in `resources/` |
| 500 | Any other error during synthesis |

**Source**: `server.py:319-373` (README.md, F5-TTS_API_REFERENCE.md)

---

### 1.3 POST /upload_audio/
**Purpose**: Upload an audio file to use as a reference voice.

**Request Format**:
- Content-Type: `multipart/form-data`

**Form Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `audio_file_label` | string | Yes | Label/name for the voice (used as filename prefix) |
| `file` | file | Yes | Audio file to upload |

**Constraints**:
| Constraint | Value |
|------------|-------|
| Allowed extensions | `wav`, `mp3`, `flac`, `ogg` |
| Max file size | 5 MB |
| Content validation | Must be valid audio (checked via `python-magic`) |

**Response**:
**Success** (200):
```json
{
  "message": "File {filename} uploaded successfully with label {audio_file_label}."
}
```

**Validation Error** (200 with error field):
```json
{
  "error": "Invalid file type. Allowed types are: wav, mp3, flac, ogg"
}
```

**Source**: `server.py:238-279` (README.md, F5-TTS_API_REFERENCE.md)

---

### 1.4 POST /change_voice/
**Purpose**: Convert the voice of an existing audio file to a different reference voice.

**Request Format**:
- Content-Type: `multipart/form-data`

**Form Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reference_speaker` | string | Yes | Voice label to convert to |
| `file` | file | Yes | Audio file to convert |

**Response**:
- Content-Type: `audio/wav`
- Body: WAV audio stream with converted voice

**Error Responses**:
| Status | Condition |
|--------|-----------|
| 400 | No matching reference speaker found |
| 500 | Any other error during conversion |

**Source**: `server.py:215-236` (README.md, F5-TTS_API_REFERENCE.md)

---

## 2. Request/Response Formats

### 2.1 Audio Input Formats
- WAV
- MP3
- FLAC
- OGG

### 2.2 Audio Output Format
- **Format**: WAV
- **Channels**: Mono (1 channel)
- **Sample Rate**: 24000 Hz

### 2.3 Voice File Naming Convention
Voice files in `resources/` are matched by **prefix**:
- A voice named `demo_speaker0` matches:
  - `demo_speaker0.wav`
  - `demo_speaker0.mp3`
  - `demo_speaker0_v2.wav`
- Server prefers `.wav` files when multiple matches exist

**Source**: F5-TTS_API_REFERENCE.md

---

## 3. Key Features and Capabilities

### 3.1 Core Features
1. **Voice Cloning** - Clone any voice from a short reference audio clip (max 15s)
2. **Voice Conversion** - Transform the voice of existing audio files
3. **Multi-language Support** - 10 languages: Chinese, English, Japanese, Korean, German, French, Russian, Portuguese, Spanish, Italian
4. **Automatic Transcription** - Uses Whisper for reference audio transcription
5. **Speed Control** - Adjust speech speed via time-stretching (librosa)
6. **Voice Caching** - Caches voice prompts to avoid repeated Whisper transcriptions

### 3.2 Reference Audio Processing
For non-default voices, reference audio is processed:
1. Clips to max 15 seconds using silence detection
2. Removes silence from edges
3. Adds 50ms silence padding
4. Transcribes using Whisper model

### 3.3 Model Information
| Model | Purpose | Size | Source |
|-------|---------|------|--------|
| `Qwen/Qwen3-TTS-12Hz-1.7B-Base` | Voice cloning TTS | 1.7B | HuggingFace |
| `openai/whisper-base` | Audio transcription | 74M | OpenAI |

**Source**: README.md, server.py, QWEN3_TTS_RESEARCH.md

---

## 4. Dependencies

### 4.1 Python Dependencies
```
fastapi>=0.128.0
uvicorn[standard]>=0.40.0
python-multipart>=0.0.21
python-magic>=0.4.27
pydub>=0.25.1
soundfile>=0.13.1
numpy>=1.24.0
qwen-tts
openai-whisper>=20250625
librosa>=0.11.0
```

**Additional runtime dependencies**:
- PyTorch with CUDA support
- FlashAttention 2 (optional, for performance)

### 4.2 System Dependencies
- CUDA 12.8+ (for RTX 5090/Blackwell support)
- GPU with 8GB+ VRAM recommended
- Python 3.10+

**Source**: requirements.txt, README.md

---

## 5. TTS Generation Process

### 5.1 Qwen3-TTS API Usage
The server uses the `qwen-tts` Python package with the `Qwen3TTSModel` class:

```python
from qwen_tts import Qwen3TTSModel

model = Qwen3TTSModel.from_pretrained(
    "Qwen/Qwen3-TTS-12Hz-1.7B-Base",
    device_map="cuda:0",
    dtype=torch.bfloat16,
)
```

### 5.2 Voice Cloning Methods

**Method 1: Direct Generation** (slower, no caching):
```python
wavs, sr = model.generate_voice_clone(
    text=text,
    language="Auto",
    ref_audio=(ref_audio_data, ref_sr),
    ref_text=ref_text,
)
```

**Method 2: With Cached Prompt** (optimized for repeated use):
```python
# Create reusable prompt once
voice_prompt = model.create_voice_clone_prompt(
    ref_audio=(ref_audio_data, ref_sr),
    ref_text=ref_text,
)

# Reuse for multiple generations
wavs, sr = model.generate_voice_clone(
    text=text,
    language="Auto",
    voice_clone_prompt=voice_prompt,
)
```

### 5.3 Speed Adjustment
The server uses librosa for time-stretching:
```python
import librosa
audio_data = librosa.effects.time_stretch(audio_data, rate=speed)
```

**Source**: server.py:119-161, QWEN3_TTS_RESEARCH.md

---

## 6. Server Configuration

### 6.1 Framework Settings
- **Framework**: FastAPI
- **Default Port**: 7860
- **Host**: 0.0.0.0
- **CORS**: Enabled for all origins

### 6.2 CORS Middleware
```python
allow_origins=["*"]
allow_credentials=True
allow_methods=["*"]
allow_headers=["*"]
```

### 6.3 Directory Structure
| Directory | Purpose |
|-----------|---------|
| `resources/` | Stores reference audio files (voice samples) |
| `outputs/` | Temporary storage for generated audio files |

**Source**: server.py:24-35, F5-TTS_API_REFERENCE.md

---

## 7. Startup Behavior

On server startup, the server performs a warmup synthesis:
- **Text**: `"This is a test sentence generated by the Qwen3-TTS API."`
- **Voice**: `demo_speaker0`

This ensures the model is loaded and ready before accepting requests.

**Source**: server.py:181-206

---

## 8. Voice Caching System

The server implements a voice caching system to optimize performance:

```python
voice_cache = {}  # {voice_name: {"processed_audio": path, "ref_text": str, "prompt": object}}
```

**Cache structure**:
- `processed_audio`: Path to processed WAV file
- `ref_text`: Transcribed reference text
- `prompt`: Pre-computed voice clone prompt
- `audio_data`: Reference audio numpy array
- `sample_rate`: Sample rate

This avoids repeated Whisper transcriptions on every request.

**Source**: server.py:52, 163-187

---

## 9. Error Handling

All endpoints return HTTP 500 with JSON body on unhandled errors:
```json
{
  "detail": "error message"
}
```

Some validation errors in `/upload_audio/` return HTTP 200 with an `error` field.

**Source**: F5-TTS_API_REFERENCE.md

---

## 10. API Contract Summary for Drop-in Replacement

### 10.1 Required Endpoints
| Endpoint | Method | Priority for Replacement |
|----------|--------|-------------------------|
| `/synthesize_speech/` | GET | **Critical** - Core TTS functionality |
| `/upload_audio/` | GET | **Critical** - Voice management |
| `/base_tts/` | GET | **Optional** - Can be handled via `/synthesize_speech/` |
| `/change_voice/` | POST | **Optional** - Voice conversion feature |

### 10.2 Required Functionality
1. Text-to-speech synthesis with voice cloning
2. Voice reference audio upload and storage
3. Multi-language support (Auto-detect or explicit)
4. Speed adjustment capability
5. WAV output at 24kHz mono
6. CORS support for web clients

### 10.3 Key Differences from ElevenLabs
- Qwen3-TTS requires reference text transcription (uses Whisper)
- Uses voice prompts for efficient caching
- No built-in streaming (generates complete audio file)
- Reference audio limited to 15 seconds

**Source**: Analysis based on README.md and F5-TTS_API_REFERENCE.md

---

## 11. Usage Examples

### 11.1 Synthesize Speech
```bash
curl "http://localhost:7860/synthesize_speech/?text=Hello%20world&voice=demo_speaker0" \
  --output output.wav
```

### 11.2 Upload a Voice
```bash
curl -X POST "http://localhost:7860/upload_audio/" \
  -F "audio_file_label=my_voice" \
  -F "file=@/path/to/voice_sample.mp3"
```

### 11.3 Use Uploaded Voice
```bash
curl "http://localhost:7860/synthesize_speech/?text=Hello%20world&voice=my_voice" \
  --output output.wav
```

### 11.4 Change Voice of Audio
```bash
curl -X POST "http://localhost:7860/change_voice/" \
  -F "reference_speaker=demo_speaker0" \
  -F "file=@/path/to/input.wav" \
  --output converted.wav
```

**Source**: README.md

---

## 12. Deployment Considerations

### 12.1 RunPod Deployment
The Docker image is optimized for RunPod:
- Server files in `/app/server/`
- `/workspace/` left free for network volumes
- Uses `sleep infinity` for web terminal access

### 12.2 Docker Configuration
Multi-stage Docker build with:
- CUDA 12.8 base image
- Pre-downloaded models in `/root/.cache/`
- Port 7860 exposed

**Source**: README.md, Dockerfile reference

---

## Conclusions and Recommendations

### Key Findings
1. The Qwen3-TTS_server provides a well-defined REST API contract suitable for drop-in replacement
2. The `/synthesize_speech/` endpoint is the core functionality needed for TTS services
3. Voice caching is a critical optimization for production use
4. The server uses standard FastAPI patterns making it easy to replicate

### Implementation Recommendations
1. **Primary focus**: Implement `/synthesize_speech/` and `/upload_audio/` endpoints
2. **Voice management**: Implement similar voice caching with prompt reuse
3. **Transcription**: Use Whisper (or HuggingFace Inference API) for reference text
4. **Speed control**: Implement via librosa time-stretching or similar
5. **Output format**: Ensure 24kHz mono WAV output for compatibility

### For HuggingFace-based Implementation
1. Use Qwen3-TTS model via HuggingFace Inference API
2. Store voice references with pre-computed prompts
3. Implement streaming response for large audio files
4. Add proper error handling and validation

---

**Document Version**: 1.0
**Last Updated**: 2026-02-06
