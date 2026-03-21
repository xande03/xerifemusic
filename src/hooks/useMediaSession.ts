import { useEffect, useCallback, useRef } from "react";
import type { Song } from "@/data/mockSongs";

interface UseMediaSessionOptions {
  song: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek?: (time: number) => void;
}

export function useMediaSession({
  song,
  isPlaying,
  currentTime,
  duration,
  onPlay,
  onPause,
  onNext,
  onPrev,
  onSeek,
}: UseMediaSessionOptions) {
  const callbacksRef = useRef({ onPlay, onPause, onNext, onPrev, onSeek });
  callbacksRef.current = { onPlay, onPause, onNext, onPrev, onSeek };

  // Helper to (re-)register all action handlers — must be called after
  // every metadata update because the YouTube iframe's own media-session
  // can override ours whenever its internal player state changes.
  const setHandlers = useCallback(() => {
    if (!("mediaSession" in navigator)) return;

    const handlers: [MediaSessionAction, MediaSessionActionHandler | null][] = [
      ["play", () => callbacksRef.current.onPlay()],
      ["pause", () => callbacksRef.current.onPause()],
      ["previoustrack", () => callbacksRef.current.onPrev()],
      ["nexttrack", () => callbacksRef.current.onNext()],
      ["seekto", (details) => {
        if (details.seekTime != null && callbacksRef.current.onSeek) {
          callbacksRef.current.onSeek(details.seekTime);
        }
      }],
      // Explicitly nullify seek-backward/forward so iOS shows
      // previoustrack / nexttrack buttons instead of ±10 s skip
      ["seekbackward", null],
      ["seekforward", null],
    ];

    for (const [action, handler] of handlers) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch { /* unsupported action */ }
    }
  }, []);

  // Set metadata when song changes
  useEffect(() => {
    if (!("mediaSession" in navigator) || !song) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: song.title,
      artist: song.artist,
      album: song.album,
      artwork: [
        { src: song.cover, sizes: "96x96", type: "image/jpeg" },
        { src: song.cover, sizes: "128x128", type: "image/jpeg" },
        { src: song.cover, sizes: "192x192", type: "image/jpeg" },
        { src: song.cover, sizes: "256x256", type: "image/jpeg" },
        { src: song.cover, sizes: "384x384", type: "image/jpeg" },
        { src: song.cover, sizes: "512x512", type: "image/jpeg" },
      ],
    });

    // Re-assert handlers after metadata change
    setHandlers();
  }, [song?.id, song?.title, song?.artist, song?.album, song?.cover, setHandlers]);

  // Set action handlers on mount
  useEffect(() => {
    setHandlers();

    return () => {
      if (!("mediaSession" in navigator)) return;
      const actions: MediaSessionAction[] = [
        "play", "pause", "previoustrack", "nexttrack", "seekto",
        "seekbackward", "seekforward",
      ];
      for (const action of actions) {
        try { navigator.mediaSession.setActionHandler(action, null); } catch {}
      }
    };
  }, [setHandlers]);

  // Re-assert handlers whenever playback state changes — this counters
  // the YouTube iframe overriding our media session controls
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
    // Re-register handlers to reclaim control from YouTube iframe
    setHandlers();
  }, [isPlaying, setHandlers]);

  // Update position state and re-assert handlers every tick (counteracts YouTube iframe hijacking)
  useEffect(() => {
    if (!("mediaSession" in navigator) || !duration) return;
    try {
      navigator.mediaSession.setPositionState({
        duration: duration,
        playbackRate: 1,
        position: Math.min(currentTime, duration),
      });
    } catch { /* ignore */ }
    // Re-register every ~5 s to prevent YT iframe from stealing session
    if (Math.round(currentTime) % 5 === 0) {
      setHandlers();
    }
  }, [currentTime, duration, setHandlers]);
}
