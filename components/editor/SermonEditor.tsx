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
  Lightbulb,
  Undo2,
  Redo2,
  Megaphone,
  Quote,
  Pilcrow,
  BookOpen,
  Sliders,
  RotateCcw,
  X,
  Settings2,
} from 'lucide-react';
import { Sermon } from '@/lib/types';
import { cleanDocumentArtifacts } from '@/lib/utils/htmlDecoder';

interface SermonEditorProps {
  sermon: Sermon;
  onSave: (updated: Sermon) => void;
  onLaunchPulpit: () => void;
  onBack?: () => void;
}

// Convert Markdown to visual Rich HTML for the editor
function markdownToHtml(md: string): string {
  const cleaned = cleanDocumentArtifacts(md);
  const lines = cleaned.split('\n');
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

    // Unordered List (- ...)
    if (line.startsWith('- ') || line.startsWith('* ')) {
      const listItems: string[] = [];
      while (i < lines.length && (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* '))) {
        listItems.push(lines[i].trim().replace(/^[-*]\s+/, ''));
        i++;
      }
      html += `<ul class="my-4 space-y-1.5 list-disc list-inside text-zinc-200">${listItems.map((item) => `<li>${inlineMarkdownToHtml(item)}</li>`).join('')}</ul>`;
      continue;
    }

    // Ordered List (1. ...)
    if (/^\d+\.\s+/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        listItems.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i++;
      }
      html += `<ol class="my-4 space-y-1.5 list-decimal list-inside text-zinc-200">${listItems.map((item) => `<li>${inlineMarkdownToHtml(item)}</li>`).join('')}</ol>`;
      continue;
    }

    // Regular Paragraph
    html += `<p class="my-3 leading-relaxed text-zinc-200 text-lg">${inlineMarkdownToHtml(line)}</p>`;
    i++;
  }

  return html || '<p class="my-3 leading-relaxed text-zinc-200 text-lg"><br></p>';
}

