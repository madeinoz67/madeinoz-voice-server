# PAI Agent Voice Design Profiles

Voice design prompts for Qwen3-TTS VoiceDesign model based on PAI agent personalities.

## Voice Profiles

### Jeremy - The Enthusiastic Researcher

**Personality:** Energetic, excited, high-energy delivery
**Traits:** enthusiastic, energetic, dynamic
**Voice Design Prompt:**
```
Male, 20s, energetic American-Irish accent, fast-paced speech with dramatic pauses,
highly expressive with wide pitch variation, enthusiastic tone, excitable and dynamic,
talks quickly when excited, uses emphasis for important points
```
**Prosody Settings:**
- Stability: 0.35 (very expressive)
- Style: 0.50 (dramatic)
- Speed: 1.10 (fast)

---

### Daniel - The Analytical Skeptic

**Personality:** Measured, intellectual, British authority
**Traits:** analytical, skeptical, intellectual, authoritative
**Voice Design Prompt:**
```
Male, 40s, deep British accent, BBC anchor style, measured and deliberate delivery,
authoritative yet questioning tone, precise articulation with slight pauses for emphasis,
intellectual gravitas, speaks with confidence and weight
```
**Prosody Settings:**
- Stability: 0.70 (consistent)
- Style: 0.10 (subtle)
- Speed: 0.95 (measured)

---

### Aria - The Creative Visionary

**Personality:** Expressive, versatile, young creative energy
**Traits:** creative, dynamic, expressive, playful
**Voice Design Prompt:**
```
Female, 20s, expressive young American voice, highly versatile with wide emotional range,
upbeat and energetic with natural enthusiasm, creative flair in delivery, animated and engaging,
friendly with bright intonation, uses pitch variation for emphasis
```
**Prosody Settings:**
- Stability: 0.40 (expressive)
- Style: 0.40 (dynamic)
- Speed: 1.05 (energetic)

---

### Marcus - The Professional Leader

**Personality:** Authoritative, confident, professional
**Traits:** authoritative, professional, confident, leader
**Voice Design Prompt:**
```
Male, 40s, confident American male, authoritative professional delivery, calm and composed,
projects leadership and experience, measured speech with deliberate pacing, warm but firm,
inspires confidence through steady delivery
```
**Prosody Settings:**
- Stability: 0.60 (consistent)
- Style: 0.20 (controlled)
- Speed: 1.00 (steady)

---

### Rachel - The Supportive Analyst

**Personality:** Calm, warm, supportive
**Traits:** supportive, calm, warm, friendly
**Voice Design Prompt:**
```
Female, 30s, calm American voice, warm and soothing delivery, supportive and encouraging,
gentle tone with natural friendliness, measured pace that invites trust, empathetic and caring,
clear articulation with soft edges
```
**Prosody Settings:**
- Stability: 0.55 (balanced)
- Style: 0.15 (natural)
- Speed: 0.95 (gentle)

## Usage with Voice Server

### Using Voice Design Prompts

When the VoiceDesign model is fully implemented, you can use these prompts directly:

```typescript
// Jeremy - Enthusiastic Researcher
await ttsClient.synthesize({
  text: "I found something amazing in the data!",
  voice_design: "Male, 20s, energetic American-Irish accent, fast-paced speech..."
});

// Daniel - Analytical Skeptic
await ttsClient.synthesize({
  text: "I'm not convinced by this argument.",
  voice_design: "Male, 40s, deep British accent, BBC anchor style..."
});
```

### Current Implementation (pyttsx3 Fallback)

For now, the voice server uses pyttsx3 with mapped voice IDs:

```bash
# Test different voices via /notify endpoint
curl -X POST http://localhost:8889/notify \
  -H "Content-Type: application/json" \
  -d '{"title": "Test", "message": "Hello Stephen", "voice_id": "marrvin"}'
```

## Future Implementation

Once Qwen VoiceDesign is integrated:

1. Store voice design prompts in configuration
2. Add `/voice-design` endpoint for dynamic voice creation
3. Cache generated voice embeddings for efficiency
4. Support runtime voice characteristic modification
