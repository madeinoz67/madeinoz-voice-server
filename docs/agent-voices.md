# PAI Agent Voice Profiles

Voice configurations for PAI agents using MLX-audio Kokoro TTS.

## Voice Profiles

### Jeremy - The Enthusiastic Researcher

**Personality:** Energetic, excited, high-energy delivery
**Kokoro Voice ID:** 4 (af_sky) - Bright, energetic
**Prosody Settings:**
- Stability: 0.35 (very expressive)
- Style: 0.50 (dramatic)
- Speed: 1.10 (fast)

---

### Daniel - The Analytical Skeptic

**Personality:** Measured, intellectual, British authority
**Kokoro Voice ID:** 21 (bf_emma) - Sophisticated British
**Prosody Settings:**
- Stability: 0.70 (consistent)
- Style: 0.10 (subtle)
- Speed: 0.95 (measured)

---

### Aria - The Creative Visionary

**Personality:** Expressive, versatile, young creative energy
**Kokoro Voice ID:** 4 (af_sky) - Bright, energetic
**Prosody Settings:**
- Stability: 0.40 (expressive)
- Style: 0.40 (dynamic)
- Speed: 1.05 (energetic)

---

### Marcus - The Professional Leader

**Personality:** Authoritative, confident, professional
**Kokoro Voice ID:** 12 (am_michael) - Professional male
**Prosody Settings:**
- Stability: 0.60 (consistent)
- Style: 0.20 (controlled)
- Speed: 1.00 (steady)

---

### Rachel - The Supportive Analyst

**Personality:** Calm, warm, supportive
**Kokoro Voice ID:** 1 (af_heart) - Warm, friendly
**Prosody Settings:**
- Stability: 0.55 (balanced)
- Style: 0.15 (natural)
- Speed: 0.95 (gentle)

## Usage with Voice Server

### Current Implementation (MLX-audio Kokoro)

The voice server uses MLX-audio with Kokoro-82M model:

```bash
# Test different voices via /notify endpoint
curl -X POST http://localhost:8889/notify \
  -H "Content-Type: application/json" \
  -d '{"title": "Test", "message": "Hello Stephen", "voice_id": "12"}'
```

### Voice Configuration

Voices are configured in `AGENTPERSONALITIES.md` (or `docs/agent-voices.md`):

```markdown
## marrvin

**Description:** Default voice for DAIV
**Kokoro Voice ID:** 12 (am_michael)

**Prosody:** speak with moderate consistency, speak in a neutral tone, speak at a normal pace

**Speed:** 1.0
```

### Available Kokoro Voices

The server includes 41 built-in Kokoro voices:

| ID | Voice | Description |
|----|-------|-------------|
| 1 | af_heart | Warm, friendly (default) |
| 4 | af_sky | Bright, energetic |
| 12 | am_michael | Professional male |
| 21 | bf_emma | Sophisticated British |

See `docs/VOICE_QUICK_REF.md` for complete voice listings.

### Prosody Translation

Voice personality traits are translated to Kokoro prosody settings:

```typescript
// Prosody settings for Kokoro
interface ProsodySettings {
  stability: number;  // 0.0-1.0 (speech consistency)
  style: number;       // 0.0-1.0 (speaking style)
  speed: number;       // 0.5-2.0 (speaking speed)
}
```

These settings are applied during TTS synthesis via the MLX-audio CLI.
