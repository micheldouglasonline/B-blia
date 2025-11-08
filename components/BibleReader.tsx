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


const PageContent: React.FC<{ 
    bookName: string, 
    chapter: Chapter | null, 
    className?: string,
    notes: Notes,
    onVerseClick: (bookName: string, chapterNumber: number, verse: Verse) => void;
}> = ({ bookName, chapter, className="", notes, onVerseClick }) => {
    if (!chapter) return <div className={`w-full h-full ${className}`} />;
    return (
        <div className={`p-6 sm:p-8 md:p-10 h-full overflow-y-auto scrollbar-thin ${className}`}>
            <h2 className="font-serif-display text-3xl sm:text-4xl font-bold text-amber-800 text-center mb-6">
              {bookName} {chapter.chapter}
            </h2>
            <div className="space-y-4 text-gray-800 font-serif-display text-lg sm:text-xl leading-relaxed">
            {chapter.verses.map((verse) => {
              const noteKey = `${bookName}-${chapter.chapter}-${verse.verse}`;
              const hasNote = notes[noteKey];
              return (
                <p key={verse.verse} onClick={() => onVerseClick(bookName, chapter.chapter, verse)} className="cursor-pointer hover:bg-amber-400/10 rounded-md p-1 -m-1 transition-colors">
                  <sup className="font-sans text-amber-600/90 mr-2 text-xs font-bold">{verse.verse}</sup>
                  {verse.text}
                  {hasNote && <NoteIcon className="inline-block w-4 h-4 ml-2 text-amber-600/70" />}
                </p>
              )
            })}
            </div>
        </div>
    );
}

const CornerFlourish: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={`absolute w-16 h-16 text-amber-400/30 ${className}`} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M0 50 C25 25, 25 25, 50 0 L0 0 Z" fill="currentColor" />
        <path d="M0 70 C35 35, 35 35, 70 0 L55 0 C35 20, 20 35, 0 55 Z" fill="currentColor" opacity="0.5"/>
    </svg>
);

export const BibleReader: React.FC<BibleReaderProps> = ({ 
  leftPageData, rightPageData, isTransitioning, direction,
  illustration, isGenerating, onGenerateIllustration,
  notes, onVerseClick
}) => {
  
  const transitionClasses = isTransitioning 
    ? `opacity-0 ${direction === 'next' ? 'transform-gpu [transform:translateX(40%)_scale(0.6)_rotateY(-145deg)]' : 'transform-gpu [transform:translateX(-40%)_scale(0.6)_rotateY(145deg)]'}`
    : 'opacity-100 transform-gpu [transform:translateX(0)_rotateY(0deg)]';

  return (
    <div className="w-full max-w-2xl lg:max-w-6xl mx-2 sm:mx-6 md:mx-8">
      <div 
        className={`relative w-full aspect-[2/1.4] lg:aspect-[2/1.2] shadow-2xl rounded-lg flex transition-all duration-[1000ms] ease-[cubic-bezier(0.65,0,0.35,1)] transform-style-3d ${transitionClasses}`}
      >
        
        {/* Left Page */}
        <div className="w-1/2 h-full paper-texture rounded-l-lg shadow-inner-left flex flex-col bg-amber-50">
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
              <CornerFlourish className="absolute bottom-0 left-0" />
              <CornerFlourish className="absolute top-0 left-0 transform -scale-y-100" />
            </div>
        </div>
        
        {/* Right Page */}
        <div className="relative w-1/2 h-full paper-texture rounded-r-lg shadow-inner-right border-l border-gray-900/10 bg-amber-50">
            {rightPageData ? (
                 <div className="h-full relative">
                    <PageContent 
                        bookName={rightPageData.book.name}
                        chapter={rightPageData.chapter}
                        notes={notes}
                        onVerseClick={onVerseClick}
                    />
                    <CornerFlourish className="absolute bottom-0 right-0 transform -scale-x-100" />
                    <CornerFlourish className="absolute top-0 right-0 transform -scale-x-100 -scale-y-100" />
                 </div>
            ) : (
                <div className="flex items-center justify-center h-full">
                    <p className="font-serif-display text-2xl text-amber-800/50">Fim.</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};