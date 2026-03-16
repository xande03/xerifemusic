import type { Song } from "@/data/mockSongs";

export interface YouTubeSearchResult {
  id: string;
  youtubeId: string;
  title: string;
  artist: string;
  album: string;
  cover: string;
  duration: number;
}

// --- Search cache ---
const SEARCH_CACHE_KEY = "demus_search_cache";
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const MAX_CACHE_ENTRIES = 50;

interface CacheEntry {
  results: Song[];
  ts: number;
}

type SearchCache = Record<string, CacheEntry>;

function getCache(): SearchCache {
  try {
    return JSON.parse(localStorage.getItem(SEARCH_CACHE_KEY) || "{}");
  } catch {
    return {};
  }
}

function setCache(cache: SearchCache): void {
  try {
    localStorage.setItem(SEARCH_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Storage full – prune and retry
    pruneCache(cache, MAX_CACHE_ENTRIES / 2);
    try {
      localStorage.setItem(SEARCH_CACHE_KEY, JSON.stringify(cache));
    } catch { /* give up */ }
  }
}

function pruneCache(cache: SearchCache, keepCount: number): void {
  const entries = Object.entries(cache).sort(([, a], [, b]) => b.ts - a.ts);
  const toRemove = entries.slice(keepCount);
  toRemove.forEach(([key]) => delete cache[key]);
}

function cacheKey(query: string, filter: string): string {
  return `${filter}:${query.toLowerCase().trim()}`;
}

function mapToSongs(results: YouTubeSearchResult[]): Song[] {
  return results.map((r) => ({
    id: r.id,
    youtubeId: r.youtubeId,
    title: r.title,
    artist: r.artist,
    album: r.album,
    cover: r.cover || "/placeholder.svg",
    duration: r.duration || 0,
    votes: 0,
    isDownloaded: false,
  }));
}

export async function searchYouTubeMusic(
  query: string,
  filter: string = "all"
): Promise<Song[]> {
  if (!query || query.length < 2) return [];

  const key = cacheKey(query, filter);

  // Check cache first
  const cache = getCache();
  const cached = cache[key];
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.results;
  }

  try {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const url = `https://${projectId}.supabase.co/functions/v1/youtube-search?q=${encodeURIComponent(query)}&filter=${encodeURIComponent(filter)}`;

    const response = await fetch(url, {
      headers: {
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "",
      },
    });

    if (!response.ok) throw new Error(`Search failed: ${response.status}`);

    const json = await response.json();
    const songs = mapToSongs(json.results || []);

    // Save to cache
    if (songs.length > 0) {
      const updated = getCache();
      updated[key] = { results: songs, ts: Date.now() };
      // Prune if over limit
      if (Object.keys(updated).length > MAX_CACHE_ENTRIES) {
        pruneCache(updated, MAX_CACHE_ENTRIES);
      }
      setCache(updated);
    }

    return songs;
  } catch (err) {
    console.error("YouTube search error:", err);
    // Return stale cache if available (offline fallback)
    if (cached) return cached.results;
    return [];
  }
}

export async function getSearchSuggestions(query: string): Promise<string[]> {
  if (!query || query.length < 2) return [];

  try {
    const url = `https://clients1.google.com/complete/search?client=youtube&ds=yt&q=${encodeURIComponent(query)}`;

    return new Promise((resolve) => {
      const callbackName = `ytSuggest_${Date.now()}`;

      (window as any)[callbackName] = (data: any) => {
        try {
          const suggestions = data[1]?.map((item: any) => item[0]) || [];
          resolve(suggestions.slice(0, 8));
        } catch {
          resolve([]);
        }
        delete (window as any)[callbackName];
        script.remove();
      };

      const script = document.createElement("script");
      script.src = `${url}&callback=${callbackName}`;
      script.onerror = () => {
        resolve([]);
        delete (window as any)[callbackName];
        script.remove();
      };
      document.head.appendChild(script);

      setTimeout(() => {
        if ((window as any)[callbackName]) {
          resolve([]);
          delete (window as any)[callbackName];
          script.remove();
        }
      }, 3000);
    });
  } catch {
    return [];
  }
}
