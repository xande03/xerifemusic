import { supabase } from "@/integrations/supabase/client";

const lyricsCache = new Map<string, string | null>();

export async function fetchLyrics(artist: string, title: string): Promise<string | null> {
  const cacheKey = `${artist}::${title}`;
  if (lyricsCache.has(cacheKey)) return lyricsCache.get(cacheKey)!;

  try {
    const { data, error } = await supabase.functions.invoke('fetch-lyrics', {
      body: { artist, title },
    });

    if (error) {
      console.warn('Lyrics edge function error:', error);
      lyricsCache.set(cacheKey, null);
      return null;
    }

    const lyrics = data?.lyrics || null;
    lyricsCache.set(cacheKey, lyrics);
    return lyrics;
  } catch (err) {
    console.warn('Lyrics fetch failed:', err);
    lyricsCache.set(cacheKey, null);
    return null;
  }
}
