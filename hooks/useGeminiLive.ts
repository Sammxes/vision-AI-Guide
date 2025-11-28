
import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage } from '@google/genai';
import { TTSVoice, ChatMessage, ToolCall, GroundingSource, Base64Media } from '../types';
import { connectLiveSession, generateSpeech, decodeAudioData, decode, createBlob, analyzeSceneForNavigation } from '../services/geminiService';

interface UseGeminiLiveProps {
  ttsVoice: TTSVoice;
  locationContext: {
    location: { latitude: number; longitude: number } | null;
    status: string;
    requestLocation: () => Promise<{ latitude: number; longitude: number } | null>;
  };
  getFrame: () => Promise<Base64Media | null>;
  onEmergencyTrigger: () => void;
}

export const useGeminiLive = ({ ttsVoice, locationContext, getFrame, onEmergencyTrigger }: UseGeminiLiveProps) => {
  const [isListening, setIsListening] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isAssistantActive, setIsAssistantActive] = useState(false);
  const [currentInputTranscription, setCurrentInputTranscription] = useState('');
  const [currentOutputTranscription, setCurrentOutputTranscription] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Refs
  const liveSessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);
  const playingSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef(0);
  const hasAIBeenInterruptedRef = useRef(false);

  // --- Helper Methods ---

  const addMessage = useCallback((msg: Omit<ChatMessage, 'timestamp'>) => {
    setMessages(prev => [...prev, { ...msg, timestamp: new Date().toLocaleTimeString() }]);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const playAudio = useCallback(async (base64Audio: string) => {
    if (!outputContextRef.current || !outputNodeRef.current) return;
    
    // Stop current audio to play new
    playingSourcesRef.current.forEach(s => s.stop());
    playingSourcesRef.current.clear();
    nextStartTimeRef.current = outputContextRef.current.currentTime;

    const buffer = await decodeAudioData(decode(base64Audio), outputContextRef.current, 24000, 1);
    const source = outputContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(outputNodeRef.current);
    source.addEventListener('ended', () => playingSourcesRef.current.delete(source));
    
    source.start(nextStartTimeRef.current);
    nextStartTimeRef.current += buffer.duration;
    playingSourcesRef.current.add(source);
  }, []);

  const speakAndLog = useCallback(async (text: string, isError = false, canSpeakIfAIResponding = true) => {
    // Suppression logic
    if (!canSpeakIfAIResponding) {
      if (hasAIBeenInterruptedRef.current || playingSourcesRef.current.size > 0) {
        addMessage({ type: 'ai', text }); // Log only
        return;
      }
    }

    addMessage({ type: 'ai', text });
    if (isError) console.error(text);

    try {
      const audio = await generateSpeech(text, ttsVoice);
      await playAudio(audio);
    } catch (e) {
      console.error('TTS failed', e);
    }
  }, [addMessage, playAudio, ttsVoice]);

  // --- Tools Implementation ---
  
  const executeWebSearch = async (query: string) => {
    window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank');
    await speakAndLog(`Searching for ${query}.`);
    return { result: 'Opened search.' };
  };

  const executeShopping = async (item: string) => {
    window.open(`https://www.amazon.com/s?k=${encodeURIComponent(item)}`, '_blank');
    await speakAndLog(`Shopping for ${item}.`);
    return { result: 'Opened shopping.' };
  };

  const executeNearby = async (query: string) => {
    if (!process.env.API_KEY) return { result: 'API Key missing.' };
    
    let loc = locationContext.location;

    // Request location if needed
    if (locationContext.status === 'idle' || locationContext.status === 'pending' || !loc) {
      await speakAndLog("I need your location. Please check your browser prompts.");
      loc = await locationContext.requestLocation();
    }

    if (!loc) {
      const msg = "I couldn't get your location. Nearby search failed.";
      await speakAndLog(msg, true);
      return { result: msg };
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: query,
        config: {
          tools: [{ googleMaps: {} }],
          toolConfig: { retrievalConfig: { latLng: loc } },
        },
      });
      
      const text = response.text;
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources = chunks
        .filter(c => c.maps?.uri && c.maps?.title)
        .map(c => ({ uri: c.maps!.uri, title: c.maps!.title }));

      addMessage({ type: 'ai', text, groundingSources: sources });
      await playAudio(await generateSpeech(text, ttsVoice));
      return { result: text };
    } catch (e) {
      const msg = "Failed to search nearby places.";
      await speakAndLog(msg, true);
      return { result: msg };
    }
  };

  const processToolCall = useCallback(async (call: ToolCall) => {
    addMessage({ type: 'tool_call', text: `Using ${call.name}`, toolCall: call });
    let response: any;
    
    try {
      if (call.name === 'webSearch' || call.name === 'navigateWeb') {
        response = await executeWebSearch(call.args.query || call.args.destination);
      } else if (call.name === 'onlineShoppingSearch') {
        response = await executeShopping(call.args.item);
      } else if (call.name === 'findNearbyPlaces') {
        response = await executeNearby(call.args.query);
      } else if (call.name === 'callEmergencyServices') {
        onEmergencyTrigger();
        await speakAndLog("Activating Emergency Dashboard.", false, false);
        response = { result: 'Emergency dashboard activated.' };
      } else if (call.name === 'describeEnvironment') {
        const frame = await getFrame();
        if (frame) {
            await speakAndLog("Analyzing your surroundings...", false, false);
            const description = await analyzeSceneForNavigation(frame.data, frame.mimeType, locationContext.location);
            response = { result: description };
        } else {
             response = { result: 'Unable to capture image. Please ensure the camera is enabled.' };
        }
      } else {
        response = { result: `Unknown tool ${call.name}` };
      }
    } catch (e) {
      console.error(e);
      response = { result: 'Tool execution failed.' };
    }

    if (liveSessionRef.current) {
      liveSessionRef.current.sendToolResponse({
        functionResponses: { id: call.id, name: call.name, response }
      });
    }
  }, [addMessage, speakAndLog, locationContext, ttsVoice, onEmergencyTrigger, getFrame]);

  // --- Live Session Handlers ---

  const handleMessage = useCallback(async (msg: LiveServerMessage, session: any) => {
    if (msg.serverContent?.inputTranscription) {
      setCurrentInputTranscription(prev => prev + msg.serverContent!.inputTranscription!.text);
    }
    
    if (msg.serverContent?.outputTranscription) {
      setCurrentOutputTranscription(prev => prev + msg.serverContent!.outputTranscription!.text);
    }

    if (msg.serverContent?.interrupted) {
      playingSourcesRef.current.forEach(s => s.stop());
      playingSourcesRef.current.clear();
      nextStartTimeRef.current = 0;
      hasAIBeenInterruptedRef.current = true;
      
      if (currentOutputTranscription) {
        addMessage({ type: 'ai', text: currentOutputTranscription + ' (Interrupted)' });
      }
      setCurrentOutputTranscription('');
    }

    if (msg.serverContent?.turnComplete) {
      if (currentInputTranscription) addMessage({ type: 'user', text: currentInputTranscription });
      if (currentOutputTranscription) addMessage({ type: 'ai', text: currentOutputTranscription });
      
      setCurrentInputTranscription('');
      setCurrentOutputTranscription('');
      hasAIBeenInterruptedRef.current = false;
    }

    const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
    if (audioData && outputContextRef.current) {
      // Streaming audio playback
      const buffer = await decodeAudioData(decode(audioData), outputContextRef.current, 24000, 1);
      const source = outputContextRef.current.createBufferSource();
      source.buffer = buffer;
      source.connect(outputNodeRef.current!);
      source.addEventListener('ended', () => playingSourcesRef.current.delete(source));
      
      const now = outputContextRef.current.currentTime;
      nextStartTimeRef.current = Math.max(nextStartTimeRef.current, now);
      source.start(nextStartTimeRef.current);
      nextStartTimeRef.current += buffer.duration;
      playingSourcesRef.current.add(source);
    }

    if (msg.toolCall) {
      for (const fc of msg.toolCall.functionCalls) {
        if (fc.name) {
          const toolCall: ToolCall = {
            name: fc.name,
            id: fc.id || 'unknown',
            args: (fc.args as Record<string, any>) || {}
          };
          await processToolCall(toolCall);
        }
      }
    }
  }, [currentInputTranscription, currentOutputTranscription, addMessage, processToolCall]);

  // --- Start/Stop ---

  const startSession = useCallback(async () => {
    setIsConnecting(true);
    try {
      // Init Audio Contexts
      const acIn = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const acOut = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = acIn;
      outputContextRef.current = acOut;
      
      const gain = acOut.createGain();
      gain.connect(acOut.destination);
      outputNodeRef.current = gain;

      // Mic Stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = acIn.createMediaStreamSource(stream);
      const processor = acIn.createScriptProcessor(4096, 1, 1);
      
      inputSourceRef.current = source;
      processorRef.current = processor;

      // Connect Live
      const session = await connectLiveSession({
        onOpen: () => {
          setIsConnecting(false);
          setIsListening(true);
          setIsAssistantActive(true);
        },
        onMessage: handleMessage,
        onError: (e) => {
            console.error(e);
            setIsConnecting(false);
            setIsListening(false);
        },
        onClose: () => {
            setIsListening(false);
        }
      }, ttsVoice);

      liveSessionRef.current = session;

      // Audio Processing Loop
      processor.onaudioprocess = (e) => {
        const data = e.inputBuffer.getChannelData(0);
        session.sendRealtimeInput({ media: createBlob(data) });
      };

      source.connect(processor);
      processor.connect(acIn.destination);

    } catch (e) {
      console.error(e);
      setIsConnecting(false);
      addMessage({ type: 'ai', text: 'Connection failed. Check permissions.' });
    }
  }, [ttsVoice, handleMessage, speakAndLog]);

  const stopSession = useCallback(() => {
    setIsListening(false);
    setIsAssistantActive(false);
    
    if (liveSessionRef.current) liveSessionRef.current.close();
    if (inputSourceRef.current) inputSourceRef.current.disconnect();
    if (processorRef.current) processorRef.current.disconnect();
    if (audioContextRef.current) audioContextRef.current.close();
    if (outputContextRef.current) outputContextRef.current.close();
    
    liveSessionRef.current = null;
  }, []);

  const stopSpeaking = useCallback(() => {
    playingSourcesRef.current.forEach(s => s.stop());
    playingSourcesRef.current.clear();
    hasAIBeenInterruptedRef.current = true;
  }, []);

  // Send video frame helper
  const sendVideoFrame = useCallback((frame: Base64Media) => {
    if (liveSessionRef.current) {
      liveSessionRef.current.sendRealtimeInput({ media: frame });
    }
  }, []);

  return {
    isListening,
    isConnecting,
    isAssistantActive,
    messages,
    currentInputTranscription,
    currentOutputTranscription,
    startSession,
    stopSession,
    stopSpeaking,
    speakAndLog,
    sendVideoFrame,
    clearMessages,
  };
};
