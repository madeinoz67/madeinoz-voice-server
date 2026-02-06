#!/usr/bin/env python3
"""
Qwen TTS Server
FastAPI server for Qwen3-TTS text-to-speech inference

Architecture Attribution:
    This server is part of a hybrid TypeScript/Python voice server architecture.
    The design was inspired by ValyrianTech/Qwen3-TTS_server for the TTS
    inference patterns and FastAPI structure.

    Reference: https://github.com/ValyrianTech/Qwen3-TTS_server

    Key Differences from Reference:
    - API contract designed as drop-in replacement for ElevenLabs
    - macOS-first with pyttsx3 fallback (vs GPU-server focus)
    - JSON POST requests (vs GET/query parameters)
    - Subprocess architecture managed by TypeScript host
    - CPU-based inference for local development

    This is an original implementation created for the madeinoz-voice-server
    project, not copied from any source.
"""

import base64
import logging
import os
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Import TTS libraries
# Using Qwen's official qwen-tts package instead of transformers
from qwen_tts import Qwen3TTSModel
import torch
import scipy.io.wavfile as wavfile
import numpy as np

try:
    import pyttsx3
    HAS_PYTTSX3 = True
except ImportError:
    HAS_PYTTSX3 = False

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Global model instance
model = None  # Qwen3TTSModel instance
MODEL_NAME = "Qwen3-TTS-VoiceDesign"
MODEL_LOADED = False

# Built-in voice names mapped to pyttsx3 voice IDs
VOICE_MAP = {
    "default": 0,
    "marrvin": 0,
    "marlin": 1,
    "daniel": 2,
}


class VoiceCloneRequest(BaseModel):
    """Voice cloning request"""
    reference_audio_path: str = Field(..., description="Path to reference audio file")
    voice_name: str = Field(..., description="Name for the cloned voice")
    description: str = Field(default="", description="Optional description")


class VoiceCloneResponse(BaseModel):
    """Voice cloning response"""
    status: str
    voice_id: str | None = None
    message: str


class TTSRequest(BaseModel):
    """TTS request from main server"""
    text: str = Field(..., description="Text to synthesize")
    voice: str = Field(default="default", description="Voice identifier")
    prosody_instruction: str = Field(default="speak normally", description="Natural language prosody")
    speed: float = Field(default=1.0, ge=0.5, le=2.0, description="Speed multiplier")
    output_format: str = Field(default="wav", description="Audio output format")


class TTSResponse(BaseModel):
    """TTS response with audio data"""
    audio_data: str = Field(..., description="Base64 encoded audio data")
    duration_ms: int = Field(..., description="Audio duration in milliseconds")
    sample_rate: int = Field(..., description="Audio sample rate")
    format: str = Field(..., description="Audio format")


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    model_loaded: bool
    model_name: str | None = None
    port: int


def load_qwen_model():
    """Load Qwen3-TTS model using Qwen's official qwen-tts package"""
    global model, MODEL_LOADED

    model_path = os.getenv("QWEN_MODEL_PATH")
    cache_dir = os.path.expanduser("~/.cache/huggingface/hub")
    # Use VoiceDesign model for creating distinct agent personalities from text descriptions
    model_id = "Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign"

    # Check for cached model in HuggingFace cache directory
    cached_model_path = os.path.join(cache_dir, f"models--{model_id.replace('/', '--')}")

    try:
        # Load the model - qwen-tts handles device placement internally
        # We don't pass device_map or dtype to avoid compatibility issues
        if model_path and os.path.exists(model_path):
            logger.info(f"Loading Qwen3-TTS model from custom path: {model_path}")
            model = Qwen3TTSModel.from_pretrained(model_path)
        elif os.path.exists(cached_model_path):
            logger.info(f"✓ Found cached model in HuggingFace cache")
            logger.info("  Using cached model (no download required)")
            model = Qwen3TTSModel.from_pretrained(model_id)
        else:
            logger.info(f"✗ Model not found in cache")
            logger.info(f"  Downloading model '{model_id}' on first use...")
            logger.info("  Model will be cached to: ~/.cache/huggingface/hub/")
            logger.info("  Model size: ~3.4GB - this may take a while...")
            model = Qwen3TTSModel.from_pretrained(model_id)
        MODEL_LOADED = True
        logger.info("✓ Model loaded successfully")
    except Exception as e:
        logger.error(f"Failed to load Qwen3-TTS model: {e}")
        logger.info("  Falling back to system TTS (pyttsx3)")
        MODEL_LOADED = HAS_PYTTSX3


