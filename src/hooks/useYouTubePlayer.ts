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
    if (apiReady) {
      resolve();
      return;
    }
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

export function useYouTubePlayer(containerId: string) {
  const playerRef = useRef<any>(null);
  const [state, setState] = useState<YouTubePlayerState>({
    isReady: false,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    videoId: null,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    loadYouTubeAPI().then(() => {
      const el = document.getElementById(containerId);
      if (!el) return;

      playerRef.current = new window.YT.Player(containerId, {
        height: "0",
        width: "0",
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
        },
        events: {
          onReady: () => {
            setState((s) => ({ ...s, isReady: true }));
          },
          onStateChange: (event: any) => {
            const playing = event.data === window.YT.PlayerState.PLAYING;
            setState((s) => ({
              ...s,
              isPlaying: playing,
              duration: playerRef.current?.getDuration?.() || 0,
            }));
          },
        },
      });
    });

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      playerRef.current?.destroy?.();
    };
  }, [containerId]);

  // Track progress
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (state.isPlaying) {
      intervalRef.current = setInterval(() => {
        const ct = playerRef.current?.getCurrentTime?.() || 0;
        const dur = playerRef.current?.getDuration?.() || 0;
        setState((s) => ({ ...s, currentTime: ct, duration: dur }));
      }, 250);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state.isPlaying]);

  const loadVideo = useCallback((videoId: string) => {
    if (playerRef.current?.loadVideoById) {
      playerRef.current.loadVideoById(videoId);
      setState((s) => ({ ...s, videoId, currentTime: 0 }));
    }
  }, []);

  const play = useCallback(() => playerRef.current?.playVideo?.(), []);
  const pause = useCallback(() => playerRef.current?.pauseVideo?.(), []);
  const seekTo = useCallback((seconds: number) => playerRef.current?.seekTo?.(seconds, true), []);
  const setVolume = useCallback((vol: number) => playerRef.current?.setVolume?.(vol), []);

  return { state, loadVideo, play, pause, seekTo, setVolume };
}
