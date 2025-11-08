
export interface Verse {
  verse: number;
  text: string;
}

export interface Chapter {
  chapter: number;
  verses: Verse[];
}

export interface Book {
  name: string;
  chapters: Chapter[];
  abbrev: string;
}

export type BibleData = Book[];

export type Notes = Record<string, string>;
