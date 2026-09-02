'use client';

import React, { useState, useMemo } from 'react';
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
  Search,
  FileCode,
  Layers,
  CheckSquare,
  Square,
  ArrowLeft,
  ListTree,
  FolderOpen,
} from 'lucide-react';
import { Sermon } from '@/lib/types';
import { useGoogleDrive, DocumentImportResult } from '@/lib/google/useGoogleDrive';
import { parseDocumentSections, ParsedDocSection } from '@/lib/utils/sectionParser';
import { GDocTab } from '@/lib/utils/gdocsApiParser';

interface GoogleDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportDoc: (importedSermon: Partial<Sermon>) => void;
}

interface PendingDoc {
  fileId: string;
  title: string;
  fullContent: string;
  tabs?: GDocTab[];
  selectedTabId?: string;
  sections: ParsedDocSection[];
}

export function GoogleDriveModal({ isOpen, onClose, onImportDoc }: GoogleDriveModalProps) {
  const [activeTab, setActiveTab] = useState<'direct' | 'link'>('direct');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');

  // Multi-section & Tabs selection state
  const [pendingDoc, setPendingDoc] = useState<PendingDoc | null>(null);
  const [selectedSectionIds, setSelectedSectionIds] = useState<string[]>([]);

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

  // Client-side instant filter on top of fetched files
  const filteredFiles = useMemo(() => {
    if (!searchFilter.trim()) return files;
    const query = searchFilter.toLowerCase().trim();
    return files.filter((f) => f.name.toLowerCase().includes(query));
  }, [files, searchFilter]);

  if (!isOpen) return null;

  const processLoadedDocument = (fileId: string, docResult: DocumentImportResult) => {
    const hasTabs = docResult.tabs && docResult.tabs.length > 1;

    // If multiple tabs, initialize with the first tab or full content
    const initialContent = hasTabs && docResult.tabs ? docResult.tabs[0].content : docResult.content;
    const sections = parseDocumentSections(initialContent);

    if (hasTabs || sections.length > 1) {
      setPendingDoc({
        fileId,
        title: docResult.title,
        fullContent: docResult.content,
        tabs: docResult.tabs,
        selectedTabId: hasTabs && docResult.tabs ? docResult.tabs[0].id : undefined,
        sections,
      });
      setSelectedSectionIds(sections.map((s) => s.id));
    } else {
      // Single tab and single section: import directly
      onImportDoc({
        title: docResult.title,
        content: docResult.content,
        targetDurationMinutes: Math.max(10, Math.round(docResult.content.split(/\s+/).filter(Boolean).length / 115)),
        syncedFromGoogle: true,
        googleDocId: fileId,
      });
      onClose();
    }
  };

  // Switch between Document Tabs (e.g. "Проповедь" vs "Греческий текст")
  const handleSelectDocumentTab = (tabId: string) => {
    if (!pendingDoc || !pendingDoc.tabs) return;

    if (tabId === 'ALL') {
      const fullContent = pendingDoc.tabs.map((t) => `# ${t.title}\n\n${t.content}`).join('\n\n---\n\n');
      const sections = parseDocumentSections(fullContent);
      setPendingDoc({
        ...pendingDoc,
        selectedTabId: 'ALL',
        sections,
      });
      setSelectedSectionIds(sections.map((s) => s.id));
      return;
    }

    const foundTab = pendingDoc.tabs.find((t) => t.id === tabId);
    if (foundTab) {
      const sections = parseDocumentSections(foundTab.content);
      setPendingDoc({
        ...pendingDoc,
        selectedTabId: tabId,
        sections,
      });
      setSelectedSectionIds(sections.map((s) => s.id));
    }
  };

  // Handle direct file import from Google Drive
  const handleSelectDriveFile = async (fileId: string) => {
    setSelectedDocId(fileId);
    try {
      const docResult = await getDocumentContent(fileId);
      processLoadedDocument(fileId, docResult);
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

      processLoadedDocument(data.docId || `url-${Date.now()}`, {
        title: data.title,
        content: data.content,
      });
      setIsUrlLoading(false);
    } catch (err: any) {
      setUrlError(err.message || 'Сетевая ошибка при подключении к Google Docs');
      setIsUrlLoading(false);
    }
  };

  // Confirm section / tab selection import
  const handleConfirmSectionImport = () => {
    if (!pendingDoc) return;
    const chosen = pendingDoc.sections.filter((s) => selectedSectionIds.includes(s.id));
    if (chosen.length === 0) return;

    const combinedContent = chosen.map((s) => s.content).join('\n\n');

    let title = pendingDoc.title;
    if (pendingDoc.tabs && pendingDoc.selectedTabId && pendingDoc.selectedTabId !== 'ALL') {
      const tabName = pendingDoc.tabs.find((t) => t.id === pendingDoc.selectedTabId)?.title;
      if (tabName) {
        title = `${pendingDoc.title}: ${tabName}`;
      }
    } else if (chosen.length === 1) {
      title = `${chosen[0].title}`;
    }

    onImportDoc({
      title,
      content: combinedContent,
      targetDurationMinutes: Math.max(10, Math.round(combinedContent.split(/\s+/).filter(Boolean).length / 115)),
      syncedFromGoogle: true,
      googleDocId: pendingDoc.fileId,
    });
    setPendingDoc(null);
    onClose();
  };

  const toggleSectionId = (id: string) => {
    setSelectedSectionIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectOnlySection = (id: string) => {
    setSelectedSectionIds([id]);
  };

  const selectAllSections = () => {
    if (!pendingDoc) return;
    setSelectedSectionIds(pendingDoc.sections.map((s) => s.id));
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
              {pendingDoc ? <ListTree className="w-6 h-6" /> : <HardDrive className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="text-lg font-bold">
                {pendingDoc ? 'Выбор вкладки и разделов' : 'Google Документы'}
              </h3>
              <p className="text-xs text-zinc-400">
                {pendingDoc?.tabs && pendingDoc.tabs.length > 1
                  ? `В документе найдено ${pendingDoc.tabs.length} вкладок (выберите нужную)`
                  : pendingDoc
                  ? `В документе обнаружено ${pendingDoc.sections.length} разделов`
                  : 'Прямой доступ к вашим файлам конспектов'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setPendingDoc(null);
              onClose();
            }}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEP 2: Document Tabs & Section Choice Screen */}
        {pendingDoc ? (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 flex flex-col min-h-0">
            {/* Document Info */}
            <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-1.5 shrink-0">
              <div className="text-xs text-zinc-400">Документ Google Docs:</div>
              <div className="text-sm font-bold text-amber-300 truncate">{pendingDoc.title}</div>
            </div>

            {/* 📑 Document Tabs Selector (e.g. "Проповедь" vs "Греческий текст") */}
            {pendingDoc.tabs && pendingDoc.tabs.length > 1 && (
              <div className="space-y-2 shrink-0">
                <div className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <span>Вкладки в документе (выберите одну):</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {pendingDoc.tabs.map((tab) => {
                    const isTabActive = pendingDoc.selectedTabId === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => handleSelectDocumentTab(tab.id)}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                          isTabActive
                            ? 'bg-amber-500 text-black shadow-md scale-102'
                            : 'bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-zinc-300'
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>{tab.title}</span>
                        <span className="opacity-70 font-mono text-[10px]">({tab.wordCount} сл.)</span>
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => handleSelectDocumentTab('ALL')}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      pendingDoc.selectedTabId === 'ALL'
                        ? 'bg-amber-500 text-black shadow-md'
                        : 'bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Все вкладки
                  </button>
                </div>
              </div>
            )}

            {/* Quick Actions (Select All / Single) */}
            <div className="flex items-center justify-between gap-2 shrink-0 pt-1">
              <span className="text-xs text-zinc-400">
                Разделы для суфлёра: <b className="text-zinc-200">{selectedSectionIds.length}</b> из {pendingDoc.sections.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={selectAllSections}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                >
                  Все разделы
                </button>
                <button
                  onClick={() => setSelectedSectionIds([])}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-zinc-800/60 hover:bg-zinc-800 text-zinc-400"
                >
                  Снять
                </button>
              </div>
            </div>

            {/* List of Sections inside the active tab */}
            <div className="flex-1 overflow-y-auto space-y-2 min-h-[160px] max-h-[260px] pr-1">
              {pendingDoc.sections.map((section, idx) => {
                const isSelected = selectedSectionIds.includes(section.id);
                return (
                  <div
                    key={section.id}
                    onClick={() => toggleSectionId(section.id)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500/50 text-zinc-100'
                        : 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700 text-zinc-400'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSectionId(section.id);
                      }}
                      className="mt-0.5 text-amber-400 shrink-0"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 fill-amber-500/20" />
                      ) : (
                        <Square className="w-4 h-4 text-zinc-600" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold text-xs sm:text-sm truncate text-zinc-200">
                          <span className="opacity-60 mr-1.5 font-mono text-xs">{idx + 1}.</span>
                          <span>{section.title}</span>
                        </div>
                        <span className="text-[10px] text-zinc-500 font-mono shrink-0">
                          ~{section.wordCount} сл.
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 line-clamp-1">
                        {section.content.replace(/[#*`_>]/g, '').trim()}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        selectOnlySection(section.id);
                      }}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold bg-zinc-800 hover:bg-amber-500 hover:text-black text-zinc-300 transition-colors shrink-0"
                      title="Импортировать только этот раздел"
                    >
                      Только этот
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-zinc-800 shrink-0">
              <button
                onClick={() => setPendingDoc(null)}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Назад</span>
              </button>

              <button
                onClick={handleConfirmSectionImport}
                disabled={selectedSectionIds.length === 0}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black shadow-lg shadow-amber-500/20 transition-all active:scale-98"
              >
                <Sparkles className="w-4 h-4" />
                <span>
                  Импортировать{' '}
                  {pendingDoc.tabs && pendingDoc.selectedTabId && pendingDoc.selectedTabId !== 'ALL'
                    ? `вкладку «${pendingDoc.tabs.find((t) => t.id === pendingDoc.selectedTabId)?.title}»`
                    : `выбранное (${selectedSectionIds.length})`}
                </span>
              </button>
            </div>
          </div>
        ) : (
          /* STEP 1: File Browser */
          <>
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
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 flex flex-col min-h-0">
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
                  /* Signed in: List of real Google Drive Files with Search */
                  <div className="space-y-3 flex-1 flex flex-col min-h-0">
                    {/* Account info bar */}
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-zinc-950 border border-zinc-800 text-xs shrink-0">
                      <div className="flex items-center gap-2 truncate">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="truncate text-zinc-300 font-medium">{userEmail || 'Google Аккаунт'}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => refreshFiles(searchFilter)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                          title="Обновить список файлов с Google Диска"
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

                    {/* 🔍 Search Input Bar */}
                    <div className="relative shrink-0">
                      <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={searchFilter}
                        onChange={(e) => setSearchFilter(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            refreshFiles(searchFilter);
                          }
                        }}
                        placeholder="Поиск по названию проповеди или темы..."
                        className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-amber-500/60 rounded-2xl pl-10 pr-10 py-2.5 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none transition-all"
                      />
                      {searchFilter && (
                        <button
                          onClick={() => {
                            setSearchFilter('');
                            refreshFiles('');
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-zinc-500 hover:text-zinc-200"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Counter & Label */}
                    <div className="flex items-center justify-between text-[11px] uppercase tracking-wider font-bold text-zinc-500 px-1 shrink-0">
                      <span>Документы Google Диска</span>
                      <span>{filteredFiles.length} из {files.length}</span>
                    </div>

                    {/* Files List */}
                    <div className="flex-1 overflow-y-auto space-y-2 min-h-[200px] max-h-[300px] pr-1">
                      {isLoading && files.length === 0 ? (
                        <div className="py-12 text-center text-xs text-zinc-500 flex flex-col items-center gap-2">
                          <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
                          <span>Ищем все файлы на вашем Google Диске...</span>
                        </div>
                      ) : filteredFiles.length === 0 ? (
                        <div className="py-12 text-center text-xs text-zinc-500 space-y-2">
                          <p>Файлов по запросу «{searchFilter}» не найдено.</p>
                          {searchFilter && (
                            <button
                              onClick={() => refreshFiles(searchFilter)}
                              className="text-amber-400 hover:underline text-xs"
                            >
                              Искать глубже на всем Google Диске ↵
                            </button>
                          )}
                        </div>
                      ) : (
                        filteredFiles.map((file) => (
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
                              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 shrink-0">
                                {file.mimeType?.includes('document') ? (
                                  <FileText className="w-4 h-4" />
                                ) : (
                                  <FileCode className="w-4 h-4" />
                                )}
                              </div>
                              <div className="truncate">
                                <div className="text-sm font-semibold truncate text-zinc-100">{file.name}</div>
                                <div className="text-[11px] text-zinc-500 flex items-center gap-1.5 mt-0.5">
                                  <Clock className="w-3 h-3" />
                                  <span>{new Date(file.modifiedTime).toLocaleDateString('ru-RU')}</span>
                                </div>
                              </div>
                            </div>
                            <ArrowRight className="w-4 h-4 opacity-50 shrink-0 ml-2 group-hover:translate-x-0.5 transition-transform" />
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="p-3.5 rounded-2xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs space-y-1 shrink-0">
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
          </>
        )}
      </div>
    </div>
  );
}
