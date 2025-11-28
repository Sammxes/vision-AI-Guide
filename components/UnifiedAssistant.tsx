
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from './Button';
import {
  ChatMessage,
  FindNearbyPlacesArgs,
  GroundingSource,
  OnlineShoppingSearchArgs,
  TTSVoice,
  ToolCall,
  WebSearchArgs,
  VisualPaneMode,
  AnalysisResult,
  Base64Media,
  BoundingBox,
} from '../types';
import { GoogleGenAI } from '@google/genai';
import { Spinner } from './Spinner';
import CameraVisualizer, { CameraVisualizerRef } from './CameraVisualizer';
import About from './About'; // About component is now here
import { generateObjectDescription } from '../services/geminiService'; // Import API services

interface UnifiedAssistantProps {
  // Global App State & Controls
  showVisualPane: boolean;
  setShowVisualPane: React.Dispatch<React.SetStateAction<boolean>>;
  visualPaneMode: VisualPaneMode;
  setVisualPaneMode: React.Dispatch<React.SetStateAction<VisualPaneMode>>;
  // Removed showAnalysisDetails as it's now implicitly true
  // Removed setShowAnalysisDetails as it's now implicitly true

  // Voice Assistant Props
  messages: ChatMessage[];
  addMessage: (message: Omit<ChatMessage, 'timestamp'>) => void;
  speakAndLog: (text: string, isError?: boolean, canSpeakIfAIResponding?: boolean) => Promise<void>;
  isListening: boolean;
  isLoading: boolean; // For global connection loading
  isAssistantActive: boolean; // For global assistant activity (after greeting)
  currentInputTranscription: string;
  currentOutputTranscription: string;
  liveSession: Awaited<ReturnType<GoogleGenAI['live']['connect']>> | null;
  ttsVoice: TTSVoice;
  setTtsVoice: React.Dispatch<React.SetStateAction<TTSVoice>>;
  executeWebSearch: (query: string) => Promise<{ result: string }>;
  executeOnlineShoppingSearch: (item: string) => Promise<{ result: string }>;
  executeFindNearbyPlaces: (query: string) => Promise<{ result: string }>;
  startListening: () => Promise<void>;
  stopListening: () => void;
  handleStopSpeaking: () => void;
  appGeolocationStatus: 'idle' | 'pending' | 'granted' | 'denied' | 'unsupported';
  locationError: string | null;
  enableGeolocation: () => Promise<void>;

  // Camera Visualizer (Object Detector) Props
  webcamStream: MediaStream | null;
  webcamEnabled: boolean;
  facingMode: 'user' | 'environment';
  hasMultipleCameras: boolean;
  onEnableWebcam: (mode: 'user' | 'environment') => Promise<void>;
  onDisableWebcam: () => void;
  onToggleCamera: () => void;
  appShowConsentPrompt: boolean;
  setAppShowConsentPrompt: React.Dispatch<React.SetStateAction<boolean>>;
  appTorchEnabled: boolean;
  appCameraHasTorch: boolean;
  onToggleTorch: () => void;
  lowLightDetectedRef: React.MutableRefObject<boolean>;
  cameraVisualizerIsRealtimeActiveRef: React.MutableRefObject<boolean>; // Prop from App.tsx
  cameraVisualizerFrameCaptureRef: React.MutableRefObject<(() => Promise<Base64Media | null>) | null>;
}

