'use client';

import React, { useState } from 'react';
import { Play, Pause, RotateCcw, Plus, Minus, Clock } from 'lucide-react';
import { StageLightState, StageTimerStatus, ThemeMode } from '@/lib/types';

interface StageTimerProps {
  status: StageTimerStatus;
  elapsedSeconds?: number;
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
  elapsedSeconds = 0,
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

  const isRunning = status === 'running';
  const isMicro = isRunning && !isExpanded;

  const totalSeconds = targetMinutes * 60;
  const progressRatio = Math.min(1, Math.max(0, elapsedSeconds / (totalSeconds || 1)));
  const progressPercent = (progressRatio * 100).toFixed(1);

  const getProgressLineStyles = () => {
    switch (lightState) {
      case 'overtime':
        return 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.9)] animate-pulse';
      case 'danger':
        return 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]';
      case 'warning':
        return 'bg-yellow-400 shadow-[0_0_6px_rgba(234,179,8,0.7)]';
      case 'normal':
      default:
        return 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]';
    }
  };

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
    <>
      {/* 1. Ultra-slim top progress bar (2.5px) along the very top edge */}
      <div className="fixed top-0 left-0 right-0 z-40 h-[2.5px] bg-zinc-800/15 pointer-events-none">
        <div
          className={`h-full transition-all duration-500 ease-linear ${getProgressLineStyles()}`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* 2. Main Floating Capsule / Micro-indicator */}
      <div className="fixed top-6 sm:top-8 left-3 sm:left-4 z-30 flex flex-col items-start select-none">
        <div
          className={`group flex items-center transition-all duration-300 shadow-lg cursor-pointer ${
            isMicro
              ? `gap-1.5 pl-1.5 pr-2.5 py-0.5 rounded-full border backdrop-blur-sm opacity-35 hover:opacity-100 ${
                  lightState === 'overtime' || lightState === 'danger'
                    ? 'opacity-85 ' + light.pill
                    : light.pill
                }`
              : `gap-2 pl-2 pr-3.5 py-1 sm:pl-2.5 sm:pr-4 sm:py-1.5 rounded-full border backdrop-blur-md ${
                  light.pill
                } ${isExpanded ? 'opacity-100 shadow-2xl' : 'opacity-70 hover:opacity-100'}`
          }`}
          onClick={() => setIsExpanded(!isExpanded)}
          title={isMicro ? 'Нажмите для открытия настроек таймера' : 'Нажмите для настройки регламента'}
        >
          {/* Play/Pause Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className={`flex items-center justify-center rounded-full transition-all ${
              isMicro ? 'w-5 h-5' : 'w-7 h-7'
            } ${
              status === 'running'
                ? 'bg-amber-500/80 hover:bg-amber-400 text-black'
                : 'bg-emerald-500/80 hover:bg-emerald-400 text-black'
            }`}
            title={status === 'running' ? 'Пауза' : 'Старт'}
          >
            {status === 'running' ? (
              <Pause className={isMicro ? 'w-2.5 h-2.5 fill-current' : 'w-3.5 h-3.5 fill-current'} />
            ) : (
              <Play className={isMicro ? 'w-2.5 h-2.5 fill-current ml-0.5' : 'w-3.5 h-3.5 fill-current ml-0.5'} />
            )}
          </button>

          {/* Digits */}
          <span
            className={`font-mono font-black tracking-tight transition-all ${
              isMicro ? 'text-xs' : 'text-lg'
            } ${light.text}`}
          >
            {remainingFormatted}
          </span>
        </div>

      {/* Expanded Quick Settings Popover */}
      {isExpanded && (
        <div
          className={`mt-2 p-3.5 rounded-2xl border backdrop-blur-xl shadow-2xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-150 min-w-[220px] ${
            theme === 'oled'
              ? 'bg-zinc-950/95 border-zinc-800 text-zinc-100'
              : theme === 'sepia'
              ? 'bg-[#fbf0d9]/95 border-[#dfcfb0] text-[#433422]'
              : 'bg-white/95 border-zinc-200 text-zinc-900'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between text-xs pb-2 border-b border-inherit font-medium">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span className="opacity-70">Регламент:</span>
              <div className="flex items-center gap-1 font-mono font-bold px-1.5 py-0.5 rounded-lg border border-zinc-700/60 bg-zinc-800/60">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddMinutes(-1);
                  }}
                  className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/20 active:scale-90 opacity-75 hover:opacity-100 transition-all cursor-pointer"
                  title="-1 минута"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-amber-400 min-w-[28px] text-center">{targetMinutes}м</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddMinutes(1);
                  }}
                  className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/20 active:scale-90 opacity-75 hover:opacity-100 transition-all cursor-pointer"
                  title="+1 минута"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
            <span className="opacity-70">Прошло: {elapsedFormatted}</span>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            <button
              onClick={() => onAddMinutes(-1)}
              className="flex items-center justify-center gap-0.5 px-2 py-1.5 rounded-xl text-xs font-semibold bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 transition-all border border-zinc-700/60 cursor-pointer"
              title="Отнять 1 минуту (-1 мин)"
            >
              <Minus className="w-3 h-3" />
              <span>1м</span>
            </button>

            <button
              onClick={() => onAddMinutes(1)}
              className="flex items-center justify-center gap-0.5 px-2 py-1.5 rounded-xl text-xs font-semibold bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 transition-all border border-zinc-700/60 cursor-pointer"
              title="Добавить 1 минуту (+1 мин)"
            >
              <Plus className="w-3 h-3" />
              <span>1м</span>
            </button>

            <button
              onClick={() => onAddMinutes(5)}
              className="flex items-center justify-center gap-0.5 px-2 py-1.5 rounded-xl text-xs font-semibold bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 transition-all border border-zinc-700/60 cursor-pointer"
              title="Добавить 5 минут (+5 мин)"
            >
              <Plus className="w-3 h-3" />
              <span>5м</span>
            </button>

            <button
              onClick={onReset}
              className="flex items-center justify-center px-2 py-1.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-all border border-zinc-700/40 cursor-pointer"
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
  </>
);
}
