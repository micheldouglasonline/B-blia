import type { BibleData, Book, Chapter } from '../types';
import { psalms } from './psalmsData';

// Adicionado o livro de Romanos
const romans: Book = {
  "name": "Romanos",
  "abbrev": "rm",
  "chapters": [
    {
      "chapter": 1,
      "verses": [
        { "verse": 16, "text": "Porque não me envergonho do evangelho de Cristo, pois é o poder de Deus para salvação de todo aquele que crê; primeiro do judeu, и depois do grego." },
        { "verse": 17, "text": "Porque nele se descobre a justiça de Deus de fé em fé, como está escrito: Mas o justo viverá da fé." }
      ]
    },
    {
      "chapter": 8,
      "verses": [
        { "verse": 28, "text": "E sabemos que todas as coisas contribuem juntamente para o bem daqueles que amam a Deus, daqueles que são chamados segundo o seu propósito." },
        { "verse": 31, "text": "Que diremos, pois, a estas coisas? Se Deus é por nós, quem será contra nós?" },
        { "verse": 38, "text": "Porque estou certo de que, nem a morte, nem a vida, nem os anjos, nem os principados, nem as potestades, nem o presente, nem o porvir," },
        { "verse": 39, "text": "Nem a altura, nem a profundidade, nem alguma outra criatura nos poderá separar do amor de Deus, que está em Cristo Jesus nosso Senhor." }
      ]
    },
    {
      "chapter": 12,
      "verses": [
        { "verse": 1, "text": "Rogo-vos, pois, irmãos, pela compaixão de Deus, que apresenteis os vossos corpos em sacrifício vivo, santo e agradável a Deus, que é o vosso culto racional." },
        { "verse": 2, "text": "E não sede conformados com este mundo, mas sede transformados pela renovação do vosso entendimento, para que experimenteis qual seja a boa, agradável, e perfeita vontade de Deus." }
      ]
    }
  ]
};

const bibleData: BibleData = [
  {
    "name": "Gênesis",
    "abbrev": "gn",
    "chapters": [
      {
        "chapter": 1,
        "verses": [
          { "verse": 1, "text": "No princípio criou Deus os céus e a terra." },
          { "verse": 2, "text": "A terra era sem forma e vazia; e havia trevas sobre a face do abismo, mas o Espírito de Deus pairava sobre a face das águas." },
          { "verse": 3, "text": "Disse Deus: haja luz. E houve luz." },
          { "verse": 4, "text": "Viu Deus que a luz era boa; e fez separação entre a luz e as trevas." },
          { "verse": 26, "text": "E disse Deus: Façamos o homem à nossa imagem, conforme a nossa semelhança; domine ele sobre os peixes do mar, sobre as aves do céu, sobre os animais domésticos, e sobre toda a terra, e sobre todo réptil que se arrasta sobre a terra." },
          { "verse": 27, "text": "Criou, pois, Deus o homem à sua imagem; à imagem de Deus o criou; homem e mulher os criou." },
        ]
      },
      {
        "chapter": 2,
        "verses": [
          { "verse": 7, "text": "E formou o Senhor Deus o homem do pó da terra, e soprou-lhe nas narinas o fôlego da vida; e o homem tornou-se alma vivente." },
          { "verse": 19, "text": "Havendo, pois, o Senhor Deus formado da terra todos os animais do campo e todas as aves do céu, trouxe-os a Adão, para ver como lhes chamaria; e tudo o que Adão chamou a toda a alma vivente, isso foi o seu nome." },
          { "verse": 22, "text": "E da costela que o Senhor Deus tomou do homem, formou uma mulher, e trouxe-a a Adão." },
        ]
      },
      {
        "chapter": 3,
        "verses": [
          { "verse": 20, "text": "E chamou Adão o nome de sua mulher Eva; porquanto era a mãe de todos os viventes." },
          { "verse": 21, "text": "E fez o Senhor Deus a Adão e à sua mulher túnicas de peles, e os vestiu." },
        ]
      }
    ]
  },
  psalms,
  {
    "name": "Mateus",
    "abbrev": "mt",
    "chapters": [
      {
        "chapter": 5,
        "verses": [
          { "verse": 3, "text": "Bem-aventurados os pobres de espírito, porque deles é o reino dos céus." },
          { "verse": 4, "text": "Bem-aventurados os que choram, porque eles serão consolados." },
          { "verse": 5, "text": "Bem-aventurados os mansos, porque eles herdarão a terra. Jesus ensinou isso." }
        ]
      },
       {
        "chapter": 16,
        "verses": [
            { "verse": 18, "text": "Pois também eu te digo que tu és Pedro, e sobre esta pedra edificarei a minha igreja, e as portas do inferno não prevalecerão contra ela." }
        ]
      }
    ]
  },
  {
    "name": "João",
    "abbrev": "jo",
    "chapters": [
      {
        "chapter": 1,
        "verses": [
          { "verse": 1, "text": "No princípio era o Verbo, e o Verbo estava com Deus, e o Verbo era Deus." },
          { "verse": 14, "text": "E o Verbo se fez carne, e habitou entre nós, e vimos a sua glória, como a glória do unigênito do Pai, cheio de graça e de verdade." },
          { "verse": 29, "text": "No dia seguinte João viu a Jesus, que vinha para ele, e disse: Eis o Cordeiro de Deus, que tira o pecado do mundo." },
        ]
      },
      {
        "chapter": 3,
        "verses": [
           { "verse": 16, "text": "Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito, para que todo aquele que nele crê não pereça, mas tenha a vida eterna." },
           { "verse": 17, "text": "Porque Deus enviou o seu Filho ao mundo, não para que condenasse o mundo, mas para que o mundo fosse salvo por ele. Aquele que crê em Jesus não é condenado." }
        ]
      }
    ]
  },
  romans
];

