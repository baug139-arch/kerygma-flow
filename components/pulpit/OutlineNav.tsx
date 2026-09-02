'use client';

import React from 'react';
import { List, X, ChevronRight, Bookmark } from 'lucide-react';
import { OutlineItem, ThemeMode } from '@/lib/types';

interface OutlineNavProps {
  isOpen: boolean;
  onClose: () => void;
  outline: OutlineItem[];
  activeId: string | null;
  onSelectSection: (id: string) => void;
  theme: ThemeMode;
}

export function OutlineNav({
  isOpen,
  onClose,
  outline,
  activeId,
  onSelectSection,
  theme,
}: OutlineNavProps) {
  if (!isOpen) return null;

  const getThemeClasses = () => {
    switch (theme) {
      case 'oled':
        return {
          drawer: 'bg-zinc-950/95 text-zinc-100 border-zinc-800',
          activeItem: 'bg-amber-500/20 text-amber-300 border-l-4 border-amber-500 font-semibold',
          item: 'hover:bg-zinc-900 text-zinc-300',
          badge: 'bg-zinc-900 text-zinc-400',
        };
      case 'sepia':
        return {
          drawer: 'bg-[#fbf0d9]/95 text-[#433422] border-[#e4d4b8]',
          activeItem: 'bg-[#8c5218]/20 text-[#683b0e] border-l-4 border-[#8c5218] font-semibold',
          item: 'hover:bg-[#ede0c4] text-[#433422]',
          badge: 'bg-[#ede0c4] text-[#71593c]',
        };
      case 'light':
      default:
        return {
          drawer: 'bg-white/95 text-zinc-900 border-zinc-200',
          activeItem: 'bg-blue-50 text-blue-700 border-l-4 border-blue-600 font-semibold',
          item: 'hover:bg-zinc-100 text-zinc-700',
          badge: 'bg-zinc-100 text-zinc-500',
        };
    }
  };

  const themeStyles = getThemeClasses();

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className={`w-full max-w-sm h-full flex flex-col border-l shadow-2xl backdrop-blur-md p-6 overflow-hidden ${themeStyles.drawer}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-inherit">
          <div className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-bold">План проповеди</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg opacity-70 hover:opacity-100 transition-opacity"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-2">
          {outline.length === 0 ? (
            <p className="text-sm opacity-50 py-8 text-center">
              Заголовки H1/H2 не обнаружены в конспекте
            </p>
          ) : (
            outline.map((item, index) => {
              const isActive = activeId === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectSection(item.id);
                    onClose();
                  }}
                  className={`w-full text-left p-3.5 rounded-xl transition-all flex items-center justify-between text-sm ${
                    isActive ? themeStyles.activeItem : themeStyles.item
                  } ${item.level === 2 ? 'pl-6' : item.level === 3 ? 'pl-9' : ''}`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className={`text-xs px-2 py-0.5 rounded ${themeStyles.badge}`}>
                      {index + 1}
                    </span>
                    <span className="truncate">{item.title}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-40 shrink-0 ml-2" />
                </button>
              );
            })
          )}
        </div>

        <div className="pt-4 border-t border-inherit text-xs opacity-50 text-center">
          Нажмите на пункт для мгновенного перехода
        </div>
      </div>
    </div>
  );
}
