#!/usr/bin/env python3
"""
Benchmark MLX-audio vs qwen-tts

Compares performance metrics:
- Model load time
- Inference time
- Memory usage
- Audio quality (via waveform comparison)
"""

import gc
import json
import time
import tracemalloc
from typing import Any

import numpy as np
import soundfile as sf
import torch


def get_system_memory_mb() -> float:
    """Get current process memory usage in MB."""
    import psutil
    process = psutil.Process()
    return process.memory_info().rss / 1024 / 1024


class QwenTTSBenchmark:
    """Benchmark Qwen TTS using qwen-tts package"""

    def __init__(self):
        self.model = None
        self.model_loaded = False

    def load_model(self):
        """Load Qwen3-TTS model using qwen-tts package"""
        gc.collect()
        tracemalloc.start()

        start_mem = get_system_memory_mb()
        start_time = time.time()

        try:
            from qwen_tts import Qwen3TTSModel

            model_id = "Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign"
            self.model = Qwen3TTSModel.from_pretrained(model_id)

            # Try MPS (Apple Silicon)
            if hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
                try:
                    self.model.device = "mps"
                    self.model.model = self.model.model.to("mps")
                    device = "mps"
                except Exception:
                    device = "cpu"
            else:
                device = "cpu"

            self.model_loaded = True
            load_time = time.time() - start_time
            end_mem = get_system_memory_mb()
            mem_used = end_mem - start_mem

            tracemalloc.stop()

            return {
                "load_time_seconds": round(load_time, 2),
                "memory_mb": round(mem_used, 2),
                "device": device,
                "success": True
            }
        except Exception as e:
            tracemalloc.stop()
            return {
                "load_time_seconds": 0,
                "memory_mb": 0,
                "device": "error",
                "success": False,
                "error": str(e)
            }

    def synthesize(self, text: str = "Hello, this is a test of the text to speech system.") -> dict[str, Any]:
        """Synthesize speech and return metrics"""
        if not self.model_loaded:
            return {"success": False, "error": "Model not loaded"}

        gc.collect()
        tracemalloc.start()

        start_mem = get_system_memory_mb()
        start_time = time.time()

        try:
            # qwen-tts VoiceDesign model uses generate_voice_design
            wavs, sample_rate = self.model.generate_voice_design(
                text=text,
                language="English",
                speaker="marrvin",
                instruct="Speak in a natural, clear voice",
                stream=False
            )

            # Convert to numpy
            audio_array = wavs.cpu().numpy() if torch.is_tensor(wavs) else np.array(wavs)
            if audio_array.ndim > 1:
                audio_array = audio_array.squeeze()

            # Convert to int16
            if audio_array.dtype == np.float32 or audio_array.dtype == np.float16:
                audio_array = np.clip(audio_array, -1.0, 1.0)
                audio_array = (audio_array * 32767).astype(np.int16)

            inference_time = time.time() - start_time
            end_mem = get_system_memory_mb()
            mem_used = end_mem - start_mem
            duration_seconds = len(audio_array) / sample_rate
            rtf = inference_time / duration_seconds  # Real-time factor

            tracemalloc.stop()

            return {
                "success": True,
                "inference_time_seconds": round(inference_time, 2),
                "audio_duration_seconds": round(duration_seconds, 2),
                "real_time_factor": round(rtf, 2),
                "peak_memory_mb": round(mem_used, 2),
                "sample_rate": sample_rate,
                "samples": len(audio_array),
                "audio_array": audio_array
            }
        except Exception as e:
            tracemalloc.stop()
            return {
                "success": False,
                "error": str(e)
            }


