'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { OutlineItem, Sermon, ThemeMode, VerseData } from '@/lib/types';

export default function PulpitPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sermonId = searchParams.get('id') || SAMPLE_SERMONS[0].id;

  const [sermon, setSermon] = useState<Sermon>(SAMPLE_SERMONS[0]);
  const [theme, setTheme] = useState<ThemeMode>('oled');
  const [fontSize, setFontSize] = useState(34); // Optimal tablet readable size
  const [isOutlineOpen, setIsOutlineOpen] = useState(false);
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

  // Autoscroll engine
  const autoscroll = useAutoscroll({
    containerRef,
    initialSpeed: 3,
  });

  // Extract Outline from H1/H2
  const outline = useMemo<OutlineItem[]>(() => {
    const items: OutlineItem[] = [];
    const lines = sermon.content.split('\n');
    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('# ')) {
        items.push({
          id: `heading-${idx}`,
          title: trimmed.replace('# ', ''),
          level: 1,
        });
      } else if (trimmed.startsWith('## ')) {
        items.push({
          id: `heading-${idx}`,
          title: trimmed.replace('## ', ''),
          level: 2,
        });
      }
    });
    return items;
  }, [sermon.content]);

  // Set initial active section
  useEffect(() => {
    if (outline.length > 0 && !activeSectionId) {
      setActiveSectionId(outline[0].id);
    }
  }, [outline, activeSectionId]);

  // Track active section on scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (outline.length === 0) return;

      const containerTop = container.getBoundingClientRect().top;
      let currentActive = outline[0].id;

      for (const item of outline) {
        const el = document.getElementById(item.id);
        if (el) {
          const rect = el.getBoundingClientRect();
          // If heading is at or above middle of container
          if (rect.top - containerTop <= 220) {
            currentActive = item.id;
          }
        }
      }

      setActiveSectionId(currentActive);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [outline]);

  // Calculate word count
  const wordCount = useMemo(() => {
    return sermon.content.trim().split(/\s+/).filter(Boolean).length;
  }, [sermon.content]);

  // Handle section jump
  const handleSelectSection = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el && containerRef.current) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSectionId(id);
    }
  }, []);

  const handleOpenVerse = (verseData: VerseData) => {
    setActiveVerse(verseData);
    setIsVerseModalOpen(true);
  };

  // Clicker / Keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Space: Toggle autoscroll (or start timer)
      if (e.code === 'Space' && !isVerseModalOpen) {
        e.preventDefault();
        autoscroll.togglePlay();
        if (timer.status === 'ready') {
          timer.start();
        }
      } else if (e.code === 'ArrowUp' || e.code === 'PageUp') {
        if (e.shiftKey) {
          autoscroll.increaseSpeed();
        } else if (containerRef.current) {
          containerRef.current.scrollBy({ top: -150, behavior: 'smooth' });
        }
      } else if (e.code === 'ArrowDown' || e.code === 'PageDown') {
        if (e.shiftKey) {
          autoscroll.decreaseSpeed();
        } else if (containerRef.current) {
          containerRef.current.scrollBy({ top: 150, behavior: 'smooth' });
        }
      } else if (e.key === 'Escape') {
        if (isVerseModalOpen) {
          setIsVerseModalOpen(false);
        } else if (isOutlineOpen) {
          setIsOutlineOpen(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVerseModalOpen, isOutlineOpen, autoscroll, timer]);

  // Stage perimeter light styles
  const getStageBorderLight = () => {
    switch (timer.lightState) {
      case 'overtime':
        return 'shadow-[inset_0_0_50px_rgba(239,68,68,0.5)] border-red-600/80';
      case 'danger':
        return 'shadow-[inset_0_0_35px_rgba(249,115,22,0.35)] border-orange-500/60';
      case 'warning':
        return 'shadow-[inset_0_0_25px_rgba(234,179,8,0.25)] border-yellow-500/40';
      default:
        return 'border-transparent';
    }
  };

  return (
    <div
      className={`relative w-screen h-screen overflow-hidden flex flex-col transition-all duration-300 border-4 ${getStageBorderLight()} ${
        theme === 'oled' ? 'bg-black' : theme === 'sepia' ? 'bg-[#fbf0d9]' : 'bg-white'
      }`}
    >
      {/* Top Left Floating Stage Timer Widget (Option A) */}
      <StageTimer
        status={timer.status}
        elapsedFormatted={timer.formattedElapsed}
        remainingFormatted={timer.formattedRemaining}
        lightState={timer.lightState}
        targetMinutes={timer.targetMinutes}
        wordCount={wordCount}
        theme={theme}
        onToggle={timer.toggle}
        onReset={timer.reset}
        onAddMinutes={timer.addMinutes}
      />

      {/* Right-Side Stage Rail Navigation (Option 1) */}
      <StageRailNav
        outline={outline}
        activeId={activeSectionId}
        onSelectSection={handleSelectSection}
        theme={theme}
      />

      {/* Main Full-Height Teleprompter Area */}
      <main className="flex-1 overflow-hidden relative">
        <Teleprompter
          content={sermon.content}
          fontSize={fontSize}
          theme={theme}
          containerRef={containerRef}
          onOpenVerse={handleOpenVerse}
        />
      </main>

      {/* Floating Auto-Hiding Pulpit Controls HUD */}
      <PulpitControls
        fontSize={fontSize}
        onIncreaseFont={() => setFontSize((f) => Math.min(56, f + 2))}
        onDecreaseFont={() => setFontSize((f) => Math.max(20, f - 2))}
        theme={theme}
        onSetTheme={setTheme}
        isAutoscrolling={autoscroll.isPlaying}
        autoscrollSpeed={autoscroll.speed}
        onToggleAutoscroll={autoscroll.togglePlay}
        onIncreaseSpeed={autoscroll.increaseSpeed}
        onDecreaseSpeed={autoscroll.decreaseSpeed}
        isWakeLockActive={isWakeLockActive}
        onToggleOutline={() => setIsOutlineOpen(!isOutlineOpen)}
        onExit={() => router.push('/')}
      />

      {/* Outline Drawer (Optional Detailed View) */}
      <OutlineNav
        isOpen={isOutlineOpen}
        onClose={() => setIsOutlineOpen(false)}
        outline={outline}
        activeId={activeSectionId}
        onSelectSection={handleSelectSection}
        theme={theme}
      />

      {/* Scripture Verses Modal / Bottom Sheet */}
      <VerseModal
        isOpen={isVerseModalOpen}
        verseData={activeVerse}
        onClose={() => setIsVerseModalOpen(false)}
        theme={theme}
      />
    </div>
  );
}