// Convert HTML content back to clean Markdown
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
  const cleaned = cleanDocumentArtifacts(md);
  return cleaned.replace(/\n{3,}/g, '\n\n').trim();
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inlineMarkdownToHtml(str: string): string {
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

  // Floating Selection Bubble State
  const [bubblePos, setBubblePos] = useState<{ x: number; y: number } | null>(null);

  // Pacing customization state (Default: 115 WPM, 2.05x expansion)
  const [wpm, setWpm] = useState(115);
  const [expansionFactor, setExpansionFactor] = useState(2.05);
  const [isPacingModalOpen, setIsPacingModalOpen] = useState(false);

  // Load user's saved pacing calibration
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

  // Monitor text selection for Floating Bubble Toolbar
  useEffect(() => {
    const handleSelectionChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !editorRef.current) {
        setBubblePos(null);
        return;
      }

      if (sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        if (editorRef.current.contains(range.commonAncestorContainer)) {
          const rect = range.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            setBubblePos({
              x: rect.left + rect.width / 2,
              y: rect.top - 12,
            });
            lastRangeRef.current = range;
            return;
          }
        }
      }
      setBubblePos(null);
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

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

  // Find the top-level block element in the editor
  const getSelectedBlockElement = (): HTMLElement | null => {
    if (!editorRef.current) return null;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;

    let node: Node | null = sel.anchorNode;
    if (!node) return null;

    if (node === editorRef.current) {
      const firstChild = editorRef.current.firstElementChild as HTMLElement | null;
      return firstChild || null;
    }

    while (node && node.parentElement && node.parentElement !== editorRef.current) {
      node = node.parentElement;
    }

    if (node && node.parentElement === editorRef.current) {
      if (node.nodeType === Node.TEXT_NODE) {
        // Wrap orphan text node into paragraph
        const p = document.createElement('p');
        p.className = 'my-3 leading-relaxed text-zinc-200 text-lg';
        p.textContent = node.textContent;
        editorRef.current.replaceChild(p, node);
        return p;
      }
      return node as HTMLElement;
    }

    return null;
  };

  // Helper to extract clean text from any block
  const getCleanBlockText = (blockEl: HTMLElement): string => {
    let text = '';
    const blockType = blockEl.getAttribute('data-block');

    if (blockType === 'scripture') {
      text = blockEl.querySelector('.font-serif')?.textContent || blockEl.textContent || '';
    } else if (blockType === 'author-quote') {
      text = blockEl.querySelector('.font-serif')?.textContent || blockEl.textContent?.replace('Цитата', '') || '';
    } else if (blockType === 'cue') {
      text = blockEl.textContent?.replace('📢 Ремарка:', '').trim() || '';
    } else if (blockType === 'story') {
      text = blockEl.querySelector('.italic')?.textContent || blockEl.textContent || '';
    } else {
      text = blockEl.textContent || '';
    }

    return text.replace(/^[#*`_❝❞«»\s]+|[#*`_❝❞«»\s]+$/g, '').trim();
  };

  // ================= PARAGRAPH-LEVEL BLOCK FORMAT TRANSFORMER =================
  const applyBlockFormat = (type: 'h1' | 'h2' | 'quote' | 'scripture' | 'cue' | 'story' | 'ul' | 'ol' | 'p') => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    restoreSelection();

    const currentBlock = getSelectedBlockElement();
    if (!currentBlock) return;

    const rawText = getCleanBlockText(currentBlock);
    const cleanText = rawText || 'Текст';

    const currentTag = currentBlock.tagName.toLowerCase();
    const currentBlockType = currentBlock.getAttribute('data-block');

    // Toggle check: if already this type or 'p', revert to clean paragraph
    const isAlreadyThisType =
      (type === 'h1' && currentTag === 'h1') ||
      (type === 'h2' && currentTag === 'h2') ||
      (type === 'quote' && currentBlockType === 'author-quote') ||
      (type === 'scripture' && currentBlockType === 'scripture') ||
      (type === 'cue' && currentBlockType === 'cue') ||
      (type === 'story' && currentBlockType === 'story') ||
      (type === 'ul' && currentTag === 'ul') ||
      (type === 'ol' && currentTag === 'ol') ||
      type === 'p';

    let newEl: HTMLElement;

    if (isAlreadyThisType) {
      // Revert to clean paragraph
      newEl = document.createElement('p');
      newEl.className = 'my-3 leading-relaxed text-zinc-200 text-lg';
      newEl.textContent = cleanText;
    } else if (type === 'h1') {
      newEl = document.createElement('h1');
      newEl.className = 'text-3xl sm:text-4xl font-black text-amber-400 border-b border-zinc-800 pb-3 pt-4 my-4 tracking-tight';
      newEl.textContent = cleanText;
    } else if (type === 'h2') {
      newEl = document.createElement('h2');
      newEl.className = 'text-2xl font-extrabold text-amber-300 border-l-4 border-amber-500 pl-4 my-5 tracking-tight';
      newEl.textContent = cleanText;
    } else if (type === 'quote') {
      newEl = document.createElement('div');
      newEl.className = 'my-4 p-5 rounded-2xl bg-zinc-900/60 border-l-4 border-indigo-400 text-zinc-200 shadow-sm';
      newEl.setAttribute('data-block', 'author-quote');
      newEl.innerHTML = `
        <div class="text-indigo-400 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 mb-2 select-none" contenteditable="false">
          <span>❝</span>
          <span>Цитата</span>
        </div>
        <div class="font-serif text-lg leading-relaxed text-zinc-200">${escapeHtml(cleanText)}</div>
      `;
    } else if (type === 'scripture') {
      newEl = document.createElement('div');
      newEl.className = 'my-5 p-5 rounded-2xl bg-gradient-to-r from-amber-950/40 to-zinc-900/40 border-l-4 border-amber-400 border-y border-r border-amber-500/20 text-amber-100 shadow-lg';
      newEl.setAttribute('data-block', 'scripture');
      newEl.setAttribute('data-header', 'Священное Писание');
      newEl.innerHTML = `
        <div class="text-amber-400 font-bold text-sm tracking-wide flex items-center gap-2 mb-2 select-none" contenteditable="false">
          <span>📖</span>
          <span class="scripture-title-text">Священное Писание</span>
        </div>
        <div class="font-serif text-lg leading-relaxed text-amber-100/95 italic">${escapeHtml(cleanText)}</div>
      `;
    } else if (type === 'story') {
      newEl = document.createElement('div');
      newEl.className = 'my-4 p-5 rounded-2xl bg-zinc-900/50 border-l-4 border-zinc-600 text-zinc-300 shadow-sm';
      newEl.setAttribute('data-block', 'story');
      newEl.innerHTML = `
        <div class="italic font-serif leading-relaxed">${escapeHtml(cleanText)}</div>
      `;
    } else if (type === 'cue') {
      newEl = document.createElement('div');
      newEl.className = 'my-3 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-cyan-950/40 border border-cyan-500/40 text-cyan-300 font-mono text-sm tracking-wide shadow-sm';
      newEl.setAttribute('data-block', 'cue');
      newEl.innerHTML = `
        <span class="opacity-70">📢 Ремарка:</span>
        <span>${escapeHtml(cleanText)}</span>
      `;
    } else if (type === 'ul') {
      newEl = document.createElement('ul');
      newEl.className = 'my-4 space-y-1.5 list-disc list-inside text-zinc-200';
      newEl.innerHTML = `<li>${escapeHtml(cleanText)}</li>`;
    } else if (type === 'ol') {
      newEl = document.createElement('ol');
      newEl.className = 'my-4 space-y-1.5 list-decimal list-inside text-zinc-200';
      newEl.innerHTML = `<li>${escapeHtml(cleanText)}</li>`;
    } else {
      newEl = document.createElement('p');
      newEl.className = 'my-3 leading-relaxed text-zinc-200 text-lg';
      newEl.textContent = cleanText;
    }

    editorRef.current.replaceChild(newEl, currentBlock);

    // Place caret at end of the new element
    const sel = window.getSelection();
    if (sel) {
      const range = document.createRange();
      range.selectNodeContents(newEl);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
      lastRangeRef.current = range;
    }

    updateWordCount();
    setBubblePos(null);
  };

  // ================= INLINE FORMATTERS =================
  const applyBold = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    restoreSelection();
    document.execCommand('bold', false);
    updateWordCount();
    saveSelection();
    setBubblePos(null);
  };

  const applyItalic = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    restoreSelection();
    document.execCommand('italic', false);
    updateWordCount();
    saveSelection();
    setBubblePos(null);
  };

  const applyThesis = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    restoreSelection();

    const sel = window.getSelection();
    const text = sel && sel.toString() ? sel.toString().trim() : '';

    if (text) {
      const thesisHtml = `<strong class="text-amber-300 font-bold underline decoration-amber-500/40 decoration-2 underline-offset-4">${escapeHtml(text)}</strong>`;
      document.execCommand('insertHTML', false, thesisHtml);
    } else {
      document.execCommand('bold', false);
    }
    updateWordCount();
    saveSelection();
    setBubblePos(null);
  };

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

  // Keyboard Enter handler: prevent broken nested cards
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      const block = getSelectedBlockElement();
      if (block && block.getAttribute('data-block')) {
        e.preventDefault();
        const p = document.createElement('p');
        p.className = 'my-3 leading-relaxed text-zinc-200 text-lg';
        p.innerHTML = '<br>';
        block.after(p);

        const sel = window.getSelection();
        if (sel) {
          const range = document.createRange();
          range.setStart(p, 0);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
          lastRangeRef.current = range;
        }
        updateWordCount();
      }
    }
  };

  // Pacing calculations
  const readingMinutes = Math.max(1, Math.round(wordCount / wpm));
  const livePreachMinutes = Math.max(1, Math.round(readingMinutes * expansionFactor));
  const diffMinutes = duration - livePreachMinutes;

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col select-none">
      {/* Top Sticky Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          {/* Back & Title */}
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                title="Назад к списку"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-lg sm:text-xl font-bold bg-transparent text-zinc-100 focus:outline-none border-b border-transparent hover:border-zinc-700 focus:border-amber-400 transition-colors tracking-tight max-w-[240px] sm:max-w-md"
                placeholder="Название проповеди..."
              />
              <div className="flex items-center gap-2 mt-0.5">
                <input
                  type="text"
                  value={series}
                  onChange={(e) => setSeries(e.target.value)}
                  placeholder="Серия / Тема (опционально)"
                  className="text-xs text-zinc-500 bg-transparent focus:outline-none border-b border-transparent hover:border-zinc-800 focus:border-zinc-600 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Word Count & Live Pacing Badge */}
          <div
            onClick={() => setIsPacingModalOpen(true)}
            className="hidden md:flex items-center gap-2.5 text-xs font-medium cursor-pointer p-1.5 rounded-xl hover:bg-zinc-900/90 transition-all group"
            title="Нажмите для настройки темпа речи и коэффициента формулы"
          >
            <span className="text-zinc-300 font-bold">{wordCount} слов</span>
            <span className="opacity-30">•</span>
            <span className="text-zinc-400">📖 ~{readingMinutes} мин чтения</span>
            <span className="opacity-30">•</span>
            <span className="text-amber-300 font-bold bg-amber-500/10 group-hover:bg-amber-500/20 px-2 py-0.5 rounded-lg border border-amber-500/20 flex items-center gap-1">
              <span>🎙 ~{livePreachMinutes} мин речи</span>
              <Settings2 className="w-3 h-3 opacity-60 group-hover:opacity-100 ml-0.5" />
            </span>
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

            {/* Save Button */}
            <button
              onClick={handleSave}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-md ${
                saved
                  ? 'bg-emerald-500 text-black shadow-emerald-500/20'
                  : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700'
              }`}
            >
              {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              <span>{saved ? 'Сохранено' : 'Сохранить'}</span>
            </button>

            {/* Launch Pulpit Teleprompter Button */}
            <button
              onClick={() => {
                handleSave();
                onLaunchPulpit();
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black text-sm font-bold shadow-lg shadow-amber-500/25 transition-all active:scale-95"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>На кафедру</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex justify-center px-4 sm:px-6 py-6 sm:py-8 max-w-5xl mx-auto w-full relative">
        {/* Floating Context Bubble on Text Selection */}
        {bubblePos && (
          <div
            className="fixed z-50 -translate-x-1/2 -translate-y-full flex items-center gap-1 p-1.5 rounded-2xl bg-zinc-900/95 border border-zinc-700 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in duration-150"
            style={{ left: `${bubblePos.x}px`, top: `${bubblePos.y}px` }}
          >
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                applyBold();
              }}
              className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-200 font-bold transition-colors"
              title="Жирный шрифт (B)"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                applyItalic();
              }}
              className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-200 italic transition-colors"
              title="Курсив (I)"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                applyThesis();
              }}
              className="p-2 rounded-xl hover:bg-amber-500/20 text-amber-300 font-bold transition-colors flex items-center gap-1 text-xs"
              title="Главный тезис"
            >
              <Lightbulb className="w-4 h-4" />
            </button>
            <div className="w-px h-5 bg-zinc-700 mx-0.5" />
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                applyBlockFormat('quote');
              }}
              className="p-2 rounded-xl hover:bg-indigo-500/20 text-indigo-300 transition-colors"
              title="Цитата"
            >
              <Quote className="w-4 h-4" />
            </button>
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                applyBlockFormat('scripture');
              }}
              className="p-2 rounded-xl hover:bg-amber-500/20 text-amber-300 transition-colors"
              title="Писание"
            >
              <BookOpen className="w-4 h-4" />
            </button>
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                applyBlockFormat('p');
              }}
              className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
              title="Обычный текст"
            >
              <Pilcrow className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* The Sermon Document Sheet */}
        <div className="w-full max-w-3xl pb-40">
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={updateWordCount}
            onBlur={saveSelection}
            onMouseUp={saveSelection}
            onKeyUp={saveSelection}
            onKeyDown={handleKeyDown}
            className="w-full min-h-[75vh] p-6 sm:p-10 rounded-3xl bg-zinc-950/70 border border-zinc-800/80 text-zinc-100 shadow-2xl focus:outline-none focus:border-zinc-700 leading-relaxed font-sans text-lg tracking-normal cursor-text selection:bg-amber-500/30 select-text"
            data-placeholder="Начните писать текст проповеди..."
          />
        </div>

        {/* Floating Right Semantic Toolbar */}
        <aside className="fixed right-4 sm:right-8 top-28 z-30 flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-zinc-950/90 border border-zinc-800 backdrop-blur-md shadow-2xl">
          {/* Tooltip Pill */}
          {hoveredTool && (
            <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs font-semibold text-amber-300 whitespace-nowrap shadow-xl pointer-events-none animate-in fade-in duration-150">
              {hoveredTool}
            </div>
          )}

          {/* Normal Paragraph / Clear Format */}
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              applyBlockFormat('p');
            }}
            onMouseEnter={() => setHoveredTool('Обычный текст (¶)')}
            onMouseLeave={() => setHoveredTool(null)}
            className="p-2.5 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 transition-all active:scale-90"
            title="Обычный текст"
          >
            <Pilcrow className="w-4 h-4" />
          </button>

          <div className="w-6 h-px bg-zinc-800 my-0.5" />

          {/* Headings */}
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              applyBlockFormat('h1');
            }}
            onMouseEnter={() => setHoveredTool('Главный заголовок (H1)')}
            onMouseLeave={() => setHoveredTool(null)}
            className="p-2.5 rounded-xl text-amber-400 hover:bg-amber-500/10 transition-all active:scale-90 font-bold text-xs"
            title="Главный заголовок H1"
          >
            <Heading1 className="w-4 h-4" />
          </button>

          <button
            onMouseDown={(e) => {
              e.preventDefault();
              applyBlockFormat('h2');
            }}
            onMouseEnter={() => setHoveredTool('Раздел плана (H2)')}
            onMouseLeave={() => setHoveredTool(null)}
            className="p-2.5 rounded-xl text-amber-300 hover:bg-amber-500/10 transition-all active:scale-90 font-bold text-xs"
            title="Раздел плана H2"
          >
            <Heading2 className="w-4 h-4" />
          </button>

          <div className="w-6 h-px bg-zinc-800 my-0.5" />

          {/* Special Semantic Blocks */}
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              applyBlockFormat('quote');
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
              applyBlockFormat('scripture');
            }}
            onMouseEnter={() => setHoveredTool('Цитата Писания')}
            onMouseLeave={() => setHoveredTool(null)}
            className="p-2.5 rounded-xl text-amber-400 hover:bg-amber-500/10 transition-all active:scale-90"
            title="Священное Писание"
          >
            <BookOpen className="w-4 h-4" />
          </button>

          <button
            onMouseDown={(e) => {
              e.preventDefault();
              applyBlockFormat('cue');
            }}
            onMouseEnter={() => setHoveredTool('Ремарка спикеру (Пауза/Слайд)')}
            onMouseLeave={() => setHoveredTool(null)}
            className="p-2.5 rounded-xl text-cyan-400 hover:bg-cyan-500/10 transition-all active:scale-90"
            title="Ремарка"
          >
            <Megaphone className="w-4 h-4" />
          </button>

          <button
            onMouseDown={(e) => {
              e.preventDefault();
              applyThesis();
            }}
            onMouseEnter={() => setHoveredTool('Главный тезис / Мысль')}
            onMouseLeave={() => setHoveredTool(null)}
            className="p-2.5 rounded-xl text-amber-300 hover:bg-amber-500/10 transition-all active:scale-90"
            title="Главный тезис"
          >
            <Lightbulb className="w-4 h-4" />
          </button>

          <div className="w-6 h-px bg-zinc-800 my-0.5" />

          {/* Inline Styles */}
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              applyBold();
            }}
            onMouseEnter={() => setHoveredTool('Жирный (Ctrl/Cmd+B)')}
            onMouseLeave={() => setHoveredTool(null)}
            className="p-2.5 rounded-xl text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800/80 transition-all active:scale-90"
            title="Жирный"
          >
            <Bold className="w-4 h-4" />
          </button>

          <button
            onMouseDown={(e) => {
              e.preventDefault();
              applyItalic();
            }}
            onMouseEnter={() => setHoveredTool('Курсив (Ctrl/Cmd+I)')}
            onMouseLeave={() => setHoveredTool(null)}
            className="p-2.5 rounded-xl text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800/80 transition-all active:scale-90"
            title="Курсив"
          >
            <Italic className="w-4 h-4" />
          </button>

          <div className="w-6 h-px bg-zinc-800 my-0.5" />

          {/* Lists */}
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              applyBlockFormat('ul');
            }}
            onMouseEnter={() => setHoveredTool('Маркированный список')}
            onMouseLeave={() => setHoveredTool(null)}
            className="p-2.5 rounded-xl text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800/80 transition-all active:scale-90"
            title="Маркированный список"
          >
            <List className="w-4 h-4" />
          </button>

          <button
            onMouseDown={(e) => {
              e.preventDefault();
              applyBlockFormat('ol');
            }}
            onMouseEnter={() => setHoveredTool('Нумерованный список')}
            onMouseLeave={() => setHoveredTool(null)}
            className="p-2.5 rounded-xl text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800/80 transition-all active:scale-90"
            title="Нумерованный список"
          >
            <ListOrdered className="w-4 h-4" />
          </button>

          <div className="w-6 h-px bg-zinc-800 my-0.5" />

          {/* Undo / Redo */}
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              applyUndo();
            }}
            onMouseEnter={() => setHoveredTool('Отменить (Cmd+Z)')}
            onMouseLeave={() => setHoveredTool(null)}
            className="p-2.5 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 transition-all active:scale-90"
            title="Отменить"
          >
            <Undo2 className="w-4 h-4" />
          </button>

          <button
            onMouseDown={(e) => {
              e.preventDefault();
              applyRedo();
            }}
            onMouseEnter={() => setHoveredTool('Повторить (Cmd+Shift+Z)')}
            onMouseLeave={() => setHoveredTool(null)}
            className="p-2.5 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 transition-all active:scale-90"
            title="Повторить"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </aside>
      </div>

      {/* Pacing Calibration Modal */}
      {isPacingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-zinc-950 border border-zinc-800 p-6 sm:p-7 shadow-2xl relative">
            <button
              onClick={() => setIsPacingModalOpen(false)}
              className="absolute right-5 top-5 p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Sliders className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-100">Калибровка хронометража речи</h3>
                <p className="text-xs text-zinc-400">Настройте темп чтения и сценический коэффициент</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* WPM Slider */}
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold text-zinc-300">Базовая скорость чтения текста</span>
                  <span className="text-sm font-mono font-bold text-amber-400">{wpm} слов / мин</span>
                </div>
                <input
                  type="range"
                  min={80}
                  max={170}
                  step={5}
                  value={wpm}
                  onChange={(e) => savePacingCalibration(Number(e.target.value), expansionFactor)}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
                  <span>80 (Размеренно)</span>
                  <span>115 (Стандарт пастора)</span>
                  <span>170 (Быстро)</span>
                </div>
              </div>

              {/* Expansion Factor Slider */}
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold text-zinc-300">Коэффициент сценического раскрытия</span>
                  <span className="text-sm font-mono font-bold text-amber-400">{expansionFactor.toFixed(2)}x</span>
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
                <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
                  <span>1.0x (Чтение слово в слово)</span>
                  <span>2.05x (Живая проповедь)</span>
                  <span>3.0x (Свободный конспект)</span>
                </div>
              </div>

              {/* Reset to Defaults */}
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => savePacingCalibration(115, 2.05)}
                  className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-amber-400 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Сбросить к стандарту (115 сл/мин, 2.05x)</span>
                </button>
                <button
                  onClick={() => setIsPacingModalOpen(false)}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-colors"
                >
                  Готово
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
