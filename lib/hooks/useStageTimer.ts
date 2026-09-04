'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { StageLightState, StageTimerStatus } from '@/lib/types';

interface UseStageTimerProps {
  initialMinutes?: number;
  onTimeWarning?: () => void;
  onTimeDanger?: () => void;
}

export function useStageTimer({ initialMinutes = 30, onTimeWarning, onTimeDanger }: UseStageTimerProps = {}) {
  const [targetMinutes, setTargetMinutes] = useState(initialMinutes);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [status, setStatus] = useState<StageTimerStatus>('ready');

  const totalTargetSeconds = targetMinutes * 60;
  const remainingSeconds = totalTargetSeconds - elapsedSeconds;

  // Sync targetMinutes when initialMinutes changes (e.g. after sermon finishes loading from localStorage)
  const lastInitialMinutesRef = useRef(initialMinutes);
  useEffect(() => {
    if (lastInitialMinutesRef.current !== initialMinutes) {
      lastInitialMinutesRef.current = initialMinutes;
      if (status === 'ready') {
        setTargetMinutes(initialMinutes);
      }
    }
  }, [initialMinutes, status]);
  
  // Calculate light state
  let lightState: StageLightState = 'normal';
  if (remainingSeconds <= 0) {
    lightState = 'overtime';
  } else if (remainingSeconds <= 120) { // 2 minutes or less
    lightState = 'danger';
  } else if (remainingSeconds <= 300) { // 5 minutes or less
    lightState = 'warning';
  }

  // Refs for callbacks to avoid re-triggering
  const warningCalled = useRef(false);
  const dangerCalled = useRef(false);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (status === 'running') {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status]);

  useEffect(() => {
    if (status === 'running') {
      if (lightState === 'warning' && !warningCalled.current) {
        warningCalled.current = true;
        onTimeWarning?.();
      }
      if (lightState === 'danger' && !dangerCalled.current) {
        dangerCalled.current = true;
        onTimeDanger?.();
      }
    }
  }, [lightState, status, onTimeWarning, onTimeDanger]);

  const start = useCallback(() => setStatus('running'), []);
  const pause = useCallback(() => setStatus('paused'), []);
  const toggle = useCallback(() => {
    setStatus((prev) => (prev === 'running' ? 'paused' : 'running'));
  }, []);
  const reset = useCallback(() => {
    setStatus('ready');
    setElapsedSeconds(0);
    warningCalled.current = false;
    dangerCalled.current = false;
  }, []);

  const addMinutes = useCallback((mins: number) => {
    setTargetMinutes((prev) => Math.max(1, prev + mins));
  }, []);

  // Format helpers
  const formatTime = (secs: number) => {
    const isNegative = secs < 0;
    const absSecs = Math.abs(secs);
    const m = Math.floor(absSecs / 60);
    const s = absSecs % 60;
    return `${isNegative ? '+' : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return {
    targetMinutes,
    setTargetMinutes,
    elapsedSeconds,
    remainingSeconds,
    status,
    lightState,
    start,
    pause,
    toggle,
    reset,
    addMinutes,
    formattedElapsed: formatTime(elapsedSeconds),
    formattedRemaining: formatTime(remainingSeconds),
    isOvertime: remainingSeconds < 0,
  };
}
