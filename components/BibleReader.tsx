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
      className="verse-item relative group cursor-pointer hover:bg-amber-400/5 rounded-lg p-3 -mx-2 transition-all duration-300"
      onClick={() => onVerseClick(bookName, chapterNumber, verse)}
    >
      <div className="flex gap-3">
        <div className="flex flex-col items-center pt-1 min-w-[24px]">
          <sup className="font-sans text-amber-700/80 text-[10px] font-black uppercase mb-2">{verse.verse}</sup>
          <button 
            onClick={handleReadVerse}
            className="verse-audio-btn p-1 rounded-full text-amber-700/40 hover:text-amber-600 hover:bg-amber-100 transition-all"
            title="Ouvir este versículo"
          >
            <SpeakerIcon className="w-4 h-4" />
          </button>
        </div>
        
        <p className="text-slate-800 font-serif-display text-xl leading-relaxed flex-grow">
          {verse.text}
          {hasNote && <span className="ml-2 inline-block w-2 h-2 rounded-full bg-amber-600 animate-pulse"></span>}
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
        <div className={`p-10 md:p-14 h-full overflow-y-auto scrollbar-thin paper-texture ${isBackPage ? 'scale-x-[-1]' : ''}`}>
            <h2 className="font-serif-display text-5xl font-bold text-amber-950 text-center mb-8 pb-4 border-b-2 border-amber-200/60 italic">
              {bookName} {chapter.chapter}
            </h2>
            <div className="space-y-4">
            {chapter.verses.map((v) => (
              <VerseItem key={v.verse} bookName={bookName} chapterNumber={chapter.chapter} verse={v} hasNote={!!notes[`${bookName}-${chapter.chapter}-${v.verse}`]} onVerseClick={onVerseClick} />
            ))}
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
    <div className="book-perspective w-full max-w-2xl lg:max-w-6xl mx-auto">
      <div className="book-wrapper relative w-full aspect-[2/1.35] shadow-[0_60px_100px_-20px_rgba(0,0,0,0.8)] rounded-xl flex overflow-visible">
        <div className="book-spine" />
        
        {/* PÁGINAS DE FUNDO */}
        <div className="w-1/2 h-full paper-texture rounded-l-xl overflow-hidden flex flex-col border-r border-amber-200/40 relative">
            {/* Sombra de dobra na página fixa da esquerda */}
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black/10 to-transparent z-10 pointer-events-none"></div>
            
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
        
        <div className="relative w-1/2 h-full paper-texture rounded-r-xl overflow-hidden bg-[#fdfaf3]">
            {/* Sombra de dobra na página fixa da direita */}
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-black/10 to-transparent z-10 pointer-events-none"></div>
            
            {rightPageData ? (
                <PageContent bookName={rightPageData.book.name} chapter={rightPageData.chapter} notes={notes} onVerseClick={onVerseClick} />
            ) : (
                <div className="flex flex-col items-center justify-center h-full p-10 text-center opacity-30">
                    <p className="font-serif-display text-4xl italic text-amber-950">Amém</p>
                </div>
            )}
        </div>

        {/* FLIPPER: A página que voa */}
        {isTransitioning && direction && (
          <div className={`flipper ${direction === 'next' ? 'flipper-next' : 'flipper-prev'} flipping`}>
            {/* FACE FRONTAL */}
            <div className="flipper-face flipper-front paper-texture shadow-2xl">
              {direction === 'next' ? (
                prevRightPageData && <PageContent bookName={prevRightPageData.book.name} chapter={prevRightPageData.chapter} notes={notes} onVerseClick={onVerseClick} />
              ) : (
                prevLeftPageData && <PageContent bookName={prevLeftPageData.book.name} chapter={prevLeftPageData.chapter} notes={notes} onVerseClick={onVerseClick} />
              )}
              <div className="page-shadow-overlay"></div>
            </div>

            {/* FACE TRASEIRA */}
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
    </div>
  );
};