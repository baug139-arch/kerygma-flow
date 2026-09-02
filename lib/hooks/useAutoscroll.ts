'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseAutoscrollProps {
  containerRef: React.RefObject<HTMLElement | null>;
  initialSpeed?: number; // 1 to 10
}

export function useAutoscroll({ containerRef, initialSpeed = 3 }: UseAutoscrollProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(initialSpeed); // 1 to 10
  const animFrameId = useRef<number | null>(null);
  const lastTimestamp = useRef<number | null>(null);

  const scrollStep = useCallback(
    (timestamp: number) => {
      if (!isPlaying || !containerRef.current) return;

      if (!lastTimestamp.current) {
        lastTimestamp.current = timestamp;
      }

      const elapsed = timestamp - lastTimestamp.current;
      lastTimestamp.current = timestamp;

      // Base pixels per second calculation based on speed level (1=15px/s, 10=150px/s)
      const pxPerSecond = speed * 16;
      const scrollDistance = (pxPerSecond * elapsed) / 1000;

      containerRef.current.scrollTop += scrollDistance;

      // Check if reached bottom
      const isAtBottom =
        containerRef.current.scrollHeight - containerRef.current.scrollTop <=
        containerRef.current.clientHeight + 5;

      if (isAtBottom) {
        setIsPlaying(false);
      } else {
        animFrameId.current = requestAnimationFrame(scrollStep);
      }
    },
    [isPlaying, speed, containerRef]
  );

  useEffect(() => {
    if (isPlaying) {
      lastTimestamp.current = null;
      animFrameId.current = requestAnimationFrame(scrollStep);
    } else {
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
        animFrameId.current = null;
      }
    }

    return () => {
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
      }
    };
  }, [isPlaying, scrollStep]);

  const togglePlay = useCallback(() => setIsPlaying((p) => !p), []);
  const play = useCallback(() => setIsPlaying(true), []);
  const pause = useCallback(() => setIsPlaying(false), []);

  const increaseSpeed = useCallback(() => setSpeed((s) => Math.min(10, s + 1)), []);
  const decreaseSpeed = useCallback(() => setSpeed((s) => Math.max(1, s - 1)), []);

  const scrollToTop = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [containerRef]);

  return {
    isPlaying,
    speed,
    setSpeed,
    togglePlay,
    play,
    pause,
    increaseSpeed,
    decreaseSpeed,
    scrollToTop,
  };
}
