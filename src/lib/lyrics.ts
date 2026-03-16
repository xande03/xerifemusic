import { supabase } from "@/integrations/supabase/client";

export interface LyricLine {
  time: number; // seconds, -1 if unsynced
  text: string;
}

export interface LyricsResult {
  lines: LyricLine[];
  synced: boolean;
}

const lyricsCache = new Map<string, LyricsResult | null>();

/** Parse LRC format: [mm:ss.xx] text */
function parseLRC(lrc: string): LyricLine[] {
  const lines: LyricLine[] = [];
  for (const raw of lrc.split('\n')) {
    const match = raw.match(/^\[(\d{2}):(\d{2})\.(\d{2,3})\]\s?(.*)/);
    if (match) {
      const mins = parseInt(match[1], 10);
      const secs = parseInt(match[2], 10);
      const ms = parseInt(match[3].padEnd(3, '0'), 10);
      const text = match[4].trim();
      if (text) {
        lines.push({ time: mins * 60 + secs + ms / 1000, text });
      }
    }
  }
  return lines;
}

function parsePlain(text: string): LyricLine[] {
  return text.split('\n').filter(l => l.trim()).map(l => ({ time: -1, text: l.trim() }));
}

export async function fetchLyrics(artist: string, title: string): Promise<LyricsResult | null> {
  const cacheKey = `${artist}::${title}`;
  if (lyricsCache.has(cacheKey)) return lyricsCache.get(cacheKey)!;

  try {
    const { data, error } = await supabase.functions.invoke('fetch-lyrics', {
      body: { artist, title },
    });

    if (error || !data?.lyrics) {
      lyricsCache.set(cacheKey, null);
      return null;
    }

    const result: LyricsResult = data.synced
      ? { lines: parseLRC(data.lyrics), synced: true }
      : { lines: parsePlain(data.lyrics), synced: false };

    if (result.lines.length === 0) {
      lyricsCache.set(cacheKey, null);
      return null;
    }

    lyricsCache.set(cacheKey, result);
    return result;
  } catch (err) {
    console.warn('Lyrics fetch failed:', err);
    lyricsCache.set(cacheKey, null);
    return null;
  }
}
