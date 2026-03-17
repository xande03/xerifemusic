import { useEffect, useRef, useCallback } from "react";

/**
 * Hook to enable native-like behavior on iOS and Android browsers:
 * - Screen Wake Lock (keeps screen on during playback)
 * - Orientation unlock (allows rotation)
 * - Prevents pull-to-refresh
 * - iOS audio session keep-alive
 */
export function useNativeCapabilities(isPlaying: boolean) {
  const wakeLockRef = useRef<any>(null);

  // Screen Wake Lock — keep screen on while playing
  const requestWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        wakeLockRef.current.addEventListener('release', () => {
          wakeLockRef.current = null;
        });
      }
    } catch {
      // WakeLock request failed (e.g., low battery)
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    try {
      if (wakeLockRef.current) {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    } catch { }
  }, []);

  // Auto-manage WakeLock based on playback state
  useEffect(() => {
    if (isPlaying) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }
    return () => { releaseWakeLock(); };
  }, [isPlaying, requestWakeLock, releaseWakeLock]);

  // Re-acquire WakeLock when page becomes visible again
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && isPlaying) {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isPlaying, requestWakeLock]);

  // Prevent pull-to-refresh on Android Chrome (overscroll)
  useEffect(() => {
    const preventOverscroll = (e: TouchEvent) => {
      // Allow scrolling inside scrollable containers
      const target = e.target as HTMLElement;
      if (target.closest('.overflow-y-auto, .overflow-y-scroll, [data-scrollable]')) return;
      
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        if (touch.clientY < 10) {
          e.preventDefault();
        }
      }
    };
    
    document.addEventListener('touchmove', preventOverscroll, { passive: false });
    return () => document.removeEventListener('touchmove', preventOverscroll);
  }, []);

  // Unlock orientation for the whole app (allows rotation in fullscreen)
  useEffect(() => {
    try {
      if (screen.orientation && (screen.orientation as any).unlock) {
        (screen.orientation as any).unlock();
      }
    } catch { }
  }, []);
}

/**
 * Request persistent storage (prevents browser from clearing IndexedDB/cache)
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (navigator.storage && navigator.storage.persist) {
      return await navigator.storage.persist();
    }
  } catch { }
  return false;
}

/**
 * Check if app is running as installed PWA
 */
export function isInstalledPWA(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return await Notification.requestPermission();
}
