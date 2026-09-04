'use client';

import React, { useState } from 'react';
import { Flag, CheckCircle2, Clock, Calendar, MapPin, MessageSquare, X, ArrowLeft } from 'lucide-react';
import { ThemeMode } from '@/lib/types';

interface FinishSermonModalProps {
  isOpen: boolean;
  onClose: () => void; // Return to teleprompter
  onConfirmSave: (deliveryData: {
    venue: string;
    notes: string;
    actualSeconds: number;
  }) => void;
  onExitWithoutSaving: () => void;
  actualDurationSeconds: number;
  targetDurationMinutes: number;
  sermonTitle: string;
  theme: ThemeMode;
}

export function FinishSermonModal({
  isOpen,
  onClose,
  onConfirmSave,
  onExitWithoutSaving,
  actualDurationSeconds,
  targetDurationMinutes,
  sermonTitle,
  theme,
}: FinishSermonModalProps) {
  const [venue, setVenue] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const actualMinutes = Math.floor(actualDurationSeconds / 60);
  const actualRemainingSec = actualDurationSeconds % 60;
  const formattedActual = `${actualMinutes} мин ${actualRemainingSec > 0 ? `${actualRemainingSec} сек` : ''}`;

  const diffMinutes = actualMinutes - targetDurationMinutes;
  const isOvertime = diffMinutes > 0;
  const isUnder = diffMinutes < -2;

  const getThemeStyles = () => {
    switch (theme) {
      case 'sepia':
        return {
          overlay: 'bg-black/60 backdrop-blur-md',
          card: 'bg-[#fbf0d9] border-[#e4d4b8] text-[#433422] shadow-2xl',
          input: 'bg-[#ede0c4] border-[#dfcfb0] text-[#433422] placeholder-[#71593c]/60 focus:border-[#8c5218] focus:ring-[#8c5218]',
          statBox: 'bg-[#ede0c4] border-[#dfcfb0]',
          btnPrimary: 'bg-[#8c5218] hover:bg-[#683b0e] text-[#fbf0d9] shadow-md',
          btnSecondary: 'bg-[#ede0c4] hover:bg-[#dfcfb0] text-[#433422] border-[#dfcfb0]',
          btnGhost: 'text-[#71593c] hover:text-[#433422]',
        };
      case 'light':
        return {
          overlay: 'bg-black/40 backdrop-blur-md',
          card: 'bg-white border-zinc-200 text-zinc-900 shadow-2xl',
          input: 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:ring-blue-500',
          statBox: 'bg-zinc-50 border-zinc-200',
          btnPrimary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-md',
          btnSecondary: 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-200',
          btnGhost: 'text-zinc-500 hover:text-zinc-800',
        };
      case 'oled':
      default:
        return {
          overlay: 'bg-black/80 backdrop-blur-md',
          card: 'bg-zinc-950 border-zinc-800 text-zinc-100 shadow-2xl shadow-amber-500/5',
          input: 'bg-zinc-900 border-zinc-800 text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:ring-amber-500',
          statBox: 'bg-zinc-900/60 border-zinc-800',
          btnPrimary: 'bg-amber-500 hover:bg-amber-400 text-black font-semibold shadow-md',
          btnSecondary: 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800',
          btnGhost: 'text-zinc-500 hover:text-zinc-300',
        };
    }
  };

  const styles = getThemeStyles();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirmSave({
      venue: venue.trim(),
      notes: notes.trim(),
      actualSeconds: actualDurationSeconds,
    });
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 select-none ${styles.overlay} animate-in fade-in duration-200`}>
      <div className={`relative w-full max-w-lg rounded-3xl border p-6 sm:p-8 space-y-6 ${styles.card} animate-in zoom-in-95 duration-200`}>
        {/* Close / Cancel Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-zinc-500/10 transition-colors"
          title="Вернуться к суфлёру"
        >
          <X className="w-5 h-5 opacity-70" />
        </button>

        {/* Header */}
        <div className="space-y-1.5 pr-8">
          <div className="flex items-center gap-2 text-amber-500 text-sm font-semibold tracking-wider uppercase">
            <CheckCircle2 className="w-5 h-5" />
            <span>Проповедь завершена</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight line-clamp-1">
            {sermonTitle}
          </h2>
          <p className="text-xs sm:text-sm opacity-70">
            Зафиксируйте факт произнесения в истории проповеди.
          </p>
        </div>

        {/* Timing Stats Banner */}
        <div className={`grid grid-cols-2 gap-3 p-4 rounded-2xl border ${styles.statBox}`}>
          <div>
            <span className="text-xs opacity-60 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Фактически
            </span>
            <div className="text-lg sm:text-xl font-bold font-mono mt-0.5">
              {formattedActual}
            </div>
            <span className={`text-[11px] font-medium ${isOvertime ? 'text-amber-500' : isUnder ? 'text-cyan-400' : 'text-emerald-500'}`}>
              {isOvertime ? `+${diffMinutes} мин к плану` : isUnder ? `${diffMinutes} мин от плана` : 'ровно по плану'}
            </span>
          </div>

          <div>
            <span className="text-xs opacity-60 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Запланировано
            </span>
            <div className="text-lg sm:text-xl font-bold font-mono mt-0.5">
              {targetDurationMinutes} мин
            </div>
            <span className="text-[11px] opacity-60">
              {new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Form Inputs */}
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold flex items-center gap-1.5 opacity-80">
              <MapPin className="w-3.5 h-3.5" />
              <span>Где произносилась? (опционально)</span>
            </label>
            <input
              type="text"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="Например: Центральная церковь / утреннее служение"
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all outline-none ${styles.input}`}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold flex items-center gap-1.5 opacity-80">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Заметки и впечатления спикера</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Что прошло хорошо? Какой отклик зала? Что изменить в следующий раз?"
              rows={3}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all outline-none resize-none ${styles.input}`}
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <button
              type="button"
              onClick={onExitWithoutSaving}
              className={`w-full sm:w-auto px-4 py-2.5 text-xs font-medium rounded-xl transition-colors ${styles.btnGhost}`}
            >
              Выйти без сохранения
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className={`flex-1 sm:flex-none px-4 py-2.5 text-xs font-semibold rounded-xl border transition-colors ${styles.btnSecondary}`}
              >
                Вернуться
              </button>
              <button
                type="submit"
                className={`flex-1 sm:flex-none px-5 py-2.5 text-xs font-bold rounded-xl transition-all ${styles.btnPrimary}`}
              >
                Сохранить в историю
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