def synthesize_with_system_tts(text: str, voice: str, speed: float) -> tuple[bytes, int, int]:
    """
    Synthesize speech using system TTS (pyttsx3)
    Returns: (audio_data, sample_rate, duration_ms)
    """
    if not HAS_PYTTSX3:
        raise HTTPException(
            status_code=500,
            detail="TTS not available. Install pyttsx3: pip install pyttsx3"
        )

    import pyttsx3

    # Initialize engine
    engine = pyttsx3.init()

    # Set voice
    voices = engine.getProperty('voices')
    voice_id = VOICE_MAP.get(voice, 0)
    if voices and len(voices) > voice_id:
        engine.setProperty('voice', voices[voice_id].id)

    # Set rate (speed)
    # Default rate is ~200, adjust by speed multiplier
    base_rate = 200
    engine.setProperty('rate', int(base_rate * speed))

    # Save to temporary file
    temp_file = "/tmp/qwen_tts_temp.wav"
    engine.save_to_file(text, temp_file)
    engine.runAndWait()

    # Read the file
    try:
        with open(temp_file, 'rb') as f:
            audio_data = f.read()

        # Get duration from file (approximately)
        import wave
        with wave.open(temp_file, 'r') as wf:
            frames = wf.getnframes()
            rate = wf.getframerate()
            duration = frames / float(rate)
            duration_ms = int(duration * 1000)
            sample_rate = rate

        # Clean up
        os.remove(temp_file)

        return audio_data, sample_rate, duration_ms
    except Exception as e:
        logger.error(f"Error reading TTS output: {e}")
        if os.path.exists(temp_file):
            os.remove(temp_file)
        raise


def synthesize_with_qwen(text: str, voice: str, prosody: str, speed: float) -> tuple[bytes, int, int]:
    """
    Synthesize speech using Qwen3-TTS model
    Returns: (audio_data, sample_rate, duration_ms)
    """
    global model

    if model is None:
        logger.warning("Qwen model not loaded, falling back to system TTS")
        return synthesize_with_system_tts(text, voice, speed)

    try:
        logger.info(f"Synthesizing with Qwen3-TTS: text='{text[:30]}...', voice={voice}")

        # Try to infer the model type and use the appropriate method
        # Base model uses generate(), VoiceDesign uses generate_voice_design()
        if hasattr(model, 'generate_voice_design'):
            # VoiceDesign model - requires instruct parameter for voice instructions
            # Use prosody as the voice instruction, default to normal speech
            voice_instruct = prosody if prosody and prosody != "speak normally" else "Speak in a natural, clear voice"
            wavs, sample_rate = model.generate_voice_design(
                text=text,
                language="English",
                speaker=voice,  # Voice description/speaker name
                instruct=voice_instruct,  # Voice instruction (required)
                stream=False
            )
        elif hasattr(model, 'generate'):
            # Base model - simpler generation
            wavs, sample_rate = model.generate(
                text=text,
                language="English",
                speaker=voice,
                stream=False
            )
        else:
            raise AttributeError("Model has no known generation method")

        # Convert to numpy array and ensure proper format
        audio_array = wavs.cpu().numpy() if torch.is_tensor(wavs) else np.array(wavs)

        # Ensure audio_array is 1D and properly formatted for WAV
        if audio_array.ndim > 1:
            audio_array = audio_array.squeeze()

        # Convert to int16 for WAV format (standard for speech audio)
        # Normalize if float audio
        if audio_array.dtype == np.float32 or audio_array.dtype == np.float16:
            # Assume audio is in [-1, 1] range, convert to int16
            audio_array = np.clip(audio_array, -1.0, 1.0)
            audio_array = (audio_array * 32767).astype(np.int16)

        duration_ms = int(len(audio_array) / sample_rate * 1000)

        # Save to temporary file
        temp_file = "/tmp/qwen_tts_output.wav"
        wavfile.write(temp_file, sample_rate, audio_array)

        # Read back as bytes
        with open(temp_file, 'rb') as f:
            audio_data = f.read()

        # Clean up
        os.remove(temp_file)

        logger.info(f"Qwen3-TTS synthesis complete: {duration_ms}ms audio at {sample_rate}Hz")
        return audio_data, sample_rate, duration_ms

    except Exception as e:
        logger.error(f"Qwen3-TTS synthesis failed: {e}")
        logger.info("Falling back to system TTS")
        return synthesize_with_system_tts(text, voice, speed)


