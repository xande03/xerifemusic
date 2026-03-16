import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const INVIDIOUS_INSTANCES = [
  "https://inv.nadeko.net",
  "https://invidious.nerdvpn.de",
  "https://invidious.jing.rocks",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const videoId = url.searchParams.get("videoId");

    if (!videoId) {
      return new Response(JSON.stringify({ error: "videoId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await fetchVideoInfo(videoId);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Video info error:", error);
    return new Response(
      JSON.stringify({ relatedVideos: [], comments: [], error: "Failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function fetchVideoInfo(videoId: string) {
  // Try Invidious instances for related videos + comments
  for (const base of INVIDIOUS_INSTANCES) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const [videoRes, commentsRes] = await Promise.all([
        fetch(`${base}/api/v1/videos/${videoId}?fields=recommendedVideos`, {
          signal: controller.signal,
        }),
        fetch(`${base}/api/v1/comments/${videoId}?sort_by=top`, {
          signal: controller.signal,
        }).catch(() => null),
      ]);
      clearTimeout(timeout);

      let relatedVideos: any[] = [];
      let comments: any[] = [];

      if (videoRes.ok) {
        const videoData = await videoRes.json();
        relatedVideos = (videoData.recommendedVideos || [])
          .filter((v: any) => v.videoId)
          .slice(0, 15)
          .map((v: any) => ({
            videoId: v.videoId,
            title: v.title || "",
            channel: v.author || "",
            channelThumbnail: "",
            thumbnail: v.videoThumbnails?.[v.videoThumbnails.length > 1 ? 1 : 0]?.url || "",
            duration: formatSeconds(v.lengthSeconds || 0),
            views: formatViews(v.viewCount || v.viewCountText || 0),
            publishedTime: "",
            lengthSeconds: v.lengthSeconds || 0,
            description: "",
          }));
      }

      if (commentsRes?.ok) {
        const commentsData = await commentsRes.json();
        comments = (commentsData.comments || [])
          .slice(0, 20)
          .map((c: any) => ({
            author: c.author || "Anônimo",
            authorThumbnail: c.authorThumbnails?.[0]?.url || "",
            content: c.contentHtml?.replace(/<[^>]*>/g, "") || c.content || "",
            likes: c.likeCount || 0,
            publishedTime: c.publishedText || "",
            isHearted: c.creatorHeart?.creatorThumbnail ? true : false,
          }));
      }

      return { relatedVideos, comments };
    } catch (err) {
      console.warn(`Instance ${base} failed:`, err);
      continue;
    }
  }

  // Fallback: try YouTube innertube for related videos
  try {
    const body = {
      context: {
        client: {
          clientName: "WEB",
          clientVersion: "2.20240101.00.00",
          hl: "pt",
          gl: "BR",
        },
      },
      videoId,
    };

    const res = await fetch(
      "https://www.youtube.com/youtubei/v1/next?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" },
        body: JSON.stringify(body),
      }
    );

    if (res.ok) {
      const data = await res.json();
      const items = data?.contents?.twoColumnWatchNextResults?.secondaryResults
        ?.secondaryResults?.results || [];

      const relatedVideos = items
        .filter((i: any) => i.compactVideoRenderer?.videoId)
        .slice(0, 15)
        .map((i: any) => {
          const r = i.compactVideoRenderer;
          const thumbs = r.thumbnail?.thumbnails || [];
          return {
            videoId: r.videoId,
            title: r.title?.simpleText || r.title?.runs?.[0]?.text || "",
            channel: r.longBylineText?.runs?.[0]?.text || r.shortBylineText?.runs?.[0]?.text || "",
            channelThumbnail: "",
            thumbnail: thumbs[thumbs.length - 1]?.url || "",
            duration: r.lengthText?.simpleText || "",
            views: r.viewCountText?.simpleText || "",
            publishedTime: r.publishedTimeText?.simpleText || "",
            lengthSeconds: parseDuration(r.lengthText?.simpleText || ""),
            description: "",
          };
        });

      return { relatedVideos, comments: [] };
    }
  } catch {}

  return { relatedVideos: [], comments: [] };
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

function formatViews(n: number | string): string {
  if (typeof n === "string") return n;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return `${n}`;
}
