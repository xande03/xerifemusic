import type { Song } from "@/data/mockSongs";

export interface YouTubeSearchResult {
  id: string;
  youtubeId: string;
  title: string;
  artist: string;
  album: string;
  cover: string;
  duration: number;
}

export async function searchYouTubeMusic(
  query: string,
  filter: string = "all"
): Promise<Song[]> {
  if (!query || query.length < 2) return [];

  try {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const url = `https://${projectId}.supabase.co/functions/v1/youtube-search?q=${encodeURIComponent(query)}&filter=${encodeURIComponent(filter)}`;

    const response = await fetch(url, {
      headers: {
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "",
      },
    });

    if (!response.ok) throw new Error(`Search failed: ${response.status}`);

    const json = await response.json();
    const results: YouTubeSearchResult[] = json.results || [];

    return results.map((r) => ({
      id: r.id,
      youtubeId: r.youtubeId,
      title: r.title,
      artist: r.artist,
      album: r.album,
      cover: r.cover || "/placeholder.svg",
      duration: r.duration || 0,
      votes: 0,
      isDownloaded: false,
    }));
  } catch (err) {
    console.error("YouTube search error:", err);
    return [];
  }
}

export async function getSearchSuggestions(query: string): Promise<string[]> {
  if (!query || query.length < 2) return [];

  try {
    const url = `https://clients1.google.com/complete/search?client=youtube&ds=yt&q=${encodeURIComponent(query)}`;

    return new Promise((resolve) => {
      const callbackName = `ytSuggest_${Date.now()}`;

      (window as any)[callbackName] = (data: any) => {
        try {
          const suggestions = data[1]?.map((item: any) => item[0]) || [];
          resolve(suggestions.slice(0, 8));
        } catch {
          resolve([]);
        }
        delete (window as any)[callbackName];
        script.remove();
      };

      const script = document.createElement("script");
      script.src = `${url}&callback=${callbackName}`;
      script.onerror = () => {
        resolve([]);
        delete (window as any)[callbackName];
        script.remove();
      };
      document.head.appendChild(script);

      setTimeout(() => {
        if ((window as any)[callbackName]) {
          resolve([]);
          delete (window as any)[callbackName];
          script.remove();
        }
      }, 3000);
    });
  } catch {
    return [];
  }
}
