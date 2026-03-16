import { useState, useEffect } from "react";
import type { Song } from "@/data/mockSongs";

const TRENDING_CACHE_KEY = "demus_trending_cache";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const INVIDIOUS_INSTANCES = [
  "https://inv.nadeko.net",
  "https://invidious.nerdvpn.de",
  "https://invidious.jing.rocks",
  "https://vid.puffyan.us",
  "https://invidious.privacyredirect.com",
];

interface CachedTrending {
  songs: Song[];
  ts: number;
}

function cleanTitle(title: string): string {
  return title
    .replace(/\s*\(Official\s*(Music\s*)?Video\)/gi, "")
    .replace(/\s*\[Official\s*(Music\s*)?Video\]/gi, "")
    .replace(/\s*\(Lyrics?\)/gi, "")
    .replace(/\s*\[Lyrics?\]/gi, "")
    .replace(/\s*\(Audio\)/gi, "")
    .replace(/\s*\[Audio\]/gi, "")
    .replace(/\s*\(Clipe Oficial\)/gi, "")
    .replace(/\s*[-|]\s*Topic$/gi, "")
    .trim();
}

function getBestThumbnail(thumbnails?: { url: string; quality: string }[]): string {
  if (!thumbnails || thumbnails.length === 0) return "/placeholder.svg";
  const medium = thumbnails.find((t) => t.quality === "medium" || t.quality === "high");
  return medium?.url || thumbnails[0].url;
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

async function fetchTrendingFromInvidious(): Promise<Song[]> {
  for (let i = 0; i < INVIDIOUS_INSTANCES.length; i++) {
    const base = INVIDIOUS_INSTANCES[i];
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(`${base}/api/v1/trending?type=music&region=BR`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) continue;

      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) continue;

      return data
        .filter((v: any) => v.videoId && v.lengthSeconds > 30)
        .slice(0, 30)
        .map((v: any, idx: number): Song => ({
          id: `trending-${v.videoId}`,
          youtubeId: v.videoId,
          title: cleanTitle(v.title || ""),
          artist: (v.author || "Desconhecido").replace(/\s*[-|]\s*Topic$/i, ""),
          album: v.title || "",
          cover: getBestThumbnail(v.videoThumbnails),
          duration: v.lengthSeconds || 0,
          votes: Math.max(0, 100 - idx * 5 + Math.floor(Math.random() * 10)),
          isDownloaded: false,
        }));
    } catch {
      continue;
    }
  }
  return [];
}

export function useTrendingMusic() {
  const [trendingSongs, setTrendingSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      // Use cache first
      const cached = getCachedTrending();
      if (cached) {
        setTrendingSongs(cached.songs);
        setIsLoading(false);
        // Still refresh in background
        fetchTrendingFromInvidious().then((fresh) => {
          if (!cancelled && fresh.length > 0) {
            setTrendingSongs(fresh);
            setCachedTrending(fresh);
          }
        });
        return;
      }

      setIsLoading(true);
      const songs = await fetchTrendingFromInvidious();
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
