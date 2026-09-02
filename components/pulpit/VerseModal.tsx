'use client';

import React, { useState } from 'react';
import { X, BookOpen, Layers, Check, Copy, ExternalLink } from 'lucide-react';
import { VerseData, ThemeMode } from '@/lib/types';

interface VerseModalProps {
  verseData: VerseData | null;
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeMode;
}

export function VerseModal({ verseData, isOpen, onClose, theme }: VerseModalProps) {
  const [selectedTranslation, setSelectedTranslation] = useState<'synodal' | 'rbo' | 'nrt' | 'esv'>('synodal');
  const [showComparison, setShowComparison] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !verseData) return null;

  const getThemeClasses = () => {
    switch (theme) {
      case 'oled':
        return {
          bg: 'bg-black/95 text-zinc-100 border-zinc-800',
          card: 'bg-zinc-900/90 border-zinc-800',
          accent: 'text-amber-400 bg-amber-400/10 border-amber-500/30',
          activeTab: 'bg-amber-400/20 text-amber-300 border-amber-500/40 font-bold',
          tab: 'bg-zinc-900 text-zinc-400 hover:text-zinc-200',
        };
      case 'sepia':
        return {
          bg: 'bg-[#fbf0d9]/95 text-[#433422] border-[#e4d4b8]',
          card: 'bg-[#f3e5c8] border-[#dfcfb0]',
          accent: 'text-[#8c5218] bg-[#8c5218]/10 border-[#8c5218]/30',
          activeTab: 'bg-[#8c5218]/20 text-[#683b0e] border-[#8c5218]/40 font-bold',
          tab: 'bg-[#ede0c4] text-[#71593c] hover:text-[#433422]',
        };
      case 'light':
      default:
        return {
          bg: 'bg-white/95 text-zinc-900 border-zinc-200',
          card: 'bg-zinc-50 border-zinc-200',
          accent: 'text-blue-600 bg-blue-50 border-blue-200',
          activeTab: 'bg-blue-100 text-blue-800 border-blue-300 font-bold',
          tab: 'bg-zinc-100 text-zinc-600 hover:text-zinc-900',
        };
    }
  };

  const themeStyles = getThemeClasses();

  const handleCopy = () => {
    const translationName =
      selectedTranslation === 'synodal'
        ? 'Синодальный перевод'
        : selectedTranslation === 'rbo'
        ? 'РБО «Радостная Весть»'
        : selectedTranslation === 'nrt'
        ? 'Новый русский перевод'
        : 'Английский (ESV)';

    const textToCopy = `${verseData.reference} (${translationName}):\n${
      verseData.translations[selectedTranslation] || verseData.translations.synodal
    }`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className={`w-full sm:max-w-2xl max-h-[85vh] flex flex-col rounded-t-3xl sm:rounded-2xl border shadow-2xl overflow-hidden ${themeStyles.bg}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-inherit">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${themeStyles.accent}`}>
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight">
                {verseData.reference}
              </h3>
              <p className="text-xs sm:text-sm opacity-60">
                {verseData.book}, Глава {verseData.chapter}, Стих {verseData.verses}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowComparison(!showComparison)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                showComparison ? themeStyles.activeTab : themeStyles.tab
              }`}
              title="Сравнение параллельных переводов"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{showComparison ? 'Один перевод' : 'Сравнить'}</span>
            </button>

            <button
              onClick={handleCopy}
              className={`p-2 rounded-lg border transition-all ${themeStyles.tab}`}
              title="Скопировать текст стиха"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className={`p-2 rounded-lg border transition-all ${themeStyles.tab}`}
              title="Закрыть"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Translation Selector Tabs */}
        {!showComparison && (
          <div className="flex items-center gap-2 px-6 pt-4 overflow-x-auto no-scrollbar">
            {[
              { id: 'synodal', label: 'Синодальный (RST)' },
              { id: 'rbo', label: 'РБО «Радостная Весть»' },
              { id: 'nrt', label: 'Новый русский (NRT)' },
              { id: 'esv', label: 'Английский (ESV)' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTranslation(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border transition-all ${
                  selectedTranslation === tab.id ? themeStyles.activeTab : themeStyles.tab
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Verse Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 max-h-[60vh]">
          {showComparison ? (
            <div className="space-y-4">
              <div className={`p-4 rounded-xl border ${themeStyles.card}`}>
                <div className="flex items-center justify-between text-xs font-bold opacity-60 uppercase mb-2">
                  <span>Синодальный перевод</span>
                </div>
                <p className="text-lg sm:text-xl leading-relaxed font-serif">
                  {verseData.translations.synodal}
                </p>
              </div>

              {verseData.translations.rbo && (
                <div className={`p-4 rounded-xl border ${themeStyles.card}`}>
                  <div className="flex items-center justify-between text-xs font-bold opacity-60 uppercase mb-2">
                    <span>Российское Библейское Общество (РБО)</span>
                  </div>
                  <p className="text-lg sm:text-xl leading-relaxed font-serif">
                    {verseData.translations.rbo}
                  </p>
                </div>
              )}

              {verseData.translations.nrt && (
                <div className={`p-4 rounded-xl border ${themeStyles.card}`}>
                  <div className="flex items-center justify-between text-xs font-bold opacity-60 uppercase mb-2">
                    <span>Новый русский перевод (NRT)</span>
                  </div>
                  <p className="text-lg sm:text-xl leading-relaxed font-serif">
                    {verseData.translations.nrt}
                  </p>
                </div>
              )}

              {verseData.translations.esv && (
                <div className={`p-4 rounded-xl border ${themeStyles.card}`}>
                  <div className="flex items-center justify-between text-xs font-bold opacity-60 uppercase mb-2">
                    <span>Английский перевод (ESV)</span>
                  </div>
                  <p className="text-lg sm:text-xl leading-relaxed font-serif">
                    {verseData.translations.esv}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className={`p-5 sm:p-6 rounded-2xl border ${themeStyles.card}`}>
              <p className="text-xl sm:text-2xl lg:text-3xl leading-relaxed font-serif tracking-wide">
                {verseData.translations[selectedTranslation] || verseData.translations.synodal}
              </p>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 border-t border-inherit text-xs opacity-50 flex items-center justify-between">
          <span>Священное Писание • Оффлайн база переводов</span>
          <span className="text-[10px]">Тапните в любом месте для закрытия</span>
        </div>
      </div>
    </div>
  );
}
