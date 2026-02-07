#!/usr/bin/env python3
"""Simple Kokoro test for Python 3.13"""

import time

print("Testing MLX-audio Kokoro with Python 3.13...")

# Import
from mlx_audio.tts.utils import load_model  # noqa: E402

print("✓ MLX-audio imported")

# Load model
print("Loading Kokoro-82M...")
start = time.time()
model = load_model("mlx-community/Kokoro-82M-bf16")
print(f"✓ Model loaded in {time.time()-start:.2f}s")

# Generate
print("Generating audio...")
start = time.time()

result = None
for r in model.generate(
    text="Hello world.",
    voice="af_heart",
    speed=1.0,
    lang_code="a",
):
    result = r
    break

if result:
    print(f"✓ Generated {result.samples} samples in {time.time()-start:.2f}s")
    print(f"  Duration: {result.audio_duration}")
    print(f"  RTF: {result.real_time_factor:.2f}x")

    # Save
    import numpy as np
    import soundfile as sf
    audio = np.array(result.audio)
    sf.write("/tmp/kokoro_py313_test.wav", audio, result.sample_rate)
    print("✓ Saved to /tmp/kokoro_py313_test.wav")
else:
    print("✗ No result")

print("\n✓ TEST COMPLETE")
