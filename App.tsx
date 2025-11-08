import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
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

type SelectedVerse = {
  bookName: string;
  chapter: number;
  verse: number;
  text: string;
}

const GiftIcon: React.FC<{className?: string}> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
    <path d="M10 2a3 3 0 00-3 3v1H5a2 2 0 00-2 2v1c0 .552.448 1 1 1h12c.552 0 1-.448 1-1v-1a2 2 0 00-2-2h-2V5a3 3 0 00-3-3zm-1.5 5.5a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" />
    <path d="M3 11.5a1.5 1.5 0 011.5-1.5h11a1.5 1.5 0 011.5 1.5v5a1.5 1.5 0 01-1.5 1.5h-11a1.5 1.5 0 01-1.5-1.5v-5z" />
  </svg>
);


const App: React.FC = () => {
  const [currentBook, setCurrentBook] = useState<Book>(bibleService.getBook('Gênesis'));
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0); // This now points to the left page of the spread
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [direction, setDirection] = useState<'next' | 'prev' | null>(null);
  const [error, setError] = useState<string | null>(null);

  // AI Illustration State
  const [currentIllustration, setCurrentIllustration] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageCache, setImageCache] = useState(new Map<string, string>());
  
  // Notes State
  const [notes, setNotes] = useState<Notes>({});
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [selectedVerse, setSelectedVerse] = useState<SelectedVerse | null>(null);

  // Testimony State
  const [isTestimonyModalOpen, setIsTestimonyModalOpen] = useState(false);

  // Load notes from localStorage on initial render
  useEffect(() => {
    try {
      const savedNotes = localStorage.getItem('bible-notes');
      if (savedNotes) {
        setNotes(JSON.parse(savedNotes));
      }
    } catch (e) {
      console.error("Failed to load notes from localStorage", e);
    }
  }, []);

  // Save notes to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('bible-notes', JSON.stringify(notes));
    } catch (e) {
      console.error("Failed to save notes to localStorage", e);
    }
  }, [notes]);


  // Left page is determined directly by state
  const leftPageData = useMemo(() => ({
    book: currentBook,
    chapter: currentBook.chapters[currentChapterIndex]
  }), [currentBook, currentChapterIndex]);

  // Right page is the one after the left page
  const rightPageData = useMemo(() => {
    try {
      const { book, chapterIndex } = bibleService.getAdjacentChapter(currentBook.name, leftPageData.chapter.chapter, 'next');
      return { book, chapter: book.chapters[chapterIndex] };
    } catch {
      return null; // End of the bible
    }
  }, [currentBook, leftPageData]);

  const chapterTextForNarration = useMemo(() => {
    const leftText = `Livro de ${leftPageData.book.name}, capítulo ${leftPageData.chapter.chapter}. ${leftPageData.chapter.verses.map(v => v.text).join(' ')}`;
    const rightText = rightPageData ? `Página seguinte. Capítulo ${rightPageData.chapter.chapter}. ${rightPageData.chapter.verses.map(v => v.text).join(' ')}` : '';
    return `${leftText} ${rightText}`;
  }, [leftPageData, rightPageData]);

  const { isSpeaking, isPaused, speak, pause, resume, cancel } = useSpeechSynthesis(chapterTextForNarration);
  
  const triggerTransition = (callback: () => void) => {
    setIsTransitioning(true);
    // Clear illustration when turning page for a fresh start
    setCurrentIllustration(null); 
    cancel(); // Stop any narration
    setTimeout(() => {
      callback();
      setTimeout(() => {
        setIsTransitioning(false);
        setDirection(null);
      }, 50); // Short delay for content to render before fade in
    }, 1000); // CSS transition duration
  };

  const navigateSpread = useCallback((dir: 'next' | 'prev') => {
    if (isTransitioning) return;
    setDirection(dir);
    triggerTransition(() => {
      try {
        if (dir === 'next') {
          // The new left page will be the chapter after the current right page
          if (!rightPageData) throw new Error("Você chegou ao final da Bíblia.");
           // Check if there's a chapter after the right page
          bibleService.getAdjacentChapter(rightPageData.book.name, rightPageData.chapter.chapter, 'next');
          
          setCurrentBook(rightPageData.book);
          setCurrentChapterIndex(rightPageData.book.chapters.findIndex(c => c.chapter === rightPageData.chapter.chapter));

        } else { // 'prev'
          // We need to go back two chapters from the current left page
           if (leftPageData.book.name === 'Gênesis' && leftPageData.chapter.chapter === 1) {
              throw new Error("Você está no início da Bíblia.");
           }
          const prevPageData = bibleService.getAdjacentChapter(leftPageData.book.name, leftPageData.chapter.chapter, 'prev');
          const prevPrevPageData = bibleService.getAdjacentChapter(prevPageData.book.name, prevPageData.book.chapters[prevPageData.chapterIndex].chapter, 'prev');
          setCurrentBook(prevPrevPageData.book);
          setCurrentChapterIndex(prevPrevPageData.chapterIndex);
        }
        setError(null);
      } catch (e) {
         if (e instanceof Error) setError(e.message);
         else setError('Ocorreu um erro desconhecido.');
         setTimeout(() => setError(null), 3000);
      }
    });
  }, [isTransitioning, leftPageData, rightPageData]);


  const handleNextChapter = useCallback(() => navigateSpread('next'), [navigateSpread]);
  const handlePrevChapter = useCallback(() => navigateSpread('prev'), [navigateSpread]);

  const handleSearch = useCallback((query: string) => {
    if (isTransitioning) return;
    setDirection('next'); // Treat search as a 'next' animation
    triggerTransition(() => {
      try {
          let { book, chapterIndex } = bibleService.search(query);
          // If the found chapter is on a right page (odd index), 
          // start the spread from the previous chapter to make it a left page.
          if (chapterIndex > 0 && chapterIndex % 2 !== 0) {
            const result = bibleService.getAdjacentChapter(book.name, book.chapters[chapterIndex].chapter, 'prev');
            book = result.book;
            chapterIndex = result.chapterIndex;
          }
          setCurrentBook(book);
          setCurrentChapterIndex(chapterIndex);
          setError(null);
      } catch (e) {
          if (e instanceof Error) setError(e.message);
          else setError('Ocorreu um erro desconhecido ao buscar.');
          setTimeout(() => setError(null), 3000);
      }
    });
  }, [isTransitioning]);
  
  const handleGenerateIllustration = useCallback(async (chapter: Chapter, bookName: string) => {
      const cacheKey = `${bookName}-${chapter.chapter}`;
      if (imageCache.has(cacheKey)) {
          setCurrentIllustration(imageCache.get(cacheKey)!);
          return;
      }

      setIsGenerating(true);
      setCurrentIllustration(null);
      setError(null);

      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const summaryText = chapter.verses.slice(0, 4).map(v => v.text).join(' ');
          const prompt = `Crie uma ilustração bíblica detalhada no estilo de uma iluminação de manuscrito medieval. A cena deve representar o seguinte tema: "${summaryText}". A imagem deve ser reverente, simbólica, com cores ricas e uma qualidade atemporal. Inclua bordas decorativas sutis.`;

          const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash-image',
              contents: { parts: [{ text: prompt }] },
              config: {
                  responseModalities: [Modality.IMAGE],
              },
          });

          const part = response.candidates?.[0]?.content?.parts?.[0];
          if (part?.inlineData) {
              const base64ImageBytes = part.inlineData.data;
              const imageUrl = `data:image/png;base64,${base64ImageBytes}`;
              setCurrentIllustration(imageUrl);
              setImageCache(prevCache => new Map(prevCache).set(cacheKey, imageUrl));
          } else {
              throw new Error("Nenhuma imagem foi gerada.");
          }
      } catch (err) {
          setError("Falha ao gerar a ilustração. Tente novamente.");
          console.error(err);
      } finally {
          setIsGenerating(false);
      }
  }, [imageCache]);
  
  const handleOpenNoteModal = useCallback((bookName: string, chapter: number, verse: Verse) => {
    setSelectedVerse({ bookName, chapter, verse: verse.verse, text: verse.text });
    setIsNoteModalOpen(true);
  }, []);

  const handleCloseNoteModal = useCallback(() => {
    setIsNoteModalOpen(false);
    setSelectedVerse(null);
  }, []);

  const handleSaveNote = useCallback((noteText: string) => {
    if (!selectedVerse) return;
    const noteKey = `${selectedVerse.bookName}-${selectedVerse.chapter}-${selectedVerse.verse}`;
    setNotes(prevNotes => ({
      ...prevNotes,
      [noteKey]: noteText,
    }));
    handleCloseNoteModal();
  }, [selectedVerse, handleCloseNoteModal]);

  const handleDeleteNote = useCallback(() => {
    if (!selectedVerse) return;
    const noteKey = `${selectedVerse.bookName}-${selectedVerse.chapter}-${selectedVerse.verse}`;
    setNotes(prevNotes => {
      const newNotes = { ...prevNotes };
      delete newNotes[noteKey];
      return newNotes;
    });
    handleCloseNoteModal();
  }, [selectedVerse, handleCloseNoteModal]);

  const handleOpenTestimonyModal = () => setIsTestimonyModalOpen(true);
  const handleCloseTestimonyModal = () => setIsTestimonyModalOpen(false);

  const handleSaveTestimony = (testimony: string) => {
    try {
      localStorage.setItem('user_testimony', testimony);
      alert('Seu testemunho foi salvo! Obrigado por compartilhar sua fé.');
      handleCloseTestimonyModal();
    } catch (e) {
      console.error("Failed to save testimony to localStorage", e);
      setError("Não foi possível salvar seu testemunho.");
    }
  };


   useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement).tagName === 'INPUT' || (event.target as HTMLElement).tagName === 'TEXTAREA') return;
      if (event.key === 'ArrowRight') handleNextChapter();
      else if (event.key === 'ArrowLeft') handlePrevChapter();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNextChapter, handlePrevChapter]);

  return (
    <div className="relative min-h-screen bg-gray-900 text-gray-200 overflow-hidden">
      <ParticleBackground />

      <div className="relative z-10 flex flex-col items-center min-h-screen p-2 sm:p-4 md:p-6">
        <a 
          href="https://s.shopee.com.br/4LBOSfdWU8" 
          target="_blank" 
          rel="noopener noreferrer"
          className="w-full max-w-4xl mx-auto mb-4 p-3 bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold text-center rounded-lg shadow-lg transition-colors duration-300 flex items-center justify-center gap-2"
        >
          <GiftIcon className="w-5 h-5" />
          Aprofunde seus estudos! Adquira sua Bíblia de Estudo completa aqui.
        </a>
        
        <header className="w-full max-w-4xl mx-auto text-center">
          <h1 className="font-serif-display text-4xl sm:text-5xl md:text-6xl font-bold text-amber-300 drop-shadow-[0_2px_2px_rgba(0,0,0,0.7)]">
            Bíblia Sagrada
          </h1>
          <p className="text-amber-100/80 mt-2 text-sm sm:text-base">Uma jornada espiritual interativa e ilustrada</p>
        </header>
        
        <main className="w-full flex-grow flex flex-col items-center justify-center">
          <SearchBar onSearch={handleSearch} />
          
          <div className="flex items-center justify-center gap-4 mt-4 text-amber-200/80">
            <ShareButtons url={window.location.href} />
            <span className="text-gray-600">|</span>
            <button 
              onClick={handleOpenTestimonyModal}
              className="px-4 py-2 text-sm bg-gray-900/50 border border-amber-300/30 rounded-full hover:bg-amber-400/20 hover:text-amber-100 transition-all duration-300 backdrop-blur-sm"
            >
              Deixe seu Testemunho
            </button>
          </div>

          {error && <p className="text-red-400 bg-red-900/50 px-4 py-2 rounded-md mt-4 text-center">{error}</p>}
          
          <div className="w-full max-w-6xl mx-auto mt-4 flex-grow flex items-center justify-center [perspective:2000px]">
            <div className="flex items-center justify-between w-full">
              <button
                onClick={handlePrevChapter}
                className="p-2 md:p-4 rounded-full bg-black/20 hover:bg-amber-400/20 text-amber-200 hover:text-amber-100 transition-all duration-300 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Capítulo Anterior"
                disabled={isTransitioning}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
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
                onClick={handleNextChapter}
                className="p-2 md:p-4 rounded-full bg-black/20 hover:bg-amber-400/20 text-amber-200 hover:text-amber-100 transition-all duration-300 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Próximo Capítulo"
                disabled={isTransitioning}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
              </button>
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
          onClose={handleCloseNoteModal}
        />
      )}

      {isTestimonyModalOpen && (
        <TestimonyModal
          onSave={handleSaveTestimony}
          onClose={handleCloseTestimonyModal}
        />
      )}
    </div>
  );
};

export default App;