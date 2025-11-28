
import React, { useEffect, useRef } from 'react';
import { ChatMessage } from '../types';
import { Spinner } from './Spinner';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  isListening: boolean;
  isConnecting: boolean;
  isAssistantActive: boolean;
  inputTrans: string;
  outputTrans: string;
  onStopSpeaking: () => void;
  onSettingsOpen: () => void;
  onStartListening: () => void;
  onStopListening: () => void;
  onClearMessages: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages, isListening, isConnecting, isAssistantActive, inputTrans, outputTrans, 
  onStopSpeaking, onSettingsOpen, onStartListening, onStopListening, onClearMessages
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, inputTrans, outputTrans]);

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-xl overflow-hidden border border-gray-200">
      {/* Header */}
      <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
        <div className="flex items-center gap-2">
           <h2 className="font-semibold text-gray-800 tracking-wide">Conversation</h2>
           {isListening && <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>}
        </div>
        <div className="flex items-center gap-2">
            {messages.length > 0 && (
                <button 
                  onClick={onClearMessages} 
                  className="p-2 text-gray-400 hover:text-red-500 transition rounded-full hover:bg-gray-100"
                  title="Clear Chat History"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                </button>
            )}
            <button onClick={onSettingsOpen} className="p-2 text-gray-400 hover:text-blue-600 transition rounded-full hover:bg-gray-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-white" ref={scrollRef}>
        {messages.length === 0 && !isListening && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 opacity-60">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-16 h-16 mb-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
            <p>Tap the microphone to start speaking</p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`flex flex-col ${msg.type === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm border
              ${msg.type === 'user' 
                ? 'bg-blue-600 text-white rounded-br-none border-blue-600' 
                : 'bg-gray-100 text-gray-800 rounded-bl-none border-gray-200'}`}>
              {msg.type === 'tool_call' ? (
                <div className="font-mono text-xs text-purple-700 flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                    <path fillRule="evenodd" d="M10 1c3.866 0 7 1.79 7 4s-3.134 4-7 4-7-1.79-7-4 3.134-4 7-4zm5.694 8.13c.464-.264.91-.583 1.306-.952V10c0 2.21-3.134 4-7 4s-7-1.79-7-4V8.178c.396.37.842.689 1.306.953C5.838 10.006 7.854 10.5 10 10.5s4.162-.494 5.694-1.37z" clipRule="evenodd" />
                    <path d="M5.5 13a.5.5 0 000 1 2.5 2.5 0 005 0 2.5 2.5 0 005 0 .5.5 0 000-1 .5.5 0 000 1 3.5 3.5 0 01-7 0 .5.5 0 000-1z" />
                  </svg>
                  Using Tool: {msg.toolCall?.name}
                </div>
              ) : (
                <p className="leading-relaxed">{msg.text}</p>
              )}
              <span className={`text-[10px] block text-right mt-1 ${msg.type === 'user' ? 'text-blue-100 opacity-80' : 'text-gray-400'}`}>{msg.timestamp}</span>
            </div>
          </div>
        ))}

        {isListening && (inputTrans || outputTrans) && (
          <div className="flex flex-col space-y-2 opacity-90">
            {inputTrans && (
              <div className="self-end bg-white border border-blue-200 text-blue-800 p-2 rounded-lg max-w-[80%] text-sm italic shadow-sm">
                {inputTrans}
              </div>
            )}
            {outputTrans && (
              <div className="self-start bg-white border border-gray-200 text-gray-500 p-2 rounded-lg max-w-[80%] text-sm italic shadow-sm">
                {outputTrans}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Bottom Control Bar */}
      <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-center gap-4 relative">
        
        {/* Main Microphone Button */}
        {isConnecting ? (
          <button disabled className="h-14 w-14 rounded-full bg-gray-200 flex items-center justify-center cursor-not-allowed shadow-inner">
             <Spinner className="text-gray-500" />
          </button>
        ) : !isListening ? (
          <button 
            onClick={onStartListening}
            className="h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group"
            aria-label="Start Listening"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7 group-hover:scale-110 transition-transform">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
          </button>
        ) : (
          <button 
            onClick={onStopListening}
            className="h-14 w-14 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-lg transition-all duration-300 flex items-center justify-center animate-pulse"
            aria-label="Stop Listening"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path fillRule="evenodd" d="M4.5 7.5a3 3 0 013-3h9a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9z" clipRule="evenodd" />
            </svg>
          </button>
        )}

        {/* Floating Stop Speaking Button */}
        {outputTrans && isAssistantActive && (
          <button 
            onClick={onStopSpeaking} 
            className="absolute right-4 text-xs font-bold text-red-600 hover:text-red-700 border border-red-200 bg-red-50 hover:bg-red-100 rounded-full px-3 py-1.5 transition-colors shadow-sm"
          >
              Stop Audio
          </button>
        )}
      </div>
    </div>
  );
};
