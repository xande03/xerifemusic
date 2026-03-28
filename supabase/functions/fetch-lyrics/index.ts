import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getClientIp, checkRateLimit, rateLimitResponse } from "../_shared/rateLimiter.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limit: 20 requests per minute per IP
    const ip = getClientIp(req);
    const rl = checkRateLimit(ip, { maxRequests: 20, windowMs: 60_000 });
    if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs, corsHeaders);

    const { artist, title } = await req.json();
    if (!artist || !title) {
      return new Response(JSON.stringify({ error: 'artist and title required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const cleanArtist = artist.replace(/\s*ft\.?\s*.*/i, '').replace(/\s*feat\.?\s*.*/i, '').replace(/\s*-\s*Topic$/i, '').replace(/VEVO$/i, '').trim();
    const cleanTitle = title.replace(/\s*\(.*\)/, '').replace(/\s*\[.*\]/, '').replace(/\s*\|.*/, '').trim();

    // Try LRCLIB with multiple strategies
    const searches = [
      { artist: cleanArtist, title: cleanTitle },
      { artist: artist, title: title },
      { artist: cleanArtist, title: title },
    ];

    for (const s of searches) {
      try {
        // Try exact match first
        const getUrl = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(s.artist)}&track_name=${encodeURIComponent(s.title)}`;
        const getRes = await fetch(getUrl, { headers: { 'User-Agent': 'DemusMusic/1.0' } });
        if (getRes.ok) {
          const data = await getRes.json();
          if (data.syncedLyrics) {
            return new Response(JSON.stringify({ lyrics: data.syncedLyrics, synced: true, source: 'lrclib' }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          if (data.plainLyrics) {
            return new Response(JSON.stringify({ lyrics: data.plainLyrics.trim(), synced: false, source: 'lrclib' }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }
      } catch {}

      try {
        // Search endpoint
        const searchUrl = `https://lrclib.net/api/search?artist_name=${encodeURIComponent(s.artist)}&track_name=${encodeURIComponent(s.title)}`;
        const searchRes = await fetch(searchUrl, { headers: { 'User-Agent': 'DemusMusic/1.0' } });
        if (searchRes.ok) {
          const results = await searchRes.json();
          if (Array.isArray(results) && results.length > 0) {
            // Prefer synced lyrics
            const synced = results.find((r: any) => r.syncedLyrics);
            if (synced) {
              return new Response(JSON.stringify({ lyrics: synced.syncedLyrics, synced: true, source: 'lrclib' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            }
            const plain = results.find((r: any) => r.plainLyrics);
            if (plain) {
              return new Response(JSON.stringify({ lyrics: plain.plainLyrics.trim(), synced: false, source: 'lrclib' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            }
          }
        }
      } catch {}
    }

    // Also try LRCLIB with just the title (for cases where artist doesn't match)
    try {
      const titleOnlyUrl = `https://lrclib.net/api/search?track_name=${encodeURIComponent(cleanTitle)}`;
      const titleRes = await fetch(titleOnlyUrl, { headers: { 'User-Agent': 'DemusMusic/1.0' } });
      if (titleRes.ok) {
        const results = await titleRes.json();
        if (Array.isArray(results) && results.length > 0) {
          const synced = results.find((r: any) => r.syncedLyrics);
          if (synced) {
            return new Response(JSON.stringify({ lyrics: synced.syncedLyrics, synced: true, source: 'lrclib' }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }
      }
    } catch {}

    // Fallback: lyrics.ovh (plain text only)
    const lyricsUrl = `https://api.lyrics.ovh/v1/${encodeURIComponent(cleanArtist)}/${encodeURIComponent(cleanTitle)}`;
    const response = await fetch(lyricsUrl, {
      headers: { 'User-Agent': 'DemusMusic/1.0' },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.lyrics) {
        return new Response(JSON.stringify({ lyrics: data.lyrics.trim(), synced: false, source: 'lyrics.ovh' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ lyrics: null, synced: false, error: 'Lyrics not found' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Lyrics fetch error:', error);
    return new Response(JSON.stringify({ lyrics: null, synced: false, error: 'Failed to fetch lyrics' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
