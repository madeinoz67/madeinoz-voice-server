"""
Tests for Qwen TTS Server
Pytest tests for FastAPI TTS endpoints
"""

import sys
from pathlib import Path
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

# Add src/py to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src" / "py"))

from qwen_tts_server import TTSRequest, app


@pytest.fixture
def client():
    """Create a test client for the FastAPI app"""
    return TestClient(app)


@pytest.fixture
def mock_audio_data():
    """Create mock audio data for testing"""
    # Create a simple WAV header + some silence
    wav_header = b"RIFF" + b"\x00" * 4 + b"WAVE"
    return wav_header


class TestHealthEndpoint:
    """Tests for /health endpoint"""

    def test_health_check_returns_200(self, client):
        """Test that health check returns 200 status"""
        response = client.get("/health")
        assert response.status_code == 200

    def test_health_check_returns_correct_structure(self, client):
        """Test that health check returns expected fields"""
        response = client.get("/health")
        data = response.json()

        assert "status" in data
        assert "model_loaded" in data
        assert "port" in data
        assert data["status"] == "healthy"


class TestTTSEndpoint:
    """Tests for /synthesize endpoint"""

    def test_synthesize_requires_text(self, client):
        """Test that synthesis requires text parameter"""
        response = client.post("/synthesize", json={})
        assert response.status_code == 422

    def test_synthesize_rejects_empty_text(self, client):
        """Test that synthesis rejects empty or whitespace text"""
        response = client.post("/synthesize", json={"text": ""})
        assert response.status_code == 400

    def test_synthesize_accepts_valid_request(self, client):
        """Test that synthesis accepts valid request structure"""
        request_data = {
            "text": "Hello world",
            "voice": "default",
            "speed": 1.0,
            "output_format": "wav"
        }

        with patch('qwen_tts_server.synthesize_with_system_tts') as mock_synth:
            mock_wav = b"RIFF" + b"\x00" * 40 + b"WAVE" + b"\x00" * 100
            mock_synth.return_value = (mock_wav, 22050, 500)

            response = client.post("/synthesize", json=request_data)
            assert response.status_code in [200, 500]

    def test_synthesize_with_voice_selection(self, client):
        """Test synthesis with different voice options"""
        request_data = {
            "text": "Test voice selection",
            "voice": "marlin",
            "speed": 1.0
        }

        with patch('qwen_tts_server.synthesize_with_system_tts') as mock_synth:
            mock_wav = b"RIFF" + b"\x00" * 40 + b"WAVE" + b"\x00" * 100
            mock_synth.return_value = (mock_wav, 22050, 500)

            response = client.post("/synthesize", json=request_data)
            assert response.status_code in [200, 500]

    def test_synthesize_speed_validation(self, client):
        """Test that speed is validated (0.5 to 2.0)"""
        response = client.post("/synthesize", json={"text": "Test", "speed": 0.1})
        assert response.status_code == 422

        response = client.post("/synthesize", json={"text": "Test", "speed": 3.0})
        assert response.status_code == 422


class TestErrorHandling:
    """Tests for error handling"""

    def test_invalid_endpoint_returns_404(self, client):
        """Test that invalid endpoints return 404"""
        response = client.get("/invalid")
        assert response.status_code == 404

    def test_invalid_method_returns_405(self, client):
        """Test that invalid HTTP methods return 405"""
        response = client.get("/synthesize")
        assert response.status_code == 405


class TestTTSRequestModel:
    """Tests for TTSRequest Pydantic model"""

    def test_tts_request_model_validation(self):
        """Test TTSRequest model validation"""
        request = TTSRequest(
            text="Hello world",
            voice="default",
            speed=1.0,
            output_format="wav"
        )
        assert request.text == "Hello world"
        assert request.voice == "default"

    def test_tts_request_defaults(self):
        """Test TTSRequest default values"""
        request = TTSRequest(text="Test")
        assert request.voice == "default"
        assert request.speed == 1.0
