import React from 'react';
import type { Chapter, Book, Verse, Notes } from '../types';
import { IllustrationPanel } from './IllustrationPanel';

interface PageData {
  book: Book;
  chapter: Chapter;
}

interface BibleReaderProps {
  leftPageData: PageData;
  rightPageData: PageData | null;
  prevLeftPageData: PageData | null;
  prevRightPageData: PageData | null;
  isTransitioning: boolean;
  direction: 'next' | 'prev' | null;
  illustration: string | null;
  isGenerating: boolean;
  onGenerateIllustration: (chapter: Chapter, bookName: string) => void;
  notes: Notes;
  onVerseClick: (bookName: string, chapterNumber: number, verse: Verse) => void;
}

const SpeakerIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
  </svg>
);

const VerseItem: React.FC<{
  bookName: string;
  chapterNumber: number;
  verse: Verse;
  hasNote: boolean;
  onVerseClick: (bookName: string, chapterNumber: number, verse: Verse) => void;
}> = ({ bookName, chapterNumber, verse, hasNote, onVerseClick }) => {
  
  const handleReadVerse = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(`${verse.text}`);
    const voices = window.speechSynthesis.getVoices();
    const ptVoice = voices.find(v => v.lang.startsWith('pt-BR'));
    if (ptVoice) utterance.voice = ptVoice;
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div 
      className="verse-item relative group cursor-pointer hover:bg-amber-900/5 rounded-2xl p-5 -mx-2 transition-all duration-500 border border-transparent hover:border-amber-200/30"
      onClick={() => onVerseClick(bookName, chapterNumber, verse)}
    >
      <div className="flex gap-5 items-start">
        <div className="flex flex-col items-center pt-1 min-w-[36px]">
          <span className="font-sans text-amber-800/40 text-xs font-black uppercase tracking-widest mb-3">{verse.verse}</span>
          <button 
            onClick={handleReadVerse}
            className="verse-audio-btn p-2.5 rounded-full text-amber-900/20 hover:text-amber-700 hover:bg-amber-200/50 transition-all flex items-center justify-center shadow-sm"
            title="Ouvir este versículo"
          >
            <SpeakerIcon className="w-4 h-4" />
          </button>
        </div>
        
        <p className="text-slate-900 font-serif-display text-2xl leading-relaxed flex-grow antialiased">
          {verse.text}
          {hasNote && <span className="ml-3 inline-block w-2.5 h-2.5 rounded-full bg-amber-600 shadow-lg shadow-amber-600/50 animate-pulse"></span>}
        </p>
      </div>
    </div>
  );
};

const PageContent: React.FC<{ 
    bookName: string, 
    chapter: Chapter | null, 
    notes: Notes,
    onVerseClick: (bookName: string, chapterNumber: number, verse: Verse) => void;
    isBackPage?: boolean;
}> = ({ bookName, chapter, notes, onVerseClick, isBackPage }) => {
    if (!chapter) return null;
    return (
        <div className={`p-10 md:p-16 h-full overflow-y-auto scrollbar-thin paper-texture relative ${isBackPage ? 'scale-x-[-1]' : ''}`}>
            {/* Sombreamento profundo no centro */}
            <div className={`absolute top-0 bottom-0 w-20 pointer-events-none z-10 ${isBackPage ? 'right-0 bg-gradient-to-l' : 'left-0 bg-gradient-to-r'} from-black/[0.08] to-transparent`}></div>
            
            <h2 className="font-serif-display text-6xl font-bold text-amber-950 text-center mb-12 pb-6 border-b-2 border-amber-900/10 italic tracking-tighter">
              {bookName} <span className="text-amber-700/80">{chapter.chapter}</span>
            </h2>
            <div className="space-y-4">
            {chapter.verses.map((v) => (
              <VerseItem key={v.verse} bookName={bookName} chapterNumber={chapter.chapter} verse={v} hasNote={!!notes[`${bookName}-${chapter.chapter}-${v.verse}`]} onVerseClick={onVerseClick} />
            ))}
            </div>
            
            <div className="mt-20 pt-10 border-t border-amber-900/5 text-center text-amber-900/30 font-serif-display italic text-lg select-none">
                Palavra Viva • {bookName}
            </div>
        </div>
    );
}

