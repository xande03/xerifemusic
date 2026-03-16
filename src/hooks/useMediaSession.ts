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
  }, [song?.id, song?.title, song?.artist, song?.album, song?.cover]);

  // Set action handlers
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;

    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ["play", () => callbacksRef.current.onPlay()],
      ["pause", () => callbacksRef.current.onPause()],
      ["previoustrack", () => callbacksRef.current.onPrev()],
      ["nexttrack", () => callbacksRef.current.onNext()],
      ["seekto", (details) => {
        if (details.seekTime != null && callbacksRef.current.onSeek) {
          callbacksRef.current.onSeek(details.seekTime);
        }
      }],
    ];

    for (const [action, handler] of handlers) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch { /* unsupported action */ }
    }

    return () => {
      for (const [action] of handlers) {
        try { navigator.mediaSession.setActionHandler(action, null); } catch {}
      }
    };
  }, []);

  // Update playback state
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [isPlaying]);

  // Update position state
  useEffect(() => {
    if (!("mediaSession" in navigator) || !duration) return;
    try {
      navigator.mediaSession.setPositionState({
        duration: duration,
        playbackRate: 1,
        position: Math.min(currentTime, duration),
      });
    } catch { /* ignore */ }
  }, [currentTime, duration]);
}
