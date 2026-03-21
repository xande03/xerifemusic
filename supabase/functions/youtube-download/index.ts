// supabase/functions/youtube-download/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { videoId, format } = await req.json()
    
    if (!videoId) {
      throw new Error('Video ID is required')
    }

    const isAudio = format === 'mp3'
    
    // Using a public cobalt instance through a proxy or direct fetch
    // Note: In production, you might want to use a more stable API or your own instance
    const response = await fetch('https://co.wuk.sh/api/json', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: `https://www.youtube.com/watch?v=${videoId}`,
        aFormat: isAudio ? "mp3" : "mp4",
        isAudioOnly: isAudio,
        vQuality: "720"
      })
    })

    const data = await response.json()

    if (data.status === 'error' || !data.url) {
      return new Response(
        JSON.stringify({ error: data.error?.text || 'Failed to get download URL' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ url: data.url }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
