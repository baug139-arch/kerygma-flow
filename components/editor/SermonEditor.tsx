'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Clock,
  Save,
  Check,
  ArrowLeft,
  Heading1,
  Heading2,
  Bold,
  Italic,
  List,
  ListOrdered,
  Sparkles,
  Lightbulb,
  Undo2,
  Redo2,
  Megaphone,
  Quote,
  Pilcrow,
  Compass,
  Flag,
  Sliders,
  RotateCcw,
  X,
  Settings2,
} from 'lucide-react';
import { Sermon } from '@/lib/types';

interface SermonEditorProps {
  sermon: Sermon;
  onSave: (updated: Sermon) => void;
  onLaunchPulpit: () => void;
  onBack?: () => void;
}

// Convert Markdown to visual Rich HTML for the editor
function markdownToHtml(md: string): string {
  const lines = md.split('\n');
  let html = '';
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    if (!line) {
      i++;
      continue;
    }

    // H1
    if (line.startsWith('# ')) {
      const text = line.replace(/^#\s+/, '').replace(/^[*_\s]+|[*_\s]+$/g, '').trim();
      html += `<h1 class="text-3xl sm:text-4xl font-black text-amber-400 border-b border-zinc-800 pb-3 pt-4 my-4 tracking-tight">${escapeHtml(text)}</h1>`;
      i++;
      continue;
    }

    // Intro Block (## 🧭 ...)
    if (line.startsWith('## 🧭') || line.toLowerCase().startsWith('## введение') || line.toLowerCase().startsWith('## 1. введение')) {
      const text = line.replace(/^##\s*(🧭|\d+\.)?\s*/i, '').replace(/^[*_\s]+|[*_\s]+$/g, '').trim();
      html += `
        <div class="my-5 p-5 rounded-2xl bg-gradient-to-r from-teal-950/40 via-emerald-950/30 to-zinc-900/40 border-l-4 border-emerald-400 border-y border-r border-emerald-500/20 text-emerald-100 shadow-md" data-block="intro">
          <div class="text-emerald-400 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 mb-2 select-none" contenteditable="false">
            <span>🧭</span>
            <span>Введение / Старт</span>
          </div>
          <div class="text-2xl font-black text-emerald-200 tracking-tight intro-text">${escapeHtml(text || 'Введение')}</div>
        </div><p><br></p>
      `;
      i++;
      continue;
    }

    // Conclusion Block (## 🏁 ...)
    if (line.startsWith('## 🏁') || line.toLowerCase().startsWith('## заключение') || line.toLowerCase().startsWith('## призыв')) {
      const text = line.replace(/^##\s*(🏁)?\s*/i, '').replace(/^[*_\s]+|[*_\s]+$/g, '').trim();
      html += `
        <div class="my-5 p-5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-orange-950/30 to-zinc-900/40 border-l-4 border-amber-400 border-y border-r border-amber-500/20 text-amber-100 shadow-md" data-block="conclusion">
          <div class="text-amber-400 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 mb-2 select-none" contenteditable="false">
            <span>🏁</span>
            <span>Заключение / Призыв</span>
          </div>
          <div class="text-2xl font-black text-amber-200 tracking-tight conclusion-text">${escapeHtml(text || 'Заключение и призыв')}</div>
        </div><p><br></p>
      `;
      i++;
      continue;
    }

    // H2
    if (line.startsWith('## ')) {
      const text = line.replace(/^##\s+/, '').replace(/^[*_\s]+|[*_\s]+$/g, '').trim();
      html += `<h2 class="text-2xl font-extrabold text-amber-300 border-l-4 border-amber-500 pl-4 my-5 tracking-tight">${escapeHtml(text)}</h2>`;
      i++;
      continue;
    }

    // H3
    if (line.startsWith('### ')) {
      const text = line.replace(/^###\s+/, '').replace(/^[*_\s]+|[*_\s]+$/g, '').trim();
      html += `<h3 class="text-xl font-bold text-zinc-200 my-3">${escapeHtml(text)}</h3>`;
      i++;
      continue;
    }

    // Auto-detect bold numbered headings like "**1. Суть научного феномена**" as H2
    const boldNumMatch = line.match(/^\*\*\s*(\d+\.?\s+[^\*]+)\s*\*\*$/);
    if (boldNumMatch) {
      const text = boldNumMatch[1].trim();
      html += `<h2 class="text-2xl font-extrabold text-amber-300 border-l-4 border-amber-500 pl-4 my-5 tracking-tight">${escapeHtml(text)}</h2>`;
      i++;
      continue;
    }

    // Speaker Cue: [📢 ...] or [⏸ ...]
    if (line.startsWith('[📢') || line.startsWith('[⏸') || (line.startsWith('[') && line.includes('📢') && line.endsWith(']'))) {
      const cueText = line.replace(/^\[|\]$/g, '');
      html += `
        <div class="my-3 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-cyan-950/40 border border-cyan-500/40 text-cyan-300 font-mono text-sm tracking-wide shadow-sm" data-block="cue">
          <span class="opacity-70">📢 Ремарка:</span>
          <span>${escapeHtml(cueText.replace('📢', '').trim())}</span>
        </div><p><br></p>
      `;
      i++;
      continue;
    }

    // Author Quote Block (❝ ... ❞)
    if (line.startsWith('❝') || (line.startsWith('«') && line.includes('—'))) {
      html += `
        <div class="my-4 p-5 rounded-2xl bg-zinc-900/60 border-l-4 border-indigo-400 text-zinc-200 shadow-sm" data-block="author-quote">
          <div class="text-indigo-400 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 mb-2 select-none" contenteditable="false">
            <span>❝</span>
            <span>Цитата</span>
          </div>
          <div class="font-serif text-lg leading-relaxed text-zinc-200">${inlineMarkdownToHtml(line)}</div>
        </div>
      `;
      i++;
      continue;
    }

    // Scripture Block (> ...)
    if (line.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s*/, ''));
        i++;
      }

      let headerText = 'Священное Писание';
      let textBody = quoteLines.join(' ');

      if (quoteLines.length > 1 && (quoteLines[0].includes('**') || quoteLines[0].includes('📖'))) {
        headerText = quoteLines[0].replace(/[📖*]/g, '').trim();
        textBody = quoteLines.slice(1).join(' ');
      }

      html += `
        <div class="my-5 p-5 rounded-2xl bg-gradient-to-r from-amber-950/40 to-zinc-900/40 border-l-4 border-amber-400 border-y border-r border-amber-500/20 text-amber-100 shadow-lg" data-block="scripture" data-header="${escapeHtml(headerText)}">
          <div class="text-amber-400 font-bold text-sm tracking-wide flex items-center gap-2 mb-2 select-none" contenteditable="false">
            <span>📖</span>
            <span class="scripture-title-text">${escapeHtml(headerText)}</span>
          </div>
          <div class="font-serif text-lg leading-relaxed text-amber-100/95 italic">${escapeHtml(textBody)}</div>
        </div>
      `;
      continue;
    }

    // Story / Illustration (*«...»* or *...*)
    if (line.startsWith('*«') || (line.startsWith('*') && line.endsWith('*') && !line.startsWith('**'))) {
      const storyText = line.replace(/^\*|\*$/g, '');
      html += `
        <div class="my-4 p-5 rounded-2xl bg-zinc-900/50 border-l-4 border-zinc-600 text-zinc-300 shadow-sm" data-block="story">
          <div class="italic font-serif leading-relaxed">${inlineMarkdownToHtml(storyText)}</div>
        </div>
      `;
      i++;
      continue;
    }

    // Bullet list
    if (line.startsWith('- ') || line.startsWith('• ')) {
      const listItems: string[] = [];
      while (i < lines.length && (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('• '))) {
        listItems.push(lines[i].trim().replace(/^[-•]\s*/, ''));
        i++;
      }
      html += `<ul class="my-3 space-y-1.5 pl-6 list-disc list-outside text-zinc-200">`;
      for (const item of listItems) {
        html += `<li>${inlineMarkdownToHtml(item)}</li>`;
      }
      html += `</ul>`;
      continue;
    }

    // Numbered list
    if (/^\d+\.\s/.test(line)) {
      const numItems: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        numItems.push(lines[i].trim().replace(/^\d+\.\s*/, ''));
        i++;
      }
      html += `<ol class="my-3 space-y-1.5 pl-6 list-decimal list-outside text-zinc-200">`;
      for (const item of numItems) {
        html += `<li>${inlineMarkdownToHtml(item)}</li>`;
      }
      html += `</ol>`;
      continue;
    }

    // Regular paragraph
    html += `<p class="my-3 leading-relaxed text-zinc-200 text-lg">${inlineMarkdownToHtml(line)}</p>`;
    i++;
  }

  return html;
}

