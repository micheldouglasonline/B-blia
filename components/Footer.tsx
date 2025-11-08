import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full text-center text-amber-200/50 text-xs py-4 mt-auto pb-28 sm:pb-32">
      <p>Dica: Use as setas do teclado (← e →) para navegar entre os capítulos.</p>
      <p className="mt-2">
        Produzido por <a href="https://micheldouglasonline.netlify.app" target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-100 transition-colors">Michel Douglas Online</a>.
      </p>
    </footer>
  );
};