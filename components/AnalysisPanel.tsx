
import React from 'react';
import { AnalysisResult } from '../types';
import { Spinner } from './Spinner';

interface AnalysisPanelProps {
  result: AnalysisResult | null;
  isLoading: boolean;
  error: string | null;
  onObjectClick: (name: string) => void;
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ result, isLoading, error, onObjectClick }) => {
  return (
    <div className="bg-gray-900 rounded-lg p-4 h-64 overflow-y-auto border-t border-gray-700">
      <h3 className="text-gray-400 text-xs font-bold uppercase mb-2">Live Scene Analysis</h3>
      
      {isLoading && !result && (
        <div className="flex items-center gap-2 text-gray-500">
          <Spinner className="w-4 h-4" /> <span>Analyzing frame...</span>
        </div>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {result && (
        <div className="space-y-3 text-sm">
          <p className="text-gray-300 italic">{result.sceneDescription}</p>
          
          {result.detectedObjects.length > 0 && (
            <div>
              <span className="text-xs text-gray-500 font-semibold">Objects:</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {result.detectedObjects.map((obj, i) => (
                  <button 
                    key={i}
                    onClick={() => onObjectClick(obj.name)}
                    className="bg-gray-800 hover:bg-gray-700 text-indigo-300 px-2 py-1 rounded text-xs border border-gray-600 transition"
                  >
                    {obj.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {!result && !isLoading && !error && (
        <p className="text-gray-600 text-sm">Camera active. AI is observing...</p>
      )}
    </div>
  );
};
