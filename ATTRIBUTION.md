# Attributions

## Qwen TTS Voice Server

This project incorporates open-source components and was inspired by
existing work in the text-to-speech community.

### Direct Dependencies

- **Qwen3-TTS** by Alibaba Qwen Team
  - License: Apache 2.0
  - Repository: https://github.com/QwenLM/Qwen3-TTS
  - Used for: Text-to-speech model (when available)

- **FastAPI** by Sebastián Ramírez
  - License: MIT
  - Repository: https://github.com/tiangolo/fastapi
  - Used for: Python web server framework

- **pyttsx3** by Natesh MB
  - License: LGPLv3
  - Repository: https://github.com/nateshmbhat/pyttsx3
  - Used for: macOS TTS fallback

### Architectural Inspiration

**ValyrianTech/Qwen3-TTS_server**
- Repository: https://github.com/ValyrianTech/Qwen3-TTS_server
- License: Apache 2.0
- Relationship: Architectural inspiration only

Our implementation was **inspired by** the ValyrianTech Qwen3-TTS_server
reference implementation for:
- FastAPI server structure patterns
- TTS inference workflow design
- Endpoint organization concepts

**However, our implementation is original code** with significant differences:
- Different API contract (ElevenLabs-compatible vs custom)
- Different deployment target (macOS local vs GPU server)
- Different architecture (TypeScript subprocess host vs standalone)
- Additional features (pyttsx3 fallback, prosody translation layer)

No code was copied from ValyrianTech/Qwen3-TTS_server.

### Related Projects

**PAI Voice Server (Original)**
- Repository: https://github.com/danielmiessler/Personal_AI_Infrastructure
- Our server is designed as a drop-in replacement for the ElevenLabs-based
  PAI voice server, maintaining API compatibility while using local TTS.

---

## License Notice

This project (madeinoz-voice-server) is licensed under the MIT License.
See LICENSE file for details.

Third-party components are licensed under their respective terms as
listed above.
