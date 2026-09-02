'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  RefreshCw,
  CheckCircle2,
  LogIn,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import { SAMPLE_SERMONS } from '@/lib/sampleSermons';
import { Sermon } from '@/lib/types';
import { SermonEditor } from '@/components/editor/SermonEditor';
import { GoogleDriveModal } from '@/components/editor/GoogleDriveModal';
import { parseBibleReferences } from '@/lib/bible/parser';
import {
  getLocalSermons,
  saveLocalSermons,
  saveSermonToCloudAndLocal,
  deleteSermonFromCloudAndLocal,
  subscribeToCloudSermons,
  syncAllLocalAndCloudSermons,
  loginWithGoogle,
  logoutGoogle,
} from '@/lib/firebase/sermonSync';
import { auth } from '@/lib/firebase/config';
import { onAuthStateChanged, User } from 'firebase/auth';

export default function DashboardPage() {
  const router = useRouter();
  const [sermons, setSermons] = useState<Sermon[]>(() => {
    const local = getLocalSermons();
    return local.length > 0 ? local : SAMPLE_SERMONS;
  });
  const [selectedSermon, setSelectedSermon] = useState<Sermon | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Trigger full two-way sync
  const performSync = useCallback(async (uid: string) => {
    setIsSyncing(true);
    try {
      const merged = await syncAllLocalAndCloudSermons(uid);
      if (merged.length > 0) {
        setSermons(merged);
      }
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Load from local storage and subscribe to Cloud Firestore when logged in
  useEffect(() => {
    const local = getLocalSermons();
    if (local.length > 0) {
      setSermons(local);
    } else {
      saveLocalSermons(SAMPLE_SERMONS);
      setSermons(SAMPLE_SERMONS);
    }

    let unsubscribeFirestore: () => void = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Run full initial sync
        await performSync(user.uid);

        // Listen for real-time cloud updates (e.g. from Mac to iPad)
        unsubscribeFirestore = subscribeToCloudSermons(user.uid, (cloudSermons) => {
          if (cloudSermons.length > 0) {
            setSermons(cloudSermons);
          }
        });
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeFirestore();
    };
  }, [performSync]);

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
    saveSermonToCloudAndLocal(newSermon);
    setSermons((prev) => [newSermon, ...prev.filter((s) => s.id !== newSermon.id)]);
    setSelectedSermon(newSermon);
    setIsEditing(true);
  };

  const handleUpdateSermon = (updated: Sermon) => {
    saveSermonToCloudAndLocal(updated);
    setSermons((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    setSelectedSermon(updated);
  };

  const handleDeleteSermon = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteSermonFromCloudAndLocal(id);
    setSermons((prev) => prev.filter((s) => s.id !== id));
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
    saveSermonToCloudAndLocal(newSermon);
    setSermons((prev) => [newSermon, ...prev.filter((s) => s.id !== newSermon.id)]);
    setSelectedSermon(newSermon);
    setIsEditing(true);
  };

  const handleLaunchPulpit = (sermonId: string) => {
    router.push(`/pulpit?id=${sermonId}`);
  };

  const handleGoogleLogin = async () => {
    setIsSyncing(true);
    try {
      const user = await loginWithGoogle();
      if (user) {
        await performSync(user.uid);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleGoogleLogout = async () => {
    await logoutGoogle();
    setCurrentUser(null);
  };

  if (isEditing && selectedSermon) {
    return (
      <div className="w-full min-h-screen flex flex-col">
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-black font-black text-lg shadow-lg shadow-amber-500/20">
              K
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight flex items-center gap-2">
                Kerygma Flow
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Кафедра
                </span>
              </h1>
              <p className="text-[11px] text-zinc-500 hidden sm:block">Сценический суфлёр-пульт для спикеров</p>
            </div>
          </div>

          {/* Sync status & Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Google Sync Badge */}
            {currentUser ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="truncate max-w-[120px] sm:max-w-[180px] font-medium text-zinc-200">
                  {currentUser.email}
                </span>
                <button
                  onClick={() => performSync(currentUser.uid)}
                  disabled={isSyncing}
                  className="p-1 rounded-lg text-zinc-400 hover:text-amber-400 transition-colors ml-1"
                  title="Синхронизировать с облаком прямо сейчас"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-400' : ''}`} />
                </button>
                <button
                  onClick={handleGoogleLogout}
                  className="p-1 rounded-lg text-zinc-400 hover:text-red-400 transition-colors"
                  title="Выйти"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleGoogleLogin}
                disabled={isSyncing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-950/50 hover:bg-emerald-900/50 border border-emerald-500/40 text-emerald-300 transition-all shadow-sm"
              >
                {isSyncing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <LogIn className="w-3.5 h-3.5" />
                )}
                <span>Войти (Синхронизация с Mac/iPad)</span>
              </button>
            )}

            <button
              onClick={() => setIsDriveModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 transition-all"
            >
              <HardDrive className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Google Диск</span>
            </button>

            <button
              onClick={handleCreateNew}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20 transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Создать</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Welcome Hero / Quick Start */}
        <div className="relative rounded-3xl overflow-hidden p-6 sm:p-8 bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Синхронизация активна</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              Ваши конспекты для кафедры
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Все правки автоматически синхронизируются между вашим MacBook и iPad. Для выхода на кафедру нажмите на любую проповедь ниже.
            </p>
          </div>
        </div>

        {/* Sermons Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs uppercase tracking-widest font-extrabold text-zinc-500">
              Список проповедей ({sermons.length})
            </h3>
            {currentUser && (
              <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Синхронизировано с Google Облаком</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sermons.map((sermon) => {
              const refs = parseBibleReferences(sermon.content);
              const wordCount = sermon.content.split(/\s+/).filter(Boolean).length;
              const estMinutes = Math.round(wordCount / 115) || sermon.targetDurationMinutes;

              return (
                <div
                  key={sermon.id}
                  onClick={() => {
                    setSelectedSermon(sermon);
                    setIsEditing(true);
                  }}
                  className="group relative p-5 rounded-3xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80 hover:border-amber-500/40 transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-4 hover:shadow-xl hover:shadow-black/60"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="p-2 rounded-2xl bg-zinc-800 group-hover:bg-amber-500/10 group-hover:text-amber-400 transition-colors text-zinc-400">
                          <FileText className="w-4 h-4" />
                        </span>
                        {sermon.syncedFromGoogle && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-950/80 border border-blue-500/30 text-blue-300">
                            Google Doc
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleDeleteSermon(sermon.id, e)}
                          className="p-1.5 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                          title="Удалить"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold text-base text-zinc-100 group-hover:text-amber-300 transition-colors line-clamp-1">
                        {sermon.title}
                      </h4>
                      {sermon.series && (
                        <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">
                          Серия: {sermon.series}
                        </p>
                      )}
                    </div>

                    {/* Bible references tags */}
                    {refs.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {refs.slice(0, 3).map((r, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-zinc-800/80 border border-zinc-700/50 text-[11px] text-zinc-300"
                          >
                            <BookOpen className="w-3 h-3 text-amber-400" />
                            <span>{r.raw}</span>
                          </span>
                        ))}
                        {refs.length > 3 && (
                          <span className="text-[10px] text-zinc-500 self-center">
                            +{refs.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-500">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>~{estMinutes} мин</span>
                      </span>
                      <span>{wordCount} сл.</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLaunchPulpit(sermon.id);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-black font-bold transition-all"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Кафедра</span>
                    </button>
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
