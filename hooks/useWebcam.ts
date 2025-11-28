
import { useState, useCallback, useEffect, useRef } from 'react';
import { UseWebcamReturn } from '../types';

export const useWebcam = (): UseWebcamReturn => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for multiple cameras
  useEffect(() => {
    const checkDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        setHasMultipleCameras(videoInputs.length > 1);
      } catch (e) {
        console.error('Error enumerating devices', e);
      }
    };
    checkDevices();
  }, []);

  const disableWebcam = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    setStream(null);
    setIsEnabled(false);
    setIsTorchOn(false);
    setHasTorch(false);
  }, [stream]);

  const enableWebcam = useCallback(async (mode: 'user' | 'environment' = facingMode) => {
    // If already enabled with correct mode, do nothing
    if (isEnabled && stream && facingMode === mode && stream.active) {
      return;
    }

    // Clean up existing
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode },
      });

      setStream(newStream);
      setIsEnabled(true);
      setFacingMode(mode);
      setError(null);
      
      // Check torch support
      const track = newStream.getVideoTracks()[0];
      const capabilities = track.getCapabilities() as any;
      setHasTorch(!!capabilities.torch);
      setIsTorchOn(false);

    } catch (err: any) {
      console.error('Webcam error:', err);
      setIsEnabled(false);
      setStream(null);
      if (err.name === 'NotAllowedError') {
        setError('Camera access denied. Please check permissions.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found.');
      } else {
        setError('Could not access camera.');
      }
    }
  }, [facingMode, isEnabled, stream]);

  const toggleCamera = useCallback(() => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    enableWebcam(newMode);
  }, [facingMode, enableWebcam]);

  const toggleTorch = useCallback(async () => {
    if (!stream || !hasTorch) return;
    const track = stream.getVideoTracks()[0];
    try {
      await track.applyConstraints({
        advanced: [{ torch: !isTorchOn } as any],
      });
      setIsTorchOn(!isTorchOn);
    } catch (err) {
      console.error('Torch toggle failed', err);
      // If torch fails (e.g. overconstrained), assume not supported
      setHasTorch(false);
      setIsTorchOn(false);
    }
  }, [stream, hasTorch, isTorchOn]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  return {
    stream,
    isEnabled,
    facingMode,
    hasMultipleCameras,
    hasTorch,
    isTorchOn,
    enableWebcam,
    disableWebcam,
    toggleCamera,
    toggleTorch,
    error
  };
};