export const BibleReader: React.FC<BibleReaderProps> = ({ 
  leftPageData, rightPageData, prevLeftPageData, prevRightPageData,
  isTransitioning, direction, illustration, isGenerating, 
  onGenerateIllustration, notes, onVerseClick
}) => {
  
  return (
    <div className="book-perspective w-full max-w-3xl lg:max-w-7xl mx-auto">
      <div className="book-wrapper relative w-full aspect-[4/3.5] md:aspect-[2/1.4] shadow-[0_80px_160px_-40px_rgba(0,0,0,0.9)] rounded-2xl flex overflow-visible">
        <div className="book-spine" />
        
        {/* LADO ESQUERDO FIXO */}
        <div className="w-1/2 h-full paper-texture rounded-l-2xl overflow-hidden flex flex-col border-r border-black/20 relative">
            <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-black/20 to-transparent z-10 pointer-events-none"></div>
            
            <IllustrationPanel 
              bookName={leftPageData.book.name}
              chapter={leftPageData.chapter}
              onGenerate={() => onGenerateIllustration(leftPageData.chapter, leftPageData.book.name)}
              imageUrl={illustration}
              isGenerating={isGenerating}
            />
            <div className="flex-grow overflow-hidden relative">
              <PageContent bookName={leftPageData.book.name} chapter={leftPageData.chapter} notes={notes} onVerseClick={onVerseClick} />
            </div>
        </div>
        
        {/* LADO DIREITO FIXO */}
        <div className="relative w-1/2 h-full paper-texture rounded-r-2xl overflow-hidden bg-[#fdfaf3]">
            <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-black/20 to-transparent z-10 pointer-events-none"></div>
            
            {rightPageData ? (
                <PageContent bookName={rightPageData.book.name} chapter={rightPageData.chapter} notes={notes} onVerseClick={onVerseClick} />
            ) : (
                <div className="flex flex-col items-center justify-center h-full p-10 text-center select-none bg-amber-50/20">
                    <svg className="w-32 h-32 text-amber-900/10 mb-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.3} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <p className="font-serif-display text-5xl italic text-amber-950/20 tracking-widest font-bold">AMÉM</p>
                </div>
            )}
        </div>

        {/* FLIPPER (A página que levanta) */}
        {isTransitioning && direction && (
          <div className={`flipper ${direction === 'next' ? 'flipper-next' : 'flipper-prev'} flipping`}>
            {/* FACE FRONTAL (O que estava antes) */}
            <div className="flipper-face flipper-front paper-texture shadow-2xl">
              {direction === 'next' ? (
                prevRightPageData && <PageContent bookName={prevRightPageData.book.name} chapter={prevRightPageData.chapter} notes={notes} onVerseClick={onVerseClick} />
              ) : (
                prevLeftPageData && <PageContent bookName={prevLeftPageData.book.name} chapter={prevLeftPageData.chapter} notes={notes} onVerseClick={onVerseClick} />
              )}
              <div className="page-shadow-overlay"></div>
            </div>

            {/* FACE TRASEIRA (O que vai entrar) */}
            <div className="flipper-face flipper-back paper-texture shadow-2xl">
               {direction === 'next' ? (
                 <PageContent bookName={leftPageData.book.name} chapter={leftPageData.chapter} notes={notes} onVerseClick={onVerseClick} isBackPage />
               ) : (
                 rightPageData && <PageContent bookName={rightPageData.book.name} chapter={rightPageData.chapter} notes={notes} onVerseClick={onVerseClick} isBackPage />
               )}
               <div className="page-shadow-overlay"></div>
            </div>
          </div>
        )}
      </div>
      
      {/* Guia Visual Mobile */}
      <div className="md:hidden flex justify-center mt-10 items-center gap-3">
         <span className="text-amber-500/30 text-xs font-bold uppercase tracking-widest">Swipe para virar</span>
         <div className="w-12 h-1 rounded-full bg-amber-500/20 overflow-hidden">
            <div className="h-full bg-amber-500 animate-[loading_2s_infinite]"></div>
         </div>
      </div>
      <style>{`
        @keyframes loading {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};