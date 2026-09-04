'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FileText } from 'lucide-react';
import { Teleprompter } from '@/components/pulpit/Teleprompter';
import { StageTimer } from '@/components/pulpit/StageTimer';
import { StageRailNav } from '@/components/pulpit/StageRailNav';
import { PulpitControls } from '@/components/pulpit/PulpitControls';
import { OutlineNav } from '@/components/pulpit/OutlineNav';
import { VerseModal } from '@/components/pulpit/VerseModal';
import { useWakeLock } from '@/lib/hooks/useWakeLock';
import { useStageTimer } from '@/lib/hooks/useStageTimer';
import { useAutoscroll } from '@/lib/hooks/useAutoscroll';
import { SAMPLE_SERMONS } from '@/lib/sampleSermons';
import { OutlineItem, Sermon, SermonDelivery, ThemeMode, VerseData } from '@/lib/types';
import { FinishSermonModal } from '@/components/pulpit/FinishSermonModal';
import { calculatePacingMap } from '@/lib/utils/pacing';
import { saveSermonToCloudAndLocal } from '@/lib/firebase/sermonSync';

function PulpitContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sermonId = searchParams.get('id') || SAMPLE_SERMONS[0].id;

  const [sermon, setSermon] = useState<Sermon>(SAMPLE_SERMONS[0]);
  const [theme, setTheme] = useState<ThemeMode>('oled');
  const [fontSize, setFontSize] = useState(34); // Optimal tablet readable size
  const [isOutlineOpen, setIsOutlineOpen] = useState(false);
  const [isSummaryMode, setIsSummaryMode] = useState(false);
  const [activeVerse, setActiveVerse] = useState<VerseData | null>(null);
  const [isVerseModalOpen, setIsVerseModalOpen] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Load sermon from storage or default
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`kerygma_sermon_${sermonId}`);
      if (saved) {
        try {
          setSermon(JSON.parse(saved));
          return;
        } catch (e) {
          console.error(e);
        }
      }
      const rawList = localStorage.getItem('kerygma_sermons') || localStorage.getItem('kerygma_sermons_list');
      if (rawList) {
        try {
          const list = JSON.parse(rawList);
          const foundInList = list.find((s: Sermon) => s.id === sermonId);
          if (foundInList) {
            setSermon(foundInList);
            return;
          }
        } catch {}
      }
      const found = SAMPLE_SERMONS.find((s) => s.id === sermonId) || SAMPLE_SERMONS[0];
      setSermon(found);
    }
  }, [sermonId]);

  // Screen WakeLock
  const { isSupported, isActive: isWakeLockActive, requestWakeLock, releaseWakeLock } = useWakeLock();

  useEffect(() => {
    requestWakeLock();
    return () => {
      releaseWakeLock();
    };
  }, [requestWakeLock, releaseWakeLock]);

  // Stage Timer
  const timer = useStageTimer({
    initialMinutes: sermon.targetDurationMinutes || 30,
  });

  // Autoscroll
  const autoscroll = useAutoscroll({
    containerRef,
    initialSpeed: 3,
  });

  // Calculate section pacing map
  const pacingMap = useMemo(() => {
    return calculatePacingMap(sermon.content, timer.targetMinutes);
  }, [sermon.content, timer.targetMinutes]);

  // Parse outline items from sermon markdown with pacing target minutes
  const outlineItems: OutlineItem[] = useMemo(() => {
    const lines = sermon.content.split('\n');
    const items: OutlineItem[] = [];

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('# ')) {
        items.push({
          id: `heading-${index}`,
          title: trimmed.replace('# ', ''),
          level: 1,
          targetMinute: pacingMap.get(index)?.targetMinute,
          lineIndex: index,
        });
      } else if (trimmed.startsWith('## ')) {
        items.push({
          id: `heading-${index}`,
          title: trimmed.replace('## ', ''),
          level: 2,
          targetMinute: pacingMap.get(index)?.targetMinute,
          lineIndex: index,
        });
      }
    });

    return items;
  }, [sermon.content, pacingMap]);

  // ScrollSpy to track active outline section
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const headings = outlineItems
        .map((item) => document.getElementById(item.id))
        .filter(Boolean) as HTMLElement[];

      if (!headings.length) return;

      const containerTop = container.scrollTop;
      let currentActive = headings[0].id;

      for (const h of headings) {
        if (h.offsetTop <= containerTop + 140) {
          currentActive = h.id;
        } else {
          break;
        }
      }

      setActiveSectionId(currentActive);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [outlineItems]);

  // Section navigation jump
  const handleJumpToSection = useCallback((sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el && containerRef.current) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSectionId(sectionId);
    }
  }, []);

  const [targetAnchorIndex, setTargetAnchorIndex] = useState<number | null>(null);

  const handleToggleSummaryMode = useCallback(() => {
    if (containerRef.current) {
      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      const eyeY = containerRect.top + container.clientHeight * 0.28;
      const elements = Array.from(container.querySelectorAll<HTMLElement>('[data-block-idx]'));
      let closestIdx = 0;
      let minDistance = Infinity;

      for (const el of elements) {
        const rect = el.getBoundingClientRect();
        // 1. If eye line is directly inside this element's vertical bounds
        if (rect.top <= eyeY && rect.bottom >= eyeY) {
          const rawIdx = el.getAttribute('data-block-idx');
          if (rawIdx !== null) {
            closestIdx = parseInt(rawIdx, 10);
            minDistance = 0;
            break;
          }
        }

        // 2. Otherwise find element whose center is closest to eye line
        const elCenter = (rect.top + rect.bottom) / 2;
        const dist = Math.abs(elCenter - eyeY);
        if (dist < minDistance) {
          minDistance = dist;
          const rawIdx = el.getAttribute('data-block-idx');
          if (rawIdx !== null) {
            closestIdx = parseInt(rawIdx, 10);
          }
        }
      }
      setTargetAnchorIndex(closestIdx);
    }
    setIsSummaryMode((prev) => !prev);
  }, []);

  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);

  const handleRequestExit = useCallback(() => {
    if (timer.elapsedSeconds >= 45) {
      timer.pause();
      setIsFinishModalOpen(true);
    } else {
      router.push('/');
    }
  }, [timer, router]);

  const handleConfirmSaveDelivery = async ({
    venue,
    notes,
    actualSeconds,
  }: {
    venue: string;
    notes: string;
    actualSeconds: number;
  }) => {
    const newDelivery: SermonDelivery = {
      id: `del-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      venue,
      actualDurationSeconds: actualSeconds,
      targetDurationMinutes: timer.targetMinutes,
      notes,
      createdAt: new Date().toISOString(),
    };

    const updatedSermon: Sermon = {
      ...sermon,
      deliveries: [newDelivery, ...(sermon.deliveries || [])],
    };

    await saveSermonToCloudAndLocal(updatedSermon);
    router.push('/');
  };

  const handleAddMinutes = useCallback((mins: number) => {
    timer.addMinutes(mins);
    const newMins = Math.max(1, timer.targetMinutes + mins);
    setSermon((prev) => {
      const updated = { ...prev, targetDurationMinutes: newMins };
      if (typeof window !== 'undefined') {
        localStorage.setItem(`kerygma_sermon_${prev.id}`, JSON.stringify(updated));
      }
      return updated;
    });
  }, [timer]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key events if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          autoscroll.togglePlay();
          break;

        case 'ArrowDown':
          e.preventDefault();
          if (containerRef.current) {
            containerRef.current.scrollBy({ top: 180, behavior: 'smooth' });
          }
          break;

        case 'ArrowUp':
          e.preventDefault();
          if (containerRef.current) {
            containerRef.current.scrollBy({ top: -180, behavior: 'smooth' });
          }
          break;

        case 'KeyT':
          e.preventDefault();
          timer.toggle();
          break;

        case 'KeyO':
          e.preventDefault();
          setIsOutlineOpen((prev) => !prev);
          break;

        case 'KeyK':
          e.preventDefault();
          handleToggleSummaryMode();
          break;

        case 'KeyR':
          if (e.shiftKey) {
            e.preventDefault();
            timer.reset();
          }
          break;

        case 'Escape':
          if (isVerseModalOpen) {
            setIsVerseModalOpen(false);
          } else if (isOutlineOpen) {
            setIsOutlineOpen(false);
          } else {
            handleRequestExit();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [autoscroll, timer, isVerseModalOpen, isOutlineOpen, handleToggleSummaryMode, handleRequestExit]);

  const getRootBg = () => {
    switch (theme) {
      case 'sepia':
        return 'bg-[#fbf0d9] text-[#433422]';
      case 'light':
        return 'bg-white text-zinc-900';
      case 'oled':
      default:
        return 'bg-black text-zinc-100';
    }
  };

  return (
    <div className={`relative w-screen h-screen overflow-hidden select-none transition-colors duration-200 ${getRootBg()}`}>
      {/* 1. Ultra-Compact Minimalist Floating Stage Timer Capsule (Top-Left Option A) */}
      <StageTimer
        status={timer.status}
        elapsedFormatted={timer.formattedElapsed}
        remainingFormatted={timer.formattedRemaining}
        lightState={timer.lightState}
        targetMinutes={timer.targetMinutes}
        wordCount={sermon.content.split(/\s+/).filter(Boolean).length}
        theme={theme}
        onToggle={timer.toggle}
        onReset={timer.reset}
        onAddMinutes={handleAddMinutes}
      />

      {/* 2. Ultra-Discrete Minimalist Floating Summary / Outline Mode Toggle (Top-Right) */}
      <div className="fixed top-8 sm:top-10 right-14 sm:right-20 z-30 select-none">
        <button
          onClick={handleToggleSummaryMode}
          className={`group flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full border backdrop-blur-md transition-all duration-300 text-xs font-mono cursor-pointer ${
            isSummaryMode
              ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 opacity-90 shadow-lg'
              : 'bg-zinc-950/40 border-zinc-800/40 text-zinc-500 hover:text-zinc-200 hover:border-zinc-700 opacity-20 hover:opacity-100'
          }`}
          title={isSummaryMode ? 'Показать полный текст (К)' : 'Краткий конспект (К)'}
        >
          <FileText className="w-3.5 h-3.5" />
          <span className="text-[11px] font-medium hidden sm:inline">
            {isSummaryMode ? 'Конспект' : 'Полный'}
          </span>
        </button>
      </div>

      {/* 3. Main Stage Teleprompter */}
      <Teleprompter
        content={sermon.content}
        fontSize={fontSize}
        theme={theme}
        containerRef={containerRef}
        isSummaryMode={isSummaryMode}
        targetAnchorIndex={targetAnchorIndex}
        targetDurationMinutes={timer.targetMinutes}
        elapsedSeconds={timer.elapsedSeconds}
        onOpenVerse={(verse) => {
          setActiveVerse(verse);
          setIsVerseModalOpen(true);
        }}
      />

      {/* 4. Stage Rail Nav (Right-side 1-tap jumping between sections Option 1) */}
      <StageRailNav
        outline={outlineItems}
        activeId={activeSectionId}
        onSelectSection={handleJumpToSection}
        theme={theme}
      />

      {/* 5. Bottom Controls HUD (Hidden by default, iOS Home Indicator summoned Method 1) */}
      <PulpitControls
        fontSize={fontSize}
        onIncreaseFont={() => setFontSize((f) => Math.min(64, f + 2))}
        onDecreaseFont={() => setFontSize((f) => Math.max(18, f - 2))}
        theme={theme}
        onSetTheme={setTheme}
        isAutoscrolling={autoscroll.isPlaying}
        autoscrollSpeed={autoscroll.speed}
        onToggleAutoscroll={autoscroll.togglePlay}
        onIncreaseSpeed={autoscroll.increaseSpeed}
        onDecreaseSpeed={autoscroll.decreaseSpeed}
        isWakeLockActive={isWakeLockActive}
        isSummaryMode={isSummaryMode}
        onToggleSummaryMode={handleToggleSummaryMode}
        onToggleOutline={() => setIsOutlineOpen((prev) => !prev)}
        onExit={handleRequestExit}
      />

      {/* Outline Drawer Modal */}
      <OutlineNav
        isOpen={isOutlineOpen}
        onClose={() => setIsOutlineOpen(false)}
        outline={outlineItems}
        activeId={activeSectionId}
        onSelectSection={(id) => {
          handleJumpToSection(id);
          setIsOutlineOpen(false);
        }}
        theme={theme}
      />

      {/* Verse Modal */}
      {isVerseModalOpen && activeVerse && (
        <VerseModal
          isOpen={isVerseModalOpen}
          onClose={() => setIsVerseModalOpen(false)}
          verseData={activeVerse}
          theme={theme}
        />
      )}

      {/* Finish Sermon & Record Delivery History Modal */}
      <FinishSermonModal
        isOpen={isFinishModalOpen}
        onClose={() => setIsFinishModalOpen(false)}
        onConfirmSave={handleConfirmSaveDelivery}
        onExitWithoutSaving={() => router.push('/')}
        actualDurationSeconds={timer.elapsedSeconds}
        targetDurationMinutes={timer.targetMinutes}
        sermonTitle={sermon.title}
        theme={theme}
      />
    </div>
  );
}

export default function PulpitPage() {
  return (
    <Suspense
      fallback={
        <div className="w-screen h-screen bg-black flex items-center justify-center text-amber-400 text-sm font-semibold">
          Загрузка кафедры...
        </div>
      }
    >
      <PulpitContent />
    </Suspense>
  );
}