export const UnifiedAssistant: React.FC<UnifiedAssistantProps> = ({
  // Global App State & Controls
  showVisualPane,
  setShowVisualPane,
  visualPaneMode,
  setVisualPaneMode,
  // Removed showAnalysisDetails
  // Removed setShowAnalysisDetails

  // Voice Assistant Props
  messages,
  addMessage,
  speakAndLog,
  isListening,
  isLoading,
  isAssistantActive,
  currentInputTranscription,
  currentOutputTranscription,
  liveSession,
  ttsVoice,
  setTtsVoice,
  executeWebSearch,
  executeOnlineShoppingSearch,
  executeFindNearbyPlaces,
  startListening,
  stopListening,
  handleStopSpeaking,
  appGeolocationStatus,
  locationError,
  enableGeolocation,

  // Camera Visualizer (Object Detector) Props
  webcamStream,
  webcamEnabled,
  facingMode,
  hasMultipleCameras,
  onEnableWebcam,
  onDisableWebcam,
  onToggleCamera,
  appShowConsentPrompt,
  setAppShowConsentPrompt,
  appTorchEnabled,
  appCameraHasTorch,
  onToggleTorch,
  lowLightDetectedRef,
  cameraVisualizerIsRealtimeActiveRef, // From App.tsx
  cameraVisualizerFrameCaptureRef, // New prop
}) => {
  // Local UI states for UnifiedAssistant
  const [showChatHistory, setShowChatHistory] = useState(true); // Maybe toggle this later

  // Settings state (now global settings for voice, geolocation, etc. handled here)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  // Removed wakeWord state and related logic as it's no longer used for assistant activation
  const [wakeWord, setWakeWord] = useState<string>('Gemini Activate'); // Still keep for local storage consistency but not functional

  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const savedTheme = localStorage.getItem('chatTheme') as 'light' | 'dark';
    return savedTheme || 'dark';
  });

  // CameraVisualizer's internal analysis results (lifted up to UnifiedAssistant)
  const [cameraAnalysisResult, setCameraAnalysisResult] = useState<AnalysisResult | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraAnalysisLoading, setIsCameraAnalysisLoading] = useState(false);
  const [highlightedElement, setHighlightedElement] = useState<{ type: 'object' | 'face'; index: number } | null>(null);
  // Real-time detection status for CameraVisualizer, managed here
  const [isRealtimeActive, setIsRealtimeActive] = useState(false);

  // Refs for CameraVisualizer's internal elements (only cameraCanvasRef remains)
  const cameraCanvasRef = useRef<HTMLCanvasElement | null>(null); 
  const cameraVisualizerDisplayAreaRef = useRef<CameraVisualizerRef>(null); // Ref for CameraVisualizer's main display area

  // --- UnifiedAssistant: CameraVisualizer Action Handlers ---
  // The handleToggleRealtimeDetection function is removed as live detection is now implicit.

  // --- Update App.tsx's cameraVisualizerIsRealtimeActiveRef ---
  useEffect(() => {
    cameraVisualizerIsRealtimeActiveRef.current = isRealtimeActive;
  }, [isRealtimeActive, cameraVisualizerIsRealtimeActiveRef]);

  // Effect to manage selection mode status when realtime status changes
  // This effect is now irrelevant as selection mode is removed, but kept for cleanup/conceptual consistency.
  useEffect(() => {
    if (isRealtimeActive) {
      // If any selection-related states existed, they would be cleared here.
      // For now, it just ensures no conflicts with a removed feature.
      // Removed the speakAndLog here as it would be redundant.
    }
  }, [isRealtimeActive]); // Removed speakAndLog dependency


  useEffect(() => {
    try {
      localStorage.setItem('wakeWord', wakeWord); // Still save for consistency, but not functional
    } catch (error) {
      console.error('Failed to load wake word from localStorage', error);
    }
  }, [wakeWord]);

  // Effect to save theme to localStorage
  useEffect(() => {
    localStorage.setItem('chatTheme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'dark' ? 'light' : 'dark'));
  };

  // Define theme classes for the chat interface
  const chatThemeClasses = {
    dark: {
      container: 'bg-gray-900',
      placeholder: 'text-gray-400',
      message: {
        user: 'bg-indigo-600 text-white self-end',
        ai: 'bg-gray-700 text-gray-100 self-start',
        tool_call: 'bg-purple-800 text-purple-100 self-start',
      },
      speakerLabel: 'text-gray-300',
      toolText: 'text-purple-100',
      toolCode: 'bg-purple-900 text-purple-200',
      groundingSource: 'bg-gray-800 hover:bg-gray-700 text-gray-200',
      timestamp: 'text-gray-400',
      transcribing: {
        user: 'bg-indigo-700 text-white self-end',
        ai: 'bg-gray-600 text-gray-200 self-start',
      },
    },
    light: {
      container: 'bg-gray-100',
      placeholder: 'text-gray-500',
      message: {
        user: 'bg-blue-500 text-white self-end',
        ai: 'bg-gray-200 text-gray-800 self-start',
        tool_call: 'bg-purple-200 text-purple-800 self-start',
      },
      speakerLabel: 'text-gray-600',
      toolText: 'text-purple-800',
      toolCode: 'bg-purple-100 text-purple-700',
      groundingSource: 'bg-gray-200 hover:bg-gray-300 text-gray-700',
      timestamp: 'text-gray-500',
      transcribing: {
        user: 'bg-blue-400 text-white self-end',
        ai: 'bg-gray-300 text-gray-700 self-start',
      },
    },
  };

  // Select the current theme based on state
  const currentTheme = chatThemeClasses[theme];

  // Removed handleQuickAction as Quick Actions buttons are removed.

  const clearVisualPane = useCallback(() => {
    setShowVisualPane(false);
    setVisualPaneMode(VisualPaneMode.Hidden);
    // showAnalysisDetails is now implicitly true when visual pane is active, so no need to manage directly
    // setShowAnalysisDetails(false); // Removed

    // Clear Camera Visualizer states
    setCameraAnalysisResult(null);
    setCameraError(null);
    setIsCameraAnalysisLoading(false);
    setIsRealtimeActive(false); // Reset realtime status
    setHighlightedElement(null);
    onDisableWebcam(); // Disable webcam if it was active when hiding

    speakAndLog('Hiding visual pane and disabling webcam.', false, false); // canSpeakIfAIResponding: false

  }, [setShowVisualPane, setVisualPaneMode, onDisableWebcam, 
      setCameraAnalysisResult, setCameraError, setIsCameraAnalysisLoading,
      setIsRealtimeActive, setHighlightedElement, speakAndLog
  ]);

  // Handle changing visual pane mode
  const handleToggleVisualPane = useCallback(async () => {
    if (showVisualPane) {
      clearVisualPane(); // This already handles disabling webcam and stopping realtime
    } else {
      // clearVisualPane(); // No need to clear first, just setting new state
      setShowVisualPane(true);
      setVisualPaneMode(VisualPaneMode.Camera); // Default to camera
      // showAnalysisDetails is now implicitly true for camera mode
      setIsRealtimeActive(true); // Automatically start real-time detection
      
      if (!webcamEnabled) {
        setAppShowConsentPrompt(true); // This will trigger the consent prompt in App.tsx
        // App.tsx will then call onEnableWebcam if consent is granted
      } else {
        // If webcam is already enabled, just ensure it's re-enabled for the correct mode
        onEnableWebcam(facingMode);
      }
      speakAndLog('Showing camera visualizer and enabling webcam.', false, false); // canSpeakIfAIResponding: false
    }
  }, [showVisualPane, clearVisualPane, webcamEnabled, setAppShowConsentPrompt, setShowVisualPane, setVisualPaneMode, 
      setIsRealtimeActive, onEnableWebcam, facingMode, speakAndLog]);


  // Voice command processing logic
  useEffect(() => {
    if (currentInputTranscription && isAssistantActive) {
      const lowerCaseInput = currentInputTranscription.toLowerCase();
      let commandHandled = false;

      // Visual Pane Mode Commands
      if (
        lowerCaseInput.includes('show visuals') || 
        lowerCaseInput.includes('open visuals') || 
        lowerCaseInput.includes('show camera') || 
        lowerCaseInput.includes('open camera') ||
        lowerCaseInput.includes('enable camera') ||
        lowerCaseInput.includes('enable the camera')
      ) {
        if (!showVisualPane) { // Only toggle if not already visible
          handleToggleVisualPane(); // This will enable webcam and start realtime
        } else if (visualPaneMode === VisualPaneMode.Camera) {
          speakAndLog('Camera visualizer is already open.', false, false); // canSpeakIfAIResponding: false
        }
        commandHandled = true;
      } else if (
        lowerCaseInput.includes('hide visuals') || 
        lowerCaseInput.includes('close visuals') || 
        lowerCaseInput.includes('hide visual pane') || 
        lowerCaseInput.includes('close visual pane') ||
        lowerCaseInput.includes('disable camera') ||
        lowerCaseInput.includes('disable the camera')
      ) {
        if (showVisualPane) {
          handleToggleVisualPane(); // This will disable webcam and stop realtime
        } else {
          speakAndLog('Visual pane is already hidden.', false, false); // canSpeakIfAIResponding: false
        }
        commandHandled = true;
      } 
      // Removed voice commands for 'show analysis details' and 'hide analysis details'

      // Camera Visualizer specific actions (only if in Camera mode and visible)
      if (visualPaneMode === VisualPaneMode.Camera && showVisualPane) {
        // Removed voice commands for 'start live detection' and 'stop live detection'
        // Removed voice commands for 'enable webcam' and 'disable webcam'
        
        if (lowerCaseInput.includes('switch camera')) {
          if (hasMultipleCameras) {
            speakAndLog('Switching camera.', false, false); // canSpeakIfAIResponding: false
            onToggleCamera();
            commandHandled = true;
          } else {
            speakAndLog("This device does not have multiple cameras to switch between.", true); // canSpeakIfAIResponding: true for error
            commandHandled = true;
          }
        } else if (lowerCaseInput.includes('turn on flash') || lowerCaseInput.includes('enable flash')) {
          if (appCameraHasTorch && !appTorchEnabled) {
            speakAndLog('Turning on the flashlight.', false, false); // canSpeakIfAIResponding: false
            onToggleTorch();
            commandHandled = true;
          } else if (appTorchEnabled) {
            speakAndLog('The flashlight is already on.', false, false); // canSpeakIfAIResponding: false
            commandHandled = true;
          } else {
            speakAndLog('This camera does not have a flashlight or it is not enabled.', true); // canSpeakIfAIResponding: true for error
            commandHandled = true;
          }
        } else if (lowerCaseInput.includes('turn off flash') || lowerCaseInput.includes('disable flash')) {
          if (appCameraHasTorch && appTorchEnabled) {
            speakAndLog('Turning off the flashlight.', false, false); // canSpeakIfAIResponding: false
            onToggleTorch();
            commandHandled = true;
          } else if (!appTorchEnabled) {
            speakAndLog('The flashlight is already off.', false, false); // canSpeakIfAIResponding: false
            commandHandled = true;
          } else {
            speakAndLog('This camera does not have a flashlight or it is not enabled.', true); // canSpeakIfAIResponding: true for error
            commandHandled = true;
          }
        }
      }

      if (commandHandled) {
         // This is handled by App.tsx's `turnComplete` now, no need to clear here explicitly.
      }
    }
  }, [
    currentInputTranscription, isAssistantActive, speakAndLog, visualPaneMode, showVisualPane,
    handleToggleVisualPane, webcamEnabled, isRealtimeActive,
    hasMultipleCameras, onToggleCamera, appCameraHasTorch, appTorchEnabled, onToggleTorch,
    // Removed setShowAnalysisDetails, handleToggleRealtimeDetection, setAppShowConsentPrompt, onDisableWebcam, onEnableWebcam
  ]);


  // Status Indicator logic (moved from App.tsx)
  let statusIndicator;
  if (isListening) {
    if (currentInputTranscription) {
      statusIndicator = (
        <div className="flex flex-col items-center justify-center text-center">
          <div className="relative h-16 w-16 flex items-center justify-center">
            <div className="absolute h-4 w-4 rounded-full bg-indigo-400 animate-pulse"></div>
            <div
              className="absolute h-full w-full rounded-full border-2 border-indigo-400"
              style={{ animation: 'ripple 1.5s infinite ease-out' }}
            ></div>
            <div
              className="absolute h-full w-full rounded-full border-2 border-indigo-400"
              style={{
                animation: 'ripple 1.5s infinite ease-out',
                animationDelay: '0.5s',
              }}
            ></div>
          </div>
          <p className="mt-4 text-gray-400">Listening...</p>
        </div>
      );
    } else if (currentOutputTranscription) {
      statusIndicator = (
        <div className="flex flex-col items-center justify-center text-center">
          <div className="relative h-16 w-16">
            <div
              className="absolute h-full w-full rounded-full bg-purple-500 opacity-75"
              style={{ animation: 'breathing 2s infinite ease-in-out' }}
            ></div>
          </div>
          <p className="mt-4 text-gray-400">Speaking...</p>
        </div>
      );
    } else {
      statusIndicator = (
        <div className="flex flex-col items-center justify-center text-center">
          <div className="relative h-16 w-16">
            <div className="absolute h-full w-full rounded-full border-2 border-gray-500"></div>
            <div className="absolute inset-0 m-auto h-4 w-4 rounded-full bg-green-500"></div>
          </div>
          <p className="mt-4 text-gray-400">Assistant is active.</p>
        </div>
      );
    }
  } else if (isLoading) {
    statusIndicator = (
      <div className="flex flex-col items-center justify-center text-center">
        <Spinner />
        <p className="mt-4 text-gray-400">Connecting...</p>
      </div>
    );
  } else {
    statusIndicator = (
      <div className="flex flex-col items-center justify-center text-center">
        <div className="relative h-16 w-16">
            <div
              className="absolute h-full w-full rounded-full bg-gray-500 opacity-75"
              style={{ animation: 'pulse-standby 2s infinite ease-in-out' }}
            ></div>
          </div>
        <p className="mt-4 text-gray-400 italic">Inactive</p>
      </div>
    );
  }

  // Define a theme for global settings modal
  const settingsThemeClasses = {
    dark: {
      container: 'bg-gray-800 border border-gray-700',
      label: 'text-gray-300',
      input: 'bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500',
      button: 'bg-indigo-600 hover:bg-indigo-700 text-white',
      closeButton: 'text-gray-400 hover:text-white',
    },
  };
  const currentSettingsTheme = settingsThemeClasses['dark']; // Always dark theme for global settings


  const getAnalysisResultContent = () => {
    // Analysis details are always visible when visual pane is active
    if (visualPaneMode === VisualPaneMode.Camera) {
      if (!cameraAnalysisResult && !cameraError && !isCameraAnalysisLoading) {
        return <p className="text-gray-400 italic">No analysis results yet.</p>;
      }
      return (
        <div className="space-y-4">
          {isCameraAnalysisLoading && <div className="text-center"><Spinner className="mx-auto" /><p className="text-gray-400">Analyzing image...</p></div>}
          {cameraError && (
            <div className="bg-red-800 text-red-100 p-3 rounded-lg text-center mt-4">
              {cameraError}
            </div>
          )}
          {cameraAnalysisResult && (
            <div className="bg-gray-700 p-4 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-2 text-gray-200">AI Scene Analysis:</h3>
              <p className="text-gray-100 whitespace-pre-wrap mb-4">{cameraAnalysisResult.sceneDescription}</p>

              <h4 className="text-lg font-semibold mb-2 text-gray-200">Spatial Analysis:</h4>
              <p className="text-gray-100 whitespace-pre-wrap mb-6 border-b border-gray-600 pb-4">{cameraAnalysisResult.spatialAnalysis}</p>

              <h4 className="text-lg font-semibold mb-3 text-gray-200">Detected Objects:</h4>
              <div className="space-y-4 mb-6">
                {cameraAnalysisResult.detectedObjects.map((obj, index) => (
                  <div
                    key={`obj-${index}`}
                    onMouseEnter={() => setHighlightedElement({ type: 'object', index })}
                    onMouseLeave={() => setHighlightedElement(null)}
                    onClick={() => handleObjectClick(obj.name)}
                    title={`Click to search for "${obj.name}"`}
                    className={`group p-3 rounded-lg transition-all duration-200 ease-in-out cursor-pointer ${
                      highlightedElement?.type === 'object' && highlightedElement?.index === index
                        ? 'bg-gray-600 ring-2 ring-yellow-400'
                        : 'bg-gray-800'
                    }`}
                  >
                    <p className="font-bold text-emerald-400 flex items-center group-hover:underline">
                      {obj.name}
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="w-4 h-4 ml-1.5 opacity-70 group-hover:opacity-100 transition-opacity"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.22 14.78a.75.75 0 0 0 1.06 0l7.22-7.22v5.69a.75.75 0 0 0 1.5 0V4.75a.75.75 0 0 0-.75-.75H7.5a.75.75 0 0 0 0 1.5h5.69l-7.22 7.22a.75.75 0 0 0 0 1.06Z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </p>
                    <p className="text-gray-300 whitespace-pre-wrap">{obj.description}</p>
                  </div>
                ))}
              </div>

              {cameraAnalysisResult.detectedFaces?.length > 0 && (
                <>
                  <h4 className="text-lg font-semibold mb-3 text-gray-200">
                    Detected Faces: ({cameraAnalysisResult.detectedFaces.length})
                  </h4>
                  <div className="space-y-4">
                    {cameraAnalysisResult.detectedFaces.map((face, index) => (
                      <div
                        key={`face-list-${index}`}
                        onMouseEnter={() => setHighlightedElement({ type: 'face', index })}
                        onMouseLeave={() => setHighlightedElement(null)}
                        className={`p-3 rounded-lg transition-all duration-200 ease-in-out ${
                          highlightedElement?.type === 'face' && highlightedElement.index === index
                            ? 'bg-gray-600 ring-2 ring-yellow-400'
                            : 'bg-gray-800'
                        }`}
                      >
                        <p className="font-bold text-amber-400">Face #{index + 1}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const handleObjectClick = useCallback((objectName: string) => {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(
      objectName,
    )}`;
    window.open(searchUrl, '_blank');
    speakAndLog(`Searching for ${objectName} online.`);
  }, [speakAndLog]);

  return (
    <div className="relative flex-grow flex flex-col lg:flex-row gap-4 h-full">
      {/* Visual Pane */}
      <div className={`
        ${showVisualPane ? 'flex-1 lg:flex-[3_3_0%] p-4 bg-gray-800 rounded-lg shadow-xl' : 'hidden'}
        flex flex-col relative transition-all duration-300 ease-in-out min-h-[400px]
      `}>
        {showVisualPane && (
          <div className="absolute top-2 right-2 z-10 flex gap-2">
            <Button
              onClick={handleToggleVisualPane}
              variant="secondary"
              className="p-2 h-auto rounded-full"
              title="Hide Visual Pane"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>
        )}
        <canvas ref={cameraCanvasRef} className="hidden"></canvas> {/* Hidden canvas for image capture */}

        {visualPaneMode === VisualPaneMode.Camera && (
          <CameraVisualizer 
            ref={cameraVisualizerDisplayAreaRef} // Pass displayAreaRef here
            speakAndLog={speakAndLog}
            webcam={{
              stream: webcamStream,
              isEnabled: webcamEnabled,
              facingMode: facingMode,
              hasMultipleCameras: hasMultipleCameras,
              hasTorch: appCameraHasTorch,
              isTorchOn: appTorchEnabled,
              enableWebcam: async (mode) => onEnableWebcam(mode || facingMode),
              disableWebcam: onDisableWebcam,
              toggleCamera: onToggleCamera,
              toggleTorch: async () => onToggleTorch(),
              error: null,
            }}
            onAnalysisUpdate={(result, loading, error) => {
               setCameraAnalysisResult(result);
               setIsCameraAnalysisLoading(loading);
               setCameraError(error);
            }}
            onLowLightChange={(isLow) => {
                if (isLow && !lowLightDetectedRef.current) {
                    lowLightDetectedRef.current = true;
                    speakAndLog("It's getting dark. You might want to turn on the flash.", false, false);
                } else if (!isLow) {
                    lowLightDetectedRef.current = false;
                }
            }}
          />
        )}
      </div>

      {/* Main Controls & Chat/Analysis Panels */}
      <div className={`
        ${showVisualPane ? 'flex-1 lg:flex-[1_1_0%]' : 'w-full max-w-5xl mx-auto'}
        flex flex-col gap-4 transition-all duration-300 ease-in-out
      `}>
        {/* Global Controls - Mic, Settings */}
        <div className="flex flex-col items-center bg-gray-800 rounded-lg shadow-xl p-4">
          <div className="flex justify-center items-center h-20 my-2">
            {statusIndicator}
          </div>
          <div className="flex flex-wrap justify-center items-center gap-4 pt-2">
            {!isListening ? (
              <Button onClick={startListening} loading={isLoading}>
                Start Voice Assistant
              </Button>
            ) : (
              <>
                <Button onClick={stopListening} variant="danger" loading={isLoading}>
                  Stop Listening
                </Button>
                {isAssistantActive && currentOutputTranscription && (
                  <Button onClick={handleStopSpeaking} variant="secondary">
                    Stop Speaking
                  </Button>
                )}
              </>
            )}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className={`p-3 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 bg-gray-700 hover:bg-gray-600 text-gray-300 focus:ring-indigo-400 focus:ring-offset-gray-900`}
              aria-label="Open settings"
              title="Settings"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.532 1.532 0 012.287-.947c1.372.836 2.942-.734-2.106-2.106a1.532 1.532 0 01-.947-2.287c1.561-.379-1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>

          {/* Removed Quick Actions section entirely */}

        </div>

        {/* Visuals Toggle Button */}
        <div className="flex justify-center gap-2 bg-gray-800 rounded-lg shadow-xl p-3">
          <Button
            onClick={handleToggleVisualPane}
            variant={showVisualPane ? 'primary' : 'secondary'}
            className="flex-1 min-w-[100px]"
            title="Toggle Camera / Visual Pane"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15.5a2.25 2.25 0 002.25-2.25V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
            </svg>
            Visuals {showVisualPane ? 'ON' : 'OFF'}
          </Button>
        </div>

        {/* Dynamic Camera Controls (simplified) */}
        {showVisualPane && (visualPaneMode === VisualPaneMode.Camera) && webcamEnabled && (
          <div className="flex flex-wrap justify-center gap-2 bg-gray-800 rounded-lg shadow-xl p-3 mt-4">
            {/* Removed Start/Stop Live Detection Button */}
            {hasMultipleCameras && (
              <Button onClick={onToggleCamera} variant="secondary">
                Switch Camera
              </Button>
            )}
            {appCameraHasTorch && (
              <Button onClick={onToggleTorch} variant={appTorchEnabled ? 'danger' : 'secondary'} className="flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-5 h-5 ${appTorchEnabled ? 'text-white' : 'text-yellow-400'}`}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L13.5 21.75 16.5 12H12a.75.75 0 01-.75-.75h-.088c-.295 0-.582-.123-.796-.337A9.764 9.764 0 015.698 5.75H3.75v1.5H5.47a9.754 9.754 0 00-1.725 6.01L3.75 13.5z" />
                </svg>
                {appTorchEnabled ? 'Flash OFF' : 'Flash ON'}
              </Button>
            )}
            {/* Removed Enable/Disable Webcam buttons as they are now managed by Visuals ON/OFF */}
          </div>
        )}

        {/* Removed Toggle Analysis Details Button as it's always visible when camera is on */}

        {/* Chat History / Analysis Details Panel */}
        <div className={`
          flex flex-col flex-grow bg-gray-800 rounded-lg shadow-xl p-4 md:p-6
          ${showVisualPane ? 'max-h-[50vh]' : 'max-h-[calc(100vh-250px)]'}
          ${showVisualPane ? 'lg:order-last' : ''} // If visual pane is showing, chat is below on smaller screens, or right on larger
          overflow-hidden transition-all duration-300 ease-in-out
        `}>
          {/* Chat History */}
          <div className={`
            flex-grow overflow-y-auto mb-4 p-4 rounded-lg shadow-inner
            ${showVisualPane && visualPaneMode !== VisualPaneMode.Hidden ? 'max-h-[calc(50vh-100px)]' : 'max-h-[calc(100vh-350px)]'}
            transition-colors duration-300 ${currentTheme.container}
          `}>
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
              {/* Settings button - now only for local settings (wake word, theme) */}
              <button
                onClick={() => setIsSettingsOpen(true)}
                className={`p-2 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  theme === 'dark'
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-300 focus:ring-indigo-400 focus:ring-offset-gray-900'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-600 focus:ring-indigo-500 focus:ring-offset-gray-100'
                }`}
                aria-label="Open chat settings"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.532 1.532 0 012.287-.947c1.372.836 2.942-.734-2.106-2.106a1.532 1.532 0 01-.947-2.287c1.561-.379-1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  theme === 'dark'
                    ? 'bg-gray-700 hover:bg-gray-600 text-yellow-300 focus:ring-yellow-400 focus:ring-offset-gray-900'
                    : 'bg-gray-200 hover:bg-gray-300 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-gray-100'
                }`}
                aria-label="Toggle chat theme"
              >
                {theme === 'dark' ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm-.707 10.607a1 1 0 011.414 0l.707-.707a1 1 0 111.414 1.414l-.707.707a1 1 0 01-1.414 0zM4 11a1 1 0 100-2H3a1 1 0 100 2h1z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            </div>

            {isSettingsOpen && (
              <div
                className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center z-30"
                onClick={() => setIsSettingsOpen(false)}
              >
                <div
                  className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md relative border border-gray-700"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 className="text-2xl font-bold mb-6 text-center text-gray-200">
                    Global Settings
                  </h3>
                  <button
                    onClick={() => setIsSettingsOpen(false)}
                    className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors"
                    aria-label="Close settings"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                  <div className="space-y-6">
                    {/* Removed Wake Word setting */}
                    <div>
                      <label
                        htmlFor="ttsVoiceSelect"
                        className={`block text-sm font-medium mb-1 ${currentSettingsTheme.label}`}
                      >
                        Assistant Voice
                      </label>
                      <select
                        id="ttsVoiceSelect"
                        value={ttsVoice}
                        onChange={(e) => setTtsVoice(e.target.value as TTSVoice)}
                        className={`w-full rounded-md px-3 py-2 transition ${currentSettingsTheme.input}`}
                      >
                        {Object.values(TTSVoice).map((voice) => (
                          <option key={voice} value={voice}>
                            {voice}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-400 mt-1">
                        The voice used for text-to-speech responses across all modes.
                      </p>
                    </div>

                    {/* Geolocation Section */}
                    <div>
                      <label
                        htmlFor="geolocationStatus"
                        className={`block text-sm font-medium mb-1 ${currentSettingsTheme.label}`}
                      >
                        Location Services
                      </label>
                      <div className="flex items-center gap-2">
                        <span
                            id="geolocationStatus"
                            className={`px-3 py-2 rounded-md text-sm font-medium ${
                                appGeolocationStatus === 'granted'
                                    ? 'bg-green-600 text-white'
                                    : appGeolocationStatus === 'denied'
                                    ? 'bg-red-600 text-white'
                                    : appGeolocationStatus === 'pending'
                                    ? 'bg-yellow-600 text-white'
                                    : 'bg-gray-600 text-gray-300'
                            }`}
                        >
                            {appGeolocationStatus.charAt(0).toUpperCase() + appGeolocationStatus.slice(1)}
                        </span>
                        {appGeolocationStatus !== 'granted' && appGeolocationStatus !== 'unsupported' && (
                            <Button onClick={enableGeolocation} className="ml-2" disabled={appGeolocationStatus === 'pending'}>
                                {appGeolocationStatus === 'pending' ? 'Requesting...' : 'Enable/Retry Location'}
                            </Button>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Required for features like "find nearby places".
                      </p>
                      {locationError && appGeolocationStatus === 'denied' && (
                        <p className="text-xs text-red-300 mt-1">
                          {locationError}
                        </p>
                      )}
                    </div>

                    {/* About Section - Moved here */}
                    <div className="mt-6 border-t border-gray-700 pt-6">
                       <About />
                    </div>

                  </div>
                  <div className="mt-8 flex justify-end">
                    <Button onClick={() => setIsSettingsOpen(false)} variant="primary">
                      Done
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {messages.length === 0 && !isListening && !isLoading && (
              <p className={`text-center italic mt-4 ${currentTheme.placeholder}`}>
                Start the Voice Assistant to begin the conversation.
              </p>
            )}
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex flex-col mb-3 ${
                  msg.type === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[80%] px-4 py-2 rounded-lg shadow-md ${
                    msg.type === 'user'
                      ? currentTheme.message.user
                      : msg.type === 'tool_call'
                      ? currentTheme.message.tool_call
                      : currentTheme.message.ai
                  }`}
                >
                  <p
                    className={`font-medium text-sm ${
                      theme === 'light' && msg.type !== 'user'
                        ? currentTheme.speakerLabel
                        : ''
                    }`}
                  >
                    {msg.type === 'user'
                      ? 'You'
                      : msg.type === 'tool_call'
                      ? 'Tool Call'
                      : 'AI'}
                  </p>
                  {msg.type === 'tool_call' && msg.toolCall ? (
                    <div className="mt-1">
                      <p className={currentTheme.toolText}>{msg.text}</p>
                      <pre
                        className={`mt-1 rounded-md p-2 text-xs font-mono overflow-x-auto ${currentTheme.toolCode}`}
                      >
                        <code>{JSON.stringify(msg.toolCall.args, null, 2)}</code>
                      </pre>
                    </div>
                  ) : (
                    <p className="text-base whitespace-pre-wrap">{msg.text}</p>
                  )}
                  {msg.groundingSources && msg.groundingSources.length > 0 && (
                    <div className="mt-2 border-t border-white/20 pt-2">
                      <p className="text-xs font-semibold mb-1">Sources:</p>
                      <div className="flex flex-col items-start gap-1">
                        {msg.groundingSources.map((source, i) => (
                          <a
                            key={i}
                            href={source.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-2 text-xs p-1.5 rounded-md transition-colors ${currentTheme.groundingSource}`}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              className="w-4 h-4 ml-1 flex-shrink-0"
                            >
                              <path
                                fillRule="evenodd"
                                d="m9.69 18.933.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .281-.14c.186-.1.4-.27.6-.533a10.04 10.04 0 0 0 .88-1.43c.364-.792.6-1.846.6-3.157 0-1.312-.236-2.365-.6-3.157a10.04 10.04 0 0 0-.88-1.43 2.08 2.08 0 0 0-.6-.533 5.74 5.74 0 0 0-.281-.14.316.316 0 0 0-.018-.008l-.006-.003ZM10 16.5A6.5 6.5 0 1 0 10 3.5a6.5 6.5 0 000 13Z"
                                clipRule="evenodd"
                              />
                            </svg>
                            <span>{source.title}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  <span
                    className={`text-xs block mt-1 ${currentTheme.timestamp}`}
                  >
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            ))}
            {isListening && isAssistantActive && currentInputTranscription && (
              <div className="flex flex-col items-end mb-3">
                <div
                  className={`max-w-[80%] px-4 py-2 rounded-lg shadow-md opacity-80 ${currentTheme.transcribing.user}`}
                >
                  <p className="font-medium text-sm">You (transcribing...)</p>
                  <p className="text-base">{currentInputTranscription}</p>
                </div>
              </div>
            )}
            {isListening && isAssistantActive && currentOutputTranscription && (
              <div className="flex flex-col items-start mb-3">
                <div
                  className={`max-w-[80%] px-4 py-2 rounded-lg shadow-md opacity-80 ${currentTheme.transcribing.ai}`}
                >
                  <p className="font-medium text-sm">AI (speaking...)</p>
                  <p className="text-base">{currentOutputTranscription}</p>
                </div>
              </div>
            )}
          </div>

          {/* Analysis Details Panel - Always Visible when Camera is ON */}
          <div className="flex-none bg-gray-900 rounded-lg shadow-inner p-4 overflow-y-auto max-h-[calc(50vh-50px)] mt-4">
            <h3 className="text-xl font-bold mb-4 text-gray-200 border-b border-gray-700 pb-2">Analysis Details</h3>
            {getAnalysisResultContent()}
          </div>
        </div>
      </div>
    </div>
  );
};
