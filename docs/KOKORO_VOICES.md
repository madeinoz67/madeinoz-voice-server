# Kokoro Voice Index

This document describes the numeric voice ID system for Kokoro-82M TTS voices.

## Overview

The voice server now uses **numeric voice IDs (1-54)** to select Kokoro voices. This makes it easy to configure voices in agent personalities without remembering complex voice names.

## Usage

To set a voice for an agent, use a numeric voice ID:

```json
{
  "voice_id": "1",
  "voice_name": "Jamie (Premium)",
  "stability": 0.5,
  "similarity_boost": 0.75
}
```

The voice_id `"1"` maps to `af_heart` (warm, friendly American female voice).

## Voice Index

### American Female (1-11)

| ID | Voice | Description |
|----|-------|-------------|
| 1 | af_heart | Warm, friendly (default) |
| 2 | af_bella | Elegant, refined |
| 3 | af_nicole | Professional |
| 4 | af_sky | Bright, energetic |
| 5 | af_sarah | Clear, articulate |
| 6 | af_jessica | Expressive |
| 7 | af_kore | Soft, gentle |
| 8 | af_nova | Artistic, dreamy |
| 9 | af_alloy | Modern, crisp |
| 10 | af_aoede | Musical, lyrical |
| 11 | af_river | Flowing, calm |

### American Male (12-20)

| ID | Voice | Description |
|----|-------|-------------|
| 12 | am_michael | Professional, grounded |
| 13 | am_adam | Youthful, energetic |
| 14 | am_eric | Friendly, warm |
| 15 | am_liam | Clear, confident |
| 16 | am_fenrir | Deep, authoritative |
| 17 | am_echo | Resonant |
| 18 | am_onyx | Bold, strong |
| 19 | am_puck | Playful |
| 20 | am_santa | Jolly, warm |

### British Female (21-24)

| ID | Voice | Description |
|----|-------|-------------|
| 21 | bf_emma | Sophisticated, RP accent |
| 22 | bf_isabella | Elegant, proper |
| 23 | bf_alice | Clear, educated |
| 24 | bf_lily | Soft, gentle |

### British Male (25-28)

| ID | Voice | Description |
|----|-------|-------------|
| 25 | bm_george | Authoritative, RP |
| 26 | bm_lewis | Confident, articulate |
| 27 | bm_daniel | Professional, clear |
| 28 | bm_fable | Storyteller, warm |

### Japanese Female (29-32)

| ID | Voice | Description |
|----|-------|-------------|
| 29 | jf_alpha | Standard Japanese female |
| 30 | jf_gongitsune | Character voice |
| 31 | jf_nezumi | Character voice |
| 32 | jf_tebukuro | Character voice |

### Japanese Male (33)

| ID | Voice | Description |
|----|-------|-------------|
| 33 | jm_kumo | Standard Japanese male |

### Chinese Female (34-41)

| ID | Voice | Description |
|----|-------|-------------|
| 34 | zf_xiaoxiao | Standard Chinese female |
| 35 | zf_xiaobei | Soft, gentle |
| 36 | zf_xiaoni | Young, bright |
| 37 | zf_xiaoyi | Clear, articulate |
| 38 | zm_yunjian | Standard Chinese male |
| 39 | zm_yunxi | Warm, friendly |
| 40 | zm_yunxia | Gentle |
| 41 | zm_yunyang | Energetic |

## Voice Recommendations by Agent Type

| Agent Type | Recommended Voice ID | Why |
|------------|---------------------|-----|
| High-energy, fast-paced (Intern) | 4 (af_sky) | Bright, energetic |
| Warm, engaging (Writer) | 1 (af_heart) | Warm, friendly |
| Professional, grounded (Engineer) | 12 (am_michael) | Professional |
| Mischievous, playful (Pentester) | 13 (am_adam) | Youthful, energetic |
| Creative, dreamy (Artist) | 8 (af_nova) | Artistic |
| Sophisticated, precise (Designer) | 2 (af_bella) | Elegant, refined |
| Wise, academic (Architect) | 21 (bf_emma) | Sophisticated, British |
| Confident, articulate (Researcher) | 21 or 25 | British, educated |

## Testing

Test a voice with curl:

```bash
# Test voice ID 1 (af_heart - warm, friendly)
curl -s -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "This is a test of voice ID 1", "voice_id": "1"}'

# Test voice ID 13 (am_adam - youthful, energetic)
curl -s -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "This is a test of voice ID 13", "voice_id": "13"}'

# Test voice ID 21 (bf_emma - sophisticated British)
curl -s -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "This is a test of voice ID 21", "voice_id": "21"}'
```

## Implementation

The voice index is implemented in:
- `src/ts/constants/KOKORO_VOICES.ts` - Voice index definitions
- `src/ts/services/voice-loader.ts` - Voice resolution logic
- `src/ts/services/mlx-tts-client.ts` - TTS client integration

## Future Enhancements

- Add remaining Kokoro voices (French, Spanish, Italian, Portuguese, Hindi)
- Support prosody settings for Kokoro (limited to speed parameter)
- Voice preview endpoint for auditioning voices
