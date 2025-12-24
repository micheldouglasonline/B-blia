import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
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

  const touchStartRef = useRef<number | null>(null);

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
    
    // Pequeno delay para garantir que o React renderize o prevState como 'current' antes de mudar
    setTimeout(() => {
      setState(newState);
      setCurrentIllustration(null);
      
      // Sincronizado com a duração do CSS (1.4s)
      setTimeout(() => {
        setIsTransitioning(false);
        setPrevState(null);
      }, 1400);
    }, 50);
  }, [state, cancel]);

  const handleSearch = useCallback(async (query: string) => {
    if (isTransitioning) return;
    setIsAiLoading(true);
    setError(null);

    try {
        // Tenta busca local primeiro para velocidade
        try {
            const result = bibleService.search(query);
            let chapterIndex = result.chapterIndex;
            if (chapterIndex > 0 && chapterIndex % 2 !== 0) chapterIndex--;
            setDirection('next');
            triggerTransition({ book: result.book, chapterIndex });
            setIsAiLoading(false);
            return;
        } catch (localError) {
            console.log("Busca local falhou, tentando IA...");
        }

        const apiKey = process.env.API_KEY;
        if (!apiKey) throw new Error("API Key não configurada no ambiente.");

        const ai = new GoogleGenAI({ apiKey });
        const prompt = `Analise a intenção de busca bíblica: "${query}". Responda APENAS com "Livro Capítulo" (ex: Salmos 23). Se não for um livro da bíblia ou tema bíblico, responda "Nulo".`;

        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: [{ parts: [{ text: prompt }] }],
        });

        const aiResponse = response.text?.trim();
        if (aiResponse && aiResponse !== "Nulo") {
            const bibleResult = bibleService.search(aiResponse);
            let chapterIndex = bibleResult.chapterIndex;
            if (chapterIndex > 0 && chapterIndex % 2 !== 0) chapterIndex--;
            setDirection('next');
            triggerTransition({ book: bibleResult.book, chapterIndex });
        } else {
            throw new Error(`Não encontramos resultados para "${query}".`);
        }
    } catch (e: any) {
        setError(e.message || "Houve um problema na conexão com o servidor.");
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
        if (leftPageData.book.name === 'Gênesis' && leftPageData.chapter.chapter === 1) throw new Error("Início da Bíblia.");
        const prev1 = bibleService.getAdjacentChapter(leftPageData.book.name, leftPageData.chapter.chapter, 'prev');
        target = bibleService.getAdjacentChapter(prev1.book.name, prev1.book.chapters[prev1.chapterIndex].chapter, 'prev');
      }
      triggerTransition(target);
    } catch (e: any) {
      setError(e.message);
      setTimeout(() => setError(null), 3000);
    }
  }, [isTransitioning, leftPageData, rightPageData, triggerTransition]);

  const handleGenerateIllustration = useCallback(async (chapter: Chapter, bookName: string) => {
      const cacheKey = `${bookName}-${chapter.chapter}`;
      if (imageCache[cacheKey]) { setCurrentIllustration(imageCache[cacheKey]); return; }
      
      setIsGenerating(true);
      setError(null);
      try {
          const apiKey = process.env.API_KEY;
          if (!apiKey) throw new Error("API Key ausente.");

          const ai = new GoogleGenAI({ apiKey });
          const prompt = `Pintura bíblica sagrada: ${bookName} capítulo ${chapter.chapter}. Estilo Caravaggio, luz divina dramática, 8k, ultra detalhado.`;
          
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
          }
      } catch (err) { 
          console.error(err);
          setError("Não foi possível gerar a arte no momento."); 
      } finally { 
          setIsGenerating(false); 
      }
  }, [imageCache]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartRef.current === null) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStartRef.current - touchEnd;
    const threshold = 70;

    if (Math.abs(diff) > threshold) {
      if (diff > 0) navigateSpread('next');
      else navigateSpread('prev');
    }
    touchStartRef.current = null;
  };

  return (
    <div 
      className="relative min-h-screen bg-slate-950 text-slate-200 overflow-x-hidden flex flex-col"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="relative z-50 bg-gradient-to-r from-amber-700 via-amber-600 to-amber-800 py-3 text-center shadow-2xl animate-slide-down">
        <a href="https://mercadolivre.com/sec/2ATGUpL" target="_blank" className="inline-flex items-center gap-2 text-white font-bold text-sm hover:scale-105 transition-transform duration-300">
          <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] uppercase tracking-tighter">Bíblias e Estudos</span>
          Explore os melhores materiais bíblicos selecionados para você!
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
        </a>
      </div>

      <ParticleBackground />

      <div className="relative z-10 flex flex-col items-center flex-grow p-4 md:p-10">
        <header className="w-full max-w-4xl mx-auto text-center mb-10">
          <h1 className="font-serif-display text-6xl md:text-9xl font-bold text-amber-500 drop-shadow-[0_0_25px_rgba(245,158,11,0.4)] tracking-tight">
            Bíblia
          </h1>
          <p className="text-amber-100/50 mt-4 italic text-xl tracking-[0.2em] uppercase">Experiência Digital Imersiva</p>
        </header>
        
        <main className="w-full max-w-7xl mx-auto flex-grow flex flex-col items-center">
          <div className="relative w-full max-w-lg">
            <SearchBar onSearch={handleSearch} />
            {isAiLoading && (
              <div className="absolute -bottom-10 left-0 right-0 text-center text-amber-400 text-sm font-medium italic animate-pulse">
                Consultando manuscritos sagrados...
              </div>
            )}
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-6 mt-16">
            <ShareButtons url={window.location.href} />
            <button onClick={() => setIsTestimonyModalOpen(true)} className="px-10 py-3 rounded-full border border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/20 text-amber-100 transition-all font-bold shadow-xl active:scale-95">
              Deixe seu Testemunho
            </button>
          </div>

          {error && (
            <div className="fixed top-1/4 z-[1000] animate-bounce pointer-events-none">
              <span className="bg-red-600/90 backdrop-blur-md text-white px-12 py-4 rounded-2xl shadow-2xl font-bold border-2 border-red-400 flex items-center gap-3">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                {error}
              </span>
            </div>
          )}
          
          <div className="w-full mt-12 flex-grow flex items-center justify-center">
            <div className="flex flex-col md:flex-row items-center justify-center w-full gap-6 md:gap-14">
              <button onClick={() => navigateSpread('prev')} className="hidden md:flex p-7 rounded-full bg-slate-900/80 hover:bg-amber-500/50 text-amber-300 transition-all border border-amber-500/30 shadow-2xl active:scale-90" disabled={isTransitioning}>
                <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
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

              <button onClick={() => navigateSpread('next')} className="hidden md:flex p-7 rounded-full bg-slate-900/80 hover:bg-amber-500/50 text-amber-300 transition-all border border-amber-500/30 shadow-2xl active:scale-90" disabled={isTransitioning}>
                <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
        </main>
        
        <NarrationControls isSpeaking={isSpeaking} isPaused={isPaused} onPlay={speak} onPause={pause} onResume={resume} onStop={cancel} />
        <Footer />
      </div>

      {isNoteModalOpen && selectedVerse && (
        <NoteModal verse={selectedVerse} note={notes[`${selectedVerse.bookName}-${selectedVerse.chapter}-${selectedVerse.verse}`] || ''}
          onSave={(t) => { 
            const newNotes = { ...notes, [`${selectedVerse.bookName}-${selectedVerse.chapter}-${selectedVerse.verse}`]: t };
            setNotes(newNotes); 
            safeStorage.setItem('bible-notes', JSON.stringify(newNotes));
            setIsNoteModalOpen(false); 
          }}
          onDelete={() => { 
            const n = {...notes}; 
            delete n[`${selectedVerse.bookName}-${selectedVerse.chapter}-${selectedVerse.verse}`]; 
            setNotes(n); 
            safeStorage.setItem('bible-notes', JSON.stringify(n));
            setIsNoteModalOpen(false); 
          }}
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