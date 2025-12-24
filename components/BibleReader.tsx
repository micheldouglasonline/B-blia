import React, { useState } from 'react';
import type { Chapter, Book, Verse, Notes } from '../types';
import { IllustrationPanel } from './IllustrationPanel';

interface PageData {
  book: Book;
  chapter: Chapter;
}

interface BibleReaderProps {
  leftPageData: PageData;
  rightPageData: PageData | null;
  isTransitioning: boolean;
  direction: 'next' | 'prev' | null;
  illustration: string | null;
  isGenerating: boolean;
  onGenerateIllustration: (chapter: Chapter, bookName: string) => void;
  notes: Notes;
  onVerseClick: (bookName: string, chapterNumber: number, verse: Verse) => void;
}

const NoteIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
      <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
    </svg>
);

const VerseItem: React.FC<{
  bookName: string;
  chapterNumber: number;
  verse: Verse;
  hasNote: boolean;
  onVerseClick: (bookName: string, chapterNumber: number, verse: Verse) => void;
}> = ({ bookName, chapterNumber, verse, hasNote, onVerseClick }) => {
  return (
    <div 
      className="relative group cursor-pointer hover:bg-amber-400/10 rounded-md p-3 -m-3 transition-all duration-300"
      onClick={() => onVerseClick(bookName, chapterNumber, verse)}
    >
      <p className="text-slate-800 font-serif-display text-lg sm:text-xl leading-relaxed">
        <sup className="font-sans text-amber-600/90 mr-2 text-xs font-bold">{verse.verse}</sup>
        {verse.text}
        {hasNote && <NoteIcon className="inline-block w-4 h-4 ml-2 text-amber-600/70" />}
      </p>
      
      <button 
        className="absolute top-3 right-3 p-1.5 rounded-full bg-amber-200/50 opacity-0 group-hover:opacity-100 transition-opacity text-amber-900 shadow-sm"
        title="Ver Anotações"
      >
        <NoteIcon className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

const PageContent: React.FC<{ 
    bookName: string, 
    chapter: Chapter | null, 
    className?: string,
    notes: Notes,
    onVerseClick: (bookName: string, chapterNumber: number, verse: Verse) => void;
}> = ({ bookName, chapter, className="", notes, onVerseClick }) => {
    if (!chapter) return <div className={`w-full h-full ${className}`} />;
    return (
        <div className={`p-8 sm:p-10 md:p-12 h-full overflow-y-auto scrollbar-thin ${className}`}>
            <h2 className="font-serif-display text-4xl sm:text-5xl font-bold text-amber-900 text-center mb-10 border-b border-amber-200 pb-4">
              {bookName} {chapter.chapter}
            </h2>
            <div className="space-y-8">
            {chapter.verses.map((verse) => {
              const noteKey = `${bookName}-${chapter.chapter}-${verse.verse}`;
              const hasNote = !!notes[noteKey];
              return (
                <VerseItem 
                  key={verse.verse}
                  bookName={bookName}
                  chapterNumber={chapter.chapter}
                  verse={verse}
                  hasNote={hasNote}
                  onVerseClick={onVerseClick}
                />
              )
            })}
            </div>
        </div>
    );
}

export const BibleReader: React.FC<BibleReaderProps> = ({ 
  leftPageData, rightPageData, isTransitioning, direction,
  illustration, isGenerating, onGenerateIllustration,
  notes, onVerseClick
}) => {
  
  // Animação de virar página: combina escala, rotação e opacidade
  const transitionClasses = isTransitioning 
    ? `opacity-0 scale-95 ${direction === 'next' ? '-rotate-y-12 translate-x-12' : 'rotate-y-12 -translate-x-12'}`
    : 'opacity-100 scale-100 rotate-y-0 translate-x-0';

  return (
    <div className="w-full max-w-2xl lg:max-w-6xl mx-auto perspective-1000">
      <div 
        className={`relative w-full aspect-[2/1.3] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] rounded-lg flex transition-all duration-[800ms] cubic-bezier(0.4, 0, 0.2, 1) transform-style-3d ${transitionClasses}`}
      >
        <div className="book-spine" />
        
        {/* Página Esquerda */}
        <div className="w-1/2 h-full paper-texture rounded-l-lg page-inner-shadow-left overflow-hidden flex flex-col bg-[#fdfaf3] border-r border-amber-200/50">
            <IllustrationPanel 
              bookName={leftPageData.book.name}
              chapter={leftPageData.chapter}
              onGenerate={() => onGenerateIllustration(leftPageData.chapter, leftPageData.book.name)}
              imageUrl={illustration}
              isGenerating={isGenerating}
            />
            <div className="flex-grow overflow-hidden relative">
              <PageContent 
                    bookName={leftPageData.book.name}
                    chapter={leftPageData.chapter}
                    notes={notes}
                    onVerseClick={onVerseClick}
                />
            </div>
        </div>
        
        {/* Página Direita */}
        <div className="relative w-1/2 h-full paper-texture rounded-r-lg page-inner-shadow-right bg-[#fdfaf3]">
            {rightPageData ? (
                 <div className="h-full relative overflow-hidden">
                    <PageContent 
                        bookName={rightPageData.book.name}
                        chapter={rightPageData.chapter}
                        notes={notes}
                        onVerseClick={onVerseClick}
                    />
                 </div>
            ) : (
                <div className="flex items-center justify-center h-full">
                    <p className="font-serif-display text-4xl text-amber-800/20 italic">Amém.</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};