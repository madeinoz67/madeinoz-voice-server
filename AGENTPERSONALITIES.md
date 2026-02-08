# PAI Agent Voice Personalities

Voice configurations for PAI agents using the MLX-audio Kokoro TTS voice server.

## Voice Configuration Format

Each agent personality includes:
- **Description**: Character and tone
- **Kokoro Voice ID**: Numeric ID (1-41) for the Kokoro voice
- **Prosody**: Speaking style guidance
- **Speed**: Speaking rate (0.5-2.0, where 1.0 is normal)

## Core Agents

### DAIV (Default AI Voice)

**Description:** Primary voice for PAI - warm, professional, and clear

**Kokoro Voice ID:** 12 (am_michael) - Professional male

**Prosody:** speak with moderate consistency, speak in a neutral tone, speak at a normal pace

**Speed:** 1.0

**Use Case:** General assistance, technical explanations, structured responses

---

### Jeremy - The Enthusiastic Researcher

**Description:** High-energy, excited delivery for discoveries and breakthroughs

**Kokoro Voice ID:** 4 (af_sky) - Bright, energetic female

**Prosody:** speak with high expressiveness, speak in an excited tone, speak quickly

**Speed:** 1.1

**Use Case:** Research findings, exciting discoveries, breakthrough moments

---

### Daniel - The Analytical Skeptic

**Description:** Measured, intellectual delivery with British authority

**Kokoro Voice ID:** 21 (bf_emma) - Sophisticated British female

**Prosody:** speak with high consistency, speak in a subdued tone, speak deliberately

**Speed:** 0.95

**Use Case:** Critical analysis, questioning assumptions, Devil's advocate

---

### Aria - The Creative Visionary

**Description:** Expressive and versatile for creative ideation

**Kokoro Voice ID:** 8 (af_nova) - Artistic, dreamy female

**Prosody:** speak with moderate expressiveness, speak in a dynamic tone, vary pace

**Speed:** 1.05

**Use Case:** Brainstorming, creative writing, artistic exploration

---

### Marcus - The Professional Leader

**Description:** Authoritative and confident for project leadership

**Kokoro Voice ID:** 12 (am_michael) - Professional male

**Prosody:** speak with consistency, speak in a controlled tone, speak steadily

**Speed:** 1.0

**Use Case:** Project management, status updates, decision summaries

---

### Rachel - The Supportive Analyst

**Description:** Calm and warm for guidance and learning

**Kokoro Voice ID:** 1 (af_heart) - Warm, friendly female

**Prosody:** speak with moderate consistency, speak gently, speak at a gentle pace

**Speed:** 0.95

**Use Case:** Tutorials, explanations, supportive feedback

---

## Specialist Agents

### Codanna - Code Intelligence

**Kokoro Voice ID:** 15 (am_liam) - Clear, confident male

**Speed:** 1.0

**Use Case:** Code analysis, symbol lookup, technical explanations

---

### QATester - Quality Assurance

**Kokoro Voice ID:** 14 (am_eric) - Friendly, warm male

**Speed:** 1.05

**Use Case:** Test results, bug reports, verification outcomes

---

### Architect - System Design

**Kokoro Voice ID:** 25 (bm_george) - Authoritative British male

**Speed:** 0.95

**Use Case:** Architecture decisions, design patterns, system planning

---

### Designer - UX/UI Design

**Kokoro Voice ID:** 2 (af_bella) - Elegant, refined female

**Speed:** 1.0

**Use Case:** Design feedback, UX guidance, visual recommendations

---

## Voice Selection Guide

### By Agent Personality Type

| Personality Type | Recommended ID | Voice |
|-----------------|----------------|-------|
| **High-energy/enthusiastic** | 4, 9, 13 | af_sky, af_alloy, am_adam |
| **Professional/steady** | 1, 12, 14 | af_heart, am_michael, am_eric |
| **Academic/analytical** | 21, 25, 27 | bf_emma, bm_george, bm_daniel |
| **Creative/expressive** | 8, 10 | af_nova, af_aoede |
| **Supportive/calm** | 1, 7, 24 | af_heart, af_kore, bf_lily |
| **Technical/precise** | 3, 5, 15 | af_nicole, af_sarah, am_liam |

### By Gender Preference

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

## Complete Voice Reference

See `docs/VOICE_QUICK_REF.md` for a complete table of all 41 Kokoro voices with descriptions and use cases.

## Configuration File Location

This file should be located at: `~/.claude/AGENTPERSONALITIES.md`

## Testing Voices

To test different voices before assigning to agents:

```bash
# Test voice ID 1 (warm female)
curl -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "This is a test of voice 1", "voice_id": "1"}'

# Test voice ID 12 (professional male)
curl -X POST http://localhost:8888/notify \
  -H "Content-Type": application/json" \
  -d '{"message": "This is a test of voice 12", "voice_id": "12"}'

# Test voice ID 21 (British female)
curl -X POST http://localhost:8888/notify \
  -H "Content-Type": application/json" \
  -d '{"message": "This is a test of voice 21", "voice_id": "21"}'
```

## Adding New Agent Personalities

To add a new agent personality:

```markdown
### Agent Name

**Description:** Brief character description

**Kokoro Voice ID:** NN (voice_name) - Voice description

**Prosody:** speak with [adjectives], speak in a [tone] tone, speak [pace]

**Speed:** N.N

**Use Case:** When to use this voice
```

Replace the placeholders with appropriate values:
- **NN**: Voice ID number (1-41)
- **N.N**: Speed (0.5-2.0, where 1.0 is normal)

## Notes

- All voice IDs must be between 1-41 (Kokoro built-in voices)
- Speed values below 1.0 are slower, above 1.0 are faster
- Prosody guidance helps the voice server adjust speaking style
- Test voices before assigning to ensure they match the agent personality
