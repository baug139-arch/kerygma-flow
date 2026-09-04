export type ThemeMode = 'oled' | 'sepia' | 'light';

export interface BibleVerseRef {
  raw: string;
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd?: number;
}

export interface TranslationText {
  synodal: string;
  rbo?: string;
  esv?: string;
  nrt?: string;
}

export interface VerseData {
  reference: string;
  book: string;
  chapter: number;
  verses: string;
  translations: TranslationText;
}

export interface OutlineItem {
  id: string;
  title: string;
  level: number;
  estimatedMinutes?: number;
  targetMinute?: number;
  lineIndex?: number;
}

export interface SermonDelivery {
  id: string;
  date: string; // "YYYY-MM-DD"
  venue?: string; // Церковь / город / служение
  actualDurationSeconds: number; // Фактическое время в секундах
  targetDurationMinutes: number; // Запланированное время
  notes?: string; // Впечатления и заметки спикера
  createdAt: string;
}

export interface Sermon {
  id: string;
  title: string;
  series?: string;
  date: string;
  targetDurationMinutes: number;
  content: string; // Markdown / Plain text with [Verse Ref] tags
  updatedAt: string;
  syncedFromGoogle?: boolean;
  googleDocId?: string;
  deliveries?: SermonDelivery[];
}

export type StageTimerStatus = 'ready' | 'running' | 'paused' | 'finished';

export type StageLightState = 'normal' | 'warning' | 'danger' | 'overtime';
