import { cleanDocumentArtifacts } from './htmlDecoder';

export interface PacingPoint {
  lineIndex: number;
  remainingMinutes: number;
  targetMinute: number;
  formattedTarget: string;
  sectionWordCount: number;
}

export interface PacingStatus {
  status: 'ahead' | 'on-pace' | 'behind';
  diffMinutes: number;
  label: string;
}

/**
 * Calculates the target remaining minutes on the countdown timer when the preacher reaches each section.
 * Distributed proportionally based on remaining word counts vs total duration.
 */
export function calculatePacingMap(
  content: string,
  targetDurationMinutes: number
): Map<number, PacingPoint> {
  const pacingMap = new Map<number, PacingPoint>();
  if (!content || targetDurationMinutes <= 0) return pacingMap;

  const cleaned = cleanDocumentArtifacts(content);
  const lines = cleaned.split('\n');

  interface RawSection {
    lineIndex: number;
    title: string;
    words: number;
  }

  const sections: RawSection[] = [];
  let currentSection: RawSection | null = null;
  let totalWords = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const wordsInLine = line.split(/\s+/).filter(Boolean).length;
    totalWords += wordsInLine;

    // Detect structural section headings: H1, H2, Intro, Conclusion
    const isSectionHeading =
      /^#\s+/.test(line) ||
      /^<h1\b/i.test(line) ||
      /^##\s+/.test(line) ||
      /^<h2\b/i.test(line) ||
      line.startsWith('## 🧭') ||
      line.toLowerCase().startsWith('## введение') ||
      line.startsWith('## 🏁') ||
      line.toLowerCase().startsWith('## заключение') ||
      line.toLowerCase().startsWith('## призыв') ||
      /^\*\*\s*(\d+\.?\s+[^\*]+)\s*\*\*$/.test(line);

    if (isSectionHeading) {
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = {
        lineIndex: i,
        title: line,
        words: wordsInLine,
      };
    } else if (currentSection) {
      currentSection.words += wordsInLine;
    } else {
      // Content before any heading (Introduction)
      currentSection = {
        lineIndex: i,
        title: 'Введение',
        words: wordsInLine,
      };
    }
  }

  if (currentSection) {
    sections.push(currentSection);
  }

  if (sections.length === 0 || totalWords === 0) return pacingMap;

  let cumulativeWords = 0;

  for (let s = 0; s < sections.length; s++) {
    const sec = sections[s];
    // Remaining words from this section to the end of sermon
    const remainingWords = Math.max(0, totalWords - cumulativeWords);
    const rawRemaining = (remainingWords / totalWords) * targetDurationMinutes;
    const remainingMinutes = Math.max(1, Math.round(rawRemaining));

    pacingMap.set(sec.lineIndex, {
      lineIndex: sec.lineIndex,
      remainingMinutes,
      targetMinute: remainingMinutes,
      formattedTarget: `осталось ~${remainingMinutes} мин`,
      sectionWordCount: sec.words,
    });

    cumulativeWords += sec.words;
  }

  return pacingMap;
}

/**
 * Compares current elapsed timer with target section minute.
 */
export function getPacingStatus(
  elapsedSeconds: number,
  targetMinute: number
): PacingStatus | null {
  if (elapsedSeconds < 30) return null; // Don't judge pace in the first 30 seconds

  const elapsedMinutes = elapsedSeconds / 60;
  const diff = elapsedMinutes - targetMinute;
  const roundedDiff = Math.round(diff);

  if (Math.abs(diff) <= 1.5) {
    return {
      status: 'on-pace',
      diffMinutes: roundedDiff,
      label: 'в темпе',
    };
  }

  if (diff > 1.5) {
    return {
      status: 'behind',
      diffMinutes: roundedDiff,
      label: `+${roundedDiff} мин`,
    };
  }

  return {
    status: 'ahead',
    diffMinutes: roundedDiff,
    label: `${roundedDiff} мин`,
  };
}
