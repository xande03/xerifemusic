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
    const match = raw.match(/^\[(\d{2,}):(\d{2})(?:\.(\d+))?\]\s?(.*)/);
    if (match) {
      const mins = parseInt(match[1], 10);
      const secs = parseInt(match[2], 10);
      let msStr = match[3] || '0';
      // Normalize ms to 3 digits (e.g. "5" -> "500", "05" -> "050")
      msStr = msStr.padEnd(3, '0').slice(0, 3);
      const ms = parseInt(msStr, 10);
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

/** Normalize string for search: remove accents, lowercase, trim */
function normalizeSearch(s: string): string {
  return s.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Fetch from LRCLIB (free public API, no key required) */
async function fetchFromLRCLIB(artist: string, title: string): Promise<LyricsResult | null> {
  try {
    const params = new URLSearchParams({
      artist_name: artist,
      track_name: title,
    });
    const res = await fetch(`https://lrclib.net/api/get?${params}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      // Try search endpoint as fallback
      const searchParams = new URLSearchParams({ q: `${artist} ${title}` });
      const searchRes = await fetch(`https://lrclib.net/api/search?${searchParams}`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!searchRes.ok) return null;
      const results = await searchRes.json();
      if (!Array.isArray(results) || results.length === 0) return null;
      // Find best match
      const normArtist = normalizeSearch(artist);
      const normTitle = normalizeSearch(title);
      const best = results.find((r: any) =>
        normalizeSearch(r.artistName || '').includes(normArtist.split(' ')[0]) &&
        normalizeSearch(r.trackName || '').includes(normTitle.split(' ')[0])
      ) || results[0];
      if (best?.syncedLyrics) {
        const lines = parseLRC(best.syncedLyrics);
        if (lines.length > 0) return { lines, synced: true };
      }
      if (best?.plainLyrics) {
        const lines = parsePlain(best.plainLyrics);
        if (lines.length > 0) return { lines, synced: false };
      }
      return null;
    }
    const data = await res.json();
    if (data?.syncedLyrics) {
      const lines = parseLRC(data.syncedLyrics);
      if (lines.length > 0) return { lines, synced: true };
    }
    if (data?.plainLyrics) {
      const lines = parsePlain(data.plainLyrics);
      if (lines.length > 0) return { lines, synced: false };
    }
    return null;
  } catch (err) {
    console.warn('LRCLIB fetch failed:', err);
    return null;
  }
}

export async function fetchLyrics(artist: string, title: string): Promise<LyricsResult | null> {
  const cacheKey = `${artist}::${title}`;
  if (lyricsCache.has(cacheKey)) return lyricsCache.get(cacheKey)!;

  // 1st attempt: Supabase Edge Function (may have Genius / other premium sources)
  try {
    const { data, error } = await supabase.functions.invoke('fetch-lyrics', {
      body: { artist, title },
    });

    if (!error && data?.lyrics) {
      const result: LyricsResult = data.synced
        ? { lines: parseLRC(data.lyrics), synced: true }
        : { lines: parsePlain(data.lyrics), synced: false };

      if (result.lines.length > 0) {
        lyricsCache.set(cacheKey, result);
        return result;
      }
    }
  } catch (_) {
    // Silently fall through to next source
  }

  // 2nd attempt: LRCLIB — free public API, great coverage, supports synced LRC
  const lrclibResult = await fetchFromLRCLIB(artist, title);
  if (lrclibResult) {
    lyricsCache.set(cacheKey, lrclibResult);
    return lrclibResult;
  }

  // 3rd attempt: retry with main artist only (strips feat./ft.)
  const mainArtist = artist.split(/[,&\/]|feat\.|ft\./i)[0].trim();
  if (mainArtist !== artist) {
    const retryResult = await fetchFromLRCLIB(mainArtist, title);
    if (retryResult) {
      lyricsCache.set(cacheKey, retryResult);
      return retryResult;
    }
  }

  // All sources exhausted
  lyricsCache.set(cacheKey, null);
  return null;
}
