import { VerseData } from '@/lib/types';
import { BIBLE_BOOKS, EMBEDDED_VERSES } from './data/verses';

export interface ParsedRefMatch {
  raw: string;
  bookKey: string;
  bookName: string;
  chapter: number;
  verses: string;
  canonicalKey: string;
}

// Regex to detect [Ин 3:16], [Рим 8:28], [1 Кор 13:4-8], [Быт 1:1-3] etc.
const BIBLE_REF_REGEX = /\[?([1-3]?\s?[А-Яа-яA-Za-z]+)\.?\s*(\d+)[:\.](\d+(?:[-–]\d+)?)\]?/gi;

export function normalizeBookName(rawBook: string): { key: string; name: string } | null {
  const clean = rawBook.trim().toLowerCase().replace(/\./g, '');
  
  for (const [key, info] of Object.entries(BIBLE_BOOKS)) {
    if (info.abbr.some(abbr => abbr.toLowerCase() === clean)) {
      return { key, name: info.ru };
    }
  }
  return null;
}

export function parseBibleReferences(text: string): ParsedRefMatch[] {
  const matches: ParsedRefMatch[] = [];
  const regex = new RegExp(BIBLE_REF_REGEX.source, 'gi');
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const raw = match[0];
    const rawBook = match[1];
    const chapter = parseInt(match[2], 10);
    const verses = match[3];

    const bookInfo = normalizeBookName(rawBook);
    if (bookInfo) {
      const canonicalKey = `${bookInfo.key.toLowerCase()} ${chapter}:${verses}`.replace(/\s+/g, ' ');
      matches.push({
        raw,
        bookKey: bookInfo.key,
        bookName: bookInfo.name,
        chapter,
        verses,
        canonicalKey,
      });
    }
  }

  return matches;
}

export function getVerseData(canonicalKey: string, fallbackRef?: string): VerseData {
  const cleanKey = canonicalKey.trim().toLowerCase();
  
  if (EMBEDDED_VERSES[cleanKey]) {
    return EMBEDDED_VERSES[cleanKey];
  }

  // If specific range not in offline cache, create placeholder with fallback
  const parts = cleanKey.split(' ');
  const book = parts[0] || 'Библия';
  const chapAndVerses = parts[1] || '1:1';
  const [chapterStr, versesStr] = chapAndVerses.split(':');

  return {
    reference: fallbackRef || canonicalKey.toUpperCase(),
    book: book.toUpperCase(),
    chapter: parseInt(chapterStr, 10) || 1,
    verses: versesStr || '1',
    translations: {
      synodal: `[Текст стиха ${fallbackRef || canonicalKey.toUpperCase()} в Синодальном переводе. Для полного оффлайн доступа база может быть расширена полным текстом Священного Писания.]`,
      rbo: `[Перевод РБО «Радостная Весть» для ${fallbackRef || canonicalKey.toUpperCase()}]`,
      esv: `[ESV Translation for ${fallbackRef || canonicalKey.toUpperCase()}]`,
      nrt: `[Новый русский перевод (NRT) для ${fallbackRef || canonicalKey.toUpperCase()}]`,
    },
  };
}
