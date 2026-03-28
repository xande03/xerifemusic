import { createFunctionHeaders, createFunctionUrl, getBackendConfig } from "@/lib/backendConfig";

export interface VideoResult {
  videoId: string;
  title: string;
  channel: string;
  channelThumbnail: string;
  thumbnail: string;
  duration: string;
  views: string;
  publishedTime: string;
  lengthSeconds: number;
  description: string;
}

const CACHE_KEY = "demus_explore_cache";
const CACHE_TTL = 2 * 60 * 60 * 1000; // 2 hours

interface CacheEntry {
  results: VideoResult[];
  ts: number;
}

function getCache(): Record<string, CacheEntry> {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}"); } catch { return {}; }
}

function setCache(cache: Record<string, CacheEntry>): void {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch {}
}

export async function searchYouTubeGeneral(query: string): Promise<VideoResult[]> {
  if (!query || query.length < 2) return [];

  const key = query.toLowerCase().trim();
  const cache = getCache();
  if (cache[key] && Date.now() - cache[key].ts < CACHE_TTL) {
    console.log("[GeneralSearch] Cache hit for:", key);
    return cache[key].results;
  }

  try {
    const { usingFallback } = getBackendConfig();

    console.log("[GeneralSearch] Edge fn attempt:", { usingFallback, query });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const url = createFunctionUrl("youtube-general-search", { q: query });
    console.log("[GeneralSearch] Calling:", url);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: createFunctionHeaders(),
    });
    clearTimeout(timeout);

    if (!response.ok) {
      console.error("[GeneralSearch] HTTP error:", response.status);
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const results: VideoResult[] = data.results || [];
    console.log("[GeneralSearch] Got", results.length, "results");

    if (results.length > 0) {
      const updated = getCache();
      updated[key] = { results, ts: Date.now() };
      const entries = Object.entries(updated).sort(([, a], [, b]) => b.ts - a.ts);
      const trimmed = Object.fromEntries(entries.slice(0, 30));
      setCache(trimmed);
    }

    return results;
  } catch (err) {
    console.error("[GeneralSearch] Failed:", err);
    return cache[key]?.results || [];
  }
}
