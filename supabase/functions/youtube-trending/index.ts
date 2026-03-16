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
  "https://vid.puffyan.us",
  "https://invidious.privacyredirect.com",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const region = url.searchParams.get("region") || "BR";

    let results: any[] = [];

    for (const base of INVIDIOUS_INSTANCES) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const res = await fetch(
          `${base}/api/v1/trending?type=music&region=${encodeURIComponent(region)}`,
          { signal: controller.signal }
        );
        clearTimeout(timeout);

        if (!res.ok) continue;

        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0) continue;

        results = data
          .filter((v: any) => v.videoId && v.lengthSeconds > 30)
          .slice(0, 30)
          .map((v: any, idx: number) => ({
            id: `trending-${v.videoId}`,
            youtubeId: v.videoId,
            title: cleanTitle(v.title || ""),
            artist: (v.author || "Desconhecido").replace(/\s*[-|]\s*Topic$/i, ""),
            album: v.title || "",
            cover: getBestThumbnail(v.videoThumbnails),
            duration: v.lengthSeconds || 0,
            votes: Math.max(0, 100 - idx * 5 + Math.floor(Math.random() * 10)),
          }));

        break; // success
      } catch {
        continue;
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Trending error:", error);
    return new Response(
      JSON.stringify({ error: "Trending fetch failed", results: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

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
