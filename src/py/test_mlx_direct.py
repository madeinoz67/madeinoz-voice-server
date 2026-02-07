#!/usr/bin/env python3
"""
Test MLX Qwen3-TTS direct loading
"""

import gc
import time
import tracemalloc

from mlx_audio.tts.models.qwen3.qwen3 import Model, ModelConfig
from mlx_audio.tts.utils import get_model_path


def test_mlx_qwen_direct():
    """Test loading and using MLX Qwen3-TTS directly"""

    print("Loading MLX Qwen3-TTS model directly...")

    gc.collect()
    tracemalloc.start()
    start_time = time.time()

    try:
        # Get model path
        model_id = "mlx-community/Qwen3-TTS-12Hz-0.6B-Base-bf16"
        model_path = get_model_path(model_id)

        print(f"Model path: {model_path}")

        # Load config from JSON directly (Transformers doesn't know qwen3_tts)
        import json
        with open(model_path / "config.json") as f:
            config_dict = json.load(f)

        print(f"Config keys: {list(config_dict.keys())[:10]}")

        # Get talker config (nested structure)
        talker_config = config_dict.get("talker_config", {})
        code_predictor_config = talker_config.get("code_predictor_config", {})

        # Create ModelConfig with parameters from talker_config
        model_config = ModelConfig(
            hidden_size=talker_config.get("hidden_size", 1024),
            num_hidden_layers=talker_config.get("num_hidden_layers", 5),
            intermediate_size=talker_config.get("intermediate_size", 3072),
            num_attention_heads=talker_config.get("num_attention_heads", 16),
            rms_norm_eps=talker_config.get("rms_norm_eps", 1e-6),
            vocab_size=config_dict.get("vocab_size", 151669),
            num_key_value_heads=talker_config.get("num_key_value_heads", 8),
            max_position_embeddings=talker_config.get("max_position_embeddings", 65536),
            rope_theta=talker_config.get("rope_theta", 1000000),
            head_dim=talker_config.get("head_dim", 128),
            tie_word_embeddings=code_predictor_config.get("tie_word_embeddings", False),
            tokenizer_name=str(model_path),
            model_type="qwen3_tts",
            sample_rate=24000,
        )

        print("ModelConfig created")

        # Create model
        model = Model(model_config)

        print("Model created, loading weights...")

        # Load weights directly
        model.load_weights(str(model_path / "model.safetensors"))

        print("Weights loaded")

        load_time = time.time() - start_time
        print(f"✓ Model loaded in {load_time:.2f}s")

        tracemalloc.stop()
        return True

    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()
        tracemalloc.stop()
        return False


if __name__ == "__main__":
    test_mlx_qwen_direct()
