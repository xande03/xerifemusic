import type { Song } from "@/data/mockSongs";
import { supabase } from "@/integrations/supabase/client";

// --- Search cache (localStorage) ---
const SEARCH_CACHE_KEY = "demus_search_cache";
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const MAX_CACHE_ENTRIES = 50;

interface CacheEntry {
  results: Song[];
  ts: number;
}
type SearchCache = Record<string, CacheEntry>;

function getCache(): SearchCache {
  try { return JSON.parse(localStorage.getItem(SEARCH_CACHE_KEY) || "{}"); } catch { return {}; }
}
function setCache(cache: SearchCache): void {
  try { localStorage.setItem(SEARCH_CACHE_KEY, JSON.stringify(cache)); } catch {
    pruneCache(cache, MAX_CACHE_ENTRIES / 2);
    try { localStorage.setItem(SEARCH_CACHE_KEY, JSON.stringify(cache)); } catch {}
  }
}
function pruneCache(cache: SearchCache, keepCount: number): void {
  const entries = Object.entries(cache).sort(([, a], [, b]) => b.ts - a.ts);
  entries.slice(keepCount).forEach(([key]) => delete cache[key]);
}
function cacheKeyFor(query: string, filter: string): string {
  return `${filter}:${query.toLowerCase().trim()}`;
}

// --- Invidious instances (fallback, CORS-friendly) ---
const INVIDIOUS_INSTANCES = [
  "https://inv.nadeko.net",
  "https://invidious.nerdvpn.de",
  "https://invidious.jing.rocks",
  "https://vid.puffyan.us",
  "https://invidious.privacyredirect.com",
];

let currentInstanceIdx = 0;

function getInvidiousUrl(): string {
  return INVIDIOUS_INSTANCES[currentInstanceIdx % INVIDIOUS_INSTANCES.length];
}

function rotateInstance(): void {
  currentInstanceIdx = (currentInstanceIdx + 1) % INVIDIOUS_INSTANCES.length;
}

interface InvidiousVideo {
  videoId: string;
  title: string;
  author: string;
  lengthSeconds: number;
  videoThumbnails?: { url: string; quality: string }[];
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
    .trim();
}

function getBestThumbnail(thumbnails?: { url: string; quality: string }[]): string {
  if (!thumbnails || thumbnails.length === 0) return "/placeholder.svg";
  // Prefer highest quality: maxres > high > medium > default
  const priorities = ["maxres", "maxresdefault", "high", "sddefault", "medium"];
  for (const q of priorities) {
    const match = thumbnails.find(t => t.quality === q);
    if (match) return match.url;
  }
  return thumbnails[thumbnails.length - 1]?.url || thumbnails[0].url;
}

function videoToSong(v: InvidiousVideo): Song {
  return {
    id: `yt-${v.videoId}`,
    youtubeId: v.videoId,
    title: cleanTitle(v.title),
    artist: v.author || "Desconhecido",
    album: v.title,
    cover: getBestThumbnail(v.videoThumbnails),
    duration: v.lengthSeconds || 0,
    votes: 0,
    isDownloaded: false,
    type: "video" as const,
  };
}

// --- Edge function search (primary, reliable in production) ---
async function searchViaEdgeFunction(query: string, filter: string): Promise<Song[]> {
  try {
    const projectUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    if (!projectUrl || !anonKey) return [];

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(
      `${projectUrl}/functions/v1/youtube-search?q=${encodeURIComponent(query)}&filter=${filter}`,
      {
        signal: controller.signal,
        headers: {
          "Authorization": `Bearer ${anonKey}`,
          "apikey": anonKey,
        },
      }
    );
    clearTimeout(timeout);

    if (!response.ok) throw new Error(`Edge fn HTTP ${response.status}`);

    const result = await response.json();
    const items = result.results || [];

    return items.map((item: any) => ({
      id: item.id || `yt-${item.youtubeId}`,
      youtubeId: item.youtubeId,
      title: item.title,
      artist: item.artist || "Desconhecido",
      album: item.album || item.title,
      cover: item.cover || "/placeholder.svg",
      duration: item.duration || 0,
      votes: 0,
      isDownloaded: false,
      type: (item.type === "music" ? "music" : "video") as "music" | "video",
    }));
  } catch (err) {
    console.warn("Edge function search failed:", err);
    return [];
  }
}

// --- Invidious fallback ---
async function fetchWithInvidious(query: string, filter: string): Promise<Song[]> {
  const typeParam = filter === "songs" ? "music" : filter === "artists" ? "channel" : filter === "albums" ? "playlist" : "all";
  
  for (let attempt = 0; attempt < 3; attempt++) {
    const base = getInvidiousUrl();
    const url = `${base}/api/v1/search?q=${encodeURIComponent(query)}&type=${typeParam === "all" ? "video" : typeParam}&sort_by=relevance&region=BR`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data: InvidiousVideo[] = await response.json();
      
      return data
        .filter((item: any) => item.videoId)
        .slice(0, 20)
        .map(videoToSong);
    } catch (err) {
      console.warn(`Invidious instance ${base} failed, rotating...`, err);
      rotateInstance();
    }
  }

  return [];
}

export async function searchYouTubeMusic(
  query: string,
  filter: string = "all"
): Promise<Song[]> {
  if (!query || query.length < 2) return [];

  const key = cacheKeyFor(query, filter);

  // Check cache first
  const cache = getCache();
  const cached = cache[key];
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.results;
  }

  try {
    // Try edge function first (works reliably in production)
    let songs = await searchViaEdgeFunction(query, filter);

    // Fallback to Invidious if edge function returned nothing
    if (songs.length === 0) {
      songs = await fetchWithInvidious(query, filter);
    }

    // Save to cache
    if (songs.length > 0) {
      const updated = getCache();
      updated[key] = { results: songs, ts: Date.now() };
      if (Object.keys(updated).length > MAX_CACHE_ENTRIES) {
        pruneCache(updated, MAX_CACHE_ENTRIES);
      }
      setCache(updated);
    }

    return songs;
  } catch (err) {
    console.error("YouTube search error:", err);
    if (cached) return cached.results;
    return [];
  }
}

// --- Suggestions (JSONP, 100% client-side) ---
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
        } catch { resolve([]); }
        delete (window as any)[callbackName];
        script.remove();
      };

      const script = document.createElement("script");
      script.src = `${url}&callback=${callbackName}`;
      script.onerror = () => { resolve([]); delete (window as any)[callbackName]; script.remove(); };
      document.head.appendChild(script);

      setTimeout(() => {
        if ((window as any)[callbackName]) { resolve([]); delete (window as any)[callbackName]; script.remove(); }
      }, 3000);
    });
  } catch { return []; }
}
