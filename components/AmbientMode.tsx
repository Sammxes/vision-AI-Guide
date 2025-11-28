
import React, { useState, useEffect } from 'react';
import { Button } from './Button';

interface AmbientModeProps {
  onEnable: () => void;
}

export const AmbientMode: React.FC<AmbientModeProps> = ({ onEnable }) => {
  const [time, setTime] = useState(new Date());
  const [phase, setPhase] = useState<'morning' | 'day' | 'evening' | 'night'>('day');

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setTime(now);
      const h = now.getHours();
      if (h >= 5 && h < 12) setPhase('morning');
      else if (h >= 12 && h < 17) setPhase('day');
      else if (h >= 17 && h < 20) setPhase('evening');
      else setPhase('night');
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const config = {
    morning: {
      gradient: 'from-rose-300 via-orange-200 to-blue-200',
      textColor: 'text-rose-900',
      icon: '🌅',
      subtext: 'Good Morning'
    },
    day: {
      gradient: 'from-blue-400 via-cyan-300 to-sky-200',
      textColor: 'text-blue-900',
      icon: '☀️',
      subtext: 'Active Day'
    },
    evening: {
      gradient: 'from-indigo-500 via-purple-500 to-orange-400',
      textColor: 'text-indigo-100',
      icon: '🌇',
      subtext: 'Good Evening'
    },
    night: {
      gradient: 'from-slate-900 via-purple-900 to-slate-900',
      textColor: 'text-slate-200',
      icon: '🌙',
      subtext: 'Sleep Well'
    }
  };

  const current = config[phase];

  return (
    <div className={`relative w-full h-full rounded-xl overflow-hidden transition-all duration-[2000ms] bg-gradient-to-br ${current.gradient} shadow-2xl flex flex-col items-center justify-center p-6 group border border-white/10`}>
      {/* Dynamic Blobs */}
      <div className="absolute inset-0 overflow-hidden opacity-60 pointer-events-none">
         <div className="absolute top-0 left-0 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-2xl opacity-70 animate-blob"></div>
         <div className="absolute top-0 right-0 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-2xl opacity-70 animate-blob animation-delay-2000"></div>
         <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-2xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      <div className="z-10 flex flex-col items-center transform transition-transform duration-500 group-hover:scale-105">
        <span className="text-6xl mb-4 animate-pulse drop-shadow-md">{current.icon}</span>
        <h2 className={`text-7xl md:text-8xl font-light font-mono tracking-tighter ${current.textColor} drop-shadow-lg`}>
          {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </h2>
        <p className={`mt-2 text-xl font-medium uppercase tracking-widest ${current.textColor} opacity-90 drop-shadow-md`}>
          {current.subtext}
        </p>
      </div>

      <div className="absolute bottom-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-20">
        <Button onClick={onEnable} variant="secondary" className="backdrop-blur-md bg-white/20 border border-white/30 text-white shadow-lg hover:bg-white/30">
          Activate Camera
        </Button>
      </div>
      
      <div className={`absolute bottom-4 text-xs font-bold tracking-widest uppercase opacity-40 group-hover:opacity-0 transition-opacity duration-500 ${current.textColor}`}>
        Ambient Mode
      </div>
    </div>
  );
};
