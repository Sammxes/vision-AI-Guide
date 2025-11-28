
import React, { useEffect, useRef } from 'react';
import CameraVisualizer, { CameraVisualizerRef } from './CameraVisualizer';
import { UseWebcamReturn } from '../types';
import { Button } from './Button';

interface VisualPaneProps {
  isOpen: boolean;
  onClose: () => void;
  webcam: UseWebcamReturn;
  speakAndLog: (text: string, error?: boolean, canSpeak?: boolean) => void;
  sendVideoFrame: (frame: any) => void;
  isListening: boolean;
}

export const VisualPane: React.FC<VisualPaneProps> = ({
  isOpen, onClose, webcam, speakAndLog, sendVideoFrame, isListening
}) => {
  const visRef = useRef<CameraVisualizerRef>(null);
  const streamInterval = useRef<number | null>(null);

  // Only auto-disable camera when pane closes. Do NOT auto-enable.
  useEffect(() => {
    if (!isOpen) {
      webcam.disableWebcam();
    }
  }, [isOpen, webcam]);

  // Streaming to Live API
  useEffect(() => {
    if (isOpen && isListening && webcam.isEnabled) {
      streamInterval.current = window.setInterval(async () => {
        if (visRef.current) {
          const frame = await visRef.current.captureFrame();
          if (frame) sendVideoFrame(frame);
        }
      }, 200); // 5 FPS
    } else {
      if (streamInterval.current) clearInterval(streamInterval.current);
    }

    return () => { if (streamInterval.current) clearInterval(streamInterval.current); };
  }, [isOpen, isListening, webcam.isEnabled, sendVideoFrame]);

  if (!isOpen) return null;

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex-grow relative rounded-xl overflow-hidden shadow-2xl border border-gray-700 bg-black">
        {webcam.isEnabled ? (
          <CameraVisualizer 
            ref={visRef}
            webcam={webcam}
            onAnalysisUpdate={() => {}}
            onLowLightChange={(isLow) => { /* Silently handle low light state if needed */ }}
            speakAndLog={speakAndLog}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-gray-900">
             <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-4 animate-pulse">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-gray-400">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                 <path strokeLinecap="round" strokeLinejoin="round" d="M5 20l14-14" />
               </svg>
             </div>
             <h3 className="text-xl font-semibold text-gray-200 mb-2">Camera Disabled</h3>
             <p className="text-gray-400 mb-6 max-w-xs">Enable the camera to use real-time object detection and Gemini Live vision features.</p>
             <Button onClick={() => webcam.enableWebcam()}>Enable Camera</Button>
          </div>
        )}
        
        <Button onClick={onClose} variant="secondary" className="absolute top-2 right-2 !p-2 rounded-full !h-10 !w-10 !min-w-0 z-50 shadow-lg hover:bg-red-600 hover:text-white transition-colors" title="Close Visual Pane">
          ✕
        </Button>
      </div>
    </div>
  );
};
