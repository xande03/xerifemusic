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

    // Clean artist/title for better matching
    const cleanArtist = artist.replace(/\s*ft\.?\s*.*/i, '').replace(/\s*feat\.?\s*.*/i, '').trim();
    const cleanTitle = title.replace(/\s*\(.*\)/, '').replace(/\s*\[.*\]/, '').trim();

    // Try lyrics.ovh (free, no key needed)
    const lyricsUrl = `https://api.lyrics.ovh/v1/${encodeURIComponent(cleanArtist)}/${encodeURIComponent(cleanTitle)}`;
    
    const response = await fetch(lyricsUrl, {
      headers: { 'User-Agent': 'DemusMusic/1.0' },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.lyrics) {
        return new Response(JSON.stringify({ lyrics: data.lyrics.trim(), source: 'lyrics.ovh' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Fallback: try with original names
    if (cleanArtist !== artist || cleanTitle !== title) {
      const fallbackUrl = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`;
      const fallbackResponse = await fetch(fallbackUrl, {
        headers: { 'User-Agent': 'DemusMusic/1.0' },
      });
      
      if (fallbackResponse.ok) {
        const data = await fallbackResponse.json();
        if (data.lyrics) {
          return new Response(JSON.stringify({ lyrics: data.lyrics.trim(), source: 'lyrics.ovh' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    }

    return new Response(JSON.stringify({ lyrics: null, error: 'Lyrics not found' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Lyrics fetch error:', error);
    return new Response(JSON.stringify({ lyrics: null, error: 'Failed to fetch lyrics' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
