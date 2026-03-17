import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const YT_MUSIC_KEY = "AIzaSyC9XL3ZjWddXya6X74dJoCTL-WEYFDNX30";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const browseId = url.searchParams.get("browseId");
    if (!browseId) {
      return new Response(JSON.stringify({ error: "Missing browseId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = {
      context: {
        client: {
          clientName: "WEB_REMIX",
          clientVersion: "1.20231204.01.00",
          hl: "pt",
          gl: "BR",
        },
      },
      browseId,
    };

    const res = await fetch(
      `https://music.youtube.com/youtubei/v1/browse?alt=json&key=${YT_MUSIC_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0", Origin: "https://music.youtube.com" },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) throw new Error(`Browse failed: ${res.status}`);
    const data = await res.json();

    const tracks = parseAlbumTracks(data);
    const albumHeader = parseAlbumHeader(data);

    return new Response(JSON.stringify({ ...albumHeader, tracks }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Album tracks error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch album tracks", tracks: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function parseAlbumHeader(data: any) {
  const header = data?.header?.musicImmersiveHeaderRenderer || data?.header?.musicDetailHeaderRenderer || {};
  const title = header?.title?.runs?.[0]?.text || "";
  const subtitle = header?.subtitle?.runs?.map((r: any) => r.text).join("") || "";
  const thumbnails = header?.thumbnail?.croppedSquareThumbnailRenderer?.thumbnail?.thumbnails || header?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
  const sorted = [...thumbnails].sort((a: any, b: any) => (b.width || 0) - (a.width || 0));
  const cover = sorted[0]?.url || "";

  return {
    albumTitle: title,
    albumSubtitle: subtitle,
    albumCover: cover.startsWith("//") ? `https:${cover}` : cover,
  };
}

function parseAlbumTracks(data: any): any[] {
  const tracks: any[] = [];
  
  const tabs = data?.contents?.singleColumnBrowseResultsRenderer?.tabs || [];
  const sections = tabs[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];

  for (const section of sections) {
    const shelf = section?.musicShelfRenderer;
    if (!shelf) continue;

    const items = shelf?.contents || [];
    for (const item of items) {
      const renderer = item?.musicResponsiveListItemRenderer;
      if (!renderer) continue;

      const flexColumns = renderer?.flexColumns || [];
      const title = flexColumns[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text || "";
      
      const secondRuns = flexColumns[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
      const artist = secondRuns[0]?.text || "";

      let videoId = "";
      const overlay = renderer?.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer;
      videoId = overlay?.playNavigationEndpoint?.watchEndpoint?.videoId || "";
      if (!videoId) {
        videoId = flexColumns[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.navigationEndpoint?.watchEndpoint?.videoId || "";
      }

      const thumbnails = renderer?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
      const sorted = [...thumbnails].sort((a: any, b: any) => (b.width || 0) - (a.width || 0));
      const cover = sorted[0]?.url || "";

      // Parse duration from fixed columns
      let duration = 0;
      const fixedColumns = renderer?.fixedColumns || [];
      for (const fc of fixedColumns) {
        const text = fc?.musicResponsiveListItemFixedColumnRenderer?.text?.runs?.[0]?.text || "";
        if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(text)) {
          const segs = text.split(":").map(Number);
          duration = segs.length === 3 ? segs[0] * 3600 + segs[1] * 60 + segs[2] : segs[0] * 60 + segs[1];
        }
      }

      if (title && videoId) {
        tracks.push({
          id: `yt-${videoId}`,
          youtubeId: videoId,
          title,
          artist,
          cover: cover.startsWith("//") ? `https:${cover}` : cover,
          duration,
        });
      }
    }
  }

  return tracks;
}
