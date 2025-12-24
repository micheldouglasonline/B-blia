import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { ParticleBackground } from './components/ParticleBackground';
import { BibleReader } from './components/BibleReader';
import { SearchBar } from './components/SearchBar';
import { NarrationControls } from './components/NarrationControls';
import { bibleService } from './services/bibleService';
import { useSpeechSynthesis } from './hooks/useSpeechSynthesis';
import type { Book, Chapter, Verse, Notes } from './types';
import { Footer } from './components/Footer';
import { NoteModal } from './components/NoteModal';
import { ShareButtons } from './components/ShareButtons';
import { TestimonyModal } from './components/TestimonyModal';
import { AudioControls } from './components/AudioControls';

type SelectedVerse = {
  bookName: string;
  chapter: number;
  verse: number;
  text: string;
}

const App: React.FC = () => {
  const getInitialStateFromHash = useCallback(() => {
    try {
      const hash = window.location.hash.replace('#/', '');
      if (hash) {
        const parts = decodeURIComponent(hash).split('/');
        if (parts.length >= 2) {
          const [bookName, chapterNum] = parts;
          const book = bibleService.getBook(bookName);
          let chapterIndex = book.chapters.findIndex(c => c.chapter === parseInt(chapterNum));
          if (chapterIndex === -1) chapterIndex = 0;
          if (chapterIndex > 0 && chapterIndex % 2 !== 0) chapterIndex--;
          return { book, chapterIndex };
        }
      }
    } catch (e) {
      console.warn("Hash access restricted or invalid.");
    }
    return null;
  }, []);

  const [state, setState] = useState(() => getInitialStateFromHash() || { book: bibleService.getBook('Gênesis'), chapterIndex: 0 });
  const { book: currentBook, chapterIndex: currentChapterIndex } = state;
  
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [direction, setDirection] = useState<'next' | 'prev' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentIllustration, setCurrentIllustration] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageCache, setImageCache] = useState<Record<string, string>>({});
  
  const [notes, setNotes] = useState<Notes>(() => {
    try {
      const saved = localStorage.getItem('bible-notes');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [selectedVerse, setSelectedVerse] = useState<SelectedVerse | null>(null);
  const [isTestimonyModalOpen, setIsTestimonyModalOpen] = useState(false);

  useEffect(() => {
    try {
      if (currentBook) {
        const bookName = encodeURIComponent(currentBook.name);
        const chapterNum = currentBook.chapters[currentChapterIndex]?.chapter || 1;
        const newHash = `#/${bookName}/${chapterNum}`;
        if (window.location.hash !== newHash) {
          window.history.replaceState(null, '', newHash);
        }
      }
    } catch (e) {
      // Ignore security errors with history API
    }
  }, [currentBook, currentChapterIndex]);

  useEffect(() => {
    try {
      localStorage.setItem('bible-notes', JSON.stringify(notes));
    } catch (e) {
      // Ignore storage errors
    }
  }, [notes]);

  const leftPageData = useMemo(() => ({
    book: currentBook,
    chapter: currentBook.chapters[currentChapterIndex] || currentBook.chapters[0]
  }), [currentBook, currentChapterIndex]);

  const rightPageData = useMemo(() => {
    try {
      const { book, chapterIndex } = bibleService.getAdjacentChapter(currentBook.name, leftPageData.chapter.chapter, 'next');
      return { book, chapter: book.chapters[chapterIndex] };
    } catch {
      return null;
    }
  }, [currentBook, leftPageData]);

  const chapterTextForNarration = useMemo(() => {
    const leftText = `Livro de ${leftPageData.book.name}, capítulo ${leftPageData.chapter.chapter}. ${leftPageData.chapter.verses.map(v => v.text).join(' ')}`;
    const rightText = rightPageData ? `Capítulo ${rightPageData.chapter.chapter}. ${rightPageData.chapter.verses.map(v => v.text).join(' ')}` : '';
    return `${leftText} ${rightText}`;
  }, [leftPageData, rightPageData]);

  const { isSpeaking, isPaused, speak, pause, resume, cancel } = useSpeechSynthesis(chapterTextForNarration);
  
  const triggerTransition = useCallback((callback: () => void) => {
    setIsTransitioning(true);
    setCurrentIllustration(null); 
    cancel();
    setTimeout(() => {
      callback();
      setTimeout(() => {
        setIsTransitioning(false);
      }, 50);
    }, 800);
  }, [cancel]);

  const navigateSpread = useCallback((dir: 'next' | 'prev') => {
    if (isTransitioning) return;
    setDirection(dir);
    
    try {
      let targetBook: Book;
      let targetChapterIndex: number;

      if (dir === 'next') {
        if (!rightPageData) throw new Error("Fim da Bíblia.");
        const nextData = bibleService.getAdjacentChapter(rightPageData.book.name, rightPageData.chapter.chapter, 'next');
        targetBook = nextData.book;
        targetChapterIndex = nextData.chapterIndex;
      } else {
        if (leftPageData.book.name === 'Gênesis' && leftPageData.chapter.chapter === 1) {
          throw new Error("Início da Bíblia.");
        }
        const prevPageData = bibleService.getAdjacentChapter(leftPageData.book.name, leftPageData.chapter.chapter, 'prev');
        const prevPrevPageData = bibleService.getAdjacentChapter(prevPageData.book.name, prevPageData.book.chapters[prevPageData.chapterIndex].chapter, 'prev');
        targetBook = prevPrevPageData.book;
        targetChapterIndex = prevPrevPageData.chapterIndex;
      }

      triggerTransition(() => {
        setState({ book: targetBook, chapterIndex: targetChapterIndex });
      });
      setError(null);
    } catch (e: any) {
      setError(e.message);
      setTimeout(() => setError(null), 3000);
    }
  }, [isTransitioning, leftPageData, rightPageData, triggerTransition]);

  const handleSearch = useCallback((query: string) => {
    if (isTransitioning) return;
    try {
        let { book, chapterIndex } = bibleService.search(query);
        if (chapterIndex > 0 && chapterIndex % 2 !== 0) chapterIndex--;
        setDirection('next');
        triggerTransition(() => {
          setState({ book, chapterIndex });
        });
        setError(null);
    } catch (e: any) {
        setError(e.message);
        setTimeout(() => setError(null), 3000);
    }
  }, [isTransitioning, triggerTransition]);
  
  const handleGenerateIllustration = useCallback(async (chapter: Chapter, bookName: string) => {
      const cacheKey = `${bookName}-${chapter.chapter}`;
      if (imageCache[cacheKey]) {
          setCurrentIllustration(imageCache[cacheKey]);
          return;
      }
      setIsGenerating(true);
      setCurrentIllustration(null);
      setError(null);
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
          const summaryText = chapter.verses.slice(0, 3).map(v => v.text).join(' ');
          const prompt = `A magnificent biblical oil painting for ${bookName} chapter ${chapter.chapter}. Theme: ${summaryText}. Baroque style, dramatic lighting, high detail.`;

          const result = await ai.models.generateContent({
              model: 'gemini-2.5-flash-image',
              contents: { parts: [{ text: prompt }] },
              config: { imageConfig: { aspectRatio: "1:1" } }
          });

          const parts = result.candidates?.[0]?.content?.parts || [];
          const imgPart = parts.find(p => p.inlineData);
          
          if (imgPart?.inlineData) {
              const url = `data:${imgPart.inlineData.mimeType};base64,${imgPart.inlineData.data}`;
              setCurrentIllustration(url);
              setImageCache(prev => ({ ...prev, [cacheKey]: url }));
          } else {
              throw new Error("AI failed to provide an image.");
          }
      } catch (err) {
          setError("Falha ao gerar ilustração.");
          console.error(err);
      } finally {
          setIsGenerating(false);
      }
  }, [imageCache]);
  
  const handleOpenNoteModal = useCallback((bookName: string, chapter: number, verse: Verse) => {
    setSelectedVerse({ bookName, chapter, verse: verse.verse, text: verse.text });
    setIsNoteModalOpen(true);
  }, []);

  const handleSaveNote = useCallback((noteText: string) => {
    if (!selectedVerse) return;
    const noteKey = `${selectedVerse.bookName}-${selectedVerse.chapter}-${selectedVerse.verse}`;
    setNotes(prev => ({ ...prev, [noteKey]: noteText }));
    setIsNoteModalOpen(false);
  }, [selectedVerse]);

  const handleDeleteNote = useCallback(() => {
    if (!selectedVerse) return;
    const noteKey = `${selectedVerse.bookName}-${selectedVerse.chapter}-${selectedVerse.verse}`;
    setNotes(prev => {
      const next = { ...prev };
      delete next[noteKey];
      return next;
    });
    setIsNoteModalOpen(false);
  }, [selectedVerse]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowRight') navigateSpread('next');
      else if (e.key === 'ArrowLeft') navigateSpread('prev');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigateSpread]);

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-200">
      <ParticleBackground />

      <div className="relative z-10 flex flex-col items-center min-h-screen p-4 md:p-8">
        <header className="w-full max-w-4xl mx-auto text-center mb-8">
          <h1 className="font-serif-display text-5xl md:text-7xl font-bold text-amber-400 drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]">
            Bíblia Sagrada
          </h1>
          <p className="text-amber-100/60 mt-2 italic text-lg tracking-wide">A Luz para o Seu Caminho</p>
        </header>
        
        <main className="w-full max-w-7xl mx-auto flex-grow flex flex-col items-center">
          <SearchBar onSearch={handleSearch} />
          
          <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
            <ShareButtons url={window.location.href} />
            <button 
              onClick={() => setIsTestimonyModalOpen(true)}
              className="px-8 py-2.5 rounded-full border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-200 transition-all font-semibold shadow-inner"
            >
              Testemunhos
            </button>
          </div>

          {error && (
            <div className="fixed top-24 z-50 animate-bounce">
              <span className="bg-red-500/90 text-white px-8 py-3 rounded-full shadow-2xl font-bold border border-red-400/50 backdrop-blur-sm">
                {error}
              </span>
            </div>
          )}
          
          <div className="w-full mt-10 flex-grow flex items-center justify-center">
            <div className="flex flex-col md:flex-row items-center justify-center w-full gap-6 md:gap-12">
              <button
                onClick={() => navigateSpread('prev')}
                className="hidden md:flex p-5 rounded-full bg-slate-800/50 hover:bg-amber-500/30 text-amber-200 transition-all backdrop-blur-md border border-amber-500/20 hover:scale-110 active:scale-95 shadow-lg group"
                disabled={isTransitioning}
              >
                <svg className="w-10 h-10 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
              </button>
      
              <BibleReader
                leftPageData={leftPageData}
                rightPageData={rightPageData}
                isTransitioning={isTransitioning}
                direction={direction}
                illustration={currentIllustration}
                isGenerating={isGenerating}
                onGenerateIllustration={handleGenerateIllustration}
                notes={notes}
                onVerseClick={handleOpenNoteModal}
              />

              <button
                onClick={() => navigateSpread('next')}
                className="hidden md:flex p-5 rounded-full bg-slate-800/50 hover:bg-amber-500/30 text-amber-200 transition-all backdrop-blur-md border border-amber-500/20 hover:scale-110 active:scale-95 shadow-lg group"
                disabled={isTransitioning}
              >
                <svg className="w-10 h-10 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
              </button>

              <div className="flex md:hidden gap-6 mt-4">
                  <button onClick={() => navigateSpread('prev')} className="px-10 py-3 bg-slate-800/50 rounded-full text-amber-200 border border-amber-500/30 active:bg-amber-500/40">Anterior</button>
                  <button onClick={() => navigateSpread('next')} className="px-10 py-3 bg-slate-800/50 rounded-full text-amber-200 border border-amber-500/30 active:bg-amber-500/40">Próximo</button>
              </div>
            </div>
          </div>
        </main>
        
        <NarrationControls
          isSpeaking={isSpeaking}
          isPaused={isPaused}
          onPlay={speak}
          onPause={pause}
          onResume={resume}
          onStop={cancel}
        />

        <Footer />
      </div>

      {isNoteModalOpen && selectedVerse && (
        <NoteModal
          verse={selectedVerse}
          note={notes[`${selectedVerse.bookName}-${selectedVerse.chapter}-${selectedVerse.verse}`] || ''}
          onSave={handleSaveNote}
          onDelete={handleDeleteNote}
          onClose={() => setIsNoteModalOpen(false)}
        />
      )}

      {isTestimonyModalOpen && (
        <TestimonyModal
          onSave={(t) => {
            try { localStorage.setItem('user_testimony', t); } catch {}
            setIsTestimonyModalOpen(false);
          }}
          onClose={() => setIsTestimonyModalOpen(false)}
        />
      )}
      <AudioControls />
    </div>
  );
};

export default App;