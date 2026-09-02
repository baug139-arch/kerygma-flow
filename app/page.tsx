'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Play,
  FileText,
  Plus,
  HardDrive,
  Clock,
  Sparkles,
  BookOpen,
  Calendar,
  ChevronRight,
  Trash2,
  Edit3,
} from 'lucide-react';
import { SAMPLE_SERMONS } from '@/lib/sampleSermons';
import { Sermon } from '@/lib/types';
import { SermonEditor } from '@/components/editor/SermonEditor';
import { GoogleDriveModal } from '@/components/editor/GoogleDriveModal';
import { parseBibleReferences } from '@/lib/bible/parser';

export default function DashboardPage() {
  const router = useRouter();
  const [sermons, setSermons] = useState<Sermon[]>(SAMPLE_SERMONS);
  const [selectedSermon, setSelectedSermon] = useState<Sermon | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);

  // Load from local storage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedList = localStorage.getItem('kerygma_sermons_list');
      if (savedList) {
        try {
          setSermons(JSON.parse(savedList));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, []);

  const saveSermonsList = (list: Sermon[]) => {
    setSermons(list);
    if (typeof window !== 'undefined') {
      localStorage.setItem('kerygma_sermons_list', JSON.stringify(list));
    }
  };

  const handleCreateNew = () => {
    const newSermon: Sermon = {
      id: `sermon-${Date.now()}`,
      title: 'Новая проповедь',
      series: '',
      date: new Date().toISOString().split('T')[0],
      targetDurationMinutes: 30,
      updatedAt: new Date().toISOString(),
      content: `# Новая проповедь\n\n## 1. Введение\nНачните ваш конспект здесь...\n\n*«Здесь можно записать личную историю или пример из жизни...»*\n\nПрочитаем ключевой стих: [Ин 3:16]\n\n**Главный тезис: Напишите ключевую мысль вашей темы.**\n\n## 2. Основная часть\n- Первый пункт плана\n- Второй пункт с цитатой [Рим 8:28]\n\n## 3. Заключение и призыв\nПомолимся вместе.`,
    };
    const updated = [newSermon, ...sermons];
    saveSermonsList(updated);
    setSelectedSermon(newSermon);
    setIsEditing(true);
  };

  const handleUpdateSermon = (updated: Sermon) => {
    const nextList = sermons.map((s) => (s.id === updated.id ? updated : s));
    saveSermonsList(nextList);
    setSelectedSermon(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`kerygma_sermon_${updated.id}`, JSON.stringify(updated));
    }
  };

  const handleDeleteSermon = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextList = sermons.filter((s) => s.id !== id);
    saveSermonsList(nextList);
    if (selectedSermon?.id === id) {
      setSelectedSermon(null);
      setIsEditing(false);
    }
  };

  const handleImportGoogleDoc = (imported: Partial<Sermon>) => {
    const newSermon: Sermon = {
      id: `gdoc-${Date.now()}`,
      title: imported.title || 'Импортированная проповедь',
      series: 'Google Диск',
      date: new Date().toISOString().split('T')[0],
      targetDurationMinutes: imported.targetDurationMinutes || 30,
      updatedAt: new Date().toISOString(),
      content: imported.content || '',
      syncedFromGoogle: true,
      googleDocId: imported.googleDocId,
    };
    const updated = [newSermon, ...sermons];
    saveSermonsList(updated);
    setSelectedSermon(newSermon);
    setIsEditing(true);
  };

  const handleLaunchPulpit = (sermonId: string) => {
    router.push(`/pulpit?id=${sermonId}`);
  };

  if (isEditing && selectedSermon) {
    return (
      <div className="w-screen h-screen flex flex-col">
        <SermonEditor
          sermon={selectedSermon}
          onSave={handleUpdateSermon}
          onLaunchPulpit={() => handleLaunchPulpit(selectedSermon.id)}
          onBack={() => setIsEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-black font-black text-xl shadow-lg shadow-amber-500/20">
              K
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight flex items-center gap-2">
                Kerygma Flow
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Кафедра
                </span>
              </h1>
              <p className="text-xs text-zinc-500">Сценический суфлёр-пульт с интеграцией Google Docs и Библии</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDriveModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 transition-all"
            >
              <HardDrive className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Google Диск</span>
            </button>

            <button
              onClick={handleCreateNew}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Создать конспект</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 space-y-8">
        {/* Welcome Hero / Quick Start */}
        <div className="relative rounded-3xl overflow-hidden p-6 sm:p-8 bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Готов к выходу на сцену</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Выберите конспект или подключите Google Docs
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Kerygma Flow трансформирует текст в контрастный суфлёр с умным распознаванием стихов, секундомером регламента и поддержкой кликеров/педалей.
            </p>
          </div>
        </div>

        {/* Sermons Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-zinc-200">
              Ваши проповеди ({sermons.length})
            </h3>
            <span className="text-xs text-zinc-500">Нажмите для запуска режима кафедры</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sermons.map((sermon) => {
              const wordCount = sermon.content.trim().split(/\s+/).filter(Boolean).length;
              const verseCount = parseBibleReferences(sermon.content).length;

              return (
                <div
                  key={sermon.id}
                  onClick={() => handleLaunchPulpit(sermon.id)}
                  className="group relative flex flex-col justify-between p-5 rounded-2xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80 hover:border-amber-500/50 transition-all cursor-pointer shadow-lg hover:shadow-amber-500/5"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      {sermon.series ? (
                        <span className="text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                          {sermon.series}
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-zinc-500">Без серии</span>
                      )}

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSermon(sermon);
                            setIsEditing(true);
                          }}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                          title="Редактировать"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteSermon(sermon.id, e)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800"
                          title="Удалить"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h4 className="text-lg font-bold text-zinc-100 group-hover:text-amber-300 transition-colors line-clamp-2">
                      {sermon.title}
                    </h4>

                    <p className="text-xs text-zinc-400 line-clamp-3 font-serif italic">
                      {sermon.content.replace(/[#*`[\]]/g, '').slice(0, 140)}...
                    </p>
                  </div>

                    {/* Metadata and Start Button */}
                    <div className="pt-4 mt-4 border-t border-zinc-800/60 flex items-center justify-between">
                      <div className="flex items-center gap-3 text-[11px] text-zinc-400">
                        <span className="flex items-center gap-1 font-semibold text-amber-300" title="Расчетная длительность живой проповеди">
                          <Clock className="w-3 h-3 text-amber-400" />
                          ~{Math.max(1, Math.round((wordCount * 2.05) / 115))} мин
                        </span>
                        <span className="opacity-40">•</span>
                        <span>{wordCount} слов</span>
                      </div>

                    <div className="flex items-center gap-1 text-xs font-bold text-amber-400 group-hover:translate-x-0.5 transition-transform">
                      <span>На кафедру</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Google Drive Import Modal */}
      <GoogleDriveModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        onImportDoc={handleImportGoogleDoc}
      />
    </div>
  );
}