// Convert Visual HTML back to clean Markdown
function htmlToMarkdown(element: HTMLElement): string {
  let md = '';

  const processNode = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || '';
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();

      // Check for Speaker Cue
      if (el.getAttribute('data-block') === 'cue') {
        const text = el.textContent?.replace('📢 Ремарка:', '').trim() || '';
        return `\n\n[📢 ${text}]\n\n`;
      }

      // Check for Author Quote
      if (el.getAttribute('data-block') === 'author-quote') {
        const text = el.querySelector('.font-serif')?.textContent || el.textContent || '';
        return `\n\n❝${text.trim()}❞\n\n`;
      }

      // Check for Scripture Card
      if (el.getAttribute('data-block') === 'scripture') {
        const header = el.getAttribute('data-header') || el.querySelector('.scripture-title-text')?.textContent || 'Священное Писание';
        const bodyText = el.querySelector('.font-serif')?.textContent || el.textContent || '';
        return `\n\n> 📖 **${header.trim()}**\n> ${bodyText.trim()}\n\n`;
      }

      // Check for Intro Card
      if (el.getAttribute('data-block') === 'intro') {
        const text = el.querySelector('.intro-text')?.textContent || el.textContent?.replace('🧭 Введение / Старт', '') || 'Введение';
        return `\n\n## 🧭 ${text.trim()}\n\n`;
      }

      // Check for Conclusion Card
      if (el.getAttribute('data-block') === 'conclusion') {
        const text = el.querySelector('.conclusion-text')?.textContent || el.textContent?.replace('🏁 Заключение / Призыв', '') || 'Заключение и призыв';
        return `\n\n## 🏁 ${text.trim()}\n\n`;
      }

      // Check for Story Card
      if (el.getAttribute('data-block') === 'story') {
        const text = el.textContent?.trim() || '';
        return `\n\n*«${text.replace(/[*«»]/g, '')}»*\n\n`;
      }

      switch (tag) {
        case 'h1':
          return `\n\n# ${el.textContent?.trim()}\n\n`;
        case 'h2':
          return `\n\n## ${el.textContent?.trim()}\n\n`;
        case 'h3':
          return `\n\n### ${el.textContent?.trim()}\n\n`;
        case 'p':
          return `\n\n${Array.from(el.childNodes).map(processNode).join('')}\n\n`;
        case 'strong':
        case 'b':
          return `**${Array.from(el.childNodes).map(processNode).join('')}**`;
        case 'em':
        case 'i':
          return `*${Array.from(el.childNodes).map(processNode).join('')}*`;
        case 'ul':
          return `\n\n${Array.from(el.children).map((li) => `- ${li.textContent?.trim()}`).join('\n')}\n\n`;
        case 'ol':
          return `\n\n${Array.from(el.children).map((li, idx) => `${idx + 1}. ${li.textContent?.trim()}`).join('\n')}\n\n`;
        case 'li':
          return `${el.textContent?.trim()}\n`;
        case 'br':
          return '\n';
        case 'div':
          return `\n${Array.from(el.childNodes).map(processNode).join('')}\n`;
        default:
          return Array.from(el.childNodes).map(processNode).join('');
      }
    }

    return '';
  };

  md = Array.from(element.childNodes).map(processNode).join('');
  return md.replace(/\n{3,}/g, '\n\n').trim();
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inlineMarkdownToHtml(str: string): string {
  // Normalize internal whitespace inside asterisks before replacing
  const normalized = str
    .replace(/\*\*\s*(.*?)\s*\*\*/g, '**$1**')
    .replace(/\*\s*(.*?)\s*\*/g, '*$1*');
  let res = escapeHtml(normalized);
  res = res.replace(/\*\*(.*?)\*\*/g, '<strong class="text-amber-300 font-bold underline decoration-amber-500/40 underline-offset-4">$1</strong>');
  res = res.replace(/\*(.*?)\*/g, '<em class="italic opacity-90">$1</em>');
  return res;
}

