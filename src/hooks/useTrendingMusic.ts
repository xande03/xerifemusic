import { useState, useEffect } from "react";
import type { Song } from "@/data/mockSongs";
import { mockSongs } from "@/data/mockSongs";

const INVIDIOUS_INSTANCES = [
  "https://inv.nadeko.net",
  "https://invidious.nerdvpn.de",
  "https://invidious.jing.rocks",
  "https://vid.puffyan.us",
  "https://inv.tux.digital",
];

async function fetchTrendingDirect(): Promise<Song[]> {
  const shuffled = [...INVIDIOUS_INSTANCES].sort(() => 0.5 - Math.random());
  
  for (const base of shuffled.slice(0, 3)) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(`${base}/api/v1/trending?region=BR&type=Music`, { signal: controller.signal });
      clearTimeout(timeout);
      
      if (!res.ok) throw new Error("Instance error");
      const data = await res.json();
      const items = Array.isArray(data) ? data : [];

      if (items.length > 0) {
        return items.slice(0, 20).map((v: any): Song => ({
          id: `trending-${v.videoId}`,
          youtubeId: v.videoId,
          title: v.title || "",
          artist: v.author || "Desconhecido",
          album: v.title || "",
          cover: v.videoThumbnails?.[0]?.url || "/placeholder.svg",
          duration: v.lengthSeconds || 0,
          votes: 0,
          isDownloaded: false,
          type: "music",
        }));
      }
    } catch (err) {
      console.warn("Trending fetch failed for", base, err);
    }
  }
  return [];
}

export function useTrendingMusic() {
  const [trendingSongs, setTrendingSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    fetchTrendingDirect().then((songs) => {
      if (!mounted) return;
      if (songs.length > 0) {
        setTrendingSongs(songs);
      } else {
        // Ultimate fallback to mock songs if no instances respond
        setTrendingSongs(mockSongs.slice(0, 10));
      }
      setIsLoading(false);
    });

    return () => { mounted = false; };
  }, []);

  return { trendingSongs, isLoading };
}
