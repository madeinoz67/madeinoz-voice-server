#!/usr/bin/env python3
"""
Test MLX-audio with Python 3.13

This script tests MLX-audio compatibility with Python 3.13
by attempting to load and use Kokoro and Qwen3-TTS models.
"""

import json
import sys
import time


def test_python_version():
    """Check Python version"""
    print(f"Python version: {sys.version}")
    version = sys.version_info
    if version.major == 3 and version.minor >= 13:
        print("✓ Python 3.13+ detected - MLX-audio should work")
        return True
    else:
        print("⚠️  Python < 3.13 - may have compatibility issues")
        return False

def test_mlx_import():
    """Test MLX-audio import"""
    print("\n" + "="*60)
    print("Testing MLX-audio import...")
    print("="*60)

    try:
        import mlx.core as mx
        print(f"✓ MLX version: {mx.__version__}")
        # Check if Metal is available
        if hasattr(mx, 'metal'):
            print("✓ MLX Metal backend available")
        else:
            print("✓ MLX loaded (Metal check not available)")
    except ImportError as e:
        print(f"✗ MLX import failed: {e}")
        return False

    try:
        from mlx_audio.tts.utils import load_model  # noqa: F401
        print("✓ mlx_audio.tts.utils imported")
    except ImportError as e:
        print(f"✗ mlx_audio import failed: {e}")
        return False

    return True

def test_kokoro_model():
    """Test Kokoro-82M model (small, fast)"""
    print("\n" + "="*60)
    print("Testing Kokoro-82M model...")
    print("="*60)

    try:
        from mlx_audio.tts.utils import load_model

        print("Loading model (this may take a minute)...")
        start_time = time.time()

        model = load_model("mlx-community/Kokoro-82M-bf16")

        load_time = time.time() - start_time
        print(f"✓ Model loaded in {load_time:.2f}s")

        # Test synthesis
        print("Synthesizing test audio...")
        start_time = time.time()

        result = None
        for generation_result in model.generate(
            text="Hello, this is a test of the Kokoro text to speech model.",
            voice="af_heart",
            speed=1.0,
            lang_code="a",
        ):
            result = generation_result
            break

        if result:
            syn_time = time.time() - start_time
            print(f"✓ Synthesis complete in {syn_time:.2f}s")
            print(f"  Audio samples: {result.samples}")
            print(f"  Sample rate: {result.sample_rate}")
            print(f"  Duration: {result.audio_duration}")
            print(f"  RTF: {result.real_time_factor:.2f}x")

            # Save audio
            import numpy as np
            import soundfile as sf

            audio_array = result.audio
            if hasattr(audio_array, 'tolist'):
                audio_array = np.array(audio_array)

            output_path = "/tmp/mlx_kokoro_test_py313.wav"
            sf.write(output_path, audio_array, result.sample_rate)
            print(f"✓ Audio saved to: {output_path}")

            return {
                "success": True,
                "load_time": load_time,
                "synthesis_time": syn_time,
                "samples": result.samples,
                "sample_rate": result.sample_rate,
                "rtf": result.real_time_factor,
                "audio_file": output_path
            }
        else:
            print("✗ No audio generated")
            return {"success": False, "error": "No audio generated"}

    except Exception as e:
        print(f"✗ Kokoro test failed: {e}")
        import traceback
        traceback.print_exc()
        return {"success": False, "error": str(e)}

def test_qwen3_model():
    """Test Qwen3-TTS model"""
    print("\n" + "="*60)
    print("Testing Qwen3-TTS model...")
    print("="*60)

    try:
        from mlx_audio.tts.utils import load_model

        print("Loading model (this may take several minutes)...")
        start_time = time.time()

        model = load_model("mlx-community/Qwen3-TTS-12Hz-0.6B-Base-bf16")

        load_time = time.time() - start_time
        print(f"✓ Model loaded in {load_time:.2f}s")

        # Test synthesis
        print("Synthesizing test audio...")
        start_time = time.time()

        result = None
        for generation_result in model.generate(
            text="Hello, this is a test of the Qwen text to speech model.",
            voice="Chelsie",
            language="English",
        ):
            result = generation_result
            break

        if result:
            syn_time = time.time() - start_time
            print(f"✓ Synthesis complete in {syn_time:.2f}s")
            print(f"  Audio samples: {result.samples}")
            print(f"  Sample rate: {result.sample_rate}")
            print(f"  Duration: {result.audio_duration}")
            print(f"  RTF: {result.real_time_factor:.2f}x")

            # Save audio
            import numpy as np
            import soundfile as sf

            audio_array = result.audio
            if hasattr(audio_array, 'tolist'):
                audio_array = np.array(audio_array)

            output_path = "/tmp/mlx_qwen3_test_py313.wav"
            sf.write(output_path, audio_array, result.sample_rate)
            print(f"✓ Audio saved to: {output_path}")

            return {
                "success": True,
                "load_time": load_time,
                "synthesis_time": syn_time,
                "samples": result.samples,
                "sample_rate": result.sample_rate,
                "rtf": result.real_time_factor,
                "audio_file": output_path
            }
        else:
            print("✗ No audio generated")
            return {"success": False, "error": "No audio generated"}

    except Exception as e:
        print(f"✗ Qwen3 test failed: {e}")
        import traceback
        traceback.print_exc()
        return {"success": False, "error": str(e)}

def main():
    """Main test function"""
    print("="*60)
    print("MLX-Audio Python 3.13 Compatibility Test")
    print("="*60)

    results = {
        "python_version": sys.version,
        "python_compat": test_python_version(),
        "mlx_import": None,
        "kokoro": None,
        "qwen3": None
    }

    # Test MLX import
    results["mlx_import"] = test_mlx_import()

    if not results["mlx_import"]:
        print("\n❌ MLX-audio import failed - stopping tests")
        return results

    # Test Kokoro (smaller, faster)
    results["kokoro"] = test_kokoro_model()

    # Test Qwen3-TTS (if Kokoro worked)
    if results["kokoro"].get("success"):
        results["qwen3"] = test_qwen3_model()

    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)

    print(f"Python version: {results['python_version']}")
    print(f"MLX import: {'✓ PASS' if results['mlx_import'] else '✗ FAIL'}")
    print(f"Kokoro model: {'✓ PASS' if results['kokoro'].get('success') else '✗ FAIL'}")
    print(f"Qwen3-TTS model: {'✓ PASS' if results.get('qwen3', {}).get('success') else '✗ FAIL / SKIPPED'}")

    # Save results
    with open("/tmp/mlx_py313_test_results.json", "w") as f:
        json.dump(results, f, indent=2, default=str)
    print("\n📁 Results saved to: /tmp/mlx_py313_test_results.json")

    return results

if __name__ == "__main__":
    main()