export function SermonEditor({ sermon, onSave, onLaunchPulpit, onBack }: SermonEditorProps) {
  const [title, setTitle] = useState(sermon.title);
  const [series, setSeries] = useState(sermon.series || '');
  const [duration, setDuration] = useState(sermon.targetDurationMinutes || 30);
  const [saved, setSaved] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [hoveredTool, setHoveredTool] = useState<string | null>(null);

  // Pacing customization state (Default: 115 WPM, 2.05x expansion)
  const [wpm, setWpm] = useState(115);
  const [expansionFactor, setExpansionFactor] = useState(2.05);
  const [isPacingModalOpen, setIsPacingModalOpen] = useState(false);

  // Load user's saved pacing calibration from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedWpm = localStorage.getItem('kerygma_pacing_wpm');
      const savedExp = localStorage.getItem('kerygma_pacing_expansion');
      if (savedWpm) setWpm(Number(savedWpm));
      if (savedExp) setExpansionFactor(Number(savedExp));
    }
  }, []);

  const savePacingCalibration = (newWpm: number, newExp: number) => {
    setWpm(newWpm);
    setExpansionFactor(newExp);
    if (typeof window !== 'undefined') {
      localStorage.setItem('kerygma_pacing_wpm', String(newWpm));
      localStorage.setItem('kerygma_pacing_expansion', String(newExp));
    }
  };

  const resetPacingToDefault = () => {
    savePacingCalibration(115, 2.05);
  };

  const editorRef = useRef<HTMLDivElement | null>(null);
  const lastRangeRef = useRef<Range | null>(null);

  // Save selection range
  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      lastRangeRef.current = sel.getRangeAt(0);
    }
  };

  const restoreSelection = () => {
    const sel = window.getSelection();
    if (sel && lastRangeRef.current) {
      sel.removeAllRanges();
      sel.addRange(lastRangeRef.current);
    }
  };

  // Initialize visual content from sermon markdown
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = markdownToHtml(sermon.content);
      updateWordCount();
    }
  }, [sermon.id]);

  const updateWordCount = () => {
    if (editorRef.current) {
      const text = editorRef.current.innerText || '';
      const count = text.trim().split(/\s+/).filter(Boolean).length;
      setWordCount(count);
    }
  };

  const handleSave = useCallback(() => {
    if (editorRef.current) {
      const mdContent = htmlToMarkdown(editorRef.current);
      onSave({
        ...sermon,
        title,
        series,
        targetDurationMinutes: duration,
        content: mdContent,
        updatedAt: new Date().toISOString(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }, [sermon, title, series, duration, onSave]);

  // Undo / Redo handlers
  const applyUndo = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand('undo', false);
    updateWordCount();
  };

  const applyRedo = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand('redo', false);
    updateWordCount();
  };

  // Helper to unwrap any custom block/card back to a normal paragraph
  const unwrapBlockToParagraph = (blockEl: HTMLElement) => {
    let cleanText = '';
    const blockType = blockEl.getAttribute('data-block');

    if (blockType === 'scripture') {
      cleanText = blockEl.querySelector('.font-serif')?.textContent || blockEl.textContent || '';
    } else if (blockType === 'author-quote') {
      cleanText = blockEl.querySelector('.font-serif')?.textContent || blockEl.textContent?.replace('Цитата', '') || '';
    } else if (blockType === 'intro') {
      cleanText = blockEl.querySelector('.intro-text')?.textContent || blockEl.textContent?.replace('Введение / Старт', '') || '';
    } else if (blockType === 'conclusion') {
      cleanText = blockEl.querySelector('.conclusion-text')?.textContent || blockEl.textContent?.replace('Заключение / Призыв', '') || '';
    } else if (blockType === 'cue') {
      cleanText = blockEl.textContent?.replace('📢 Ремарка:', '').trim() || '';
    } else if (blockType === 'story') {
      cleanText = blockEl.querySelector('.font-serif')?.textContent || blockEl.textContent || '';
    } else {
      cleanText = blockEl.textContent || '';
    }

    cleanText = cleanText.replace(/^[#*`_❝❞«»\s]+|[#*`_❝❞«»\s]+$/g, '').trim();
    if (!cleanText) cleanText = 'Текст';

    const p = document.createElement('p');
    p.className = 'my-3 leading-relaxed text-zinc-200 text-lg';
    p.textContent = cleanText;

    blockEl.parentNode?.replaceChild(p, blockEl);
    return p;
  };

  // Clear format to regular paragraph (¶)
  const applyNormalText = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    restoreSelection();

    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    const node = selection.anchorNode;
    const parentEl = node?.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node?.parentElement;

    // Find if inside a custom card or heading
    const specialBlock = parentEl?.closest('[data-block], blockquote, h1, h2, h3, ul, ol, pre') as HTMLElement | null;

    if (specialBlock && editorRef.current.contains(specialBlock)) {
      unwrapBlockToParagraph(specialBlock);
    } else {
      document.execCommand('formatBlock', false, '<p>');
      document.execCommand('removeFormat', false);
    }

    updateWordCount();
    saveSelection();
  };

  // Introduction Block (🧭) - Toggles on/off
  const applyIntroduction = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    restoreSelection();

    const selection = window.getSelection();
    const parentEl = selection?.anchorNode?.parentElement;
    const existingIntro = parentEl?.closest('[data-block="intro"]') as HTMLElement | null;

    // If already intro, unwrap to normal text
    if (existingIntro && editorRef.current.contains(existingIntro)) {
      unwrapBlockToParagraph(existingIntro);
      updateWordCount();
      saveSelection();
      return;
    }

    let text = selection && selection.toString().trim() ? selection.toString().trim() : '';

    if (!text) {
      const currentBlockText = parentEl?.textContent?.trim() || '';
      if (currentBlockText && currentBlockText !== 'Введение' && !currentBlockText.startsWith('🧭')) {
        text = currentBlockText;
      } else {
        text = 'Введение';
      }
    }

    const cleanText = text.replace(/^[#\d.\s🧭]+/, '').trim() || 'Введение';

    const introHtml = `
      <div class="my-5 p-5 rounded-2xl bg-gradient-to-r from-teal-950/40 via-emerald-950/30 to-zinc-900/40 border-l-4 border-emerald-400 border-y border-r border-emerald-500/20 text-emerald-100 shadow-md" data-block="intro">
        <div class="text-emerald-400 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 mb-2 select-none" contenteditable="false">
          <span>🧭</span>
          <span>Введение / Старт</span>
        </div>
        <div class="text-2xl font-black text-emerald-200 tracking-tight intro-text">${escapeHtml(cleanText)}</div>
      </div><p><br></p>
    `;

    // Replace parent paragraph if whole paragraph was selected
    const parentP = parentEl?.closest('p, h1, h2, h3, div');
    if (parentP && parentP !== editorRef.current && parentP.textContent?.trim() === cleanText) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = introHtml;
      parentP.parentNode?.replaceChild(tempDiv.firstElementChild || tempDiv, parentP);
    } else {
      document.execCommand('insertHTML', false, introHtml);
    }

    updateWordCount();
    saveSelection();
  };

  // Conclusion Block (🏁) - Toggles on/off
  const applyConclusion = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    restoreSelection();

    const selection = window.getSelection();
    const parentEl = selection?.anchorNode?.parentElement;
    const existingConclusion = parentEl?.closest('[data-block="conclusion"]') as HTMLElement | null;

    // If already conclusion, unwrap to normal text
    if (existingConclusion && editorRef.current.contains(existingConclusion)) {
      unwrapBlockToParagraph(existingConclusion);
      updateWordCount();
      saveSelection();
      return;
    }

    let text = selection && selection.toString().trim() ? selection.toString().trim() : '';

    if (!text) {
      const currentBlockText = parentEl?.textContent?.trim() || '';
      if (currentBlockText && currentBlockText !== 'Заключение' && !currentBlockText.startsWith('🏁')) {
        text = currentBlockText;
      } else {
        text = 'Заключение и призыв';
      }
    }

    const cleanText = text.replace(/^[#\d.\s🏁]+/, '').trim() || 'Заключение и призыв';

    const conclusionHtml = `
      <div class="my-5 p-5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-orange-950/30 to-zinc-900/40 border-l-4 border-amber-400 border-y border-r border-amber-500/20 text-amber-100 shadow-md" data-block="conclusion">
        <div class="text-amber-400 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 mb-2 select-none" contenteditable="false">
          <span>🏁</span>
          <span>Заключение / Призыв</span>
        </div>
        <div class="text-2xl font-black text-amber-200 tracking-tight conclusion-text">${escapeHtml(cleanText)}</div>
      </div><p><br></p>
    `;

    const parentP = parentEl?.closest('p, h1, h2, h3, div');
    if (parentP && parentP !== editorRef.current && parentP.textContent?.trim() === cleanText) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = conclusionHtml;
      parentP.parentNode?.replaceChild(tempDiv.firstElementChild || tempDiv, parentP);
    } else {
      document.execCommand('insertHTML', false, conclusionHtml);
    }

    updateWordCount();
    saveSelection();
  };

  // Headings - Toggle to P if already heading
  const applyH1 = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    restoreSelection();

    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    const existingH1 = selection.anchorNode?.parentElement?.closest('h1');
    if (existingH1) {
      document.execCommand('formatBlock', false, '<p>');
    } else {
      document.execCommand('formatBlock', false, '<h1>');
      const h1 = selection.anchorNode?.parentElement?.closest('h1');
      if (h1) {
        h1.className = 'text-3xl sm:text-4xl font-black text-amber-400 border-b border-zinc-800 pb-3 pt-4 my-4 tracking-tight';
      }
    }
    updateWordCount();
    saveSelection();
  };

  const applyH2 = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    restoreSelection();

    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    const existingH2 = selection.anchorNode?.parentElement?.closest('h2');
    if (existingH2) {
      document.execCommand('formatBlock', false, '<p>');
    } else {
      document.execCommand('formatBlock', false, '<h2>');
      const h2 = selection.anchorNode?.parentElement?.closest('h2');
      if (h2) {
        h2.className = 'text-2xl font-extrabold text-amber-300 border-l-4 border-amber-500 pl-4 my-5 tracking-tight';
      }
    }
    updateWordCount();
    saveSelection();
  };

  const applyBold = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    restoreSelection();
    document.execCommand('bold', false);
    updateWordCount();
    saveSelection();
  };

  const applyItalic = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    restoreSelection();
    document.execCommand('italic', false);
    updateWordCount();
    saveSelection();
  };

  const applyBulletList = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    restoreSelection();
    document.execCommand('insertUnorderedList', false);
    updateWordCount();
    saveSelection();
  };

  const applyNumberedList = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    restoreSelection();
    document.execCommand('insertOrderedList', false);
    updateWordCount();
    saveSelection();
  };

  // Speaker Cue - Toggles on/off
  const applySpeakerCue = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    restoreSelection();

    const selection = window.getSelection();
    const parentEl = selection?.anchorNode?.parentElement;
    const existingCue = parentEl?.closest('[data-block="cue"]') as HTMLElement | null;

    if (existingCue && editorRef.current.contains(existingCue)) {
      unwrapBlockToParagraph(existingCue);
      updateWordCount();
      saveSelection();
      return;
    }

    const text = selection && selection.toString() ? selection.toString() : 'Пауза 5 сек / Слайд 1';

    const cueHtml = `
      <div class="my-3 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-cyan-950/40 border border-cyan-500/40 text-cyan-300 font-mono text-sm tracking-wide shadow-sm" data-block="cue">
        <span class="opacity-70">📢 Ремарка:</span>
        <span>${escapeHtml(text)}</span>
      </div><p><br></p>
    `;

    document.execCommand('insertHTML', false, cueHtml);
    updateWordCount();
    saveSelection();
  };

  // Author Quote - Toggles on/off
  const applyAuthorQuote = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    restoreSelection();

    const selection = window.getSelection();
    const parentEl = selection?.anchorNode?.parentElement;
    const existingQuote = parentEl?.closest('[data-block="author-quote"]') as HTMLElement | null;

    if (existingQuote && editorRef.current.contains(existingQuote)) {
      unwrapBlockToParagraph(existingQuote);
      updateWordCount();
      saveSelection();
      return;
    }

    const text = selection && selection.toString() ? selection.toString() : '«Бог шепчет нам в наших удовольствиях...» — К.С. Льюис';

    const quoteHtml = `
      <div class="my-4 p-5 rounded-2xl bg-zinc-900/60 border-l-4 border-indigo-400 text-zinc-200 shadow-sm" data-block="author-quote">
        <div class="text-indigo-400 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 mb-2 select-none" contenteditable="false">
          <span>❝</span>
          <span>Цитата</span>
        </div>
        <div class="font-serif text-lg leading-relaxed text-zinc-200">${escapeHtml(text)}</div>
      </div><p><br></p>
    `;

    const parentP = parentEl?.closest('p, h1, h2, h3, div');
    if (parentP && parentP !== editorRef.current && parentP.textContent?.trim() === text.trim()) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = quoteHtml;
      parentP.parentNode?.replaceChild(tempDiv.firstElementChild || tempDiv, parentP);
    } else {
      document.execCommand('insertHTML', false, quoteHtml);
    }

    updateWordCount();
    saveSelection();
  };

  // Story Block - Toggles on/off
  const applyStoryBlock = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    restoreSelection();

    const selection = window.getSelection();
    const parentEl = selection?.anchorNode?.parentElement;
    const existingStory = parentEl?.closest('[data-block="story"]') as HTMLElement | null;

    if (existingStory && editorRef.current.contains(existingStory)) {
      unwrapBlockToParagraph(existingStory);
      updateWordCount();
      saveSelection();
      return;
    }

    const text = selection && selection.toString() ? selection.toString() : '«Напишите здесь пример или личную историю...»';

    const storyHtml = `
      <div class="my-4 p-5 rounded-2xl bg-zinc-900/50 border-l-4 border-zinc-600 text-zinc-300 shadow-sm" data-block="story">
        <div class="italic font-serif leading-relaxed">${escapeHtml(text)}</div>
      </div><p><br></p>
    `;

    document.execCommand('insertHTML', false, storyHtml);
    updateWordCount();
    saveSelection();
  };

  // Thesis
  const applyThesis = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    restoreSelection();

    const selection = window.getSelection();
    const text = selection && selection.toString() ? selection.toString() : 'Напишите ключевой тезис';

    const thesisHtml = `<strong class="text-amber-300 font-black underline decoration-amber-500/40 decoration-2 underline-offset-4">Главная мысль: ${escapeHtml(text)}</strong> `;
    document.execCommand('insertHTML', false, thesisHtml);
    updateWordCount();
    saveSelection();
  };

  // Calculations based on customized or default WPM and expansion factor
  const readingMinutes = Math.max(1, Math.round(wordCount / wpm));
  const livePreachMinutes = Math.max(1, Math.round((wordCount * expansionFactor) / wpm));
  const diffMinutes = livePreachMinutes - duration;

  return (
    <div className="flex flex-col min-h-screen bg-[#09090b] text-zinc-100 select-text relative">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              handleSave();
              if (onBack) onBack();
              else window.location.href = '/';
            }}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-all flex items-center gap-1 text-xs font-semibold"
            title="Вернуться к списку проповедей"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Все проповеди</span>
          </button>

          <div className="h-4 w-px bg-zinc-800 hidden sm:block" />

          {/* Dual-Timing Statistics with Quick Calibration Click */}
          <div
            onClick={() => setIsPacingModalOpen(true)}
            className="hidden md:flex items-center gap-2.5 text-xs font-medium cursor-pointer p-1.5 rounded-xl hover:bg-zinc-900/90 transition-all group"
            title="Нажмите для настройки темпа речи и коэффициента формулы"
          >
            <span className="text-zinc-300 font-bold">{wordCount} слов</span>
            <span className="opacity-30">•</span>
            <span className="text-zinc-400">
              📖 ~{readingMinutes} мин чтения
            </span>
            <span className="opacity-30">•</span>
            <span className="text-amber-300 font-bold bg-amber-500/10 group-hover:bg-amber-500/20 px-2 py-0.5 rounded-lg border border-amber-500/20 flex items-center gap-1">
              <span>🎙 ~{livePreachMinutes} мин речи</span>
              <Settings2 className="w-3 h-3 opacity-60 group-hover:opacity-100 ml-0.5" />
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Target Duration Selector */}
          <div className={`flex items-center gap-1.5 bg-zinc-900/80 px-3 py-1.5 rounded-xl border text-xs transition-colors ${
            Math.abs(diffMinutes) <= 4
              ? 'border-emerald-500/40'
              : diffMinutes > 5
              ? 'border-amber-500/40'
              : 'border-zinc-800'
          }`}>
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-zinc-400 hidden sm:inline">Регламент:</span>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="bg-transparent text-amber-400 font-bold focus:outline-none cursor-pointer"
            >
              <option value={15} className="bg-zinc-900">15 мин</option>
              <option value={20} className="bg-zinc-900">20 мин</option>
              <option value={25} className="bg-zinc-900">25 мин</option>
              <option value={30} className="bg-zinc-900">30 мин</option>
              <option value={35} className="bg-zinc-900">35 мин</option>
              <option value={40} className="bg-zinc-900">40 мин</option>
              <option value={45} className="bg-zinc-900">45 мин</option>
              <option value={60} className="bg-zinc-900">60 мин</option>
            </select>
          </div>

          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 transition-all"
            title="Сохранить изменения"
          >
            {saved ? <Check className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4" />}
            <span className="hidden sm:inline">{saved ? 'Сохранено' : 'Сохранить'}</span>
          </button>

          <button
            onClick={() => {
              handleSave();
              onLaunchPulpit();
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black shadow-lg shadow-amber-500/20 transition-all active:scale-95"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>На кафедру</span>
          </button>
        </div>
      </header>

      {/* Vertical Right Floating Toolbar */}
      <aside className="fixed right-3 sm:right-6 top-1/2 -translate-y-1/2 z-30 select-none">
        <div className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-zinc-950/90 border border-zinc-800/80 backdrop-blur-xl shadow-2xl">
          {/* Undo / Redo */}
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              applyUndo();
            }}
            onMouseEnter={() => setHoveredTool('Отменить (Ctrl+Z)')}
            onMouseLeave={() => setHoveredTool(null)}
            className="p-2.5 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-all active:scale-90"
            title="Отменить"
          >
            <Undo2 className="w-4 h-4" />
          </button>

          <button
            onMouseDown={(e) => {
              e.preventDefault();
              applyRedo();
            }}
            onMouseEnter={() => setHoveredTool('Повторить (Ctrl+Y)')}
            onMouseLeave={() => setHoveredTool(null)}
            className="p-2.5 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-all active:scale-90"
            title="Повторить"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          <div className="w-6 h-px bg-zinc-800 my-0.5" />

          {/* Normal Text */}
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              applyNormalText();
            }}
            onMouseEnter={() => setHoveredTool('Обычный текст (Сбросить стиль)')}
            onMouseLeave={() => setHoveredTool(null)}
            className="p-2.5 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-all active:scale-90"
            title="Обычный текст"
          >
            <Pilcrow className="w-4 h-4" />
          </button>

          {/* Headings */}
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              applyH1();
            }}
            onMouseEnter={() => setHoveredTool('Главный заголовок (H1)')}
            onMouseLeave={() => setHoveredTool(null)}
            className="p-2.5 rounded-xl text-amber-400 hover:bg-amber-500/10 transition-all active:scale-90 font-bold text-xs"
            title="Заголовок H1"
          >
            <Heading1 className="w-4 h-4" />
          </button>

          <button
            onMouseDown={(e) => {
              e.preventDefault();
              applyH2();
            }}
            onMouseEnter={() => setHoveredTool('Раздел плана (H2)')}
            onMouseLeave={() => setHoveredTool(null)}
            className="p-2.5 rounded-xl text-amber-300 hover:bg-amber-500/10 transition-all active:scale-90 font-bold text-xs"
            title="Раздел плана H2"
          >
            <Heading2 className="w-4 h-4" />
          </button>

          <div className="w-6 h-px bg-zinc-800 my-0.5" />

          {/* Introduction and Conclusion Section Buttons */}
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              applyIntroduction();
            }}
            onMouseEnter={() => setHoveredTool('Введение (Начало проповеди)')}
            onMouseLeave={() => setHoveredTool(null)}
            className="p-2.5 rounded-xl text-emerald-400 hover:bg-emerald-500/10 transition-all active:scale-90"
            title="Введение"
          >
            <Compass className="w-4 h-4" />
          </button>

          <button
            onMouseDown={(e) => {
              e.preventDefault();
              applyConclusion();
            }}
            onMouseEnter={() => setHoveredTool('Заключение и призыв (Финал)')}
            onMouseLeave={() => setHoveredTool(null)}
            className="p-2.5 rounded-xl text-amber-400 hover:bg-amber-500/10 transition-all active:scale-90"
            title="Заключение и призыв"
          >
            <Flag className="w-4 h-4 fill-current" />
          </button>

          <div className="w-6 h-px bg-zinc-800 my-0.5" />

          {/* Special Semantic Blocks */}
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              applyAuthorQuote();
            }}
            onMouseEnter={() => setHoveredTool('Цитата автора')}
            onMouseLeave={() => setHoveredTool(null)}
            className="p-2.5 rounded-xl text-indigo-400 hover:bg-indigo-500/10 transition-all active:scale-90"
            title="Цитата"
          >
            <Quote className="w-4 h-4" />
          </button>

          <button
            onMouseDown={(e) => {
              e.preventDefault();
              applySpeakerCue();
            }}
            onMouseEnter={() => setHoveredTool('Ремарка спикеру (пауза, слайд)')}
            onMouseLeave={() => setHoveredTool(null)}
            className="p-2.5 rounded-xl text-cyan-400 hover:bg-cyan-500/10 transition-all active:scale-90"
            title="Ремарка спикеру"
          >
            <Megaphone className="w-4 h-4" />
          </button>

          <button
            onMouseDown={(e) => {
              e.preventDefault();
              applyStoryBlock();
            }}
            onMouseEnter={() => setHoveredTool('История / Пример')}
            onMouseLeave={() => setHoveredTool(null)}
            className="p-2.5 rounded-xl text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition-all active:scale-90"
            title="История"
          >
            <Sparkles className="w-4 h-4 text-zinc-400" />
          </button>

          <button
            onMouseDown={(e) => {
              e.preventDefault();
              applyThesis();
            }}
            onMouseEnter={() => setHoveredTool('Главный тезис')}
            onMouseLeave={() => setHoveredTool(null)}
            className="p-2.5 rounded-xl text-amber-400 hover:bg-amber-500/10 transition-all active:scale-90"
            title="Главный тезис"
          >
            <Lightbulb className="w-4 h-4" />
          </button>

          <div className="w-6 h-px bg-zinc-800 my-0.5" />

          {/* Basic Text Formatting */}
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              applyBold();
            }}
            onMouseEnter={() => setHoveredTool('Жирный шрифт')}
            onMouseLeave={() => setHoveredTool(null)}
            className="p-2.5 rounded-xl text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition-all active:scale-90 font-bold"
            title="Жирный"
          >
            <Bold className="w-4 h-4" />
          </button>

          <button
            onMouseDown={(e) => {
              e.preventDefault();
              applyItalic();
            }}
            onMouseEnter={() => setHoveredTool('Курсив')}
            onMouseLeave={() => setHoveredTool(null)}
            className="p-2.5 rounded-xl text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition-all active:scale-90 italic"
            title="Курсив"
          >
            <Italic className="w-4 h-4" />
          </button>

          <button
            onMouseDown={(e) => {
              e.preventDefault();
              applyBulletList();
            }}
            onMouseEnter={() => setHoveredTool('Маркерный список (•)')}
            onMouseLeave={() => setHoveredTool(null)}
            className="p-2.5 rounded-xl text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition-all active:scale-90"
            title="Маркерный список"
          >
            <List className="w-4 h-4" />
          </button>

          <button
            onMouseDown={(e) => {
              e.preventDefault();
              applyNumberedList();
            }}
            onMouseEnter={() => setHoveredTool('Нумерованный список (1, 2, 3...)')}
            onMouseLeave={() => setHoveredTool(null)}
            className="p-2.5 rounded-xl text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition-all active:scale-90"
            title="Нумерованный список"
          >
            <ListOrdered className="w-4 h-4" />
          </button>
        </div>

        {/* Hovered Tooltip */}
        {hoveredTool && (
          <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap bg-zinc-900/95 text-zinc-100 border border-zinc-800 shadow-2xl animate-in fade-in duration-100 pointer-events-none">
            {hoveredTool}
          </div>
        )}
      </aside>

      {/* Main Centered Visual WYSIWYG Document */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-6 sm:px-12 py-8 flex flex-col space-y-6 pr-16 sm:pr-20">
        {/* Title Input */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Название проповеди..."
          className="w-full bg-transparent text-3xl sm:text-4xl lg:text-5xl font-black text-zinc-100 placeholder-zinc-700 focus:outline-none border-b border-zinc-800/40 pb-4 leading-tight tracking-tight"
        />

        {/* Series Input (Optional) */}
        <input
          type="text"
          value={series}
          onChange={(e) => setSeries(e.target.value)}
          placeholder="Серия проповедей (например: «Вера в действии»)"
          className="w-full bg-transparent text-sm text-zinc-400 placeholder-zinc-700 focus:outline-none -mt-2"
        />

        {/* Visual ContentEditable Document (WYSIWYG) */}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={updateWordCount}
          onBlur={handleSave}
          onKeyUp={saveSelection}
          onMouseUp={saveSelection}
          className="w-full flex-1 focus:outline-none min-h-[65vh] pb-32 text-zinc-200"
          style={{ lineHeight: 1.85 }}
        />
      </main>

      {/* Pacing Calibration Modal */}
      {isPacingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-6 text-zinc-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold">
                <Sliders className="w-5 h-5" />
                <span>Калибровка темпа и формулы</span>
              </div>
              <button
                onClick={() => setIsPacingModalOpen(false)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Speaking Rate WPM */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-zinc-300">Базовый темп речи (слов/мин):</span>
                <span className="text-amber-400 font-mono font-bold text-sm">{wpm} сл/мин</span>
              </div>
              <input
                type="range"
                min={85}
                max={165}
                step={5}
                value={wpm}
                onChange={(e) => savePacingCalibration(Number(e.target.value), expansionFactor)}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                <span>90 (Размеренный)</span>
                <span className="text-amber-400/80">115 (Стандарт)</span>
                <span>150 (Быстрый)</span>
              </div>
            </div>

            {/* Expansion Factor */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-zinc-300">Коэффициент живой речи:</span>
                <span className="text-amber-400 font-mono font-bold text-sm">{expansionFactor.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min={1.0}
                max={3.0}
                step={0.05}
                value={expansionFactor}
                onChange={(e) => savePacingCalibration(wpm, Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                <span>1.0x (Чтение текста)</span>
                <span className="text-amber-400/80">2.05x (Проповедь)</span>
                <span>3.0x (Импровизация)</span>
              </div>
            </div>

            {/* Resulting Formula Summary */}
            <div className="p-3.5 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 text-xs space-y-1.5 text-zinc-400">
              <div className="font-semibold text-zinc-200">Текущий расчет для вашего конспекта:</div>
              <div>• {wordCount} слов $\to$ 📖 ~{readingMinutes} мин чистого чтения</div>
              <div>• {wordCount} слов $\to$ 🎙 <strong className="text-amber-300">~{livePreachMinutes} мин живой проповеди</strong></div>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
              <button
                onClick={resetPacingToDefault}
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 p-2 rounded-xl hover:bg-zinc-800/60 transition-all"
                title="Сбросить к 115 сл/мин и 2.05x"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>По умолчанию (115, 2.05x)</span>
              </button>

              <button
                onClick={() => setIsPacingModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black shadow-md transition-all"
              >
                Применить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
