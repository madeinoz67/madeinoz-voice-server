# Voice Configuration Examples

This document provides practical examples for configuring voices in your PAI agents.

## Agent Personalities File

The main configuration file is `~/.claude/skills/Agents/AgentPersonalities.md`.

## Example Configurations

### Example 1: Professional Engineer

```json
{
  "voices": {
    "Engineer": {
      "voice_id": "12",
      "voice_name": "Marcus Webb",
      "name": "Marcus",
      "description": "Senior engineer, steady and reliable",
      "stability": 0.50,
      "similarity_boost": 0.80,
      "style": 0.0,
      "speed": 1.0,
      "use_speaker_boost": true,
      "type": "Premium"
    }
  }
}
```

**Voice 12 (am_michael)**: Professional, grounded American male - perfect for technical explanations.

### Example 2: High-Energy Intern

```json
{
  "voices": {
    "Intern": {
      "voice_id": "4",
      "voice_name": "Sky",
      "name": "Dev Patel",
      "description": "High-energy genius, fast learner",
      "stability": 0.18,
      "similarity_boost": 0.75,
      "style": 0.0,
      "speed": 1.2,
      "use_speaker_boost": true,
      "type": "Premium"
    }
  }
}
```

**Voice 4 (af_sky)**: Bright, energetic American female - matches high-energy personality.

### Example 3: Sophisticated Architect

```json
{
  "voices": {
    "Architect": {
      "voice_id": "21",
      "voice_name": "Emma",
      "name": "Serena Blackwood",
      "description": "Wise, academic, sees patterns",
      "stability": 0.75,
      "similarity_boost": 0.88,
      "style": 0.0,
      "speed": 0.9,
      "use_speaker_boost": true,
      "type": "Premium"
    }
  }
}
```

**Voice 21 (bf_emma)**: Sophisticated British female with RP accent - conveys wisdom and authority.

### Example 4: Playful Security Researcher

```json
{
  "voices": {
    "Pentester": {
      "voice_id": "13",
      "voice_name": "Adam",
      "name": "Rook Blackburn",
      "description": "Mischievous, finds vulnerabilities",
      "stability": 0.18,
      "similarity_boost": 0.85,
      "style": 0.0,
      "speed": 1.3,
      "use_speaker_boost": true,
      "type": "Enhanced"
    }
  }
}
```

**Voice 13 (am_adam)**: Youthful, energetic American male - playful and fun.

### Example 5: Creative Artist

```json
{
  "voices": {
    "Artist": {
      "voice_id": "8",
      "voice_name": "Nova",
      "name": "Priya Desai",
      "description": "Dreamy, follows creative tangents",
      "stability": 0.20,
      "similarity_boost": 0.52,
      "style": 0.0,
      "speed": 0.95,
      "use_speaker_boost": false,
      "type": "Premium"
    }
  }
}
```

**Voice 8 (af_nova)**: Artistic, dreamy American female - perfect for creative work.

## Personality-to-Voice Mapping Guide

### Analytical/Technical Agents

| Personality | Voice ID | Why |
|-------------|----------|-----|
| Engineer | 12 (am_michael) | Professional, grounded |
| Architect | 21 (bf_emma) | Wise, authoritative British |
| Researcher | 21 or 25 | Educated accent |
| Data Analyst | 3 (af_nicole) | Clear, professional |

### Creative/Artistic Agents

| Personality | Voice ID | Why |
|-------------|----------|-----|
| Artist | 8 (af_nova) | Artistic, dreamy |
| Designer | 2 (af_bella) | Elegant, refined |
| Writer | 1 (af_heart) | Warm, engaging |
| Content Creator | 6 (af_jessica) | Expressive |

### High-Energy/Fast Agents

