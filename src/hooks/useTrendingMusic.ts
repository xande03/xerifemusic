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
  try {
    const projectUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!projectUrl || !anonKey) throw new Error("Missing config");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(
      `${projectUrl}/functions/v1/youtube-trending?region=BR`,
      {
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${anonKey}`,
          apikey: anonKey,
        },
      }
    );
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const items = data.results || [];

    return items.map((v: any): Song => ({
      id: v.id || `trending-${v.youtubeId}`,
      youtubeId: v.youtubeId,
      title: v.title || "",
      artist: v.artist || "Desconhecido",
      album: v.album || v.title || "",
      cover: v.cover || "/placeholder.svg",
      duration: v.duration || 0,
      votes: v.votes || 0,
      isDownloaded: false,
    }));
  } catch (err) {
    console.warn("Trending edge function failed:", err);
    return [];
  }
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
