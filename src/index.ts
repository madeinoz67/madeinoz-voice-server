/**
 * madeinoz-voice-server
 * TTS service using Qwen TTS model
 */

export interface TTSRequest {
  text: string;
  voice?: string;
  speed?: number;
}

export interface TTSResponse {
  audio: Uint8Array;
  format: string;
}

/**
 * Main TTS service class
 */
export class VoiceServer {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Convert text to speech using Qwen TTS model
   */
  async synthesize(request: TTSRequest): Promise<TTSResponse> {
    // TODO: Implement Qwen TTS API call
    throw new Error("Not yet implemented");
  }
}

/**
 * Initialize the voice server
 */
export function createServer(apiKey?: string): VoiceServer {
  const key = apiKey || process.env.HUGGINGFACE_API_KEY;
  if (!key) {
    throw new Error("HUGGINGFACE_API_KEY environment variable is required");
  }
  return new VoiceServer(key);
}
