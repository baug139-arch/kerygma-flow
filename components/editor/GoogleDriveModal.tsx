'use client';

import React, { useState } from 'react';
import {
  X,
  HardDrive,
  FileText,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  Link2,
  Sparkles,
  AlertCircle,
  LogIn,
  LogOut,
  Clock,
} from 'lucide-react';
import { Sermon } from '@/lib/types';
import { useGoogleDrive } from '@/lib/google/useGoogleDrive';

interface GoogleDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportDoc: (importedSermon: Partial<Sermon>) => void;
}

export function GoogleDriveModal({ isOpen, onClose, onImportDoc }: GoogleDriveModalProps) {
  const [activeTab, setActiveTab] = useState<'direct' | 'link'>('direct');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  // Link import fallback state
  const [docUrl, setDocUrl] = useState('');
  const [isUrlLoading, setIsUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  const {
    accessToken,
    userEmail,
    files,
    isLoading,
    error,
    login,
    logout,
    refreshFiles,
    getDocumentContent,
  } = useGoogleDrive();

  if (!isOpen) return null;

  // Handle direct file import from Google Drive
  const handleSelectDriveFile = async (fileId: string) => {
    setSelectedDocId(fileId);
    try {
      const doc = await getDocumentContent(fileId);
      onImportDoc({
        title: doc.title,
        content: doc.content,
        targetDurationMinutes: 30,
        syncedFromGoogle: true,
        googleDocId: fileId,
      });
      onClose();
    } catch (err: any) {
      // Handled in hook
    } finally {
      setSelectedDocId(null);
    }
  };

  // Handle URL import fallback
  const handleImportByUrl = async () => {
    if (!docUrl.trim()) {
      setUrlError('Пожалуйста, вставьте ссылку на ваш Google Документ');
      return;
    }

    setIsUrlLoading(true);
    setUrlError(null);

    try {
      const res = await fetch('/api/gdocs/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: docUrl }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setUrlError(data.error || 'Не удалось загрузить документ. Проверьте ссылку.');
        setIsUrlLoading(false);
        return;
      }

      onImportDoc({
        title: data.title,
        content: data.content,
        targetDurationMinutes: 30,
        syncedFromGoogle: true,
        googleDocId: data.docId,
      });
      setIsUrlLoading(false);
      onClose();
    } catch (err: any) {
      setUrlError(err.message || 'Сетевая ошибка при подключении к Google Docs');
      setIsUrlLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-5 text-zinc-100 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Google Документы</h3>
              <p className="text-xs text-zinc-400">Прямой доступ к вашим файлам конспектов</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center p-1 bg-zinc-950/80 rounded-2xl border border-zinc-800 shrink-0">
          <button
            onClick={() => setActiveTab('direct')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'direct'
                ? 'bg-amber-500 text-black shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            ⚡️ Прямой вход (Google Drive)
          </button>
          <button
            onClick={() => setActiveTab('link')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'link'
                ? 'bg-zinc-800 text-zinc-100 shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            🔗 По ссылке на документ
          </button>
        </div>

        {/* TAB 1: Direct Google Drive Access */}
        {activeTab === 'direct' && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {!accessToken ? (
              <div className="space-y-4 py-2">
                <div className="p-5 rounded-2xl bg-zinc-950/60 border border-zinc-800 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400">
                    <LogIn className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-zinc-100">Вход в Google Аккаунт</h4>
                    <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto leading-relaxed">
                      Авторизуйтесь в Google, чтобы выбирать любые конспекты прямо со своего Google Диска в 1 клик.
                    </p>
                  </div>

                  <button
                    onClick={login}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs sm:text-sm font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black shadow-lg shadow-amber-500/20 transition-all active:scale-98"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <HardDrive className="w-4 h-4" />
                    )}
                    <span>Войти через Google и открыть файлы</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Signed in: List of real Google Drive Files */
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-950 border border-zinc-800 text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="truncate text-zinc-300 font-medium">{userEmail || 'Google Аккаунт'}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={refreshFiles}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                      title="Обновить список"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
                    </button>
                    <button
                      onClick={logout}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800"
                      title="Выйти из аккаунта"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="text-xs uppercase tracking-wider font-bold text-zinc-500 px-1">
                  Ваши документы Google Docs:
                </div>

                {isLoading && files.length === 0 ? (
                  <div className="py-8 text-center text-xs text-zinc-500 flex flex-col items-center gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
                    <span>Загрузка файлов с вашего Google Диска...</span>
                  </div>
                ) : files.length === 0 ? (
                  <div className="py-8 text-center text-xs text-zinc-500">
                    На вашем Google Диске пока нет файлов Google Docs.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {files.map((file) => (
                      <button
                        key={file.id}
                        onClick={() => handleSelectDriveFile(file.id)}
                        disabled={selectedDocId === file.id || isLoading}
                        className={`w-full flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all ${
                          selectedDocId === file.id
                            ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                            : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/80 text-zinc-200'
                        }`}
                      >
                        <div className="flex items-center gap-3 truncate">
                          <FileText className="w-5 h-5 text-amber-400 shrink-0" />
                          <div className="truncate">
                            <div className="text-sm font-semibold truncate">{file.name}</div>
                            <div className="text-[11px] text-zinc-500 flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3" />
                              <span>{new Date(file.modifiedTime).toLocaleDateString('ru-RU')}</span>
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 opacity-50 shrink-0 ml-2 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3.5 rounded-2xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-red-400">
                  <AlertCircle className="w-4 h-4" />
                  <span>Ошибка</span>
                </div>
                <p className="leading-relaxed text-zinc-300">{error}</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Import by URL */}
        {activeTab === 'link' && (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <Link2 className="w-4 h-4 text-amber-400" />
                <span>Ссылка на ваш Google Doc:</span>
              </label>
              <input
                type="url"
                value={docUrl}
                onChange={(e) => {
                  setDocUrl(e.target.value);
                  setUrlError(null);
                }}
                placeholder="https://docs.google.com/document/d/.../edit"
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500/60 rounded-2xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none"
              />
            </div>

            <button
              onClick={handleImportByUrl}
              disabled={isUrlLoading || !docUrl.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-xs sm:text-sm font-bold bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black shadow-lg shadow-amber-500/20 transition-all active:scale-98"
            >
              {isUrlLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Загрузка...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Импортировать в суфлёр</span>
                </>
              )}
            </button>

            {urlError && (
              <div className="p-3.5 rounded-2xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs">
                {urlError}
              </div>
            )}

            <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 text-[11px] text-zinc-400 space-y-1">
              <span className="font-semibold text-zinc-300">💡 Как открыть доступ по ссылке:</span>
              <p>В Google Docs нажмите «Поделиться» $\to$ «Все, у кого есть ссылка (Просмотр)» $\to$ скопируйте ссылку.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
