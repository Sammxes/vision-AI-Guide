import {
  LiveServerMessage,
  Blob as GenAIBlob,
} from '@google/genai';
import { Base64Media, AnalysisResult, TTSVoice } from '../types';

/**
 * Utility to decode a base64 string to a Uint8Array.
 */
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Utility to encode a Uint8Array to a base64 string.
 */
function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Decodes raw PCM audio data into an AudioBuffer.
 */
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

/**
 * Creates a GenAIBlob from Float32Array audio data.
 */
function createBlob(data: Float32Array): GenAIBlob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768; // Convert float to 16-bit integer
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000', // Supported audio MIME type
  };
}

/**
 * Interface for live session callbacks.
 */
interface LiveSessionCallbacks {
  onOpen?: () => void;
  onMessage: (
    message: LiveServerMessage,
    session: any, // Using any to avoid complex type mocking
  ) => Promise<void>;
  onError?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
}

// Mock Session class to mimic the GoogleGenAI LiveSession interface
class LiveSession {
  private ws: WebSocket;
  private callbacks: LiveSessionCallbacks;

  constructor(ws: WebSocket, callbacks: LiveSessionCallbacks) {
    this.ws = ws;
    this.callbacks = callbacks;

    this.ws.onopen = () => {
      this.callbacks.onOpen?.();
    };

    this.ws.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data) as LiveServerMessage;
        await this.callbacks.onMessage(message, this);
      } catch (e) {
        console.error('Error parsing WebSocket message:', e);
      }
    };

    this.ws.onerror = (event) => {
      this.callbacks.onError?.(event);
    };

    this.ws.onclose = (event) => {
      this.callbacks.onClose?.(event);
    };
  }

  sendRealtimeInput(input: { media: GenAIBlob }) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ realtimeInput: input }));
    }
  }

  sendToolResponse(response: any) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ toolResponse: response }));
    }
  }

  close() {
    this.ws.close();
  }
}

/**
 * Connects to the Gemini Live API via Backend Proxy.
 */
export async function connectLiveSession(
  callbacks: LiveSessionCallbacks,
  voiceName: TTSVoice,
): Promise<LiveSession> {
  // Determine WebSocket protocol based on current page protocol
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host; // Includes port if present
  const wsUrl = `${protocol}//${host}`;

  const ws = new WebSocket(wsUrl);
  // We can pass voiceName as a query param if we want to support dynamic voice config in the future
  // const ws = new WebSocket(`${wsUrl}?voice=${voiceName}`);

  return new Promise((resolve, reject) => {
    const session = new LiveSession(ws, callbacks);

    // Wait for open to resolve? Or just return session?
    // The original SDK connect returns a promise that resolves when connected.
    ws.addEventListener('open', () => {
      resolve(session);
    }, { once: true });

    ws.addEventListener('error', (e) => {
      reject(e);
    }, { once: true });
  });
}

/**
 * Generates speech from text using the Backend Proxy.
 */
export async function generateSpeech(text: string, voiceName: TTSVoice): Promise<string> {
  const response = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voiceName }),
  });

  if (!response.ok) {
    throw new Error(`TTS API failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.audioData;
}

/**
 * Helper function to handle analysis prompts with scene detection instructions via Backend Proxy.
 */
export async function analyzeSceneForNavigation(
  imageData: string,
  mimeType: string,
  location?: { latitude: number; longitude: number } | null
): Promise<string> {
  const response = await fetch('/api/analyze-scene', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageData, mimeType, location }),
  });

  if (!response.ok) {
    throw new Error(`Scene Analysis API failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.text;
}

/**
 * Generates an object description from an image using the Backend Proxy.
 */
export async function generateObjectDescription(
  imageData: string,
  mimeType: string,
  prompt: string,
): Promise<AnalysisResult> {
  const response = await fetch('/api/object-description', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageData, mimeType, prompt }),
  });

  if (!response.ok) {
    throw new Error(`Object Description API failed: ${response.statusText}`);
  }

  return await response.json();
}

export { decode, encode, decodeAudioData, createBlob };
