import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const YT_MUSIC_KEY = "AIzaSyC9XL3ZjWddXya6X74dJoCTL-WEYFDNX30";
const CLIENT_CONTEXT = {
  client: {
    clientName: "WEB_REMIX",
    clientVersion: "1.20231204.01.00",
    hl: "pt",
    gl: "BR",
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const artistName = url.searchParams.get("name");
    if (!artistName) {
      return new Response(JSON.stringify({ error: "Missing name param" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 1: Search for artist to get browseId
    const browseId = await findArtistBrowseId(artistName);
    
    if (!browseId) {
      // Fallback: return search-based results
      const fallback = await searchFallback(artistName);
      return new Response(JSON.stringify(fallback), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 2: Browse artist page
    const artistData = await browseArtistPage(browseId);

    return new Response(JSON.stringify(artistData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Artist info error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch artist info" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function findArtistBrowseId(name: string): Promise<string | null> {
  const body = {
    context: CLIENT_CONTEXT,
    query: name,
    params: "EgWKAQIgAWoKEAkQBRAKEAMQBA%3D%3D", // artists filter
  };

  const res = await fetch(
    `https://music.youtube.com/youtubei/v1/search?alt=json&key=${YT_MUSIC_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0", Origin: "https://music.youtube.com" },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) return null;
  const data = await res.json();

  const contents = data?.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];

  for (const section of contents) {
    // Check card shelf (top result)
    const card = section?.musicCardShelfRenderer;
    if (card) {
      const navEp = card?.title?.runs?.[0]?.navigationEndpoint?.browseEndpoint;
      if (navEp?.browseId?.startsWith("UC")) return navEp.browseId;
    }

    const items = section?.musicShelfRenderer?.contents || [];
    for (const item of items) {
      const renderer = item?.musicResponsiveListItemRenderer;
      if (!renderer) continue;
      const navEp = renderer?.navigationEndpoint?.browseEndpoint;
      if (navEp?.browseId?.startsWith("UC")) return navEp.browseId;
    }
  }

  return null;
}

async function browseArtistPage(browseId: string) {
  const body = {
    context: CLIENT_CONTEXT,
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

  return parseArtistPage(data);
}

function parseArtistPage(data: any) {
  const header = data?.header?.musicImmersiveHeaderRenderer || data?.header?.musicVisualHeaderRenderer || {};
  const name = header?.title?.runs?.[0]?.text || "Artista";
  const description = header?.description?.runs?.map((r: any) => r.text).join("") || "";
  const subscriberCount = header?.subscriptionButton?.subscribeButtonRenderer?.subscriberCountText?.runs?.[0]?.text || "";

  // Get artist thumbnail
  const thumbnails = header?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
  const sorted = [...thumbnails].sort((a: any, b: any) => (b.width || 0) - (a.width || 0));
  const thumbnail = sorted[0]?.url || "";

  // Parse sections (songs, albums, singles, features)
  const tabs = data?.contents?.singleColumnBrowseResultsRenderer?.tabs || [];
  const sections = tabs[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];

  const result: any = {
    name,
    description,
    subscriberCount,
    thumbnail: thumbnail.startsWith("//") ? `https:${thumbnail}` : thumbnail,
    topSongs: [],
    albums: [],
    singles: [],
    features: [],
  };

  for (const section of sections) {
    const shelf = section?.musicShelfRenderer;
    const carousel = section?.musicCarouselShelfRenderer;

    if (shelf) {
      const title = shelf?.title?.runs?.[0]?.text?.toLowerCase() || "";
      if (title.includes("músicas") || title.includes("songs") || title.includes("popular")) {
        result.topSongs = parseShelfSongs(shelf);
      }
    }

    if (carousel) {
      const title = carousel?.header?.musicCarouselShelfBasicHeaderRenderer?.title?.runs?.[0]?.text?.toLowerCase() || "";
      const items = parseCarouselItems(carousel);

      if (title.includes("álbuns") || title.includes("albums")) {
        result.albums = items;
      } else if (title.includes("singles") || title.includes("single")) {
        result.singles = items;
      } else if (title.includes("participações") || title.includes("feat") || title.includes("aparece em") || title.includes("appears")) {
        result.features = items;
      } else if (title.includes("vídeos") || title.includes("videos")) {
        // Could add videos section too
      } else if (items.length > 0 && result.albums.length === 0) {
        // First unmatched carousel with items could be albums
        result.albums = items;
      }
    }
  }

  return result;
}

function parseShelfSongs(shelf: any): any[] {
  const songs: any[] = [];
  const items = shelf?.contents || [];

  for (const item of items) {
    const renderer = item?.musicResponsiveListItemRenderer;
    if (!renderer) continue;

    const flexColumns = renderer?.flexColumns || [];
    const title = flexColumns[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text || "";
    
    const secondRuns = flexColumns[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
    const parts = secondRuns.filter((r: any) => r.text && r.text.trim() !== "•" && r.text.trim() !== " • ").map((r: any) => r.text.trim());
    
    // Get video ID
    let videoId = "";
    const overlay = renderer?.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer;
    videoId = overlay?.playNavigationEndpoint?.watchEndpoint?.videoId || "";
    if (!videoId) {
      videoId = flexColumns[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.navigationEndpoint?.watchEndpoint?.videoId || "";
    }

    const thumbnails = renderer?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
    const sorted = [...thumbnails].sort((a: any, b: any) => (b.width || 0) - (a.width || 0));
    const cover = sorted[0]?.url || "";

    // Parse duration
    let duration = 0;
    for (const part of parts) {
      if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(part)) {
        const segs = part.split(":").map(Number);
        duration = segs.length === 3 ? segs[0] * 3600 + segs[1] * 60 + segs[2] : segs[0] * 60 + segs[1];
      }
    }

    const artist = parts.find((p: string) => !/^\d{1,2}:\d{2}/.test(p) && !["Música", "Song", "Vídeo", "Video"].includes(p)) || "";

    if (title && videoId) {
      songs.push({
        id: `yt-${videoId}`,
        youtubeId: videoId,
        title: cleanTitle(title),
        artist,
        album: title,
        cover: cover.startsWith("//") ? `https:${cover}` : cover,
        duration,
      });
    }
  }

  return songs.slice(0, 20);
}

function parseCarouselItems(carousel: any): any[] {
  const items: any[] = [];
  const contents = carousel?.contents || [];

  for (const item of contents) {
    const renderer = item?.musicTwoRowItemRenderer;
    if (!renderer) continue;

    const title = renderer?.title?.runs?.[0]?.text || "";
    const subtitle = renderer?.subtitle?.runs?.map((r: any) => r.text).join("") || "";
    
    // Get browse ID for album page
    const browseId = renderer?.title?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId || "";
    const pageType = renderer?.title?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseEndpointContextSupportedConfigs?.browseEndpointContextMusicConfig?.pageType || "";

    const thumbnails = renderer?.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
    const sorted = [...thumbnails].sort((a: any, b: any) => (b.width || 0) - (a.width || 0));
    const cover = sorted[0]?.url || "";

    if (title) {
      items.push({
        title,
        subtitle,
        browseId,
        pageType,
        cover: cover.startsWith("//") ? `https:${cover}` : cover,
      });
    }
  }

  return items;
}

async function searchFallback(artistName: string) {
  // Just do a regular search and group results
  const body = {
    context: CLIENT_CONTEXT,
    query: artistName,
  };

  const res = await fetch(
    `https://music.youtube.com/youtubei/v1/search?alt=json&key=${YT_MUSIC_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0", Origin: "https://music.youtube.com" },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) return { name: artistName, topSongs: [], albums: [], singles: [], features: [], description: "", subscriberCount: "", thumbnail: "" };

  const data = await res.json();
  const contents = data?.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];

  const songs: any[] = [];
  for (const section of contents) {
    const items = section?.musicShelfRenderer?.contents || [];
    for (const item of items) {
      const renderer = item?.musicResponsiveListItemRenderer;
      if (!renderer) continue;
      const flexColumns = renderer?.flexColumns || [];
      const title = flexColumns[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text || "";
      let videoId = renderer?.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint?.videoId || "";
      if (!videoId) videoId = flexColumns[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.navigationEndpoint?.watchEndpoint?.videoId || "";
      
      const thumbnails = renderer?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
      const sorted = [...thumbnails].sort((a: any, b: any) => (b.width || 0) - (a.width || 0));
      const cover = sorted[0]?.url || "";

      if (title && videoId) {
        songs.push({
          id: `yt-${videoId}`,
          youtubeId: videoId,
          title: cleanTitle(title),
          artist: artistName,
          album: title,
          cover: cover.startsWith("//") ? `https:${cover}` : cover,
          duration: 0,
        });
      }
    }
  }

  return {
    name: artistName,
    description: "",
    subscriberCount: "",
    thumbnail: songs[0]?.cover || "",
    topSongs: songs.slice(0, 10),
    albums: [],
    singles: [],
    features: [],
  };
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
