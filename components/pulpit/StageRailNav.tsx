'use client';

import React, { useState } from 'react';
import { Flag, Bookmark, ChevronRight, Compass } from 'lucide-react';
import { OutlineItem, ThemeMode } from '@/lib/types';

interface StageRailNavProps {
  outline: OutlineItem[];
  activeId: string | null;
  onSelectSection: (id: string) => void;
  theme: ThemeMode;
}

export function StageRailNav({
  outline,
  activeId,
  onSelectSection,
  theme,
}: StageRailNavProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (outline.length <= 1) return null;

  const getThemeClasses = () => {
    switch (theme) {
      case 'oled':
        return {
          rail: 'bg-zinc-950/40 hover:bg-zinc-950/80 border-zinc-800/60 hover:border-zinc-700 text-zinc-300',
          item: 'bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 border-zinc-800',
          activeItem: 'bg-amber-500 text-black border-amber-400 font-black shadow-[0_0_15px_rgba(245,158,11,0.5)] scale-110',
          tooltip: 'bg-zinc-900/95 text-zinc-100 border-zinc-800 shadow-2xl',
        };
      case 'sepia':
        return {
          rail: 'bg-[#fbf0d9]/50 hover:bg-[#fbf0d9]/90 border-[#e4d4b8] text-[#433422]',
          item: 'bg-[#ede0c4] hover:bg-[#dfcfb0] text-[#71593c] hover:text-[#433422] border-[#dfcfb0]',
          activeItem: 'bg-[#8c5218] text-[#fbf0d9] border-[#683b0e] font-black shadow-[0_0_15px_rgba(140,82,24,0.3)] scale-110',
          tooltip: 'bg-[#f3e5c8]/95 text-[#433422] border-[#dfcfb0] shadow-2xl',
        };
      case 'light':
      default:
        return {
          rail: 'bg-white/50 hover:bg-white/90 border-zinc-200 text-zinc-700',
          item: 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 border-zinc-200',
          activeItem: 'bg-blue-600 text-white border-blue-500 font-black shadow-[0_0_15px_rgba(37,99,235,0.4)] scale-110',
          tooltip: 'bg-white/95 text-zinc-900 border-zinc-200 shadow-2xl',
        };
    }
  };

  const themeStyles = getThemeClasses();

  return (
    <aside className="fixed right-3 sm:right-5 top-1/2 -translate-y-1/2 z-30 select-none">
      <nav
        aria-label="Навигация по разделам проповеди"
        className={`flex flex-col items-center gap-2 p-1.5 sm:p-2 rounded-full border backdrop-blur-md transition-all duration-300 shadow-xl opacity-60 hover:opacity-100 ${themeStyles.rail}`}
      >
        {outline.map((item, index) => {
          const isActive = activeId === item.id;
          const titleLower = item.title.toLowerCase();
          const isIntro = index === 0 && (item.title.includes('🧭') || titleLower.includes('введение') || titleLower.includes('вступление'));
          const isLast = index === outline.length - 1;
          const isConclusion =
            item.title.includes('🏁') ||
            titleLower.includes('заключ') ||
            titleLower.includes('призыв') ||
            titleLower.includes('молитв') ||
            (isLast && index > 1);

          return (
            <div key={item.id} className="relative flex items-center">
              {/* Tooltip on hover/focus */}
              {hoveredId === item.id && (
                <div
                  className={`absolute right-full mr-3 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border backdrop-blur-xl animate-in fade-in slide-in-from-right-2 duration-150 pointer-events-none z-40 max-w-xs truncate ${themeStyles.tooltip}`}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{item.title}</span>
                    {item.targetMinute !== undefined && (
                      <span className="text-[10px] font-mono opacity-70 border-l border-zinc-500/30 pl-1.5 ml-0.5 text-amber-400">
                        ~{item.targetMinute} мин
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Number/Compass/Flag Button */}
              <button
                onClick={() => onSelectSection(item.id)}
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId(null)}
                className={`flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full text-xs font-bold border transition-all duration-200 ${
                  isActive ? themeStyles.activeItem : themeStyles.item
                }`}
                title={item.title}
              >
                {isIntro ? (
                  <Compass className="w-3.5 h-3.5" />
                ) : isConclusion ? (
                  <Flag className="w-3.5 h-3.5 fill-current" />
                ) : (
                  <span>{isIntro ? '🧭' : index}</span>
                )}
              </button>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
