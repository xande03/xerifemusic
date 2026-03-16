import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SearchResult {
  id: string;
  youtubeId: string;
  title: string;
  artist: string;
  album: string;
  cover: string;
  duration: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const query = url.searchParams.get("q");
    const filter = url.searchParams.get("filter") || "all"; // all, songs, artists, albums

    if (!query || query.length < 2) {
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use YouTube's internal search endpoint (InnerTube API)
    const searchResults = await searchYouTube(query, filter);

    return new Response(JSON.stringify({ results: searchResults }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Search error:", error);
    return new Response(
      JSON.stringify({ error: "Search failed", results: [] }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function searchYouTube(
  query: string,
  filter: string
): Promise<SearchResult[]> {
  // Use YouTube Music's InnerTube API
  const params = getSearchParams(filter);

  const body = {
    context: {
      client: {
        clientName: "WEB_REMIX",
        clientVersion: "1.20231204.01.00",
        hl: "pt",
        gl: "BR",
      },
    },
    query,
    ...(params ? { params } : {}),
  };

  const response = await fetch(
    "https://music.youtube.com/youtubei/v1/search?alt=json&key=AIzaSyC9XL3ZjWddXya6X74dJoCTL-WEYFDNX30",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0",
        Origin: "https://music.youtube.com",
        Referer: "https://music.youtube.com/",
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    console.error("YouTube API error:", response.status, await response.text());
    return [];
  }

  const data = await response.json();
  return parseSearchResults(data);
}

function getSearchParams(filter: string): string | null {
  // InnerTube search params for filtering
  switch (filter) {
    case "songs":
      return "EgWKAQIIAWoKEAkQBRAKEAMQBA%3D%3D";
    case "artists":
      return "EgWKAQIgAWoKEAkQBRAKEAMQBA%3D%3D";
    case "albums":
      return "EgWKAQIYAWoKEAkQBRAKEAMQBA%3D%3D";
    default:
      return null;
  }
}

function parseSearchResults(data: any): SearchResult[] {
  const results: SearchResult[] = [];

  try {
    const contents =
      data?.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer
        ?.content?.sectionListRenderer?.contents || [];

    for (const section of contents) {
      const items =
        section?.musicShelfRenderer?.contents ||
        section?.musicCardShelfRenderer
          ? [section]
          : [];

      const shelfItems = section?.musicShelfRenderer?.contents || [];

      for (const item of shelfItems) {
        const parsed = parseMusicItem(item);
        if (parsed) results.push(parsed);
      }

      // Also handle card shelf (top result)
      if (section?.musicCardShelfRenderer) {
        const card = parseCardShelf(section.musicCardShelfRenderer);
        if (card) results.push(card);
      }
    }
  } catch (e) {
    console.error("Parse error:", e);
  }

  return results.slice(0, 20);
}

function parseMusicItem(item: any): SearchResult | null {
  try {
    const renderer =
      item?.musicResponsiveListItemRenderer;
    if (!renderer) return null;

    const flexColumns = renderer?.flexColumns || [];
    const title =
      flexColumns[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]
        ?.text || "";
    
    // Get artist and album from second column
    const secondColumnRuns =
      flexColumns[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
    
    let artist = "";
    let album = "";
    let duration = 0;
    
    // Parse runs: typically "Type • Artist • Album • Duration"
    const textParts = secondColumnRuns
      .filter((r: any) => r.text && r.text !== " • " && r.text !== " & ")
      .map((r: any) => r.text);
    
    if (textParts.length >= 2) {
      // First part is often the type (Song, Video, etc.)
      const typeIndicators = ["Música", "Vídeo", "Song", "Video", "Artista", "Artist", "Álbum", "Album"];
      const startIdx = typeIndicators.includes(textParts[0]) ? 1 : 0;
      artist = textParts[startIdx] || "";
      album = textParts[startIdx + 1] || "";
    }

    // Get duration from last text part
    const lastPart = textParts[textParts.length - 1];
    if (lastPart && /^\d+:\d+$/.test(lastPart)) {
      const [m, s] = lastPart.split(":").map(Number);
      duration = m * 60 + s;
    }

    // Get video ID from overlay or navigation
    let videoId = "";
    const overlay = renderer?.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer;
    const navEndpoint = overlay?.playNavigationEndpoint;
    videoId = navEndpoint?.watchEndpoint?.videoId || "";

    if (!videoId) {
      // Try from flexColumn navigation
      const navEp = flexColumns[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.navigationEndpoint;
      videoId = navEp?.watchEndpoint?.videoId || "";
    }

    if (!title || !videoId) return null;

    // Get thumbnail
    const thumbnails = renderer?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
    const cover = thumbnails.length > 0
      ? thumbnails[thumbnails.length - 1].url
      : "";

    return {
      id: `yt-${videoId}`,
      youtubeId: videoId,
      title,
      artist: artist || "Unknown",
      album: album || title,
      cover: cover.startsWith("//") ? `https:${cover}` : cover,
      duration: duration || 0,
    };
  } catch {
    return null;
  }
}

function parseCardShelf(renderer: any): SearchResult | null {
  try {
    const title = renderer?.title?.runs?.[0]?.text || "";
    const subtitle = renderer?.subtitle?.runs?.map((r: any) => r.text).join("") || "";
    const videoId = renderer?.title?.runs?.[0]?.navigationEndpoint?.watchEndpoint?.videoId;
    
    if (!title || !videoId) return null;

    const thumbnails = renderer?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
    const cover = thumbnails.length > 0 ? thumbnails[thumbnails.length - 1].url : "";

    return {
      id: `yt-${videoId}`,
      youtubeId: videoId,
      title,
      artist: subtitle.split("•")[0]?.trim() || "Unknown",
      album: subtitle.split("•")[1]?.trim() || title,
      cover: cover.startsWith("//") ? `https:${cover}` : cover,
      duration: 0,
    };
  } catch {
    return null;
  }
}
