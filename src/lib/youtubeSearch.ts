import type { Song } from "@/data/mockSongs";

// --- Search cache (localStorage) ---
const SEARCH_CACHE_KEY = "demus_search_cache";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const MAX_CACHE_ENTRIES = 100;

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
    const entries = Object.entries(cache).sort(([, a], [, b]) => b.ts - a.ts);
    entries.slice(50).forEach(([key]) => delete cache[key]);
    try { localStorage.setItem(SEARCH_CACHE_KEY, JSON.stringify(cache)); } catch {}
  }
}
function cacheKeyFor(query: string, filter: string): string {
  return `${filter}:${query.toLowerCase().trim()}`;
}

// --- Invidious instances (CORS-friendly, direct search) ---
const INVIDIOUS_INSTANCES = [
  "https://inv.nadeko.net",
  "https://invidious.nerdvpn.de",
  "https://invidious.jing.rocks",
  "https://vid.puffyan.us",
  "https://invidious.no-logs.com",
  "https://inv.us.projectsegfau.lt",
  "https://invidious.io.lol",
  "https://inv.tux.digital",
  "https://invidious.perennialte.ch",
  "https://iv.melmac.space"
];

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

/**
 * Perform a parallel search across multiple Invidious instances.
 * This is the ultimate "send-to-send" approach using the user's IP.
 */
async function searchParallel(query: string, filter: string): Promise<Song[]> {
  const typeParam = filter === "songs" ? "music" : filter === "artists" ? "channel" : filter === "albums" ? "playlist" : "all";
  
  // Pick 4 random instances to avoid overloading any single one and improve speed
  const shuffled = [...INVIDIOUS_INSTANCES].sort(() => 0.5 - Math.random());
  const targets = shuffled.slice(0, 4);

  const fetchFromInstance = async (base: string): Promise<Song[]> => {
    const url = `${base}/api/v1/search?q=${encodeURIComponent(query)}&type=${typeParam === "all" ? "video" : typeParam}&sort_by=relevance&region=BR`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!response.ok) throw new Error("Instance error");
      const data: InvidiousVideo[] = await response.json();
      return data.filter(item => item.videoId).slice(0, 25).map(videoToSong);
    } catch (err) {
      throw err;
    }
  };

  try {
    // Return the results from the FIRST instance that succeeds
    return await Promise.any(targets.map(fetchFromInstance));
  } catch (err) {
    console.warn("All parallel search instances failed or timed out.");
    return [];
  }
}

export async function searchYouTubeMusic(
  query: string,
  filter: string = "all"
): Promise<Song[]> {
  if (!query || query.length < 2) return [];

  const key = cacheKeyFor(query, filter);
  const cache = getCache();
  const cached = cache[key];
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.results;
  }

  try {
    const songs = await searchParallel(query, filter);

    if (songs.length > 0) {
      const updated = getCache();
      updated[key] = { results: songs, ts: Date.now() };
      setCache(updated);
    }

    return songs;
  } catch (err) {
    console.error("YouTube search error:", err);
    return cached?.results || [];
  }
}

// --- Suggestions (JSONP, 100% client-side) ---
export async function getSearchSuggestions(query: string): Promise<string[]> {
  if (!query || query.length < 2) return [];

  try {
    const url = `https://suggestqueries.google.com/complete/search?client=youtube&ds=yt&q=${encodeURIComponent(query)}`;

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
