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
    
    // Pequeno delay para garantir sincronia do estado anterior
    setTimeout(() => {
      setState(newState);
      setCurrentIllustration(null);
      
      // Sincronizado com a duração do CSS (1.5s)
      setTimeout(() => {
        setIsTransitioning(false);
        setPrevState(null);
      }, 1500);
    }, 100);
  }, [state, cancel]);

  const handleSearch = useCallback(async (query: string) => {
    if (isTransitioning) return;
    setIsAiLoading(true);
    setError(null);

    try {
        // Tenta busca local robusta primeiro
        try {
            const result = bibleService.search(query);
            let chapterIndex = result.chapterIndex;
            // Alinhamento para spreads de 2 páginas
            if (chapterIndex > 0 && chapterIndex % 2 !== 0) chapterIndex--;
            setDirection('next');
            triggerTransition({ book: result.book, chapterIndex });
            setIsAiLoading(false);
            return;
        } catch (localError) {
            console.log("Local search skipped, engaging AI reasoning...");
        }

        const apiKey = process.env.API_KEY;
        if (!apiKey) throw new Error("A conexão com o servidor de IA não foi estabelecida.");

        const ai = new GoogleGenAI({ apiKey });
        const prompt = `Você é um guia bíblico. Identifique a referência bíblica mais próxima para: "${query}". Responda estritamente no formato "Livro Capítulo" (ex: Gênesis 1). Caso não identifique nada, responda "Erro".`;

        const result = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: [{ parts: [{ text: prompt }] }],
        });

        const responseText = result.text?.trim();
        if (responseText && responseText !== "Erro") {
            const bibleResult = bibleService.search(responseText);
            let chapterIndex = bibleResult.chapterIndex;
            if (chapterIndex > 0 && chapterIndex % 2 !== 0) chapterIndex--;
            setDirection('next');
            triggerTransition({ book: bibleResult.book, chapterIndex });
        } else {
            throw new Error(`A referência "${query}" não foi encontrada.`);
        }
    } catch (e: any) {
        setError(e.message || "Erro de conexão. Tente novamente em instantes.");
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
        if (!rightPageData) throw new Error("Você alcançou o fim das escrituras.");
        target = bibleService.getAdjacentChapter(rightPageData.book.name, rightPageData.chapter.chapter, 'next');
      } else {
        if (leftPageData.book.name === 'Gênesis' && leftPageData.chapter.chapter === 1) throw new Error("Início da Bíblia.");
        const step1 = bibleService.getAdjacentChapter(leftPageData.book.name, leftPageData.chapter.chapter, 'prev');
        target = bibleService.getAdjacentChapter(step1.book.name, step1.book.chapters[step1.chapterIndex].chapter, 'prev');
      }
      triggerTransition(target);
    } catch (e: any) {
      setError(e.message);
      setTimeout(() => setError(null), 3500);
    }
  }, [isTransitioning, leftPageData, rightPageData, triggerTransition]);

  const handleGenerateIllustration = useCallback(async (chapter: Chapter, bookName: string) => {
      const cacheKey = `${bookName}-${chapter.chapter}`;
      if (imageCache[cacheKey]) { setCurrentIllustration(imageCache[cacheKey]); return; }
      
      setIsGenerating(true);
      setError(null);
      try {
          const apiKey = process.env.API_KEY;
          if (!apiKey) throw new Error("Chave de API não disponível.");

          const ai = new GoogleGenAI({ apiKey });
          const prompt = `Ilustração sacra e majestosa de ${bookName} capítulo ${chapter.chapter}. Pintura digital épica, estilo renascentista moderno, luz cinematográfica, tons dourados e terrosos.`;
          
          const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash-image',
              contents: { parts: [{ text: prompt }] },
              config: { imageConfig: { aspectRatio: "1:1" } }
          });
          
          const parts = response.candidates?.[0]?.content?.parts || [];
          const imagePart = parts.find(p => p.inlineData);
          
          if (imagePart?.inlineData) {
              const b64 = imagePart.inlineData.data;
              const mime = imagePart.inlineData.mimeType;
              const dataUrl = `data:${mime};base64,${b64}`;
              setCurrentIllustration(dataUrl);
              setImageCache(prev => ({ ...prev, [cacheKey]: dataUrl }));
          }
      } catch (err) { 
          console.error("Image generation failed:", err);
          setError("A galeria de arte divina está temporariamente fechada."); 
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
    const sensitivity = 65;

    if (Math.abs(diff) > sensitivity) {
      if (diff > 0) navigateSpread('next');
      else navigateSpread('prev');
    }
    touchStartRef.current = null;
  };

  return (
    <div 
      className="relative min-h-screen bg-slate-950 text-slate-200 overflow-x-hidden flex flex-col selection:bg-amber-500/30"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="relative z-[100] bg-gradient-to-r from-amber-800 via-amber-600 to-amber-900 py-3 text-center shadow-[0_4px_30px_rgba(0,0,0,0.5)] animate-slide-down">
        <a href="https://mercadolivre.com/sec/2ATGUpL" target="_blank" className="inline-flex items-center gap-3 text-white font-bold text-sm tracking-wide hover:scale-105 transition-transform duration-500">
          <span className="bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[10px] uppercase border border-white/10">Recomendação</span>
          Descubra materiais de estudo bíblico selecionados. Explore agora!
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5-5 5M6 7l5 5-5 5" /></svg>
        </a>
      </div>

      <ParticleBackground />

      <div className="relative z-10 flex flex-col items-center flex-grow p-4 md:p-12">
        <header className="w-full max-w-5xl mx-auto text-center mb-12">
          <h1 className="font-serif-display text-7xl md:text-[10rem] font-bold text-amber-500 drop-shadow-[0_10px_40px_rgba(245,158,11,0.5)] tracking-tighter leading-none">
            Bíblia
          </h1>
          <p className="text-amber-100/40 mt-6 italic text-xl md:text-2xl tracking-[0.3em] uppercase font-light">Luz para o seu caminho</p>
        </header>
        
        <main className="w-full max-w-7xl mx-auto flex-grow flex flex-col items-center">
          <div className="relative w-full max-w-xl">
            <SearchBar onSearch={handleSearch} />
            {isAiLoading && (
              <div className="absolute -bottom-12 left-0 right-0 text-center text-amber-400 text-sm font-bold tracking-widest italic animate-pulse">
                Sondando os pergaminhos...
              </div>
            )}
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-8 mt-20">
            <ShareButtons url={window.location.href} />
            <button onClick={() => setIsTestimonyModalOpen(true)} className="px-12 py-3.5 rounded-full border-2 border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/30 text-amber-50 hover:text-white transition-all duration-500 font-black shadow-2xl active:scale-95 uppercase text-xs tracking-widest">
              Escrever Testemunho
            </button>
          </div>

          {error && (
            <div className="fixed top-1/3 z-[2000] animate-bounce-slow">
              <span className="bg-red-700/90 backdrop-blur-xl text-white px-14 py-5 rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.5)] font-bold border-2 border-red-500/50 flex items-center gap-4 text-lg">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                {error}
              </span>
            </div>
          )}
          
          <div className="w-full mt-16 flex-grow flex items-center justify-center">
            <div className="flex flex-col md:flex-row items-center justify-center w-full gap-8 md:gap-20">
              <button onClick={() => navigateSpread('prev')} className="hidden md:flex p-8 rounded-full bg-slate-900/90 hover:bg-amber-500/60 text-amber-300 hover:text-white transition-all duration-500 border border-amber-500/40 shadow-[0_20px_40px_rgba(0,0,0,0.4)] active:scale-75" disabled={isTransitioning}>
                <svg className="w-14 h-14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
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

              <button onClick={() => navigateSpread('next')} className="hidden md:flex p-8 rounded-full bg-slate-900/90 hover:bg-amber-500/60 text-amber-300 hover:text-white transition-all duration-500 border border-amber-500/40 shadow-[0_20px_40px_rgba(0,0,0,0.4)] active:scale-75" disabled={isTransitioning}>
                <svg className="w-14 h-14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
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