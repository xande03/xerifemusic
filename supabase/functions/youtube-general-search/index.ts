import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getClientIp, checkRateLimit, rateLimitResponse } from "../_shared/rateLimiter.ts";
import { cachedFetch } from "../_shared/serverCache.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface VideoResult {
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);

    // Rate limit: 20 requests per minute per IP
    const ip = getClientIp(req);
    const rl = checkRateLimit(ip, { maxRequests: 20, windowMs: 60_000 });
    if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs, corsHeaders);

    const query = url.searchParams.get("q");

    if (!query || query.length < 2) {
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Server-side cache: same query shares results across users for 5 min
    const cacheKey = `general:${query.toLowerCase().trim()}`;
    const results = await cachedFetch(cacheKey, () => searchYouTubeGeneral(query), { ttlMs: 5 * 60 * 1000 });

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("General search error:", error);
    return new Response(
      JSON.stringify({ error: "Search failed", results: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function searchYouTubeGeneral(query: string): Promise<VideoResult[]> {
  const body = {
    context: {
      client: {
        clientName: "WEB",
        clientVersion: "2.20240101.00.00",
        hl: "pt",
        gl: "BR",
      },
    },
    query,
  };

  const response = await fetch(
    "https://www.youtube.com/youtubei/v1/search?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0",
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    console.error("YouTube general API error:", response.status);
    // Fallback to Invidious
    return searchViaInvidious(query);
  }

  const data = await response.json();
  return parseResults(data);
}

async function searchViaInvidious(query: string): Promise<VideoResult[]> {
  const instances = [
    "https://inv.nadeko.net",
    "https://invidious.nerdvpn.de",
    "https://invidious.jing.rocks",
  ];

  for (const base of instances) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(
        `${base}/api/v1/search?q=${encodeURIComponent(query)}&type=video&sort_by=relevance&region=BR`,
        { signal: controller.signal }
      );
      clearTimeout(timeout);

      if (!res.ok) continue;
      const items = await res.json();

      return items
        .filter((v: any) => v.videoId)
        .slice(0, 20)
        .map((v: any) => ({
          videoId: v.videoId,
          title: v.title || "",
          channel: v.author || "",
          channelThumbnail: v.authorThumbnails?.[v.authorThumbnails.length - 1]?.url || v.authorThumbnails?.[0]?.url || "",
          thumbnail: v.videoThumbnails?.find((t: any) => t.quality === "maxres")?.url ||
            v.videoThumbnails?.find((t: any) => t.quality === "high")?.url ||
            v.videoThumbnails?.find((t: any) => t.quality === "medium")?.url ||
            v.videoThumbnails?.[v.videoThumbnails.length - 1]?.url || "",
          duration: formatSeconds(v.lengthSeconds || 0),
          views: formatViews(v.viewCount || 0),
          publishedTime: v.publishedText || "",
          lengthSeconds: v.lengthSeconds || 0,
          description: v.description || "",
        }));
    } catch {
      continue;
    }
  }
  return [];
}

function parseResults(data: any): VideoResult[] {
  const results: VideoResult[] = [];

  try {
    const contents =
      data?.contents?.twoColumnSearchResultsRenderer?.primaryContents
        ?.sectionListRenderer?.contents || [];

    for (const section of contents) {
      const items = section?.itemSectionRenderer?.contents || [];

      for (const item of items) {
        const renderer = item?.videoRenderer;
        if (!renderer?.videoId) continue;

        const title = renderer.title?.runs?.map((r: any) => r.text).join("") || "";
        const channel = renderer.ownerText?.runs?.[0]?.text || "";
        const channelThumbs = renderer.channelThumbnailSupportedRenderers
          ?.channelThumbnailWithLinkRenderer?.thumbnail?.thumbnails || [];
        const channelThumb = channelThumbs[0]?.url || "";
        const thumbs = renderer.thumbnail?.thumbnails || [];
        const thumb = thumbs[thumbs.length - 1]?.url || "";
        const durationText = renderer.lengthText?.simpleText || "";
        const viewText = renderer.viewCountText?.simpleText || renderer.viewCountText?.runs?.map((r: any) => r.text).join("") || "";
        const published = renderer.publishedTimeText?.simpleText || "";

        results.push({
          videoId: renderer.videoId,
          title,
          channel,
          channelThumbnail: channelThumb.startsWith("//") ? `https:${channelThumb}` : channelThumb,
          thumbnail: thumb.startsWith("//") ? `https:${thumb}` : thumb,
          duration: durationText,
          views: viewText,
          publishedTime: published,
          lengthSeconds: parseDuration(durationText),
          description: renderer.detailedMetadataSnippets?.[0]?.snippetText?.runs?.map((r: any) => r.text).join("") || "",
        });
      }
    }
  } catch (e) {
    console.error("Parse error:", e);
  }

  return results.slice(0, 20);
}

function parseDuration(text: string): number {
  if (!text) return 0;
  const parts = text.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

function formatSeconds(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M visualizações`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K visualizações`;
  return `${n} visualizações`;
}
