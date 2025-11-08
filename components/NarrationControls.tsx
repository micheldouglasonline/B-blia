
import React from 'react';

interface NarrationControlsProps {
  isSpeaking: boolean;
  isPaused: boolean;
  onPlay: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

const PlayIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
);
const PauseIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
);
const StopIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h12v12H6z" /></svg>
);

export const NarrationControls: React.FC<NarrationControlsProps> = ({ isSpeaking, isPaused, onPlay, onPause, onResume, onStop }) => {
  const handlePlayPause = () => {
    if (!isSpeaking) {
      onPlay();
    } else if (isPaused) {
      onResume();
    } else {
      onPause();
    }
  };

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 mb-4 sm:mb-6 z-20 flex items-center gap-4 bg-black/40 backdrop-blur-lg border border-amber-200/20 rounded-full p-2 shadow-lg">
      <button 
        onClick={handlePlayPause} 
        className="w-14 h-14 flex items-center justify-center rounded-full bg-amber-400 text-gray-900 hover:bg-amber-300 transition-all duration-300 transform hover:scale-105"
        aria-label={!isSpeaking ? "Ouvir Capítulo" : isPaused ? "Continuar Narração" : "Pausar Narração"}
      >
        {isSpeaking && !isPaused ? <PauseIcon className="w-8 h-8" /> : <PlayIcon className="w-8 h-8" />}
      </button>
      {isSpeaking && (
        <button
          onClick={onStop}
          className="w-12 h-12 flex items-center justify-center rounded-full bg-gray-700/50 text-amber-200 hover:bg-red-500/50 transition-colors duration-300"
          aria-label="Parar Narração"
        >
          <StopIcon className="w-6 h-6" />
        </button>
      )}
    </div>
  );
};
