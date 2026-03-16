import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { artist, title } = await req.json();
    if (!artist || !title) {
      return new Response(JSON.stringify({ error: 'artist and title required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const cleanArtist = artist.replace(/\s*ft\.?\s*.*/i, '').replace(/\s*feat\.?\s*.*/i, '').trim();
    const cleanTitle = title.replace(/\s*\(.*\)/, '').replace(/\s*\[.*\]/, '').trim();

    // Try LRCLIB first (provides synced lyrics with timestamps)
    try {
      const lrclibUrl = `https://lrclib.net/api/search?artist_name=${encodeURIComponent(cleanArtist)}&track_name=${encodeURIComponent(cleanTitle)}`;
      const lrclibRes = await fetch(lrclibUrl, {
        headers: { 'User-Agent': 'DemusMusic/1.0' },
      });

      if (lrclibRes.ok) {
        const results = await lrclibRes.json();
        if (Array.isArray(results) && results.length > 0) {
          const best = results[0];
          if (best.syncedLyrics) {
            return new Response(JSON.stringify({
              lyrics: best.syncedLyrics,
              synced: true,
              source: 'lrclib',
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          if (best.plainLyrics) {
            return new Response(JSON.stringify({
              lyrics: best.plainLyrics.trim(),
              synced: false,
              source: 'lrclib',
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }
      }
    } catch (e) {
      console.warn('LRCLIB fetch failed:', e);
    }

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
