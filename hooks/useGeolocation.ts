
import { useState, useCallback, useRef } from 'react';
import { UseGeolocationReturn } from '../types';

export const useGeolocation = (): UseGeolocationReturn => {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [status, setStatus] = useState<'idle' | 'pending' | 'granted' | 'denied' | 'unsupported'>('idle');
  const [error, setError] = useState<string | null>(null);
  const promiseRef = useRef<Promise<{ latitude: number; longitude: number } | null> | null>(null);

  const requestLocation = useCallback(async (): Promise<{ latitude: number; longitude: number } | null> => {
    if (promiseRef.current) return promiseRef.current;

    setStatus('pending');
    setError(null);

    if (!navigator.geolocation) {
      setStatus('unsupported');
      setError('Geolocation is not supported by this browser.');
      return Promise.resolve(null);
    }

    const promise = new Promise<{ latitude: number; longitude: number } | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setLocation(loc);
          setStatus('granted');
          resolve(loc);
        },
        (err) => {
          setStatus('denied');
          setError(err.message);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });

    promiseRef.current = promise;
    return promise.finally(() => {
      promiseRef.current = null;
    });
  }, []);

  return { location, status, error, requestLocation };
};
