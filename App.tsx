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

const safeStorage = {
  memoryStore: {} as Record<string, string>,
  getItem: (key: string): string | null => {
    try { return localStorage.getItem(key); } catch { return safeStorage.memoryStore[key] || null; }
  },
  setItem: (key: string, value: string) => {
    try { localStorage.setItem(key, value); } catch { safeStorage.memoryStore[key] = value; }
  }
};

type SelectedVerse = {
  bookName: string;
  chapter: number;
  verse: number;
  text: string;
}

const App: React.FC = () => {
  const [state, setState] = useState(() => ({ book: bibleService.getBook('Gênesis'), chapterIndex: 0 }));
  const [prevState, setPrevState] = useState<{book: Book, chapterIndex: number} | null>(null);
  const { book: currentBook, chapterIndex: currentChapterIndex } = state;
  
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [direction, setDirection] = useState<'next' | 'prev' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  const [currentIllustration, setCurrentIllustration] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageCache, setImageCache] = useState<Record<string, string>>({});
  
  const [notes, setNotes] = useState<Notes>(() => {
    const saved = safeStorage.getItem('bible-notes');
    try { return saved ? JSON.parse(saved) : {}; } catch { return {}; }
  });
  
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [selectedVerse, setSelectedVerse] = useState<SelectedVerse | null>(null);
  const [isTestimonyModalOpen, setIsTestimonyModalOpen] = useState(false);

  useEffect(() => {
    try {
      if (currentBook) {
        const bookName = encodeURIComponent(currentBook.name);
        const chapterNum = currentBook.chapters[currentChapterIndex]?.chapter || 1;
        window.history.replaceState(null, '', `#/${bookName}/${chapterNum}`);
      }
    } catch {}
  }, [currentBook, currentChapterIndex]);

  const leftPageData = useMemo(() => ({
    book: currentBook,
    chapter: currentBook.chapters[currentChapterIndex] || currentBook.chapters[0]
  }), [currentBook, currentChapterIndex]);

  const rightPageData = useMemo(() => {
    try {
      const { book, chapterIndex } = bibleService.getAdjacentChapter(currentBook.name, leftPageData.chapter.chapter, 'next');
      return { book, chapter: book.chapters[chapterIndex] };
    } catch { return null; }
  }, [currentBook, leftPageData]);

  const prevLeftPageData = useMemo(() => {
    if (!prevState) return null;
    return {
      book: prevState.book,
      chapter: prevState.book.chapters[prevState.chapterIndex] || prevState.book.chapters[0]
    };
  }, [prevState]);

  const prevRightPageData = useMemo(() => {
    if (!prevState || !prevLeftPageData) return null;
    try {
      const { book, chapterIndex } = bibleService.getAdjacentChapter(prevLeftPageData.book.name, prevLeftPageData.chapter.chapter, 'next');
      return { book, chapter: book.chapters[chapterIndex] };
    } catch { return null; }
  }, [prevState, prevLeftPageData]);

  const { isSpeaking, isPaused, speak, pause, resume, cancel } = useSpeechSynthesis(
    `Livro de ${leftPageData.book.name}, capítulo ${leftPageData.chapter.chapter}.`
  );
  
  const triggerTransition = useCallback((newState: {book: Book, chapterIndex: number}) => {
    setPrevState(state);
    setIsTransitioning(true);
    cancel();
    
    // Pequeno delay para permitir que o React processe o prevState
    setTimeout(() => {
      setState(newState);
      setCurrentIllustration(null);
      
      // Sincronizado com a duração do CSS (0.8s)
      setTimeout(() => {
        setIsTransitioning(false);
        setPrevState(null);
      }, 800);
    }, 20);
  }, [state, cancel]);

  const handleSearch = useCallback(async (query: string) => {
    if (isTransitioning) return;
    setIsAiLoading(true);
    setError(null);

    try {
        try {
            const result = bibleService.search(query);
            let chapterIndex = result.chapterIndex;
            if (chapterIndex > 0 && chapterIndex % 2 !== 0) chapterIndex--;
            setDirection('next');
            triggerTransition({ book: result.book, chapterIndex });
            setIsAiLoading(false);
            return;
        } catch (localError) {}

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
        const prompt = `Assistant: User search "${query}". Return the most relevant Bible Book and Chapter. Format: "Book Chapter". Example: "Psalms 23". If not found, "Not found".`;

        const result = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: [{ parts: [{ text: prompt }] }],
        });

        const aiResponse = result.text?.trim();
        if (aiResponse && aiResponse !== "Not found") {
            const bibleResult = bibleService.search(aiResponse);
            let chapterIndex = bibleResult.chapterIndex;
            if (chapterIndex > 0 && chapterIndex % 2 !== 0) chapterIndex--;
            setDirection('next');
            triggerTransition({ book: bibleResult.book, chapterIndex });
        } else {
            throw new Error(`Busca "${query}" não encontrada.`);
        }
    } catch (e: any) {
        setError(e.message || "Erro na busca.");
    } finally {
        setIsAiLoading(false);
    }
  }, [isTransitioning, triggerTransition]);

  const navigateSpread = useCallback((dir: 'next' | 'prev') => {
    if (isTransitioning) return;
    setDirection(dir);
    try {
      let target: { book: Book, chapterIndex: number };
      if (dir === 'next') {
        if (!rightPageData) throw new Error("Fim da Bíblia.");
        target = bibleService.getAdjacentChapter(rightPageData.book.name, rightPageData.chapter.chapter, 'next');
      } else {
        if (leftPageData.book.name === 'Gênesis' && leftPageData.chapter.chapter === 1) throw new Error("Início.");
        const prev1 = bibleService.getAdjacentChapter(leftPageData.book.name, leftPageData.chapter.chapter, 'prev');
        target = bibleService.getAdjacentChapter(prev1.book.name, prev1.book.chapters[prev1.chapterIndex].chapter, 'prev');
      }
      triggerTransition(target);
    } catch (e: any) {
      setError(e.message);
      setTimeout(() => setError(null), 2500);
    }
  }, [isTransitioning, leftPageData, rightPageData, triggerTransition]);

  const handleGenerateIllustration = useCallback(async (chapter: Chapter, bookName: string) => {
      const cacheKey = `${bookName}-${chapter.chapter}`;
      if (imageCache[cacheKey]) { setCurrentIllustration(imageCache[cacheKey]); return; }
      setIsGenerating(true);
      setError(null);
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
          const prompt = `Art for ${bookName} ${chapter.chapter}. Biblical scene, oil painting, high drama.`;
          const result = await ai.models.generateContent({
              model: 'gemini-2.5-flash-image',
              contents: { parts: [{ text: prompt }] },
              config: { imageConfig: { aspectRatio: "1:1" } }
          });
          const imgPart = result.candidates?.[0]?.content?.parts.find(p => p.inlineData);
          if (imgPart?.inlineData) {
              const url = `data:${imgPart.inlineData.mimeType};base64,${imgPart.inlineData.data}`;
              setCurrentIllustration(url);
              setImageCache(prev => ({ ...prev, [cacheKey]: url }));
          }
      } catch { setError("IA ocupada."); } finally { setIsGenerating(false); }
  }, [imageCache]);

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-200 overflow-x-hidden">
      <div className="relative z-50 bg-gradient-to-r from-amber-700 via-amber-500 to-amber-800 py-2.5 text-center shadow-xl animate-slide-down">
        <a href="https://mercadolivre.com/sec/2ATGUpL" target="_blank" className="inline-flex items-center gap-2 text-white font-bold text-sm sm:text-base hover:scale-105 transition-all">
          <span className="bg-white/30 px-2 py-0.5 rounded text-xs uppercase">Oferta</span>
          Melhores materiais bíblicos em destaque!
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5-5 5M6 7l5 5-5 5" /></svg>
        </a>
      </div>

      <ParticleBackground />

      <div className="relative z-10 flex flex-col items-center min-h-screen p-4 md:p-8">
        <header className="w-full max-w-4xl mx-auto text-center mb-6">
          <h1 className="font-serif-display text-5xl md:text-8xl font-bold text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.3)]">
            Bíblia Sagrada
          </h1>
          <p className="text-amber-100/40 mt-2 italic text-lg tracking-widest uppercase">A Palavra que Transforma</p>
        </header>
        
        <main className="w-full max-w-7xl mx-auto flex-grow flex flex-col items-center">
          <div className="relative w-full max-w-md">
            <SearchBar onSearch={handleSearch} />
            {isAiLoading && (
              <div className="absolute -bottom-8 left-0 right-0 text-center text-amber-400 text-xs animate-pulse">
                Buscando nas escrituras...
              </div>
            )}
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-4 mt-12">
            <ShareButtons url={window.location.href} />
            <button onClick={() => setIsTestimonyModalOpen(true)} className="px-8 py-2.5 rounded-full border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/30 text-amber-200 transition-all font-semibold shadow-lg">
              Testemunhos
            </button>
          </div>

          {error && (
            <div className="fixed top-32 z-50 animate-bounce">
              <span className="bg-red-600 text-white px-10 py-3 rounded-full shadow-2xl font-bold border border-red-400">
                {error}
              </span>
            </div>
          )}
          
          <div className="w-full mt-10 flex-grow flex items-center justify-center">
            <div className="flex flex-col md:flex-row items-center justify-center w-full gap-4 md:gap-12">
              <button onClick={() => navigateSpread('prev')} className="hidden md:flex p-6 rounded-full bg-slate-800/60 hover:bg-amber-500/40 text-amber-200 transition-all border border-amber-500/20 shadow-2xl active:scale-90" disabled={isTransitioning}>
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
              </button>
      
              <BibleReader
                leftPageData={leftPageData}
                rightPageData={rightPageData}
                prevLeftPageData={prevLeftPageData}
                prevRightPageData={prevRightPageData}
                isTransitioning={isTransitioning}
                direction={direction}
                illustration={currentIllustration}
                isGenerating={isGenerating}
                onGenerateIllustration={handleGenerateIllustration}
                notes={notes}
                onVerseClick={(b, c, v) => { setSelectedVerse({ bookName: b, chapter: c, verse: v.verse, text: v.text }); setIsNoteModalOpen(true); }}
              />

              <button onClick={() => navigateSpread('next')} className="hidden md:flex p-6 rounded-full bg-slate-800/60 hover:bg-amber-500/40 text-amber-200 transition-all border border-amber-500/20 shadow-2xl active:scale-90" disabled={isTransitioning}>
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
        </main>
        
        <NarrationControls isSpeaking={isSpeaking} isPaused={isPaused} onPlay={speak} onPause={pause} onResume={resume} onStop={cancel} />
        <Footer />
      </div>

      {isNoteModalOpen && selectedVerse && (
        <NoteModal verse={selectedVerse} note={notes[`${selectedVerse.bookName}-${selectedVerse.chapter}-${selectedVerse.verse}`] || ''}
          onSave={(t) => { setNotes(prev => ({ ...prev, [`${selectedVerse.bookName}-${selectedVerse.chapter}-${selectedVerse.verse}`]: t })); setIsNoteModalOpen(false); }}
          onDelete={() => { setNotes(prev => { const n = {...prev}; delete n[`${selectedVerse.bookName}-${selectedVerse.chapter}-${selectedVerse.verse}`]; return n; }); setIsNoteModalOpen(false); }}
          onClose={() => setIsNoteModalOpen(false)} />
      )}

      {isTestimonyModalOpen && (
        <TestimonyModal onSave={(t) => { safeStorage.setItem('user_testimony', t); setIsTestimonyModalOpen(false); }} onClose={() => setIsTestimonyModalOpen(false)} />
      )}
      <AudioControls />
    </div>
  );
};

export default App;