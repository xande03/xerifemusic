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

    const result = parseAlbumPage(data);

    return new Response(JSON.stringify(result), {
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

function parseAlbumPage(data: any) {
  // Try both renderer types
  const browseRenderer = data?.contents?.twoColumnBrowseResultsRenderer || data?.contents?.singleColumnBrowseResultsRenderer;
  const tabs = browseRenderer?.tabs || [];
  const sections = tabs[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];

  let albumTitle = "";
  let albumSubtitle = "";
  let albumCover = "";
  const tracks: any[] = [];

  for (const section of sections) {
    // Parse header from musicResponsiveHeaderRenderer
    const headerRenderer = section?.musicResponsiveHeaderRenderer;
    if (headerRenderer) {
      albumTitle = headerRenderer?.title?.runs?.[0]?.text || "";
      albumSubtitle = headerRenderer?.subtitle?.runs?.map((r: any) => r.text).join("") || "";
      
      // Get thumbnail from strapline or thumbnail
      const thumbSources = [
        headerRenderer?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails,
        headerRenderer?.thumbnail?.croppedSquareThumbnailRenderer?.thumbnail?.thumbnails,
      ];
      for (const thumbs of thumbSources) {
        if (thumbs?.length) {
          const sorted = [...thumbs].sort((a: any, b: any) => (b.width || 0) - (a.width || 0));
          albumCover = sorted[0]?.url || "";
          if (albumCover.startsWith("//")) albumCover = `https:${albumCover}`;
          break;
        }
      }
    }

    // Parse tracks from musicShelfRenderer
    const shelf = section?.musicShelfRenderer;
    if (shelf) {
      for (const item of (shelf.contents || [])) {
        const track = parseTrackItem(item);
        if (track) tracks.push(track);
      }
    }
  }

  // Also check secondary contents (twoColumnBrowseResultsRenderer has secondaryContents)
  const secondaryContents = browseRenderer?.secondaryContents?.sectionListRenderer?.contents || [];
  for (const section of secondaryContents) {
    const shelf = section?.musicShelfRenderer;
    if (shelf) {
      for (const item of (shelf.contents || [])) {
        const track = parseTrackItem(item);
        if (track) tracks.push(track);
      }
    }
  }

  // Also check for the tab content directly containing a shelf
  const tabContent = tabs[0]?.tabRenderer?.content;
  if (tabContent?.musicShelfRenderer) {
    for (const item of (tabContent.musicShelfRenderer.contents || [])) {
      const track = parseTrackItem(item);
      if (track) tracks.push(track);
    }
  }

  return { albumTitle, albumSubtitle, albumCover, tracks };
}

function parseTrackItem(item: any): any | null {
  const renderer = item?.musicResponsiveListItemRenderer;
  if (!renderer) return null;

  const flexColumns = renderer?.flexColumns || [];
  const title = flexColumns[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text || "";

  const secondRuns = flexColumns[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
  const artist = secondRuns.filter((r: any) => r.text && r.text.trim() !== "•" && r.text.trim() !== " • ").map((r: any) => r.text.trim()).filter((t: string) => !/^\d{1,2}:\d{2}/.test(t)).join(", ") || "";

  let videoId = "";
  const overlay = renderer?.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer;
  videoId = overlay?.playNavigationEndpoint?.watchEndpoint?.videoId || "";
  if (!videoId) {
    videoId = flexColumns[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.navigationEndpoint?.watchEndpoint?.videoId || "";
  }
  // Also try playlistItemData
  if (!videoId) {
    videoId = renderer?.playlistItemData?.videoId || "";
  }

  const thumbnails = renderer?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
  const sorted = [...thumbnails].sort((a: any, b: any) => (b.width || 0) - (a.width || 0));
  let cover = sorted[0]?.url || "";
  if (cover.startsWith("//")) cover = `https:${cover}`;

  // Parse duration from fixedColumns or flexColumns
  let duration = 0;
  const fixedColumns = renderer?.fixedColumns || [];
  for (const fc of fixedColumns) {
    const text = fc?.musicResponsiveListItemFixedColumnRenderer?.text?.runs?.[0]?.text || "";
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(text)) {
      const segs = text.split(":").map(Number);
      duration = segs.length === 3 ? segs[0] * 3600 + segs[1] * 60 + segs[2] : segs[0] * 60 + segs[1];
    }
  }
  // Also check in flex column runs
  if (duration === 0) {
    for (const run of secondRuns) {
      const text = run?.text?.trim();
      if (text && /^\d{1,2}:\d{2}(:\d{2})?$/.test(text)) {
        const segs = text.split(":").map(Number);
        duration = segs.length === 3 ? segs[0] * 3600 + segs[1] * 60 + segs[2] : segs[0] * 60 + segs[1];
      }
    }
  }

  if (title && videoId) {
    return { id: `yt-${videoId}`, youtubeId: videoId, title, artist, cover, duration };
  }
  return null;
}
