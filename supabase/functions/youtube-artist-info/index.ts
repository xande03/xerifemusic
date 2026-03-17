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

    // Step 1: Search for artist browseId
    const browseId = await findArtistBrowseId(artistName);

    if (!browseId) {
      const fallback = await searchFallback(artistName);
      return new Response(JSON.stringify(fallback), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 2: Browse artist page
    const artistData = await browseArtistPage(browseId, artistName);

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

async function ytMusicPost(endpoint: string, body: any) {
  const res = await fetch(
    `https://music.youtube.com/youtubei/v1/${endpoint}?alt=json&key=${YT_MUSIC_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Origin: "https://music.youtube.com",
        Referer: "https://music.youtube.com/",
      },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) throw new Error(`YT Music ${endpoint} failed: ${res.status}`);
  return res.json();
}

async function findArtistBrowseId(name: string): Promise<string | null> {
  try {
    // Search with artist filter
    const data = await ytMusicPost("search", {
      context: CLIENT_CONTEXT,
      query: name,
      params: "EgWKAQIgAWoKEAkQBRAKEAMQBA%3D%3D",
    });

    const contents = data?.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];

    for (const section of contents) {
      // Top result card
      const card = section?.musicCardShelfRenderer;
      if (card) {
        const navEp = card?.title?.runs?.[0]?.navigationEndpoint?.browseEndpoint;
        if (navEp?.browseId?.startsWith("UC")) return navEp.browseId;
      }

      // Regular list items
      const items = section?.musicShelfRenderer?.contents || [];
      for (const item of items) {
        const renderer = item?.musicResponsiveListItemRenderer;
        if (!renderer) continue;
        const navEp = renderer?.navigationEndpoint?.browseEndpoint;
        if (navEp?.browseId?.startsWith("UC")) return navEp.browseId;
        // Also check overlay navigation
        const overlayNav = renderer?.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint;
        if (!navEp?.browseId && renderer?.flexColumns) {
          for (const fc of renderer.flexColumns) {
            const runs = fc?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
            for (const run of runs) {
              const bid = run?.navigationEndpoint?.browseEndpoint?.browseId;
              if (bid?.startsWith("UC")) return bid;
            }
          }
        }
      }
    }

    // Try without filter as fallback
    const data2 = await ytMusicPost("search", {
      context: CLIENT_CONTEXT,
      query: name,
    });

    const contents2 = data2?.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];
    for (const section of contents2) {
      const card = section?.musicCardShelfRenderer;
      if (card) {
        const navEp = card?.title?.runs?.[0]?.navigationEndpoint?.browseEndpoint;
        if (navEp?.browseId?.startsWith("UC")) return navEp.browseId;
        // Check subtitle for artist link
        const subtitleRuns = card?.subtitle?.runs || [];
        for (const run of subtitleRuns) {
          const bid = run?.navigationEndpoint?.browseEndpoint?.browseId;
          if (bid?.startsWith("UC")) return bid;
        }
      }
    }
  } catch (e) {
    console.error("findArtistBrowseId error:", e);
  }

  return null;
}

async function browseArtistPage(browseId: string, artistName: string) {
  const data = await ytMusicPost("browse", {
    context: CLIENT_CONTEXT,
    browseId,
  });

  return parseArtistPage(data, artistName);
}

function parseArtistPage(data: any, fallbackName: string) {
  // Handle multiple header types
  const header =
    data?.header?.musicImmersiveHeaderRenderer ||
    data?.header?.musicVisualHeaderRenderer ||
    data?.header?.musicHeaderRenderer ||
    {};

  const name = header?.title?.runs?.[0]?.text || fallbackName;

  // Description can be in different places
  const description =
    header?.description?.runs?.map((r: any) => r.text).join("") ||
    header?.description?.musicDescriptionShelfRenderer?.description?.runs?.map((r: any) => r.text).join("") ||
    "";

  const subscriberCount =
    header?.subscriptionButton?.subscribeButtonRenderer?.subscriberCountText?.runs?.[0]?.text ||
    header?.subtitle?.runs?.map((r: any) => r.text).join("") ||
    "";

  // Get best thumbnail
  const thumbSources = [
    header?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails,
    header?.foregroundThumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails,
    header?.thumbnail?.croppedSquareThumbnailRenderer?.thumbnail?.thumbnails,
  ];
  let thumbnail = "";
  for (const thumbs of thumbSources) {
    if (thumbs?.length) {
      const sorted = [...thumbs].sort((a: any, b: any) => (b.width || 0) - (a.width || 0));
      thumbnail = sorted[0]?.url || "";
      break;
    }
  }
  if (thumbnail.startsWith("//")) thumbnail = `https:${thumbnail}`;

  // Parse all sections
  const tabs = data?.contents?.singleColumnBrowseResultsRenderer?.tabs || [];
  const sections = tabs[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];

  const result: any = {
    name,
    description,
    subscriberCount,
    thumbnail,
    topSongs: [],
    albums: [],
    singles: [],
    features: [],
  };

  // Also look for description in sections
  for (const section of sections) {
    const descShelf = section?.musicDescriptionShelfRenderer;
    if (descShelf && !result.description) {
      result.description = descShelf?.description?.runs?.map((r: any) => r.text).join("") || "";
    }

    // musicShelfRenderer = songs list
    const shelf = section?.musicShelfRenderer;
    if (shelf) {
      const title = (shelf?.title?.runs?.[0]?.text || "").toLowerCase();
      if (title.includes("músicas") || title.includes("songs") || title.includes("popular") || title.includes("mais tocadas")) {
        result.topSongs = parseShelfSongs(shelf);
      }
    }

    // musicCarouselShelfRenderer = horizontal carousel (albums, singles, features)
    const carousel = section?.musicCarouselShelfRenderer;
    if (carousel) {
      const rawTitle = carousel?.header?.musicCarouselShelfBasicHeaderRenderer?.title?.runs?.[0]?.text || "";
      const title = rawTitle.toLowerCase();
      const items = parseCarouselItems(carousel);

      if (title.includes("álbuns") || title.includes("albums") || title.includes("álbum")) {
        result.albums = items;
      } else if (title.includes("singles") || title.includes("single") || title.includes("eps")) {
        result.singles = items;
      } else if (
        title.includes("participações") || title.includes("feat") ||
        title.includes("aparece em") || title.includes("appears") ||
        title.includes("colaborações")
      ) {
        result.features = items;
      } else if (title.includes("vídeos") || title.includes("videos") || title.includes("clipes")) {
        // Skip videos section for now
      } else if (title.includes("fãs") || title.includes("fans") || title.includes("relacionados") || title.includes("related")) {
        // Skip related artists
      } else if (items.length > 0) {
        // Assign to first empty category
        if (result.albums.length === 0) {
          result.albums = items;
        } else if (result.singles.length === 0) {
          result.singles = items;
        }
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
    const parts = secondRuns
      .filter((r: any) => r.text && r.text.trim() !== "•" && r.text.trim() !== " • ")
      .map((r: any) => r.text.trim());

    // Get video ID from multiple sources
    let videoId = "";
    const overlay = renderer?.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer;
    videoId = overlay?.playNavigationEndpoint?.watchEndpoint?.videoId || "";
    if (!videoId) {
      videoId = flexColumns[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.navigationEndpoint?.watchEndpoint?.videoId || "";
    }
    if (!videoId) {
      videoId = renderer?.playlistItemData?.videoId || "";
    }

    const thumbnails = renderer?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
    const sorted = [...thumbnails].sort((a: any, b: any) => (b.width || 0) - (a.width || 0));
    let cover = sorted[0]?.url || "";
    if (cover.startsWith("//")) cover = `https:${cover}`;

    // Parse duration
    let duration = 0;
    // Check fixedColumns first
    const fixedColumns = renderer?.fixedColumns || [];
    for (const fc of fixedColumns) {
      const text = fc?.musicResponsiveListItemFixedColumnRenderer?.text?.runs?.[0]?.text || "";
      if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(text)) {
        const segs = text.split(":").map(Number);
        duration = segs.length === 3 ? segs[0] * 3600 + segs[1] * 60 + segs[2] : segs[0] * 60 + segs[1];
      }
    }
    // Fallback to flex column runs
    if (duration === 0) {
      for (const part of parts) {
        if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(part)) {
          const segs = part.split(":").map(Number);
          duration = segs.length === 3 ? segs[0] * 3600 + segs[1] * 60 + segs[2] : segs[0] * 60 + segs[1];
        }
      }
    }

    const artist = parts.find(
      (p: string) => !/^\d{1,2}:\d{2}/.test(p) && !["Música", "Song", "Vídeo", "Video"].includes(p)
    ) || "";

    if (title && videoId) {
      songs.push({
        id: `yt-${videoId}`,
        youtubeId: videoId,
        title: cleanTitle(title),
        artist,
        album: title,
        cover,
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

    const browseId = renderer?.title?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId ||
      renderer?.navigationEndpoint?.browseEndpoint?.browseId || "";
    const pageType =
      renderer?.title?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseEndpointContextSupportedConfigs?.browseEndpointContextMusicConfig?.pageType ||
      renderer?.navigationEndpoint?.browseEndpoint?.browseEndpointContextSupportedConfigs?.browseEndpointContextMusicConfig?.pageType || "";

    const thumbnails = renderer?.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
    const sorted = [...thumbnails].sort((a: any, b: any) => (b.width || 0) - (a.width || 0));
    let cover = sorted[0]?.url || "";
    if (cover.startsWith("//")) cover = `https:${cover}`;

    if (title) {
      items.push({ title, subtitle, browseId, pageType, cover });
    }
  }

  return items;
}

async function searchFallback(artistName: string) {
  try {
    const data = await ytMusicPost("search", {
      context: CLIENT_CONTEXT,
      query: artistName,
    });

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
        if (!videoId) videoId = renderer?.playlistItemData?.videoId || "";

        const thumbnails = renderer?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
        const sorted = [...thumbnails].sort((a: any, b: any) => (b.width || 0) - (a.width || 0));
        let cover = sorted[0]?.url || "";
        if (cover.startsWith("//")) cover = `https:${cover}`;

        if (title && videoId) {
          songs.push({
            id: `yt-${videoId}`,
            youtubeId: videoId,
            title: cleanTitle(title),
            artist: artistName,
            album: title,
            cover,
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
  } catch {
    return {
      name: artistName, description: "", subscriberCount: "", thumbnail: "",
      topSongs: [], albums: [], singles: [], features: [],
    };
  }
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
