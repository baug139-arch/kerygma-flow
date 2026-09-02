'use client';

import React, { useState, useEffect } from 'react';
import {
  Type,
  Sun,
  Moon,
  Coffee,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  FastForward,
  Rewind,
  List,
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { ThemeMode } from '@/lib/types';

interface PulpitControlsProps {
  fontSize: number;
  onIncreaseFont: () => void;
  onDecreaseFont: () => void;
  theme: ThemeMode;
  onSetTheme: (theme: ThemeMode) => void;
  isAutoscrolling: boolean;
  autoscrollSpeed: number;
  onToggleAutoscroll: () => void;
  onIncreaseSpeed: () => void;
  onDecreaseSpeed: () => void;
  isWakeLockActive: boolean;
  onToggleOutline: () => void;
  onExit: () => void;
}

export function PulpitControls({
  fontSize,
  onIncreaseFont,
  onDecreaseFont,
  theme,
  onSetTheme,
  isAutoscrolling,
  autoscrollSpeed,
  onToggleAutoscroll,
  onIncreaseSpeed,
  onDecreaseSpeed,
  isWakeLockActive,
  onToggleOutline,
  onExit,
}: PulpitControlsProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isOpen, setIsOpen] = useState(false); // Hidden by default

  // Listen for keyboard shortcut 'm' or 's' to toggle controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'm' || e.key === 'M' || e.key === 'ь' || e.key === 'Ь') && !e.metaKey && !e.ctrlKey) {
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const getThemeClasses = () => {
    switch (theme) {
      case 'oled':
        return 'bg-zinc-950/95 border-zinc-800 text-zinc-100 shadow-[0_10px_40px_rgba(0,0,0,0.9)]';
      case 'sepia':
        return 'bg-[#fbf0d9]/95 border-[#e4d4b8] text-[#433422] shadow-[0_10px_40px_rgba(100,50,0,0.2)]';
      case 'light':
      default:
        return 'bg-white/95 border-zinc-200 text-zinc-900 shadow-[0_10px_40px_rgba(0,0,0,0.15)]';
    }
  };

  return (
    <>
      {/* Dimmed backdrop when controls are open so tapping text closes the panel */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-20 bg-black/20 transition-opacity animate-in fade-in"
        />
      )}

      {/* Persistent Bottom Pill / Pull-Tab Handle (Method 1) */}
      {!isOpen && (
        <div className="fixed bottom-2 left-1/2 -translate-x-1/2 z-30 select-none">
          <button
            onClick={() => setIsOpen(true)}
            className="group flex flex-col items-center gap-1 px-8 py-2.5 rounded-full hover:bg-zinc-800/30 transition-all focus:outline-none"
            title="Открыть панель управления (или клавиша M)"
          >
            {/* iOS style home bar indicator */}
            <div className="w-24 sm:w-32 h-1.5 rounded-full bg-zinc-600/40 group-hover:bg-amber-400/80 transition-all shadow-sm group-hover:h-2" />
            <span className="text-[10px] text-zinc-500 group-hover:text-amber-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity tracking-wider uppercase">
              Настройки
            </span>
          </button>
        </div>
      )}

      {/* Main Sliding Pulpit Controls HUD */}
      <div
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 rounded-2xl border backdrop-blur-xl transition-all duration-300 max-w-[95vw] overflow-x-auto no-scrollbar ${
          isOpen
            ? 'translate-y-0 opacity-100 pointer-events-auto shadow-2xl scale-100'
            : 'translate-y-28 opacity-0 pointer-events-none scale-95'
        }`}
      >
        <div className={`flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-xl border ${getThemeClasses()}`}>
          {/* Back button */}
          <button
            onClick={onExit}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg opacity-80 hover:opacity-100 hover:bg-zinc-800/40 text-xs font-semibold transition-all"
            title="Вернуться к списку конспектов"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden md:inline">В меню</span>
          </button>

          <div className="h-5 w-px bg-zinc-700/40 mx-1" />

          {/* Outline trigger */}
          <button
            onClick={onToggleOutline}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg opacity-80 hover:opacity-100 hover:bg-zinc-800/40 text-xs font-semibold transition-all"
            title="План выступления"
          >
            <List className="w-4 h-4 text-amber-400" />
            <span>План</span>
          </button>

          <div className="h-5 w-px bg-zinc-700/40 mx-1" />

          {/* Font size adjustments */}
          <div className="flex items-center gap-1 bg-zinc-800/30 px-2 py-1 rounded-xl">
            <span className="text-[11px] text-zinc-400 font-medium hidden sm:inline mr-1">Шрифт:</span>
            <button
              onClick={onDecreaseFont}
              disabled={fontSize <= 20}
              className="px-1.5 py-0.5 rounded-md opacity-80 hover:opacity-100 hover:bg-zinc-700/50 disabled:opacity-30 transition-all font-bold text-xs"
              title="Уменьшить шрифт"
            >
              A−
            </button>
            <span className="text-xs font-mono font-bold opacity-80 px-1">
              {fontSize}px
            </span>
            <button
              onClick={onIncreaseFont}
              disabled={fontSize >= 56}
              className="px-1.5 py-0.5 rounded-md opacity-80 hover:opacity-100 hover:bg-zinc-700/50 disabled:opacity-30 transition-all font-bold text-xs"
              title="Увеличить шрифт"
            >
              A+
            </button>
          </div>

          <div className="h-5 w-px bg-zinc-700/40 mx-1" />

          {/* Autoscroll controls */}
          <div className="flex items-center gap-1 bg-zinc-800/30 px-2 py-1 rounded-xl">
            <span className="text-[11px] text-zinc-400 font-medium hidden sm:inline mr-1">Скролл:</span>
            <button
              onClick={onDecreaseSpeed}
              disabled={autoscrollSpeed <= 1}
              className="p-1 rounded opacity-70 hover:opacity-100 disabled:opacity-20"
              title="Замедлить"
            >
              <Rewind className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onToggleAutoscroll}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                isAutoscrolling
                  ? 'bg-amber-500 text-black shadow-md'
                  : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
              }`}
              title="Автопрокрутка (Пробел)"
            >
              {isAutoscrolling ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isAutoscrolling ? 'Пауза' : 'Пуск'}</span>
              <span className="font-mono text-[10px] opacity-70 ml-0.5">({autoscrollSpeed})</span>
            </button>

            <button
              onClick={onIncreaseSpeed}
              disabled={autoscrollSpeed >= 10}
              className="p-1 rounded opacity-70 hover:opacity-100 disabled:opacity-20"
              title="Ускорить"
            >
              <FastForward className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-5 w-px bg-zinc-700/40 mx-1" />

          {/* Theme mode selector */}
          <div className="flex items-center gap-1 bg-zinc-800/30 px-1.5 py-1 rounded-xl">
            <button
              onClick={() => onSetTheme('oled')}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                theme === 'oled' ? 'bg-amber-500/20 text-amber-400 font-bold' : 'opacity-50 hover:opacity-100'
              }`}
              title="Темная сцена"
            >
              <Moon className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Сцена</span>
            </button>
            <button
              onClick={() => onSetTheme('sepia')}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                theme === 'sepia' ? 'bg-[#8c5218]/20 text-[#8c5218] font-bold' : 'opacity-50 hover:opacity-100'
              }`}
              title="Теплая сепия"
            >
              <Coffee className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Сепия</span>
            </button>
            <button
              onClick={() => onSetTheme('light')}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                theme === 'light' ? 'bg-blue-100 text-blue-800 font-bold' : 'opacity-50 hover:opacity-100'
              }`}
              title="Светлый зал"
            >
              <Sun className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Светлая</span>
            </button>
          </div>

          <div className="h-5 w-px bg-zinc-700/40 mx-1" />

          {/* WakeLock indicator */}
          <div
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs opacity-80"
            title={isWakeLockActive ? 'Экран не гаснет' : 'Сон'}
          >
            {isWakeLockActive ? (
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-zinc-500" />
            )}
          </div>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg opacity-70 hover:opacity-100 hover:bg-zinc-800/40 text-xs font-medium transition-all hidden sm:flex"
            title="Во весь экран"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <div className="h-5 w-px bg-zinc-700/40 mx-1" />

          {/* Close/Hide Button */}
          <button
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-zinc-800/50 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 text-xs font-semibold transition-all"
            title="Скрыть панель"
          >
            <ChevronDown className="w-4 h-4" />
            <span>Скрыть</span>
          </button>
        </div>
      </div>
    </>
  );
}
