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
  isFullscreen: boolean;
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

// Silent audio element to keep iOS/Android audio session alive in background/lock screen
let silentAudio: HTMLAudioElement | null = null;
let audioContext: AudioContext | null = null;

/**
 * Creates a longer silent audio loop (1 second) that keeps the browser audio
 * session alive when the page loses visibility (lock screen, app switch).
 * Uses both an <audio> element AND a Web Audio API oscillator for maximum
 * compatibility across iOS Safari, Chrome Android, and desktop browsers.
 */
function ensureSilentAudio() {
  if (silentAudio) return silentAudio;

  // Generate a 1-second silent WAV (44100 Hz, 16-bit mono)
  // Longer duration = more reliable background keep-alive on iOS
  const sampleRate = 44100;
  const numSamples = sampleRate; // 1 second
  const dataSize = numSamples * 2; // 16-bit = 2 bytes per sample
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  // RIFF header
  const writeString = (offset: number, str: string) => { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)); };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true);  // PCM
  view.setUint16(22, 1, true);  // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true);  // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);
  // All samples = 0 (silence)

  const blob = new Blob([buffer], { type: 'audio/wav' });
  const url = URL.createObjectURL(blob);

  silentAudio = new Audio(url);
  silentAudio.loop = true;
  silentAudio.volume = 0.001; // Nearly silent
  silentAudio.setAttribute("playsinline", "true");
  silentAudio.setAttribute("webkit-playsinline", "true");
  silentAudio.setAttribute("x-webkit-airplay", "allow");

  // Also start a Web Audio API context — some Android browsers only
  // keep the audio session alive if an AudioContext is running
  try {
    if (!audioContext) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (AC) {
        audioContext = new AC();
        // Create silent oscillator
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        gain.gain.value = 0.001; // inaudible
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.start();
      }
    }
  } catch { /* AudioContext not available */ }

  return silentAudio;
}

/** Resume AudioContext if suspended (required after user gesture on iOS/Chrome) */
function resumeAudioContext() {
  if (audioContext && audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {});
  }
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
    isFullscreen: false,
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
          fs: 1,
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
      }, 200); // Increased frequency for better sync performance
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

  const togglePiP = useCallback(async (): Promise<'native' | 'fallback' | 'failed'> => {
    try {
      const iframe = playerRef.current?.getIframe?.() as HTMLIFrameElement | null;
      if (!iframe) return 'failed';

      // Method 1: Try to access the video element inside the iframe
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc) {
          const video = iframeDoc.querySelector('video');
          if (video) {
            if ((video as any).webkitSetPresentationMode) {
              const currentMode = (video as any).webkitPresentationMode;
              if (currentMode === 'picture-in-picture') {
                (video as any).webkitSetPresentationMode('inline');
              } else {
                (video as any).webkitSetPresentationMode('picture-in-picture');
              }
              return 'native';
            }
            if (video.requestPictureInPicture) {
              if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
              } else {
                await video.requestPictureInPicture();
              }
              return 'native';
            }
          }
        }
      } catch (_crossOriginError) {
        // Cross-origin — expected
      }

      // Method 2: Document PiP API (Chrome 116+)
      if ('documentPictureInPicture' in window) {
        const docPiP = (window as any).documentPictureInPicture;
        if (docPiP.window) {
          docPiP.window.close();
          return 'native';
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
        return 'native';
      }

      // Method 3: Fallback — use in-app floating mini player
      return 'fallback';
    } catch (err) {
      console.warn('PiP not available:', err);
      return 'failed';
    }
  }, [state.videoId]);

  const requestFullscreen = useCallback(async () => {
    try {
      // Target the dedicated fullscreen container that holds both the player and overlay
      const container = document.getElementById('yt-fullscreen-container');
      const target = container || playerRef.current?.getIframe?.()?.parentElement;
      if (!target) return;

      if (target.requestFullscreen) {
        await target.requestFullscreen();
      } else if ((target as any).webkitRequestFullscreen) {
        (target as any).webkitRequestFullscreen();
      } else if ((target as any).webkitEnterFullscreen) {
        (target as any).webkitEnterFullscreen();
      }

      // Lock to landscape on mobile for video rotation
      try {
        if (screen.orientation && (screen.orientation as any).lock) {
          await (screen.orientation as any).lock("landscape");
        }
      } catch {
        // orientation lock not supported or denied — that's fine
      }
    } catch (err) {
      console.warn("Fullscreen request failed:", err);
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
      // Unlock orientation on exit
      try {
        if (screen.orientation && (screen.orientation as any).unlock) {
          (screen.orientation as any).unlock();
        }
      } catch {}
    } catch (err) {
      console.warn("Exit fullscreen failed:", err);
    }
  }, []);

  // Track fullscreen state
  useEffect(() => {
    const handleFsChange = () => {
      const isFs = !!document.fullscreenElement || !!(document as any).webkitFullscreenElement;
      setState((s) => ({ ...s, isFullscreen: isFs }));
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    document.addEventListener("webkitfullscreenchange", handleFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFsChange);
      document.removeEventListener("webkitfullscreenchange", handleFsChange);
    };
  }, []);

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

  return { state, loadVideo, play, pause, seekTo, setVolume, togglePiP, requestAirPlay, requestFullscreen, exitFullscreen };
}
