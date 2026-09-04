'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Flag, Compass } from 'lucide-react';
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
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const activeSlideIdRef = useRef<string | null>(null);

  const hideTooltip = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setHoveredId(null);
  }, []);

  const showTooltip = useCallback((id: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setHoveredId(id);
    // Auto-hide tooltip after 1.2s so it doesn't hang ("не висит долго")
    timerRef.current = setTimeout(() => {
      setHoveredId(null);
    }, 1200);
  }, []);

  // Track sliding touch gesture across the rail
  const handleTouch = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      if (!touch || !outline.length) return;

      const clientY = touch.clientY;
      let closestId: string | null = null;
      let closestDist = Infinity;

      for (const item of outline) {
        const btn = itemRefs.current.get(item.id);
        if (btn) {
          const rect = btn.getBoundingClientRect();
          const centerY = rect.top + rect.height / 2;
          const dist = Math.abs(clientY - centerY);
          if (dist < closestDist) {
            closestDist = dist;
            closestId = item.id;
          }
        }
      }

      if (closestId && closestId !== activeSlideIdRef.current) {
        activeSlideIdRef.current = closestId;
        setHoveredId(closestId);
        onSelectSection(closestId);

        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate?.(8);
          } catch {}
        }
      }
    },
    [outline, onSelectSection]
  );

  const handleTouchEnd = useCallback(() => {
    activeSlideIdRef.current = null;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setHoveredId(null);
    }, 400);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (outline.length <= 1) return null;

  const getThemeClasses = () => {
    switch (theme) {
      case 'oled':
        return {
          rail: 'bg-zinc-950/20 hover:bg-zinc-950/80 border-zinc-800/30 hover:border-zinc-700/60 text-zinc-400',
          item: 'bg-zinc-900/30 hover:bg-zinc-800/80 text-zinc-500 hover:text-zinc-200 border-zinc-800/30',
          activeItem: 'bg-amber-500/90 text-black border-amber-400 font-black shadow-[0_0_12px_rgba(245,158,11,0.4)] scale-105',
          tooltip: 'bg-zinc-900/95 text-zinc-100 border-zinc-800 shadow-2xl',
        };
      case 'sepia':
        return {
          rail: 'bg-[#fbf0d9]/20 hover:bg-[#fbf0d9]/80 border-[#e4d4b8]/30 text-[#433422]',
          item: 'bg-[#ede0c4]/30 hover:bg-[#dfcfb0]/80 text-[#71593c]/60 hover:text-[#433422] border-[#dfcfb0]/30',
          activeItem: 'bg-[#8c5218]/90 text-[#fbf0d9] border-[#683b0e] font-black shadow-[0_0_12px_rgba(140,82,24,0.3)] scale-105',
          tooltip: 'bg-[#f3e5c8]/95 text-[#433422] border-[#dfcfb0] shadow-2xl',
        };
      case 'light':
      default:
        return {
          rail: 'bg-white/20 hover:bg-white/85 border-zinc-200/30 text-zinc-700',
          item: 'bg-zinc-100/30 hover:bg-zinc-200/80 text-zinc-400 hover:text-zinc-900 border-zinc-200/30',
          activeItem: 'bg-blue-600/90 text-white border-blue-500 font-black shadow-[0_0_12px_rgba(37,99,235,0.4)] scale-105',
          tooltip: 'bg-white/95 text-zinc-900 border-zinc-200 shadow-2xl',
        };
    }
  };

  const themeStyles = getThemeClasses();

  return (
    <aside className="fixed right-2 sm:right-4 top-1/2 -translate-y-1/2 z-30 select-none">
      <nav
        aria-label="Навигация по разделам проповеди"
        onTouchStart={handleTouch}
        onTouchMove={handleTouch}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className={`flex flex-col items-center gap-1.5 p-1 sm:p-1.5 rounded-full border backdrop-blur-sm transition-all duration-300 shadow-lg opacity-20 hover:opacity-90 touch-none cursor-pointer ${themeStyles.rail}`}
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
              {/* Tooltip on hover/focus - purely section title, NO time badge */}
              {hoveredId === item.id && (
                <div
                  className={`absolute right-full mr-2.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border backdrop-blur-xl animate-in fade-in slide-in-from-right-2 duration-100 pointer-events-none z-40 max-w-xs truncate ${themeStyles.tooltip}`}
                >
                  <span>{item.title}</span>
                </div>
              )}

              {/* Number/Compass/Flag Button */}
              <button
                ref={(el) => {
                  if (el) itemRefs.current.set(item.id, el);
                  else itemRefs.current.delete(item.id);
                }}
                onClick={() => {
                  hideTooltip();
                  onSelectSection(item.id);
                }}
                onMouseEnter={() => showTooltip(item.id)}
                onMouseLeave={hideTooltip}
                className={`flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[11px] font-bold border transition-all duration-200 ${
                  isActive ? themeStyles.activeItem : themeStyles.item
                }`}
                title={item.title}
              >
                {isIntro ? (
                  <Compass className="w-3 h-3" />
                ) : isConclusion ? (
                  <Flag className="w-3 h-3 fill-current" />
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
