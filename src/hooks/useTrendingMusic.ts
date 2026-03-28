import { useState, useEffect } from "react";
import type { Song } from "@/data/mockSongs";
import { createFunctionHeaders, createFunctionUrl, getBackendConfig } from "@/lib/backendConfig";

const TRENDING_CACHE_KEY = "demus_trending_cache";
const CACHE_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours — trending rarely changes

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
    const { usingFallback } = getBackendConfig();

    console.log("[Trending] Edge fn attempt:", { usingFallback });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const url = createFunctionUrl("youtube-trending", { region: "BR" });
    console.log("[Trending] Calling:", url);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: createFunctionHeaders(),
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.error("[Trending] HTTP error:", res.status);
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    const items = data.results || [];
    console.log("[Trending] Got", items.length, "results");

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
    console.error("[Trending] Edge function failed:", err);
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
        // Skip background refresh — cache is valid for 4h
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
