import { useEffect, useRef, useCallback, useState } from "react";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export interface YouTubePlayerState {
  isReady: boolean;
  isPlaying: boolean;
  isEnded: boolean;
  currentTime: number;
  duration: number;
  videoId: string | null;
}

let apiLoaded = false;
let apiReady = false;
const readyCallbacks: (() => void)[] = [];

function loadYouTubeAPI(): Promise<void> {
  return new Promise((resolve) => {
    if (apiReady) { resolve(); return; }
    readyCallbacks.push(resolve);
    if (apiLoaded) return;
    apiLoaded = true;

    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);

    window.onYouTubeIframeAPIReady = () => {
      apiReady = true;
      readyCallbacks.forEach((cb) => cb());
      readyCallbacks.length = 0;
    };
  });
}

// Silent audio element to keep iOS audio session alive in background
let silentAudio: HTMLAudioElement | null = null;

function ensureSilentAudio() {
  if (silentAudio) return silentAudio;
  
  // Create a tiny silent WAV as a data URI
  // This keeps the Web Audio session active on iOS even in background/lock screen
  const silentWav = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";
  silentAudio = new Audio(silentWav);
  silentAudio.loop = true;
  silentAudio.volume = 0.001; // Nearly silent
  silentAudio.setAttribute("playsinline", "true");
  silentAudio.setAttribute("webkit-playsinline", "true");
  
  return silentAudio;
}

export function useYouTubePlayer(containerId: string) {
  const playerRef = useRef<any>(null);
  const [state, setState] = useState<YouTubePlayerState>({
    isReady: false,
    isPlaying: false,
    isEnded: false,
    currentTime: 0,
    duration: 0,
    videoId: null,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const userGestureRef = useRef(false);

  // iOS requires a user gesture to start audio — capture first interaction
  useEffect(() => {
    const captureGesture = () => {
      if (userGestureRef.current) return;
      userGestureRef.current = true;

      // Start silent audio on first user interaction (iOS audio session)
      const audio = ensureSilentAudio();
      audio.play().catch(() => {});

      document.removeEventListener("touchstart", captureGesture);
      document.removeEventListener("click", captureGesture);
    };

    document.addEventListener("touchstart", captureGesture, { passive: true });
    document.addEventListener("click", captureGesture, { passive: true });

    return () => {
      document.removeEventListener("touchstart", captureGesture);
      document.removeEventListener("click", captureGesture);
    };
  }, []);

  useEffect(() => {
    loadYouTubeAPI().then(() => {
      const el = document.getElementById(containerId);
      if (!el) return;

      playerRef.current = new window.YT.Player(containerId, {
        height: "100%",
        width: "100%",
        playerVars: {
          autoplay: 0, // iOS blocks autoplay without gesture — start manually
          controls: 1,
          modestbranding: 1,
          rel: 0,
          playsinline: 1, // Critical for iOS — prevents fullscreen
          iv_load_policy: 3,
          cc_load_policy: 0,
          fs: 0,
          disablekb: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            setState((s) => ({ ...s, isReady: true }));
          },
          onStateChange: (event: any) => {
            const playing = event.data === window.YT.PlayerState.PLAYING;
            const ended = event.data === window.YT.PlayerState.ENDED;

            // Keep silent audio in sync — iOS needs an active audio element
            if (playing) {
              ensureSilentAudio().play().catch(() => {});
            }

            setState((s) => ({
              ...s,
              isPlaying: playing,
              isEnded: ended,
              duration: playerRef.current?.getDuration?.() || 0,
            }));
          },
          onError: (event: any) => {
            console.warn("YouTube player error:", event.data);
            // On error, try to continue to next song
            setState((s) => ({ ...s, isEnded: true, isPlaying: false }));
          },
        },
      });
    });

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      playerRef.current?.destroy?.();
    };
  }, [containerId]);

  // Track progress — use requestAnimationFrame-friendly interval
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (state.isPlaying) {
      intervalRef.current = setInterval(() => {
        const ct = playerRef.current?.getCurrentTime?.() || 0;
        const dur = playerRef.current?.getDuration?.() || 0;
        setState((s) => ({ ...s, currentTime: ct, duration: dur }));
      }, 500); // 500ms is enough and saves battery on mobile
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state.isPlaying]);

  const loadVideo = useCallback((videoId: string) => {
    if (playerRef.current?.loadVideoById) {
      playerRef.current.loadVideoById(videoId);
      setState((s) => ({ ...s, videoId, currentTime: 0, isEnded: false }));
    }
  }, []);

  const play = useCallback(() => playerRef.current?.playVideo?.(), []);
  const pause = useCallback(() => {
    playerRef.current?.pauseVideo?.();
    // Pause silent audio too to save battery
    silentAudio?.pause();
  }, []);
  const seekTo = useCallback((seconds: number) => playerRef.current?.seekTo?.(seconds, true), []);
  const setVolume = useCallback((vol: number) => playerRef.current?.setVolume?.(vol), []);

  return { state, loadVideo, play, pause, seekTo, setVolume };
}
