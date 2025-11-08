import React, { useState, useEffect, useRef } from 'react';

type SelectedVerse = {
  bookName: string;
  chapter: number;
  verse: number;
  text: string;
}

interface NoteModalProps {
  verse: SelectedVerse;
  note: string;
  onSave: (noteText: string) => void;
  onDelete: () => void;
  onClose: () => void;
}

export const NoteModal: React.FC<NoteModalProps> = ({ verse, note, onSave, onDelete, onClose }) => {
  const [text, setText] = useState(note);
  const modalRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Focus textarea on open
    textareaRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    
    const handleClickOutside = (event: MouseEvent) => {
        if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
            onClose();
        }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const handleSave = () => {
    onSave(text);
  };
  
  const hasExistingNote = note.length > 0;

  return (
    <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        aria-modal="true"
        role="dialog"
    >
        <div 
            ref={modalRef}
            className="bg-amber-50 paper-texture text-gray-800 rounded-lg shadow-2xl w-full max-w-lg m-4 p-6 font-serif-display transform transition-all animate-fade-in"
        >
            <h2 className="text-2xl font-bold text-amber-800 mb-2">
                Anotação para {verse.bookName} {verse.chapter}:{verse.verse}
            </h2>
            <p className="mb-4 p-3 bg-amber-100/50 rounded-md border-l-4 border-amber-400 italic">
                "{verse.text}"
            </p>

            <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Escreva sua reflexão aqui..."
                className="w-full h-40 p-3 bg-white border border-amber-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none scrollbar-thin"
            />

            <div className="mt-6 flex justify-between items-center">
                <div>
                    {hasExistingNote && (
                        <button
                            onClick={onDelete}
                            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-sans text-sm font-semibold"
                            aria-label="Excluir anotação"
                        >
                            Excluir
                        </button>
                    )}
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors font-sans text-sm font-semibold"
                        aria-label="Cancelar e fechar"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors font-sans text-sm font-semibold"
                        aria-label="Salvar anotação"
                    >
                        Salvar Anotação
                    </button>
                </div>
            </div>
        </div>
        <style>{`
            @keyframes fade-in {
                from { opacity: 0; transform: scale(0.95); }
                to { opacity: 1; transform: scale(1); }
            }
            .animate-fade-in {
                animation: fade-in 0.3s ease-out forwards;
            }
        `}</style>
    </div>
  );
};
