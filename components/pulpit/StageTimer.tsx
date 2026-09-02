'use client';

import React, { useState } from 'react';
import { Play, Pause, RotateCcw, Plus, Clock, ChevronDown, Sparkles } from 'lucide-react';
import { StageLightState, StageTimerStatus, ThemeMode } from '@/lib/types';

interface StageTimerProps {
  status: StageTimerStatus;
  elapsedFormatted: string;
  remainingFormatted: string;
  lightState: StageLightState;
  targetMinutes: number;
  wordCount: number;
  theme: ThemeMode;
  onToggle: () => void;
  onReset: () => void;
  onAddMinutes: (mins: number) => void;
}

export function StageTimer({
  status,
  elapsedFormatted,
  remainingFormatted,
  lightState,
  targetMinutes,
  wordCount,
  theme,
  onToggle,
  onReset,
  onAddMinutes,
}: StageTimerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const estWpm = Math.round(wordCount / targetMinutes);

  // Status dot & border styles based on lightState
  const getLightStyles = () => {
    switch (lightState) {
      case 'overtime':
        return {
          pill: 'bg-red-950/60 border-red-500/80 text-red-300 shadow-[0_0_20px_rgba(239,68,68,0.5)] opacity-95',
          dot: 'bg-red-500 animate-ping',
          solidDot: 'bg-red-500',
          text: 'text-red-400 font-bold',
        };
      case 'danger':
        return {
          pill: 'bg-orange-950/50 border-orange-500/70 text-orange-200 shadow-[0_0_15px_rgba(249,115,22,0.4)] opacity-90',
          dot: 'bg-orange-500 animate-pulse',
          solidDot: 'bg-orange-500',
          text: 'text-orange-300 font-bold',
        };
      case 'warning':
        return {
          pill: 'bg-yellow-950/40 border-yellow-500/60 text-yellow-200 shadow-[0_0_12px_rgba(234,179,8,0.3)] opacity-85',
          dot: 'bg-yellow-400',
          solidDot: 'bg-yellow-400',
          text: 'text-yellow-300 font-bold',
        };
      case 'normal':
      default:
        return {
          pill:
            theme === 'oled'
              ? 'bg-zinc-950/40 hover:bg-zinc-900/80 border-zinc-800/60 hover:border-zinc-700 text-zinc-100'
              : theme === 'sepia'
              ? 'bg-[#fbf0d9]/60 hover:bg-[#fbf0d9]/95 border-[#dfcfb0] text-[#433422]'
              : 'bg-white/60 hover:bg-white/95 border-zinc-200 text-zinc-900',
          dot: 'bg-emerald-400',
          solidDot: 'bg-emerald-400',
          text: '',
        };
    }
  };

  const light = getLightStyles();

  return (
    <div className="fixed top-5 left-5 z-30 flex flex-col items-start select-none">
      {/* Main Mini Floating Pill */}
      <div
        className={`group flex items-center gap-2.5 px-3.5 py-2 rounded-full border backdrop-blur-md transition-all duration-300 shadow-lg cursor-pointer ${
          light.pill
        } ${isExpanded ? 'opacity-100 shadow-2xl' : 'opacity-60 hover:opacity-100'}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Play/Pause Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className={`flex items-center justify-center w-7 h-7 rounded-full transition-all ${
            status === 'running'
              ? 'bg-amber-500/80 hover:bg-amber-400 text-black'
              : 'bg-emerald-500/80 hover:bg-emerald-400 text-black'
          }`}
          title={status === 'running' ? 'Пауза' : 'Старт'}
        >
          {status === 'running' ? (
            <Pause className="w-3.5 h-3.5 fill-current" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
          )}
        </button>

        {/* Digits */}
        <span className={`font-mono text-lg font-black tracking-tight ${light.text}`}>
          {remainingFormatted}
        </span>

        {/* Status Dot */}
        <div className="relative flex items-center justify-center w-2.5 h-2.5 ml-0.5">
          <span className={`absolute w-full h-full rounded-full opacity-75 ${light.dot}`} />
          <span className={`relative w-2 h-2 rounded-full ${light.solidDot}`} />
        </div>

        {/* Small expand arrow */}
        <ChevronDown
          className={`w-3.5 h-3.5 opacity-40 group-hover:opacity-100 transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </div>

      {/* Expanded Quick Settings Popover */}
      {isExpanded && (
        <div
          className={`mt-2 p-3.5 rounded-2xl border backdrop-blur-xl shadow-2xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-150 min-w-[210px] ${
            theme === 'oled'
              ? 'bg-zinc-950/95 border-zinc-800 text-zinc-100'
              : theme === 'sepia'
              ? 'bg-[#fbf0d9]/95 border-[#dfcfb0] text-[#433422]'
              : 'bg-white/95 border-zinc-200 text-zinc-900'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between text-xs opacity-70 pb-2 border-b border-inherit font-medium">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>Регламент: {targetMinutes}м</span>
            </div>
            <span>Прошло: {elapsedFormatted}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onAddMinutes(2)}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 transition-all border border-zinc-700"
              title="Добавить 2 минуты"
            >
              <Plus className="w-3 h-3" />
              <span>+2 мин</span>
            </button>

            <button
              onClick={onReset}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-all border border-transparent hover:border-zinc-700"
              title="Сбросить таймер"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="text-[11px] opacity-50 text-center font-mono">
            Темп: ~{estWpm} слов/мин
          </div>
        </div>
      )}
    </div>
  );
}
