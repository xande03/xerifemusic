import { useState, useEffect } from "react";
import type { Song } from "@/data/mockSongs";

const TRENDING_CACHE_KEY = "demus_trending_cache";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface CachedTrending {
  songs: Song[];
  ts: number;
}

function getCachedTrending(): CachedTrending | null {
  try {
    const raw = localStorage.getItem(TRENDING_CACHE_KEY);
    if (!raw) return null;
    const cached: CachedTrending = JSON.parse(raw);
    if (Date.now() - cached.ts < CACHE_TTL_MS && cached.songs.length > 0) {
      return cached;
    }
    return null;
  } catch {
    return null;
  }
}

function setCachedTrending(songs: Song[]): void {
  try {
    localStorage.setItem(TRENDING_CACHE_KEY, JSON.stringify({ songs, ts: Date.now() }));
  } catch {}
}

async function fetchTrendingViaEdgeFunction(): Promise<Song[]> {
  // Supabase connection disabled as requested. 
  // Returning empty list to trigger local fallback in components.
  return [];
}

export function useTrendingMusic() {
  const [trendingSongs, setTrendingSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const cached = getCachedTrending();
      if (cached) {
        setTrendingSongs(cached.songs);
        setIsLoading(false);
        // Refresh in background
        fetchTrendingViaEdgeFunction().then((fresh) => {
          if (!cancelled && fresh.length > 0) {
            setTrendingSongs(fresh);
            setCachedTrending(fresh);
          }
        });
        return;
      }

      setIsLoading(true);
      const songs = await fetchTrendingViaEdgeFunction();
      if (!cancelled) {
        setTrendingSongs(songs);
        if (songs.length > 0) setCachedTrending(songs);
        setIsLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, []);

  return { trendingSongs, isLoading };
}
