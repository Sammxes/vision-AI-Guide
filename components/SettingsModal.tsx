
import React from 'react';
import { Button } from './Button';
import { TTSVoice } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  ttsVoice: TTSVoice;
  setTtsVoice: (voice: TTSVoice) => void;
  geoStatus: string;
  onEnableGeo: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen, onClose, ttsVoice, setTtsVoice, geoStatus, onEnableGeo
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md border border-gray-700 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-2xl font-bold text-gray-200">Settings</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">Assistant Voice</label>
            <select
              value={ttsVoice}
              onChange={(e) => setTtsVoice(e.target.value as TTSVoice)}
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-2"
            >
              {Object.values(TTSVoice).map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">Location Services</label>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-md text-xs font-bold uppercase
                ${geoStatus === 'granted' ? 'bg-green-900 text-green-100' : 'bg-red-900 text-red-100'}`}>
                {geoStatus}
              </span>
              {geoStatus !== 'granted' && (
                <Button onClick={onEnableGeo} variant="secondary" className="text-xs py-1 h-8">
                  Enable
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={onClose}>Done</Button>
        </div>
      </div>
    </div>
  );
};