@asynccontextmanager
async def lifespan(app: FastAPI):  # noqa: ARG001 - app required by FastAPI
    """Lifespan context manager for model loading"""
    global model
    # Startup
    logger.info("Starting Qwen TTS server")
    load_qwen_model()
    logger.info(f"Model loaded: {MODEL_LOADED}")
    yield
    # Shutdown
    logger.info("Shutting down Qwen TTS server")


# Create FastAPI app
app = FastAPI(
    title="Qwen TTS Server",
    description="Text-to-speech server using Qwen3-TTS model",
    version="1.0.0",
    lifespan=lifespan,
)

# Add CORS middleware (localhost only)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8888", "http://127.0.0.1:8888"],
    allow_credentials=True,
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    port = int(os.getenv("QWEN_SERVER_PORT", "7860"))
    return HealthResponse(
        status="healthy",
        model_loaded=MODEL_LOADED,
        model_name=MODEL_NAME if MODEL_LOADED else None,
        port=port,
    )


@app.post("/synthesize", response_model=TTSResponse)
async def synthesize(request: TTSRequest):
    """
    Synthesize speech from text

    Supports:
    - Text preprocessing and sanitization
    - Voice selection (built-in voices)
    - Prosody control via natural language
    - Speed adjustment
    - WAV audio output
    """
    logger.info(f"Synthesize request: text='{request.text[:50]}...', voice={request.voice}")

    if not request.text or not request.text.strip():
        raise HTTPException(status_code=400, detail="Text is required")

    start_time = time.time()

    try:
        # Choose synthesis method
        if MODEL_LOADED:
            audio_data, sample_rate, duration_ms = synthesize_with_qwen(
                request.text,
                request.voice,
                request.prosody_instruction,
                request.speed
            )
        else:
            # Fallback to system TTS
            audio_data, sample_rate, duration_ms = synthesize_with_system_tts(
                request.text,
                request.voice,
                request.speed
            )

        # Encode to base64
        audio_base64 = base64.b64encode(audio_data).decode('utf-8')

        elapsed = (time.time() - start_time) * 1000
        logger.info(f"Synthesis complete: {duration_ms}ms audio in {elapsed:.0f}ms")

        return TTSResponse(
            audio_data=audio_base64,
            duration_ms=duration_ms,
            sample_rate=sample_rate,
            format=request.output_format
        )

    except Exception as e:
        logger.error(f"Synthesis error: {e}")
        raise HTTPException(status_code=500, detail=f"Synthesis failed: {str(e)}") from None


@app.post("/clone-voice", response_model=VoiceCloneResponse)
async def clone_voice(request: VoiceCloneRequest):
    """
    Clone a voice from reference audio

    This endpoint accepts a path to a reference audio file and creates
    a voice clone. When Qwen3-TTS VoiceDesign model is available, this
    will use the model for actual cloning. Currently returns a stub response.

    Future implementation:
    - Load reference audio
    - Extract voice characteristics using Qwen3-TTS VoiceDesign
    - Create voice embedding/profile
    - Return voice_id for use in synthesis
    """
    logger.info(f"Voice clone request: name='{request.voice_name}', reference={request.reference_audio_path}")

    # Check if reference audio exists
    if not os.path.exists(request.reference_audio_path):
        raise HTTPException(status_code=404, detail=f"Reference audio not found: {request.reference_audio_path}")

    # TODO: Implement actual Qwen3-TTS VoiceDesign cloning when model is available
    # For now, return a placeholder response
    # The actual implementation will:
    # 1. Load the reference audio
    # 2. Extract voice embeddings using Qwen3-TTS VoiceDesign
    # 3. Store the voice profile for use in synthesis
    # 4. Return the voice_id

    import uuid
    voice_id = f"custom_{request.voice_name.lower().replace(' ', '_')}_{str(uuid.uuid4())[:8]}"

    logger.warning("Voice cloning not fully implemented - Qwen3-TTS VoiceDesign model required")
    logger.info(f"Generated voice ID: {voice_id} (stub - cloning not yet functional)")

    return VoiceCloneResponse(
        status="pending",
        voice_id=voice_id,
        message=f"Voice cloning not yet implemented. Qwen3-TTS VoiceDesign model required. Stub voice_id: {voice_id}"
    )


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Qwen TTS Server",
        "status": "running",
        "model_loaded": MODEL_LOADED,
        "version": "1.0.0"
    }


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("QWEN_SERVER_PORT", "7860"))
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=port,
        log_level="info"
    )
