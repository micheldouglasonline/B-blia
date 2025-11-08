import React from 'react';
import type { Chapter } from '../types';

interface IllustrationPanelProps {
  bookName: string;
  chapter: Chapter;
  onGenerate: () => void;
  imageUrl: string | null;
  isGenerating: boolean;
}

const PaintBrushIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.998 15.998 0 011.622-3.385m5.043.025a2.25 2.25 0 01-2.4-2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 00-3.388-1.62m-5.043-.025a15.998 15.998 0 01-1.622-3.385m12.062 6.25a2.25 2.25 0 01-2.4-2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 00-3.388-1.62m-5.043-.025a15.998 15.998 0 01-1.622-3.385" />
    </svg>
);

const LoadingSpinner: React.FC = () => (
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
);

export const IllustrationPanel: React.FC<IllustrationPanelProps> = ({ bookName, chapter, onGenerate, imageUrl, isGenerating }) => {
  return (
    <div className="w-full h-2/5 flex-shrink-0 flex items-center justify-center p-4">
        {isGenerating ? (
            <div className="text-center text-amber-700">
                <LoadingSpinner />
                <p className="mt-2 text-sm font-medium">Gerando arte...</p>
            </div>
        ) : imageUrl ? (
            <img 
                src={imageUrl} 
                alt={`Ilustração para ${bookName} ${chapter.chapter}`} 
                className="object-contain w-full h-full rounded-md shadow-lg"
            />
        ) : (
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className="w-full h-full flex flex-col items-center justify-center p-4 bg-amber-400/10 hover:bg-amber-400/20 border-2 border-dashed border-amber-400/30 rounded-lg text-amber-800/80 hover:text-amber-900 transition-all duration-300 disabled:opacity-50 disabled:cursor-wait"
            aria-label={`Gerar ilustração para ${bookName} ${chapter.chapter}`}
          >
            <PaintBrushIcon className="w-10 h-10" />
            <span className="mt-2 text-sm font-semibold">Gerar Ilustração</span>
          </button>
        )}
    </div>
  );
};
