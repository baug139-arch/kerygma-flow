'use client';

import React, { useState } from 'react';
import { Sermon, SermonDelivery } from '@/lib/types';
import { Calendar, Clock, MapPin, MessageSquare, Plus, Trash2, X, Award, CheckCircle2 } from 'lucide-react';

interface DeliveryHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  sermon: Sermon;
  onUpdateSermon: (updated: Sermon) => void;
}

export function DeliveryHistoryModal({
  isOpen,
  onClose,
  sermon,
  onUpdateSermon,
}: DeliveryHistoryModalProps) {
  const [isAddingManual, setIsAddingManual] = useState(false);
  const [manualDate, setManualDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [manualVenue, setManualVenue] = useState('');
  const [manualMinutes, setManualMinutes] = useState(sermon.targetDurationMinutes || 30);
  const [manualNotes, setManualNotes] = useState('');

  if (!isOpen) return null;

  const deliveries = sermon.deliveries || [];

  const handleAddManual = (e: React.FormEvent) => {
    e.preventDefault();
    const newDelivery: SermonDelivery = {
      id: `del-${Date.now()}`,
      date: manualDate,
      venue: manualVenue.trim(),
      actualDurationSeconds: manualMinutes * 60,
      targetDurationMinutes: sermon.targetDurationMinutes || 30,
      notes: manualNotes.trim(),
      createdAt: new Date().toISOString(),
    };

    const updatedDeliveries = [newDelivery, ...deliveries];
    onUpdateSermon({
      ...sermon,
      deliveries: updatedDeliveries,
    });

    setIsAddingManual(false);
    setManualVenue('');
    setManualNotes('');
  };

  const handleDeleteDelivery = (deliveryId: string) => {
    if (!confirm('Удалить эту запись из истории проповеди?')) return;
    const updatedDeliveries = deliveries.filter((d) => d.id !== deliveryId);
    onUpdateSermon({
      ...sermon,
      deliveries: updatedDeliveries,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-xl max-h-[85vh] flex flex-col rounded-3xl border border-zinc-800 bg-zinc-950 text-zinc-100 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800/80 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold tracking-wider uppercase">
              <Award className="w-4 h-4" />
              <span>История произнесения</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight line-clamp-1">
              {sermon.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Deliveries Summary Bar */}
        <div className="px-6 py-3 bg-zinc-900/50 border-b border-zinc-800/60 flex items-center justify-between shrink-0 text-xs text-zinc-400">
          <div>
            Произнесена:{' '}
            <span className="font-bold text-zinc-200">
              {deliveries.length} {deliveries.length === 1 ? 'раз' : 'раза'}
            </span>
          </div>
          {!isAddingManual && (
            <button
              onClick={() => setIsAddingManual(true)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span>Добавить запись вручную</span>
            </button>
          )}
        </div>

        {/* Modal Body / Scroll area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Manual Add Form */}
          {isAddingManual && (
            <form
              onSubmit={handleAddManual}
              className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 space-y-3.5 mb-4"
            >
              <div className="flex items-center justify-between text-xs font-bold text-amber-400">
                <span>Новая запись о произнесении</span>
                <button
                  type="button"
                  onClick={() => setIsAddingManual(false)}
                  className="hover:underline opacity-80"
                >
                  Отмена
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Дата</label>
                  <input
                    type="date"
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    required
                    className="w-full px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Длительность (мин)</label>
                  <input
                    type="number"
                    min="1"
                    max="240"
                    value={manualMinutes}
                    onChange={(e) => setManualMinutes(parseInt(e.target.value, 10) || 30)}
                    required
                    className="w-full px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Место / Служение</label>
                <input
                  type="text"
                  value={manualVenue}
                  onChange={(e) => setManualVenue(e.target.value)}
                  placeholder="Например: Центральная церковь, молодёжное"
                  className="w-full px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Заметки и впечатления</label>
                <textarea
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="Что прошло хорошо, что стоит улучшить?"
                  rows={2}
                  className="w-full px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddingManual(false)}
                  className="px-3 py-1.5 rounded-xl text-xs text-zinc-400 hover:text-zinc-200"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-amber-500 text-black font-semibold text-xs hover:bg-amber-400 transition-colors"
                >
                  Сохранить
                </button>
              </div>
            </form>
          )}

          {/* List of past deliveries */}
          {deliveries.length === 0 && !isAddingManual ? (
            <div className="text-center py-12 space-y-3 opacity-60">
              <Clock className="w-10 h-10 mx-auto text-zinc-500 stroke-1" />
              <div className="text-sm font-medium">Эта проповедь еще не произносилась</div>
              <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                Когда вы завершите проповедь в режиме суфлера на кафедре, данные таймера автоматически предложат сохраниться здесь.
              </p>
            </div>
          ) : (
            deliveries.map((delivery) => {
              const minutes = Math.floor(delivery.actualDurationSeconds / 60);
              const sec = delivery.actualDurationSeconds % 60;
              const formattedDuration = `${minutes} мин${sec > 0 ? ` ${sec} сек` : ''}`;

              return (
                <div
                  key={delivery.id}
                  className="p-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-900/70 transition-all space-y-2.5 group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs font-bold text-zinc-200">
                        <Calendar className="w-3.5 h-3.5 text-amber-400" />
                        <span>
                          {new Date(delivery.date).toLocaleDateString('ru-RU', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </span>
                        {delivery.venue && (
                          <span className="flex items-center gap-1 text-zinc-400 font-normal">
                            • <MapPin className="w-3 h-3 text-cyan-400" />
                            {delivery.venue}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300 font-mono text-xs font-semibold">
                        ⏱ {formattedDuration}
                      </span>
                      <button
                        onClick={() => handleDeleteDelivery(delivery.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-400 text-zinc-600 transition-all"
                        title="Удалить запись"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {delivery.notes && (
                    <div className="text-xs text-zinc-300 italic pl-3 border-l-2 border-amber-500/40 py-0.5">
                      «{delivery.notes}»
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/30 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