class BibleService {
  public data: BibleData;
  private bookMap: Map<string, Book>;

  constructor(data: BibleData) {
    this.data = data;
    this.bookMap = new Map();
    data.forEach(book => {
        this.bookMap.set(book.name.toLowerCase(), book);
        this.bookMap.set(book.abbrev.toLowerCase(), book);
    });
  }

  getBook(name: string): Book {
    const book = this.bookMap.get(name.toLowerCase());
    if (!book) throw new Error(`Livro "${name}" não encontrado.`);
    return book;
  }
  
  getBookIndex(name: string): number {
    return this.data.findIndex(b => b.name.toLowerCase() === name.toLowerCase());
  }
  
  search(query: string): { book: Book; chapterIndex: number } {
    const cleanedQuery = query.trim().toLowerCase();

    // Priority 1: Search for "verseNumber text..."
    const verseTextMatch = cleanedQuery.match(/^(\d+)\s+(.+)/);
    if (verseTextMatch) {
        const verseNumber = parseInt(verseTextMatch[1], 10);
        const searchText = verseTextMatch[2];
        for (const book of this.data) {
            for (let i = 0; i < book.chapters.length; i++) {
                const chapter = book.chapters[i];
                for (const verse of chapter.verses) {
                    if (verse.verse === verseNumber && verse.text.toLowerCase().includes(searchText)) {
                        return { book, chapterIndex: i }; // Return first match
                    }
                }
            }
        }
    }
    
    // Priority 2: Tenta corresponder ao formato "Livro Capítulo:Versículo"
    const chapterMatch = cleanedQuery.match(/^(.+?)\s+(\d+)(?::\d+)?$/);
    if (chapterMatch) {
      try {
        const bookName = chapterMatch[1].trim();
        const chapterNumber = parseInt(chapterMatch[2], 10);
        
        const book = Array.from(this.bookMap.values()).find(b => 
            b.name.toLowerCase().startsWith(bookName) || 
            b.abbrev.toLowerCase() === bookName
        );

        if (book) {
            const chapterIndex = book.chapters.findIndex(c => c.chapter === chapterNumber);
            if (chapterIndex !== -1) {
                return { book, chapterIndex };
            }
        }
      } catch (e) {
        // Ignora o erro e prossegue para a busca por palavra-chave
      }
    }
    
    // Priority 3: Busca por palavra-chave com sistema de pontuação
    let bestMatch: { book: Book; chapterIndex: number; score: number } | null = null;
    const searchTerm = cleanedQuery;

    for (const book of this.data) {
        // Pontua correspondência no nome do livro
        if (book.name.toLowerCase().includes(searchTerm) || book.abbrev.toLowerCase().includes(searchTerm)) {
            const score = 100; // Pontuação alta para correspondência no nome do livro
            if (!bestMatch || score > bestMatch.score) {
                bestMatch = { book, chapterIndex: 0, score };
            }
        }

        for (let i = 0; i < book.chapters.length; i++) {
            const chapter = book.chapters[i];
            for (const verse of chapter.verses) {
                const verseText = verse.text.toLowerCase();
                if (verseText.includes(searchTerm)) {
                    let score = 1; // Pontuação base para qualquer correspondência
                    if (verseText.startsWith(searchTerm)) {
                        score += 5; // Pontuação maior para correspondência no início
                    }
                    if (!bestMatch || score > bestMatch.score) {
                        bestMatch = { book, chapterIndex: i, score };
                    }
                }
            }
        }
    }

    if (bestMatch) {
        return { book: bestMatch.book, chapterIndex: bestMatch.chapterIndex };
    }

    throw new Error(`Nenhum resultado para "${query}". Tente "Livro Capítulo" ou uma palavra-chave.`);
  }

  getAdjacentChapter(currentBookName: string, currentChapterNumber: number, direction: 'next' | 'prev'): { book: Book, chapterIndex: number } {
    const currentBook = this.getBook(currentBookName);
    const currentChapterIndex = currentBook.chapters.findIndex(c => c.chapter === currentChapterNumber);

    if (direction === 'next') {
        if (currentChapterIndex < currentBook.chapters.length - 1) {
            return { book: currentBook, chapterIndex: currentChapterIndex + 1 };
        } else {
            const currentBookIndexInData = this.data.findIndex(b => b.name === currentBookName);
            if (currentBookIndexInData < this.data.length - 1) {
                const nextBook = this.data[currentBookIndexInData + 1];
                return { book: nextBook, chapterIndex: 0 };
            } else {
                // At the very end, throw error
                throw new Error("Você chegou ao final da Bíblia.");
            }
        }
    } else { // prev
        if (currentChapterIndex > 0) {
            return { book: currentBook, chapterIndex: currentChapterIndex - 1 };
        } else {
            const currentBookIndexInData = this.data.findIndex(b => b.name === currentBookName);
            if (currentBookIndexInData > 0) {
                const prevBook = this.data[currentBookIndexInData - 1];
                return { book: prevBook, chapterIndex: prevBook.chapters.length - 1 };
            } else {
                 // At the very beginning, throw error
                throw new Error("Você está no início da Bíblia.");
            }
        }
    }
  }
}

export const bibleService = new BibleService(bibleData);