import { useEffect, useRef, useState, useCallback } from "react";

const IDLE_TIMEOUT_MS  = 30 * 60 * 1000; // 30 minutes of inactivity
const WARNING_SECONDS  = 60;              // countdown before sign-out

const ACTIVITY_EVENTS = [
  "mousemove", "mousedown", "keydown", "touchstart", "scroll",
] as const;

interface IdleTimeoutState {
  showWarning: boolean;
  secondsLeft: number;
  resetTimer: () => void;
}

export function useIdleTimeout(onIdle: () => void): IdleTimeoutState {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(WARNING_SECONDS);

  const idleTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearCountdown = () => {
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
  };

  const startCountdown = useCallback(() => {
    setSecondsLeft(WARNING_SECONDS);
    setShowWarning(true);
    clearCountdown();
    countdownRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          clearCountdown();
          onIdle();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }, [onIdle]);

  const resetTimer = useCallback(() => {
    // Cancel any existing timers
    if (idleTimer.current) clearTimeout(idleTimer.current);
    clearCountdown();
    setShowWarning(false);
    setSecondsLeft(WARNING_SECONDS);

    // Start fresh idle timer
    idleTimer.current = setTimeout(startCountdown, IDLE_TIMEOUT_MS);
  }, [startCountdown]);

  useEffect(() => {
    // Start the idle timer on mount
    resetTimer();

    // Listen for user activity
    const handleActivity = () => {
      if (!showWarning) resetTimer();
    };

    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, handleActivity, { passive: true }));

    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      clearCountdown();
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, handleActivity));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When warning is active, activity events should NOT reset (user must click "המשך")
  useEffect(() => {
    const handleActivity = () => {
      if (!showWarning) resetTimer();
    };
    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, handleActivity, { passive: true }));
    return () => {
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, handleActivity));
    };
  }, [showWarning, resetTimer]);

  return { showWarning, secondsLeft, resetTimer };
}
