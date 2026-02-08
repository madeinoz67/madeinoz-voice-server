# Voice Configuration Guide

This guide explains how to configure voices for your PAI agents using the Kokoro TTS system.

## Quick Start

To set a voice for an agent, use a **numeric voice ID** (1-41):

```json
{
  "voice_id": "1"
}
```

That's it! Voice ID `1` gives you a warm, friendly American female voice.

## Understanding Voice IDs

The voice server uses **Kokoro-82M**, a fast text-to-speech model with 41 built-in voices. Instead of remembering complex voice names, you simply use a number:

| ID | Voice | Description | Best For |
|----|-------|-------------|----------|
| 1 | af_heart | Warm, friendly female | General assistant |
| 4 | af_sky | Bright, energetic female | High-energy tasks |
| 12 | am_michael | Professional male | Technical explanations |
| 13 | am_adam | Youthful, energetic male | Playful interactions |
| 21 | bf_emma | Sophisticated British female | Academic content |

See the [Quick Reference](VOICE_QUICK_REF.md) for all 41 voices.

## How to Configure Voices

### Option 1: Agent Personalities File

Edit `~/.claude/skills/Agents/AgentPersonalities.md`:

```json
{
  "voices": {
    "Engineer": {
      "voice_id": "12",
      "voice_name": "Professional Male",
      "description": "Marcus Webb - steady, reliable engineer"
    },
    "Intern": {
      "voice_id": "4",
      "voice_name": "Energetic Female",
      "description": "High-energy genius"
    }
  }
}
```

### Option 2: Voice ID in Request

When sending notifications:

```bash
curl -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello!", "voice_id": "1"}'
```

### Option 3: Environment Variable

Set a default voice:

```bash
export DEFAULT_VOICE_ID="1"
```

## Choosing the Right Voice

### By Agent Personality

| Agent Type | Recommended IDs | Why |
|------------|----------------|-----|
| **High-energy/fast** | 4, 9, 13 | Bright, energetic delivery |
| **Professional/steady** | 1, 12, 14 | Warm but grounded |
| **Academic/wise** | 21, 25 | Sophisticated British accent |
| **Creative/artistic** | 8, 10 | Dreamy, expressive |
| **Mischievous/playful** | 13, 19 | Youthful, fun |

### By Gender

**Female Voices:**
- American: IDs 1-11
- British: IDs 21-24
- Japanese: IDs 29-32
- Chinese: IDs 34-37

**Male Voices:**
- American: IDs 12-20
- British: IDs 25-28
- Japanese: ID 33
- Chinese: IDs 38-41

### By Accent

| Accent | Voice IDs | Characteristics |
|--------|-----------|----------------|
| American | 1-20 | Casual, friendly, diverse |
| British | 21-28 | Sophisticated, educated |
| Japanese | 29-33 | Native pronunciation |
| Chinese | 34-41 | Native pronunciation |

## Voice Descriptions

### American Female (1-11)

- **#1 af_heart** - Warm, friendly (default, great all-rounder)
- **#2 af_bella** - Elegant, refined
- **#3 af_nicole** - Professional, clear
- **#4 af_sky** - Bright, energetic
- **#5 af_sarah** - Clear, articulate
- **#6 af_jessica** - Expressive
- **#7 af_kore** - Soft, gentle
- **#8 af_nova** - Artistic, dreamy
- **#9 af_alloy** - Modern, crisp
- **#10 af_aoede** - Musical, lyrical
- **#11 af_river** - Flowing, calm

### American Male (12-20)

- **#12 am_michael** - Professional, grounded
- **#13 am_adam** - Youthful, energetic
- **#14 am_eric** - Friendly, warm
- **#15 am_liam** - Clear, confident
- **#16 am_fenrir** - Deep, authoritative
- **#17 am_echo** - Resonant
- **#18 am_onyx** - Bold, strong
- **#19 am_puck** - Playful
- **#20 am_santa** - Jolly, warm

### British Female (21-24)

- **#21 bf_emma** - Sophisticated, RP accent
- **#22 bf_isabella** - Elegant, proper
- **#23 bf_alice** - Clear, educated
- **#24 bf_lily** - Soft, gentle

### British Male (25-28)

- **#25 bm_george** - Authoritative, RP
- **#26 bm_lewis** - Confident, articulate
- **#27 bm_daniel** - Professional, clear
- **#28 bm_fable** - Storyteller, warm

### Japanese (29-33)

- **#29 jf_alpha** - Standard Japanese female
- **#30-32** - Character voices
- **#33 jm_kumo** - Standard Japanese male

### Chinese (34-41)

- **#34 zf_xiaoxiao** - Standard Chinese female
- **#35-37** - Variations (soft, young, clear)
- **#38-41** - Male voices (standard, warm, gentle, energetic)

## Testing Voices

Try different voices to find your favorite:

```bash
# Test voice 1 (warm female)
curl -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "This is voice 1, warm and friendly", "voice_id": "1"}'

# Test voice 12 (professional male)
curl -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "This is voice 12, professional and grounded", "voice_id": "12"}'

# Test voice 21 (British female)
curl -X POST http://localhost:8888/notify \
  -H "Content-Type": application/json" \
  -d '{"message": "This is voice 21, sophisticated British", "voice_id": "21"}'
```

## Troubleshooting

**Voice not changing?**
- Restart the voice server after changing `AGENTPERSONALITIES.md`
- Check that the voice ID is a number between 1-41

**Audio quality issues?**
- Make sure AirPods or speakers are connected
- Check server logs for errors

**Need more voices?**
- Currently 41 Kokoro voices available
- More languages (French, Spanish, etc.) coming soon

## Advanced Configuration

### Speed Adjustment

Voice speed can be adjusted in the MLX client configuration:

```json
{
  "speed": 1.0
}
```

- `0.8` = Slower
- `1.0` = Normal (default)
- `1.2` = Faster

### Streaming Quality

For smoother audio, adjust streaming interval:

```bash
export MLX_STREAMING_INTERVAL="0.3"  # 300ms chunks (default)
```

Lower values = smoother streaming but more CPU usage.

## Next Steps

1. Browse the [Quick Reference](VOICE_QUICK_REF.md) for all voices
2. Test different voice IDs to find your favorites
3. Update your agent configurations with chosen voices
4. Refer to [KOKORO_VOICES.md](KOKORO_VOICES.md) for technical details
