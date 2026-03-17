import type { VideoResult } from "./youtubeGeneralSearch";

export interface Comment {
  author: string;
  authorThumbnail: string;
  content: string;
  likes: number;
  publishedTime: string;
  isHearted: boolean;
}

export interface VideoInfo {
  relatedVideos: VideoResult[];
  comments: Comment[];
}

const CACHE_KEY = "demus_video_info_cache";
const CACHE_TTL = 10 * 60 * 1000; // 10 min

function getCache(): Record<string, { data: VideoInfo; ts: number }> {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}"); } catch { return {}; }
}

function setCache(cache: Record<string, { data: VideoInfo; ts: number }>): void {
  try {
    const entries = Object.entries(cache).sort(([, a], [, b]) => b.ts - a.ts).slice(0, 20);
    localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {}
}

export async function fetchVideoInfo(videoId: string): Promise<VideoInfo> {
  if (!videoId) return { relatedVideos: [], comments: [] };

  const cache = getCache();
  if (cache[videoId] && Date.now() - cache[videoId].ts < CACHE_TTL) {
    return cache[videoId].data;
  }

  try {
    const projectUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!projectUrl || !anonKey) throw new Error("Missing config");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(
      `${projectUrl}/functions/v1/youtube-video-info?videoId=${encodeURIComponent(videoId)}`,
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
    const result: VideoInfo = {
      relatedVideos: data.relatedVideos || [],
      comments: data.comments || [],
    };

    // Only cache if we got actual data
    if (result.relatedVideos.length > 0 || result.comments.length > 0) {
      const updated = getCache();
      updated[videoId] = { data: result, ts: Date.now() };
      setCache(updated);
    }

    return result;
  } catch (err) {
    console.warn("Video info fetch failed:", err);
    return cache[videoId]?.data || { relatedVideos: [], comments: [] };
  }
}
