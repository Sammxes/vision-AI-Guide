import React, { useState, useEffect, useRef } from 'react';
import { useWebcam } from './hooks/useWebcam';
import { useGeolocation } from './hooks/useGeolocation';
import { useGeminiLive } from './hooks/useGeminiLive';
import { VisualPane } from './components/VisualPane';
import { AmbientMode } from './components/AmbientMode';
import { ChatInterface } from './components/ChatInterface';
import { SettingsModal } from './components/SettingsModal';
import { AboutModal } from './components/AboutModal';
import { ReadmeModal } from './components/ReadmeModal';
import { EmergencyModal } from './components/EmergencyModal';
import { Button } from './components/Button';
import { Spinner } from './components/Spinner';
import { TTSVoice, VisualPaneMode, Base64Media } from './types';
import { CameraVisualizerRef } from './components/CameraVisualizer';

const App: React.FC = () => {
  const [isVisualsOpen, setIsVisualsOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isReadmeOpen, setIsReadmeOpen] = useState(false);
  const [isEmergencyOpen, setIsEmergencyOpen] = useState(false);
  const [ttsVoice, setTtsVoice] = useState<TTSVoice>(TTSVoice.Zephyr);
  
  const cameraVisualizerRef = useRef<CameraVisualizerRef>(null);
  const cameraVisualizerIsRealtimeActiveRef = useRef(false);

  // Hooks
  const webcam = useWebcam();
  const geolocation = useGeolocation();
  const assistant = useGeminiLive({ 
    ttsVoice, 
    locationContext: {
      location: geolocation.location,
      status: geolocation.status,
      requestLocation: geolocation.requestLocation
    },
    getFrame: async () => {
        if (cameraVisualizerRef.current) {
            return await cameraVisualizerRef.current.captureFrame();
        }
        return null;
    },
    onEmergencyTrigger: () => {
        // Safe wrapper to ensure state update happens
        setIsEmergencyOpen(true);
        if (geolocation.status !== 'granted') {
             geolocation.requestLocation();
        }
    }
  });

  // Sync realtime status ref
  useEffect(() => {
    // If visuals are open, we assume implicit realtime detection is active (or will be when camera is ready)
    cameraVisualizerIsRealtimeActiveRef.current = isVisualsOpen && webcam.isEnabled;
  }, [isVisualsOpen, webcam.isEnabled]);


  // Persist Settings
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ttsVoice');
      if (saved) setTtsVoice(saved as TTSVoice);
    } catch (e) {
      console.error("LocalStorage error:", e);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('ttsVoice', ttsVoice);
    } catch (e) {
       console.error("LocalStorage error:", e);
    }
  }, [ttsVoice]);

  const handleEmergencyOpen = () => {
    setIsEmergencyOpen(true);
    // If assistant is listening, stop it to avoid interference during emergency
    if (assistant.isListening) {
      assistant.stopSession();
    }
    // Ensure we try to get location if we don't have it
    if (!geolocation.location) {
      geolocation.requestLocation();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col p-4 md:p-6 transition-colors duration-300">
      {/* Header */}
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">
            Your Vision AI Guide
          </h1>
          <p className="text-gray-500 text-sm font-medium">Voice & Vision Intelligence</p>
        </div>
        <div className="flex gap-3 items-center">
           <Button 
             onClick={handleEmergencyOpen} 
             variant="danger" 
             className="mr-2 animate-pulse font-bold tracking-wide border-2 border-red-500 shadow-md hover:shadow-lg hover:bg-red-700"
             aria-label="Open Emergency Dashboard"
           >
             SOS
           </Button>
           {/* About Button removed from header */}
           {!assistant.isListening && !assistant.isConnecting && (
             <Button onClick={assistant.startSession}>Start Assistant</Button>
           )}
           {assistant.isConnecting && (
             <Button disabled><Spinner className="mr-2"/> Connecting</Button>
           )}
           {assistant.isListening && (
             <Button variant="danger" onClick={assistant.stopSession}>Stop</Button>
           )}
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="flex-grow grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6 min-h-[500px]">
        
        {/* Left Column: Visuals or Ambient Mode */}
        <div className={`flex flex-col transition-all duration-500 ${isVisualsOpen ? 'opacity-100' : 'hidden lg:flex opacity-100'}`}>
          {isVisualsOpen ? (
            <VisualPane 
              isOpen={isVisualsOpen}
              onClose={() => setIsVisualsOpen(false)}
              webcam={webcam}
              speakAndLog={assistant.speakAndLog}
              sendVideoFrame={assistant.sendVideoFrame}
              isListening={assistant.isListening}
              visualizerRef={cameraVisualizerRef}
              onEmergencyTrigger={handleEmergencyOpen}
            />
          ) : (
            <AmbientMode onEnable={() => setIsVisualsOpen(true)} />
          )}
        </div>

        {/* Right Column: Chat & Controls */}
        <div className="flex flex-col h-full">
           <ChatInterface 
             messages={assistant.messages}
             isListening={assistant.isListening}
             isConnecting={assistant.isConnecting}
             isAssistantActive={assistant.isAssistantActive}
             inputTrans={assistant.currentInputTranscription}
             outputTrans={assistant.currentOutputTranscription}
             onStopSpeaking={assistant.stopSpeaking}
             onSettingsOpen={() => setIsSettingsOpen(true)}
             onStartListening={assistant.startSession}
             onStopListening={assistant.stopSession}
             onClearMessages={assistant.clearMessages}
           />
        </div>

      </main>

      {/* Footer */}
      <footer className="mt-8 border-t border-gray-200 pt-6 pb-2">
        <div className="flex flex-col sm:flex-row justify-center items-center gap-6 text-sm font-medium text-gray-600">
          <button 
            onClick={() => setIsAboutOpen(true)} 
            className="hover:text-blue-600 transition-colors flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            About Application
          </button>
          <span className="hidden sm:inline text-gray-300">|</span>
          <button 
            onClick={() => setIsReadmeOpen(true)} 
            className="hover:text-blue-600 transition-colors flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            User Guide (Readme)
          </button>
        </div>
        <p className="text-center text-xs text-gray-400 mt-4">
          &copy; {new Date().getFullYear()} Vision AI Guide. Empowering vision through intelligence.
        </p>
      </footer>

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        ttsVoice={ttsVoice}
        setTtsVoice={setTtsVoice}
        geoStatus={geolocation.status}
        onEnableGeo={geolocation.requestLocation}
      />

      {/* About Modal */}
      <AboutModal 
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />

      {/* Readme Modal */}
      <ReadmeModal 
        isOpen={isReadmeOpen}
        onClose={() => setIsReadmeOpen(false)}
      />

      {/* Emergency Modal */}
      <EmergencyModal 
        isOpen={isEmergencyOpen} 
        onClose={() => setIsEmergencyOpen(false)} 
        location={geolocation.location} 
      />
    </div>
  );
};

export default App;