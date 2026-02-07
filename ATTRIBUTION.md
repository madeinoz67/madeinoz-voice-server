# Attributions

## madeinoz-voice-server

This project incorporates open-source components and was inspired by
existing work in the text-to-speech community.

### Direct Dependencies

- **MLX-audio** by MLX Community
  - License: MIT
  - Repository: https://github.com/ml-explore/mlx-audio
  - Used for: Fast local TTS with Kokoro-82M model (Apple Silicon)

- **Kokoro-82M** by LMSTUDIO
  - License: Apache 2.0
  - Repository: https://huggingface.co/mlx-community/Kokoro-82M-bf16
  - Used for: Text-to-speech model with 41 built-in voices

- **Bun** by Jarred Sumner
  - License: MIT
  - Repository: https://github.com/oven-sh/bun
  - Used for: TypeScript runtime and server framework

### Historical References (Previously Used)

The following components were used in earlier versions but have been removed:

- **Qwen3-TTS** by Alibaba Qwen Team (Apache 2.0) - Previously used for custom voice cloning
- **FastAPI** by Sebastián Ramírez (MIT) - Previously used for Python web server
- **pyttsx3** by Natesh MB (LGPLv3) - Previously used for macOS TTS fallback

### Architectural Inspiration

**ValyrianTech/Qwen3-TTS_server**
- Repository: https://github.com/ValyrianTech/Qwen3-TTS_server
- License: Apache 2.0
- Relationship: Historical architectural inspiration only

Our initial implementation was **inspired by** the ValyrianTech Qwen3-TTS_server
reference implementation for:
- FastAPI server structure patterns
- TTS inference workflow design
- Endpoint organization concepts

**However, our current implementation is original code** with significant differences:
- MLX-audio backend instead of Qwen TTS
- TypeScript-only architecture (no Python subprocess)
- Kokoro-82M with 41 built-in voices
- ElevenLabs-compatible API for PAI integration
- Simplified single-backend architecture

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