class MLXAUDIOBenchmark:
    """Benchmark Qwen TTS using MLX-audio"""

    def __init__(self):
        self.model = None
        self.model_loaded = False
        self.model_type = None

    def load_model(self):
        """Load Qwen3-TTS model using MLX-audio"""
        gc.collect()
        tracemalloc.start()

        start_mem = get_system_memory_mb()
        start_time = time.time()

        try:
            from mlx_audio.utils import load_model

            # Try multiple MLX models in order of preference
            # 1. Qwen3-TTS 0.6B Base (smaller, faster)
            # 2. Kokoro (well-tested fallback)
            models_to_try = [
                ("mlx-community/Qwen3-TTS-12Hz-0.6B-Base-bf16", "qwen"),
                ("mlx-community/Kokoro-82M-bf16", "kokoro"),
            ]

            self.model = None
            self.model_type = None

            for model_id, model_type in models_to_try:
                try:
                    print(f"    Trying {model_id}...", end="", flush=True)
                    self.model = load_model(model_id)
                    self.model_type = model_type
                    print(" ✓")
                    break
                except Exception as e:
                    print(f" ✗ ({str(e)[:50]}...)")

            if self.model is None:
                raise Exception("All MLX models failed to load")

            self.model_loaded = True
            load_time = time.time() - start_time
            end_mem = get_system_memory_mb()
            mem_used = end_mem - start_mem

            tracemalloc.stop()

            return {
                "load_time_seconds": round(load_time, 2),
                "memory_mb": round(mem_used, 2),
                "device": "mlx (Apple Silicon)",
                "success": True
            }
        except Exception as e:
            tracemalloc.stop()
            return {
                "load_time_seconds": 0,
                "memory_mb": 0,
                "device": "error",
                "success": False,
                "error": str(e)
            }

    def synthesize(self, text: str = "Hello, this is a test of the text to speech system.") -> dict[str, Any]:
        """Synthesize speech and return metrics"""
        if not self.model_loaded:
            return {"success": False, "error": "Model not loaded"}

        gc.collect()
        tracemalloc.start()

        start_mem = get_system_memory_mb()
        start_time = time.time()

        try:
            import mlx.core as mx

            # MLX-audio generate returns a generator
            result = None

            # Handle different model types
            if self.model_type == "kokoro":
                # Kokoro uses lang_code parameter
                for generation_result in self.model.generate(
                    text=text,
                    voice="af_heart",  # American female voice
                    speed=1.0,
                    lang_code="a",  # American English
                ):
                    result = generation_result
                    break
            else:
                # Qwen and others
                for generation_result in self.model.generate(
                    text=text,
                    voice="Chelsie",
                    language="English",
                ):
                    result = generation_result
                    break

            if result is None:
                raise Exception("No audio generated")

            # Get audio from result
            audio_array = result.audio
            if isinstance(audio_array, mx.array):
                audio_array = np.array(audio_array)

            # Convert to int16 if needed
            if audio_array.dtype == np.float32 or audio_array.dtype == np.float16:
                audio_array = np.clip(audio_array, -1.0, 1.0)
                audio_array = (audio_array * 32767).astype(np.int16)

            inference_time = time.time() - start_time
            end_mem = get_system_memory_mb()
            mem_used = end_mem - start_mem

            duration_seconds = result.samples / result.sample_rate
            rtf = inference_time / duration_seconds

            tracemalloc.stop()

            return {
                "success": True,
                "inference_time_seconds": round(inference_time, 2),
                "audio_duration_seconds": round(duration_seconds, 2),
                "real_time_factor": round(rtf, 2),
                "peak_memory_mb": round(mem_used, 2),
                "sample_rate": result.sample_rate,
                "samples": result.samples,
                "audio_array": audio_array
            }
        except Exception as e:
            tracemalloc.stop()
            return {
                "success": False,
                "error": str(e)
            }


def save_audio(audio_array: np.ndarray, sample_rate: int, path: str):
    """Save audio array to WAV file"""
    sf.write(path, audio_array, sample_rate)