| Personality | Voice ID | Why |
|-------------|----------|-----|
| Intern | 4 (af_sky) | Bright, energetic |
| Startup Founder | 13 (am_adam) | Youthful, fast |
| Product Manager | 9 (af_alloy) | Modern, crisp |
| Developer | 4 or 9 | Tech-focused |

### Security/Testing Agents

| Personality | Voice ID | Why |
|-------------|----------|-----|
| Pentester | 13 (am_adam) | Playful, mischievous |
| QA Tester | 14 (am_eric) | Friendly, thorough |
| Security Analyst | 16 (am_fenrir) | Deep, authoritative |

### Academic/Teaching Agents

| Personality | Voice ID | Why |
|-------------|----------|-----|
| Professor | 25 (bm_george) | Authoritative British |
| Tutor | 1 (af_heart) | Warm, encouraging |
| Academic Writer | 21 (bf_emma) | Sophisticated |
| Science Communicator | 12 (am_michael) | Professional, clear |

## Speed Recommendations by Agent Type

Different agent types benefit from different speaking speeds:

| Agent Type | Speed | Voice ID | Why |
|------------|-------|----------|-----|
| Fast-paced (Intern, Pentester) | 1.2-1.3 | 4, 13 | Match high energy |
| Normal (Engineer, Designer) | 1.0 | 1, 12 | Natural pace |
| Slower (Architect, Professor) | 0.85-0.95 | 21, 25 | Convey wisdom |
| Storytelling (Writer) | 0.9-1.0 | 1, 28 | Engaging but clear |

## Multi-Agent Voice Selection

When using multiple agents in parallel, choose distinct voices:

### Research Team Example

```json
{
  "voices": {
    "Researcher_1": {
      "voice_id": "3",
      "voice_name": "Nicole"
    },
    "Researcher_2": {
      "voice_id": "14",
      "voice_name": "Eric"
    },
    "Researcher_3": {
      "voice_id": "21",
      "voice_name": "Emma"
    }
  }
}
```

**Result**: Three distinct voices (professional female, friendly male, sophisticated British female).

### Debate Team Example

```json
{
  "voices": {
    "Debater_A": {
      "voice_id": "12",
      "voice_name": "Michael"
    },
    "Debater_B": {
      "voice_id": "25",
      "voice_name": "George"
    }
  }
}
```

**Result**: Two distinct male voices (American professional vs British authoritative).

## Testing Your Configuration

After updating `AGENTPERSONALITIES.md`, restart the voice server and test:

```bash
# Kill existing server
pkill -f "bun run src/ts/server.ts"

# Start with Kokoro backend
TTS_BACKEND=mlx bun run dev

# Test each agent voice
curl -X POST http://localhost:8889/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "This is the Engineer voice", "voice_id": "12"}'

curl -X POST http://localhost:8889/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "This is the Intern voice", "voice_id": "4"}'
```

## Common Patterns

### The "Enterprise" Suite

Professional voices for business contexts:

| Role | Voice ID | Voice Name |
|------|----------|------------|
| CEO | 16 (am_fenrir) | Deep, authoritative |
| CTO | 12 (am_michael) | Professional, technical |
| Designer | 2 (af_bella) | Elegant, refined |
| HR | 1 (af_heart) | Warm, friendly |

### The "Creative" Suite

Artistic voices for creative work:

| Role | Voice ID | Voice Name |
|------|----------|------------|
| Art Director | 8 (af_nova) | Artistic, dreamy |
| Copywriter | 6 (af_jessica) | Expressive |
| Brand Strategist | 21 (bf_emma) | Sophisticated |
| Content Creator | 4 (af_sky) | Bright, energetic |

### The "Academic" Suite

Educated voices for learning contexts:

| Role | Voice ID | Voice Name |
|------|----------|------------|
| Professor | 25 (bm_george) | Authoritative British |
| TA | 14 (am_eric) | Friendly, helpful |
| Librarian | 7 (af_kore) | Soft, gentle |
| Dean | 21 (bf_emma) | Sophisticated |
