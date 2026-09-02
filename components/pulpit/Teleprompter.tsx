'use client';

import React from 'react';
import { BookOpen, Sparkles, Quote, Bookmark, Megaphone, Compass, Flag } from 'lucide-react';
import { ThemeMode } from '@/lib/types';
import { parseBibleReferences, getVerseData } from '@/lib/bible/parser';

interface TeleprompterProps {
  content: string;
  fontSize: number; // in px, e.g. 28, 36, 48
  theme: ThemeMode;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onOpenVerse?: (verse: any) => void;
}

export function Teleprompter({
  content,
  fontSize,
  theme,
  containerRef,
}: TeleprompterProps) {
  // Theme classes
  const getThemeClasses = () => {
    switch (theme) {
      case 'oled':
        return {
          bg: 'bg-black text-zinc-100',
          h1: 'text-amber-400 border-b border-zinc-800 pb-3 font-black',
          h2: 'text-amber-300 border-l-4 border-amber-500 pl-4 my-6 font-extrabold',
          h3: 'text-zinc-200 font-bold',
          // Special Intro & Conclusion Stage Blocks
          introCard:
            'my-7 p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-teal-950/50 via-emerald-950/40 to-zinc-950/60 border-l-4 border-emerald-400 border-y border-r border-emerald-500/20 text-emerald-100 shadow-[0_0_25px_rgba(16,185,129,0.12)]',
          introBadge: 'text-emerald-400 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 mb-2',
          introTitle: 'text-2xl sm:text-3xl font-black text-emerald-200 tracking-tight',
          conclusionCard:
            'my-7 p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-amber-950/50 via-orange-950/40 to-zinc-950/60 border-l-4 border-amber-400 border-y border-r border-amber-500/20 text-amber-100 shadow-[0_0_25px_rgba(245,158,11,0.12)]',
          conclusionBadge: 'text-amber-400 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 mb-2',
          conclusionTitle: 'text-2xl sm:text-3xl font-black text-amber-200 tracking-tight',
          // Special Scripture Card Style
          scriptureCard:
            'my-6 p-6 rounded-2xl bg-gradient-to-r from-amber-950/30 via-zinc-900/40 to-zinc-950/20 border-l-4 border-amber-400 border-y border-r border-amber-500/20 shadow-[0_4px_20px_rgba(0,0,0,0.5)]',
          scriptureHeader: 'text-amber-400 font-bold text-base tracking-wide flex items-center gap-2 mb-3',
          scriptureText: 'text-amber-100/95 font-serif text-[1.08em] leading-relaxed tracking-wide',
          // Speaker Cue
          cue: 'my-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-950/50 border border-cyan-500/40 text-cyan-300 font-mono text-sm tracking-wide shadow-md select-none',
          // Author Quote
          authorQuote:
            'my-5 p-5 rounded-2xl bg-zinc-900/60 border-l-4 border-indigo-400 text-zinc-200 shadow-md',
          // Personal Story Card
          story:
            'my-5 p-5 rounded-2xl bg-zinc-900/50 border-l-4 border-zinc-600 text-zinc-300 shadow-sm',
          storyText: 'italic font-serif leading-relaxed',
          bold: 'text-amber-300 font-extrabold underline decoration-amber-500/40 decoration-2 underline-offset-4',
          bullet: 'text-amber-400 font-bold',
        };
      case 'sepia':
        return {
          bg: 'bg-[#fbf0d9] text-[#433422]',
          h1: 'text-[#683b0e] border-b border-[#e4d4b8] pb-3 font-black',
          h2: 'text-[#8c5218] border-l-4 border-[#8c5218] pl-4 my-6 font-extrabold',
          h3: 'text-[#433422] font-bold',
          // Special Intro & Conclusion Stage Blocks
          introCard:
            'my-7 p-6 sm:p-7 rounded-3xl bg-[#e3efe9] border-l-4 border-[#2b6a55] border-y border-r border-[#2b6a55]/30 text-[#143d30] shadow-sm',
          introBadge: 'text-[#2b6a55] font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 mb-2',
          introTitle: 'text-2xl sm:text-3xl font-black text-[#143d30] tracking-tight',
          conclusionCard:
            'my-7 p-6 sm:p-7 rounded-3xl bg-[#faecd6] border-l-4 border-[#a66a1e] border-y border-r border-[#a66a1e]/30 text-[#543309] shadow-sm',
          conclusionBadge: 'text-[#a66a1e] font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 mb-2',
          conclusionTitle: 'text-2xl sm:text-3xl font-black text-[#543309] tracking-tight',
          // Special Scripture Card Style
          scriptureCard:
            'my-6 p-6 rounded-2xl bg-[#f0dfc2] border-l-4 border-[#8c5218] border-y border-r border-[#dfcfb0] shadow-sm',
          scriptureHeader: 'text-[#683b0e] font-bold text-base tracking-wide flex items-center gap-2 mb-3',
          scriptureText: 'text-[#2a1d0f] font-serif text-[1.08em] leading-relaxed tracking-wide font-medium',
          // Speaker Cue
          cue: 'my-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#dbeef5] border border-[#3b7c8c]/40 text-[#164854] font-mono text-sm tracking-wide shadow-sm select-none',
          // Author Quote
          authorQuote:
            'my-5 p-5 rounded-2xl bg-[#eee2cf] border-l-4 border-[#655380] text-[#332840] shadow-sm',
          // Personal Story Card
          story:
            'my-5 p-5 rounded-2xl bg-[#f5e9d0] border-l-4 border-[#a67c52] text-[#4a3928] shadow-sm',
          storyText: 'italic font-serif leading-relaxed',
          bold: 'text-[#5a2f05] font-extrabold underline decoration-[#8c5218]/40 decoration-2 underline-offset-4',
          bullet: 'text-[#8c5218] font-bold',
        };
      case 'light':
      default:
        return {
          bg: 'bg-white text-zinc-900',
          h1: 'text-zinc-950 border-b border-zinc-200 pb-3 font-black',
          h2: 'text-blue-900 border-l-4 border-blue-600 pl-4 my-6 font-extrabold',
          h3: 'text-zinc-800 font-bold',
          // Special Intro & Conclusion Stage Blocks
          introCard:
            'my-7 p-6 sm:p-7 rounded-3xl bg-emerald-50 border-l-4 border-emerald-600 border-y border-r border-emerald-200 text-emerald-950 shadow-sm',
          introBadge: 'text-emerald-700 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 mb-2',
          introTitle: 'text-2xl sm:text-3xl font-black text-emerald-950 tracking-tight',
          conclusionCard:
            'my-7 p-6 sm:p-7 rounded-3xl bg-amber-50 border-l-4 border-amber-500 border-y border-r border-amber-200 text-amber-950 shadow-sm',
          conclusionBadge: 'text-amber-700 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 mb-2',
          conclusionTitle: 'text-2xl sm:text-3xl font-black text-amber-950 tracking-tight',
          // Special Scripture Card Style
          scriptureCard:
            'my-6 p-6 rounded-2xl bg-gradient-to-r from-blue-50/90 to-indigo-50/50 border-l-4 border-blue-600 border-y border-r border-blue-200 shadow-sm',
          scriptureHeader: 'text-blue-900 font-bold text-base tracking-wide flex items-center gap-2 mb-3',
          scriptureText: 'text-zinc-950 font-serif text-[1.08em] leading-relaxed tracking-wide font-medium',
          // Speaker Cue
          cue: 'my-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-50 border border-cyan-300 text-cyan-800 font-mono text-sm tracking-wide shadow-sm select-none',
          // Author Quote
          authorQuote:
            'my-5 p-5 rounded-2xl bg-indigo-50/70 border-l-4 border-indigo-400 text-indigo-950 shadow-sm',
          // Personal Story Card
          story:
            'my-5 p-5 rounded-2xl bg-zinc-100/80 border-l-4 border-zinc-400 text-zinc-700 shadow-sm',
          storyText: 'italic font-serif leading-relaxed',
          bold: 'text-blue-950 font-extrabold underline decoration-blue-500/40 decoration-2 underline-offset-4',
          bullet: 'text-blue-600 font-bold',
        };
    }
  };

  const themeStyles = getThemeClasses();

  // Group markdown lines into structured semantic blocks
  const blocks: Array<{
    type: 'h1' | 'h2' | 'h3' | 'intro' | 'conclusion' | 'scripture' | 'author-quote' | 'cue' | 'story' | 'bullet' | 'numbered' | 'paragraph';
    content: string;
    header?: string;
    index: number;
    rawLines?: string[];
  }> = [];

  const rawLines = content.split('\n');
  let i = 0;

  while (i < rawLines.length) {
    const line = rawLines[i].trim();

    if (!line) {
      i++;
      continue;
    }

    // Heading 1
    if (line.startsWith('# ')) {
      const clean = line.replace(/^#\s+/, '').replace(/^[*_\s]+|[*_\s]+$/g, '').trim();
      blocks.push({ type: 'h1', content: clean, index: i });
      i++;
      continue;
    }

    // Intro Block (## 🧭 ...)
    if (line.startsWith('## 🧭') || line.toLowerCase().startsWith('## введение') || line.toLowerCase().startsWith('## 1. введение')) {
      const clean = line.replace(/^##\s*(🧭|\d+\.)?\s*/i, '').replace(/^[*_\s]+|[*_\s]+$/g, '').trim() || 'Введение';
      blocks.push({
        type: 'intro',
        content: clean,
        index: i,
      });
      i++;
      continue;
    }

    // Conclusion Block (## 🏁 ...)
    if (line.startsWith('## 🏁') || line.toLowerCase().startsWith('## заключение') || line.toLowerCase().startsWith('## призыв')) {
      const clean = line.replace(/^##\s*(🏁)?\s*/i, '').replace(/^[*_\s]+|[*_\s]+$/g, '').trim() || 'Заключение и призыв';
      blocks.push({
        type: 'conclusion',
        content: clean,
        index: i,
      });
      i++;
      continue;
    }

    // Heading 2
    if (line.startsWith('## ')) {
      const clean = line.replace(/^##\s+/, '').replace(/^[*_\s]+|[*_\s]+$/g, '').trim();
      blocks.push({ type: 'h2', content: clean, index: i });
      i++;
      continue;
    }

    // Heading 3
    if (line.startsWith('### ')) {
      const clean = line.replace(/^###\s+/, '').replace(/^[*_\s]+|[*_\s]+$/g, '').trim();
      blocks.push({ type: 'h3', content: clean, index: i });
      i++;
      continue;
    }

    // Auto-detect bold numbered headings like "**1. Суть научного феномена**" as H2
    const boldNumberedMatch = line.match(/^\*\*\s*(\d+\.?\s+[^\*]+)\s*\*\*$/);
    if (boldNumberedMatch) {
      blocks.push({ type: 'h2', content: boldNumberedMatch[1].trim(), index: i });
      i++;
      continue;
    }

    // Speaker Cue: [📢 ...] or [⏸ ...]
    if (line.startsWith('[📢') || line.startsWith('[⏸') || (line.startsWith('[') && line.includes('📢') && line.endsWith(']'))) {
      const cueText = line.replace(/^\[|\]$/g, '').replace('📢', '').trim();
      blocks.push({
        type: 'cue',
        content: cueText,
        index: i,
      });
      i++;
      continue;
    }

    // Author Quote (❝ ... ❞)
    if (line.startsWith('❝') || (line.startsWith('«') && line.includes('—'))) {
      blocks.push({
        type: 'author-quote',
        content: line.replace(/[❝❞]/g, ''),
        index: i,
      });
      i++;
      continue;
    }

    // Blockquote / Scripture Block (lines starting with >)
    if (line.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < rawLines.length && rawLines[i].trim().startsWith('>')) {
        quoteLines.push(rawLines[i].trim().replace(/^>\s*/, ''));
        i++;
      }

      let headerText = 'Священное Писание';
      let textBody = quoteLines.join('\n');

      if (quoteLines.length > 1 && (quoteLines[0].includes('**') || quoteLines[0].includes('📖'))) {
        headerText = quoteLines[0].replace(/[📖*]/g, '').trim();
        textBody = quoteLines.slice(1).join('\n');
      }

      blocks.push({
        type: 'scripture',
        header: headerText,
        content: textBody,
        index: i,
      });
      continue;
    }

    // Personal Story (wrapped in *...* or *«...»*)
    if (line.startsWith('*«') || (line.startsWith('*') && line.endsWith('*') && !line.startsWith('**'))) {
      const storyText = line.replace(/^\*|\*$/g, '');
      blocks.push({
        type: 'story',
        content: storyText,
        index: i,
      });
      i++;
      continue;
    }

    // Bullet point
    if (line.startsWith('- ') || line.startsWith('• ')) {
      blocks.push({
        type: 'bullet',
        content: line.replace(/^[-•]\s*/, ''),
        index: i,
      });
      i++;
      continue;
    }

    // Numbered list
    const numMatch = line.match(/^(\d+)\.\s*(.*)$/);
    if (numMatch) {
      blocks.push({
        type: 'numbered',
        header: numMatch[1],
        content: numMatch[2],
        index: i,
      });
      i++;
      continue;
    }

    // Standalone scripture reference like [Ин 3:16]
    const standaloneRefMatch = parseBibleReferences(line);
    if (standaloneRefMatch.length === 1 && line.trim().startsWith('[') && line.trim().endsWith(']')) {
      const verse = getVerseData(standaloneRefMatch[0].canonicalKey, standaloneRefMatch[0].raw);
      blocks.push({
        type: 'scripture',
        header: `${verse.book} ${verse.chapter}:${verse.verses}`,
        content: `«${verse.translations.synodal}»`,
        index: i,
      });
      i++;
      continue;
    }

    // Regular paragraph
    blocks.push({
      type: 'paragraph',
      content: line,
      index: i,
    });
    i++;
  }

  return (
    <div
      ref={containerRef}
      className={`w-full h-full overflow-y-auto px-6 sm:px-16 lg:px-28 py-10 select-text transition-colors duration-200 ${themeStyles.bg}`}
      style={{
        fontSize: `${fontSize}px`,
        lineHeight: 1.8,
      }}
    >
      <div className="max-w-4xl mx-auto space-y-6 pb-64">
        {blocks.map((block, idx) => {
          switch (block.type) {
            case 'h1':
              return (
                <h1
                  id={`heading-${block.index}`}
                  key={idx}
                  className={`text-3xl sm:text-4xl lg:text-5xl pt-4 ${themeStyles.h1}`}
                >
                  {block.content}
                </h1>
              );

            case 'intro':
              return (
                <div
                  id={`heading-${block.index}`}
                  key={idx}
                  className={themeStyles.introCard}
                >
                  <div className={themeStyles.introBadge}>
                    <Compass className="w-4 h-4 shrink-0 animate-pulse text-emerald-400" />
                    <span>Введение / Старт</span>
                  </div>
                  <div className={themeStyles.introTitle}>
                    {block.content}
                  </div>
                </div>
              );

            case 'conclusion':
              return (
                <div
                  id={`heading-${block.index}`}
                  key={idx}
                  className={themeStyles.conclusionCard}
                >
                  <div className={themeStyles.conclusionBadge}>
                    <Flag className="w-4 h-4 shrink-0 fill-current text-amber-400" />
                    <span>Заключение / Призыв</span>
                  </div>
                  <div className={themeStyles.conclusionTitle}>
                    {block.content}
                  </div>
                </div>
              );

            case 'h2':
              return (
                <h2
                  id={`heading-${block.index}`}
                  key={idx}
                  className={`text-2xl sm:text-3xl ${themeStyles.h2}`}
                >
                  {block.content}
                </h2>
              );

            case 'h3':
              return (
                <h3 key={idx} className={`text-xl sm:text-2xl ${themeStyles.h3}`}>
                  {block.content}
                </h3>
              );

            case 'cue':
              return (
                <div key={idx} className="my-3">
                  <div className={themeStyles.cue}>
                    <Megaphone className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>{block.content}</span>
                  </div>
                </div>
              );

            case 'author-quote':
              return (
                <div key={idx} className={themeStyles.authorQuote}>
                  <div className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5 mb-2">
                    <Quote className="w-4 h-4" />
                    <span>Цитата</span>
                  </div>
                  <div className="font-serif text-lg leading-relaxed">
                    {renderInlineFormatted(block.content, themeStyles)}
                  </div>
                </div>
              );

            case 'scripture':
              return (
                <div key={idx} className={themeStyles.scriptureCard}>
                  <div className={themeStyles.scriptureHeader}>
                    <BookOpen className="w-5 h-5 text-amber-500 shrink-0" />
                    <span>{block.header || 'Священное Писание'}</span>
                  </div>
                  <div className={themeStyles.scriptureText}>
                    {renderInlineFormatted(block.content, themeStyles)}
                  </div>
                </div>
              );

            case 'story':
              return (
                <div key={idx} className={themeStyles.story}>
                  <div className={themeStyles.storyText}>
                    {renderInlineFormatted(block.content, themeStyles)}
                  </div>
                </div>
              );

            case 'bullet':
              return (
                <div key={idx} className="flex items-start gap-3 pl-4">
                  <span className={`text-2xl font-bold select-none ${themeStyles.bullet}`}>•</span>
                  <div className="flex-1">{renderInlineFormatted(block.content, themeStyles)}</div>
                </div>
              );

            case 'numbered':
              return (
                <div key={idx} className="flex items-start gap-3 pl-4">
                  <span className={`font-mono font-bold select-none text-lg ${themeStyles.bullet}`}>
                    {block.header}.
                  </span>
                  <div className="flex-1">{renderInlineFormatted(block.content, themeStyles)}</div>
                </div>
              );

            case 'paragraph':
            default:
              return (
                <p key={idx} className="leading-relaxed font-sans">
                  {renderInlineFormatted(block.content, themeStyles)}
                </p>
              );
          }
        })}
      </div>
    </div>
  );
}

// Helper for inline markdown (**bold**, *italic*)
function renderInlineFormatted(text: string, themeStyles: any) {
  // Normalize internal whitespace inside asterisks (e.g. "** text **" -> "**text**")
  const normalized = text
    .replace(/\*\*\s*(.*?)\s*\*\*/g, '**$1**')
    .replace(/\*\s*(.*?)\s*\*/g, '*$1*');

  const parts = normalized.split(/(\*\*.*?\*\*|\*.*?\*)/g);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
          return (
            <strong key={i} className={themeStyles.bold}>
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
          return (
            <em key={i} className="italic opacity-90">
              {part.slice(1, -1)}
            </em>
          );
        }
        return part;
      })}
    </>
  );
}