def compare_waveforms(arr1: np.ndarray, arr2: np.ndarray) -> dict[str, float]:
    """Compare two waveforms and return similarity metrics"""
    # Normalize lengths
    min_len = min(len(arr1), len(arr2))
    arr1_norm = arr1[:min_len].astype(float)
    arr2_norm = arr2[:min_len].astype(float)

    # Normalize amplitudes
    arr1_norm = arr1_norm / (np.max(np.abs(arr1_norm)) + 1e-8)
    arr2_norm = arr2_norm / (np.max(np.abs(arr2_norm)) + 1e-8)

    # Correlation
    correlation = np.corrcoef(arr1_norm, arr2_norm)[0, 1]

    # MSE
    mse = np.mean((arr1_norm - arr2_norm) ** 2)

    return {
        "correlation": round(correlation, 4),
        "mse": round(mse, 6)
    }


def run_benchmark() -> dict[str, Any]:
    """Run full benchmark comparing both implementations"""
    test_text = "Hello, this is a test of the text to speech system."

    results = {
        "test_text": test_text,
        "qwen_tts": {},
        "mlx_audio": {},
        "comparison": {}
    }

    print("=" * 60)
    print("BENCHMARK: qwen-tts vs MLX-audio")
    print("=" * 60)

    # Benchmark qwen-tts
    print("\n[1/4] Loading qwen-tts model...")
    qwen = QwenTTSBenchmark()
    qwen_load = qwen.load_model()
    results["qwen_tts"]["load"] = qwen_load

    if qwen_load["success"]:
        print(f"  ✓ Loaded in {qwen_load['load_time_seconds']}s")
        print(f"  ✓ Memory: {qwen_load['memory_mb']} MB")
        print(f"  ✓ Device: {qwen_load['device']}")

        print("\n[2/4] Running qwen-tts inference...")
        qwen_syn = qwen.synthesize(test_text)
        results["qwen_tts"]["synthesis"] = qwen_syn

        if qwen_syn["success"]:
            print(f"  ✓ Inference: {qwen_syn['inference_time_seconds']}s")
            print(f"  ✓ Audio: {qwen_syn['audio_duration_seconds']}s")
            print(f"  ✓ RTF: {qwen_syn['real_time_factor']}x")
            print(f"  ✓ Memory: {qwen_syn['peak_memory_mb']} MB")

            # Save audio for comparison
            save_audio(
                qwen_syn["audio_array"],
                qwen_syn["sample_rate"],
                "/tmp/qwen_benchmark_qwen.wav"
            )
            print("  ✓ Saved: /tmp/qwen_benchmark_qwen.wav")
        else:
            print(f"  ✗ Error: {qwen_syn.get('error')}")
    else:
        print(f"  ✗ Failed: {qwen_load.get('error')}")

    # Clean up before loading MLX
    del qwen
    gc.collect()

    # Initialize MLX results to avoid UnboundLocalError
    mlx_syn = {"success": False}

    # Benchmark MLX-audio
    print("\n[3/4] Loading MLX-audio model...")
    mlx = MLXAUDIOBenchmark()
    mlx_load = mlx.load_model()
    results["mlx_audio"]["load"] = mlx_load

    if mlx_load["success"]:
        print(f"  ✓ Loaded in {mlx_load['load_time_seconds']}s")
        print(f"  ✓ Memory: {mlx_load['memory_mb']} MB")
        print(f"  ✓ Device: {mlx_load['device']}")

        print("\n[4/4] Running MLX-audio inference...")
        mlx_syn = mlx.synthesize(test_text)
        results["mlx_audio"]["synthesis"] = mlx_syn

        if mlx_syn["success"]:
            print(f"  ✓ Inference: {mlx_syn['inference_time_seconds']}s")
            print(f"  ✓ Audio: {mlx_syn['audio_duration_seconds']}s")
            print(f"  ✓ RTF: {mlx_syn['real_time_factor']}x")
            print(f"  ✓ Memory: {mlx_syn['peak_memory_mb']} MB")

            # Save audio for comparison
            save_audio(
                mlx_syn["audio_array"],
                mlx_syn["sample_rate"],
                "/tmp/qwen_benchmark_mlx.wav"
            )
            print("  ✓ Saved: /tmp/qwen_benchmark_mlx.wav")
        else:
            print(f"  ✗ Error: {mlx_syn.get('error')}")
    else:
        print(f"  ✗ Failed: {mlx_load.get('error')}")

    # Comparison
    if (qwen_syn.get("success") and mlx_syn.get("success") and
        qwen_load.get("success") and mlx_load.get("success")):

        print("\n" + "=" * 60)
        print("COMPARISON RESULTS")
        print("=" * 60)

        # Speed comparison
        speedup = qwen_syn["inference_time_seconds"] / mlx_syn["inference_time_seconds"]
        print("\n📊 Inference Speed:")
        print(f"   qwen-tts:  {qwen_syn['inference_time_seconds']}s")
        print(f"   MLX-audio: {mlx_syn['inference_time_seconds']}s")
        print(f"   Speedup:   {speedup:.2f}x {'✓' if speedup > 1 else '✗'}")

        # Memory comparison
        mem_reduction = (qwen_syn["peak_memory_mb"] / mlx_syn["peak_memory_mb"])
        print("\n💾 Memory Usage:")
        print(f"   qwen-tts:  {qwen_syn['peak_memory_mb']} MB")
        print(f"   MLX-audio: {mlx_syn['peak_memory_mb']} MB")
        print(f"   Reduction: {mem_reduction:.2f}x {'✓' if mem_reduction > 1 else '✗'}")

        # RTF comparison (lower is better)
        print("\n⏱️  Real-Time Factor:")
        print(f"   qwen-tts:  {qwen_syn['real_time_factor']}x")
        print(f"   MLX-audio: {mlx_syn['real_time_factor']}x")
        print(f"   {'✓ MLX is faster' if mlx_syn['real_time_factor'] < qwen_syn['real_time_factor'] else '✗ qwen-tts is faster'}")

        # Waveform comparison
        waveform_comp = compare_waveforms(
            qwen_syn["audio_array"],
            mlx_syn["audio_array"]
        )
        print("\n🎵 Audio Similarity:")
        print(f"   Correlation: {waveform_comp['correlation']}")
        print(f"   MSE: {waveform_comp['mse']}")

        results["comparison"] = {
            "speedup": round(speedup, 2),
            "memory_reduction": round(mem_reduction, 2),
            "faster_backend": "mlx_audio" if mlx_syn["inference_time_seconds"] < qwen_syn["inference_time_seconds"] else "qwen_tts",
            "waveform_correlation": waveform_comp["correlation"],
            "waveform_mse": waveform_comp["mse"]
        }

        # Recommendation
        print("\n" + "=" * 60)
        if speedup > 1.2 and mem_reduction > 1.5:
            print("✅ RECOMMENDATION: MLX-audio is SIGNIFICANTLY better")
            print(f"   - {speedup:.1f}x faster inference")
            print(f"   - {mem_reduction:.1f}x lower memory")
        elif speedup > 1.0:
            print("✓ RECOMMENDATION: MLX-audio is moderately better")
        else:
            print("⚠️  RECOMMENDATION: qwen-tts may be better for this use case")
        print("=" * 60)

    return results


if __name__ == "__main__":
    results = run_benchmark()

    # Save results to JSON
    with open("/tmp/qwen_benchmark_results.json", "w") as f:
        # Remove audio arrays from JSON
        save_results = {
            k: v for k, v in results.items()
            if k != "qwen_tts" and k != "mlx_audio" or
            not any("audio_array" in str(v2) for v2 in (v.values() if isinstance(v, dict) else []))
        }
        json.dump(save_results, f, indent=2)

    print("\n📁 Results saved to: /tmp/qwen_benchmark_results.json")
