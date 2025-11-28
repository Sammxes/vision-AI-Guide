
import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import { Base64Media, AnalysisResult, UseWebcamReturn, DetectedObject } from '../types';
import { generateObjectDescription } from '../services/geminiService';

interface CameraVisualizerProps {
  webcam: UseWebcamReturn;
  onAnalysisUpdate: (result: AnalysisResult | null, loading: boolean, error: string | null) => void;
  onLowLightChange: (isLowLight: boolean) => void;
  speakAndLog: (text: string, error?: boolean, canSpeak?: boolean) => void;
  onEmergencyTrigger?: () => void;
}

// Expose capture method via ref
export interface CameraVisualizerRef {
  captureFrame: () => Promise<Base64Media | null>;
}

const CameraVisualizer = forwardRef<CameraVisualizerRef, CameraVisualizerProps>(({
  webcam, onAnalysisUpdate, onLowLightChange, speakAndLog, onEmergencyTrigger
}, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [boundingBoxes, setBoundingBoxes] = useState<AnalysisResult | null>(null);
  const [selectedObject, setSelectedObject] = useState<DetectedObject | null>(null);
  const [isDetectionEnabled, setIsDetectionEnabled] = useState(true);
  const isAnalyzingRef = useRef(false);
  const emergencyTriggeredRef = useRef<string | null>(null);

  // --- Proximity Light Logic ---
  const [coverageRatio, setCoverageRatio] = useState(0);

  // --- Frame Capture ---
  const captureFrame = useCallback(async (): Promise<Base64Media | null> => {
    if (!videoRef.current || !canvasRef.current || !webcam.stream) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video.videoWidth === 0) return null;

    // Downscale for performance and network stability
    // Reduced max width to 480px to decrease payload size for "Network Error" prevention
    const scale = Math.min(1, 480 / video.videoWidth);
    canvas.width = video.videoWidth * scale;
    canvas.height = video.videoHeight * scale;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    return new Promise(resolve => {
      canvas.toBlob(blob => {
        if (!blob) resolve(null);
        else {
          const reader = new FileReader();
          reader.onload = () => {
            const b64 = (reader.result as string).split(',')[1];
            resolve({ data: b64, mimeType: 'image/jpeg' });
          };
          reader.readAsDataURL(blob);
        }
      }, 'image/jpeg', 0.5); // Reduced quality to 0.5
    });
  }, [webcam.stream]);

  useImperativeHandle(ref, () => ({ captureFrame }), [captureFrame]);

  // --- Video Stream Setup ---
  useEffect(() => {
    if (videoRef.current && webcam.stream) {
      videoRef.current.srcObject = webcam.stream;
    }
  }, [webcam.stream]);

  // --- Visual Analysis Loop (Gemini Pro) ---
  useEffect(() => {
    let timeoutId: number;

    const runAnalysis = async () => {
      if (!webcam.isEnabled || !isDetectionEnabled) return;
      
      // Offline Check
      if (!navigator.onLine) {
        onAnalysisUpdate(null, false, "No internet connection.");
        // Retry in 5s
        timeoutId = window.setTimeout(runAnalysis, 5000);
        return;
      }

      if (isAnalyzingRef.current) return;
      isAnalyzingRef.current = true;

      try {
        const frame = await captureFrame();
        if (frame) {
          // NOTE: We do NOT call onAnalysisUpdate(null, true...) here to avoid flickering the previous result
          
          // Use Gemini Pro for detailed bounding boxes
          const result = await generateObjectDescription(
            frame.data, frame.mimeType, 
            "Detect objects and faces. CRITICAL: Generate extremely precise, tight bounding boxes that shrink-wrap the objects with zero background margin. The box must strictly touch the outermost pixels of the object."
          );
          
          setBoundingBoxes(result);
          onAnalysisUpdate(result, false, null);

          // Calculate largest object coverage for Proximity Light
          if (result.detectedObjects.length > 0) {
            let maxArea = 0;
            result.detectedObjects.forEach(obj => {
              const area = (obj.boundingBox.xMax - obj.boundingBox.xMin) * (obj.boundingBox.yMax - obj.boundingBox.yMin);
              if (area > maxArea) maxArea = area;
            });
            setCoverageRatio(maxArea);
          } else {
            setCoverageRatio(0);
          }

          // Check for CRITICAL EMERGENCY
          if (result.sceneDescription.includes("CRITICAL EMERGENCY:") && onEmergencyTrigger) {
             const emergencyType = result.sceneDescription.split("CRITICAL EMERGENCY:")[1].split(".")[0].trim();
             // Prevent spamming the trigger for the same event
             if (emergencyTriggeredRef.current !== emergencyType) {
                emergencyTriggeredRef.current = emergencyType;
                speakAndLog(`Visual system detected a critical event: ${emergencyType}. Activating emergency dashboard.`);
                onEmergencyTrigger();
             }
          } else {
             emergencyTriggeredRef.current = null; // Reset if emergency clears
          }
          
          // Success: Wait 2s before next run for near-real-time feel
          timeoutId = window.setTimeout(runAnalysis, 2000);
        } else {
           // Retry quickly if frame capture failed
           timeoutId = window.setTimeout(runAnalysis, 1000);
        }
      } catch (e: any) {
        console.error("Analysis error", e);
        const errorMsg = e.toString();
        const isQuotaError = errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('RESOURCE_EXHAUSTED');
        const isTimeout = errorMsg.includes('timed out');
        
        // Backoff strategy: 60s for quota limits, 10s for timeouts, 5s for other errors
        const delay = isQuotaError ? 60000 : isTimeout ? 10000 : 5000;
        
        onAnalysisUpdate(
            null, 
            false, 
            isQuotaError ? "Quota exceeded. Pausing 1 min." : 
            isTimeout ? "Network timeout. Retrying..." : 
            "Analysis error. Retrying..."
        );
        // Do not clear boundingBoxes immediately on transient error to prevent flashing
        if (isQuotaError) setBoundingBoxes(null);

        timeoutId = window.setTimeout(runAnalysis, delay);
      } finally {
        isAnalyzingRef.current = false;
      }
    };

    if (webcam.isEnabled && isDetectionEnabled) {
      runAnalysis();
    } else {
      setBoundingBoxes(null);
      setSelectedObject(null);
      setCoverageRatio(0);
      onAnalysisUpdate(null, false, null);
    }

    return () => {
      clearTimeout(timeoutId);
    };
  }, [webcam.isEnabled, isDetectionEnabled, captureFrame, onAnalysisUpdate, onEmergencyTrigger, speakAndLog]);

  // --- Rendering Bounding Boxes ---
  const renderBoxes = () => {
    if (!boundingBoxes || !videoRef.current) return null;
    
    return (
      <div className="absolute inset-0 pointer-events-none">
        {boundingBoxes.detectedObjects.map((obj, i) => {
          const isSelected = selectedObject === obj;
          
          return (
            <div key={`obj-${i}`}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedObject(obj);
              }}
              className={`absolute border-2 transition-all duration-300 pointer-events-auto cursor-pointer group animate-in fade-in zoom-in duration-300 ${isSelected ? 'border-yellow-300 z-30' : 'border-blue-400/80 hover:border-yellow-400 z-10'}`}
              style={{
                top: `${obj.boundingBox.yMin * 100}%`,
                left: `${obj.boundingBox.xMin * 100}%`,
                width: `${(obj.boundingBox.xMax - obj.boundingBox.xMin) * 100}%`,
                height: `${(obj.boundingBox.yMax - obj.boundingBox.yMin) * 100}%`,
              }}
            >
               {/* Stylish Corner Brackets (Visual Cues) */}
               {!isSelected && (
                 <>
                   <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-white -mt-0.5 -ml-0.5"></div>
                   <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-white -mt-0.5 -mr-0.5"></div>
                   <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-white -mb-0.5 -ml-0.5"></div>
                   <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-white -mb-0.5 -mr-0.5"></div>
                 </>
               )}

               {/* Selection Animation Ring */}
               {isSelected && (
                 <div className="absolute -inset-2 border-2 border-yellow-300 rounded-sm animate-pulse"></div>
               )}

               {/* Label Tag - Highlight if selected */}
               <div className={`absolute -top-7 left-0 text-sm font-bold px-2 py-0.5 rounded shadow-sm opacity-90 transition-colors duration-300
                 ${isSelected ? 'bg-yellow-300 text-black scale-110 origin-bottom-left' : 'bg-blue-600 text-white'}`}>
                 {obj.name}
               </div>

               {/* Hover/Selection Overlay */}
               <div className={`absolute inset-0 transition-opacity duration-300 ${isSelected ? 'bg-yellow-400/20' : 'bg-blue-400/0 hover:bg-yellow-400/10'}`}></div>
            </div>
          );
        })}
        {boundingBoxes.detectedFaces.map((face, i) => (
           <div key={`face-${i}`}
           className="absolute border-2 border-green-500 z-10"
           style={{
             top: `${face.boundingBox.yMin * 100}%`,
             left: `${face.boundingBox.xMin * 100}%`,
             width: `${(face.boundingBox.xMax - face.boundingBox.xMin) * 100}%`,
             height: `${(face.boundingBox.yMax - face.boundingBox.yMin) * 100}%`,
           }}
         >
             {/* Face Label */}
            <div className="absolute -top-7 left-0 bg-green-600 text-white text-sm font-bold px-2 py-0.5 rounded shadow-sm opacity-90">
               Face
            </div>
         </div>
        ))}
      </div>
    );
  };

  return (
    <div 
      className={`relative w-full h-full bg-black flex items-center justify-center overflow-hidden rounded-lg transition-all duration-500 ${coverageRatio > 0.6 ? 'border-[12px] border-yellow-400 shadow-[inset_0_0_50px_rgba(250,204,21,0.5)]' : 'border border-gray-700'}`} 
      onClick={() => setSelectedObject(null)}
    >
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        className={`w-full h-full object-contain ${webcam.facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
      />
      {renderBoxes()}
      <canvas ref={canvasRef} className="hidden" />

      {/* Instruction Badge - Only show if detection is enabled and objects are found but not selected */}
      {isDetectionEnabled && boundingBoxes && boundingBoxes.detectedObjects.length > 0 && !selectedObject && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-md text-white px-4 py-2 rounded-full border border-white/20 shadow-xl pointer-events-none animate-bounce z-20">
          <p className="text-sm font-semibold tracking-wide">👆 Tap on any object for details</p>
        </div>
      )}

      {/* Object Description Tooltip */}
      {selectedObject && (
        <div 
          className="absolute z-40 bg-white/95 border-2 border-yellow-500 text-gray-900 p-4 rounded-xl shadow-2xl max-w-[260px] backdrop-blur-md pointer-events-auto flex flex-col gap-2 animate-in fade-in zoom-in duration-200"
          style={{
            top: `${Math.min(selectedObject.boundingBox.yMax * 100 + 2, 70)}%`, 
            left: `${Math.min(selectedObject.boundingBox.xMin * 100, 50)}%`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
           <div className="flex justify-between items-start">
              <h4 className="font-bold text-lg text-blue-700 capitalize leading-tight">{selectedObject.name}</h4>
              <button 
                onClick={() => setSelectedObject(null)} 
                className="text-gray-500 hover:text-red-500 -mt-2 -mr-2 p-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Close tooltip"
              >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
              </button>
           </div>
           <p className="text-sm text-gray-700 leading-relaxed font-medium">{selectedObject.description}</p>
        </div>
      )}
      
      {/* Overlay Controls */}
      <div className="absolute top-2 left-2 flex flex-col gap-2 pointer-events-auto z-30">
        {/* Disable Camera Button */}
        <button
           onClick={(e) => { e.stopPropagation(); webcam.disableWebcam(); }}
           className="p-3 rounded-full backdrop-blur-md transition-colors shadow-lg border border-white/20 bg-red-600 text-white hover:bg-red-700"
           title="Turn Off Camera"
        >
           <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
             <path d="M3.53 2.47a.75.75 0 00-1.06 1.06l18 18a.75.75 0 101.06-1.06l-18-18zM21.75 12a.75.75 0 01-.75.75h-1.654l-1.5 1.5H21a2.25 2.25 0 002.25-2.25V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316A2.31 2.31 0 017.25 7.23c-.38.054-.757.112-1.134.175C5.065 7.58 4.315 8.507 4.315 9.574V12c0 .265.07.513.195.73L2.842 14.4a2.24 2.24 0 01-.592-1.4v-1c0-1.067.75-1.994 1.802-2.169a47.865 47.865 0 011.134-.175 2.31 2.31 0 001.64-1.055l.822-1.316a2.192 2.192 0 011.736-1.039 48.774 48.774 0 015.232 0 2.192 2.192 0 011.736 1.039l.821 1.316a2.31 2.31 0 001.64 1.055c.38.054.757.112 1.134.175 1.053.15 1.803 1.077 1.803 2.144v1.237z" />
           </svg>
        </button>

        {/* Detection Toggle */}
        <button
          onClick={(e) => { e.stopPropagation(); setIsDetectionEnabled(!isDetectionEnabled); }}
          className={`p-3 rounded-full backdrop-blur-md transition-colors shadow-lg border border-white/20 ${isDetectionEnabled ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-600 text-white hover:bg-gray-700'}`}
          title={isDetectionEnabled ? "Disable Object Detection" : "Enable Object Detection"}
        >
          {isDetectionEnabled ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6">
              <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
              <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clipRule="evenodd" />
            </svg>
          ) : (
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6">
               <path fillRule="evenodd" d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l14.5 14.5a.75.75 0 1 0 1.06-1.06l-1.745-1.745a10.029 10.029 0 0 0 3.3-5.533.749.749 0 0 0 0-.885C18.053 5.824 14.389 3.25 10 3.25c-1.568 0-3.06.333-4.424.934L3.28 2.22Zm4.088 4.088.96.96A2.498 2.498 0 0 1 10 7.75c.69 0 1.351.28 1.828.777l.96.961a3.988 3.988 0 0 0-.418-.418 4 4 0 0 0-5.002.3Zm3.555 3.555 2.58 2.58a4.002 4.002 0 0 0-5.16-5.16l2.58 2.58Zm-5.472 7.584A10.005 10.005 0 0 1 .664 10.59a1.651 1.651 0 0 1 0-1.186 10.02 10.02 0 0 1 1.67-2.616l1.812 1.812a3.994 3.994 0 0 0 4.606 4.606l1.812 1.812c-1.305.405-2.71.632-4.173.632Z" clipRule="evenodd" />
             </svg>
          )}
        </button>

        {webcam.hasTorch && (
          <button 
            onClick={(e) => { e.stopPropagation(); webcam.toggleTorch(); }}
            className={`p-3 rounded-full backdrop-blur-md transition-colors shadow-lg border border-white/20 ${webcam.isTorchOn ? 'bg-yellow-400 text-black ring-4 ring-yellow-400/30' : 'bg-gray-800 text-white hover:bg-gray-700'}`}
            title="Toggle Flashlight"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
            </svg>
          </button>
        )}
        {webcam.hasMultipleCameras && (
          <button 
            onClick={(e) => { e.stopPropagation(); webcam.toggleCamera(); }}
            className="p-3 rounded-full bg-gray-800 text-white backdrop-blur-md hover:bg-gray-700 shadow-lg border border-white/20"
            title="Switch Camera"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
});

export default CameraVisualizer;
