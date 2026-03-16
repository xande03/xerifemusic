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
const CACHE_TTL = 15 * 60 * 1000; // 15 min

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
    return cache[key].results;
  }

  try {
    const projectUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!projectUrl || !anonKey) throw new Error("Missing config");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(
      `${projectUrl}/functions/v1/youtube-general-search?q=${encodeURIComponent(query)}`,
      {
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${anonKey}`,
          apikey: anonKey,
        },
      }
    );
    clearTimeout(timeout);

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    const results: VideoResult[] = data.results || [];

    if (results.length > 0) {
      const updated = getCache();
      updated[key] = { results, ts: Date.now() };
      // Keep max 30 entries
      const entries = Object.entries(updated).sort(([, a], [, b]) => b.ts - a.ts);
      const trimmed = Object.fromEntries(entries.slice(0, 30));
      setCache(trimmed);
    }

    return results;
  } catch (err) {
    console.warn("General YouTube search failed:", err);
    return cache[key]?.results || [];
  }
}
