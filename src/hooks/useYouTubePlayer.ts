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
  // Enable AirPlay on the audio element (Safari)
  silentAudio.setAttribute("x-webkit-airplay", "allow");
  
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
          autoplay: 1,
          controls: 1,
          modestbranding: 1,
          rel: 0,
          playsinline: 1, // Critical for iOS — prevents fullscreen
          iv_load_policy: 3,
          cc_load_policy: 0,
          fs: 0,
          disablekb: 1,
          origin: window.location.origin,
          // Workaround: enable JS API and allow autoplay with sound
          enablejsapi: 1,
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
      // Ensure user gesture audio session is active
      ensureSilentAudio().play().catch(() => {});
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

  const togglePiP = useCallback(async () => {
    try {
      const iframe = playerRef.current?.getIframe?.() as HTMLIFrameElement | null;
      if (!iframe) return;

      // Method 1: Try to access the video element inside the iframe (YouPIP approach)
      // This works when same-origin or when Safari allows access
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc) {
          const video = iframeDoc.querySelector('video');
          if (video) {
            // Safari/iOS: use webkitSetPresentationMode (the YouPIP shortcut technique)
            if ((video as any).webkitSetPresentationMode) {
              const currentMode = (video as any).webkitPresentationMode;
              if (currentMode === 'picture-in-picture') {
                (video as any).webkitSetPresentationMode('inline');
              } else {
                (video as any).webkitSetPresentationMode('picture-in-picture');
              }
              return;
            }
            // Standard PiP API
            if (video.requestPictureInPicture) {
              if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
              } else {
                await video.requestPictureInPicture();
              }
              return;
            }
          }
        }
      } catch (_crossOriginError) {
        // Cross-origin — expected, continue to fallback methods
      }

      // Method 2: Document PiP API (Chrome 116+)
      if ('documentPictureInPicture' in window) {
        const docPiP = (window as any).documentPictureInPicture;
        if (docPiP.window) {
          docPiP.window.close();
          return;
        }
        const pipWindow = await docPiP.requestWindow({ width: 320, height: 180 });
        const pipIframe = pipWindow.document.createElement('iframe');
        const videoId = state.videoId;
        if (videoId) {
          pipIframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1&controls=1`;
          pipIframe.style.cssText = 'width:100%;height:100%;border:none;';
          pipIframe.allow = 'autoplay; encrypted-media; picture-in-picture';
          pipWindow.document.body.style.margin = '0';
          pipWindow.document.body.style.overflow = 'hidden';
          pipWindow.document.body.appendChild(pipIframe);
        }
        return;
      }

      // Method 3: iOS Safari fallback — open embed in new page where native PiP controls work
      // Safari shows native PiP button on fullscreen video players
      const videoId = state.videoId;
      if (videoId) {
        // Use piped or embed URL that Safari can natively PiP from fullscreen
        const pipUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1&controls=1&fs=1`;
        
        // On iOS Safari, opening in a new tab allows the user to use Safari's native PiP
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        if (isIOS) {
          // Open in same window with a back option, or new tab
          window.open(pipUrl, '_blank');
        } else {
          window.open(
            pipUrl,
            'demus-pip',
            'width=400,height=225,top=50,left=50'
          );
        }
      }
    } catch (err) {
      console.warn('PiP not available:', err);
    }
  }, [state.videoId]);

  const requestAirPlay = useCallback(async (mode: 'audio' | 'video') => {
    try {
      if (mode === 'video') {
        // Try Remote Playback API on the iframe
        const iframe = playerRef.current?.getIframe?.() as HTMLIFrameElement | null;
        if (iframe && 'remote' in iframe) {
          await (iframe as any).remote.prompt();
          return;
        }
      }

      // For audio mode or fallback: use the silent audio element with AirPlay
      const audio = ensureSilentAudio();
      
      // Safari-specific: webkitShowPlaybackTargetPicker
      if ((audio as any).webkitShowPlaybackTargetPicker) {
        (audio as any).webkitShowPlaybackTargetPicker();
        return;
      }

      // Web Remote Playback API
      if ('remote' in audio) {
        await (audio as any).remote.prompt();
        return;
      }

      console.warn('AirPlay not supported on this browser');
    } catch (err) {
      console.warn('AirPlay error:', err);
    }
  }, []);

  return { state, loadVideo, play, pause, seekTo, setVolume, togglePiP, requestAirPlay };
}
