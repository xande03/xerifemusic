import { uploadToTmpFiles } from "./tmpFilesUpload";
import { supabase } from "@/integrations/supabase/client";

export { uploadToTmpFiles };

export const downloadCobaltMedia = async (
  youtubeId: string,
  isAudio: boolean,
  onProgress?: (progress: number) => void
): Promise<Blob> => {
  // Use our Supabase Edge Function as a proxy to bypass CORS
  const { data, error } = await supabase.functions.invoke('youtube-download', {
    body: { 
      videoId: youtubeId, 
      format: isAudio ? 'mp3' : 'mp4' 
    }
  });

  if (error || !data?.url) {
    throw new Error(error?.message || data?.error || 'Não foi possível obter o link de download');
  }

  // Fetch with progress tracking from the returned proxy URL
  const fileRes = await fetch(data.url);
  if (!fileRes.ok) throw new Error(`Erro ao acessar arquivo: ${fileRes.status}`);
  
  const contentLength = fileRes.headers.get('content-length');
  const total = contentLength ? parseInt(contentLength, 10) : 0;
  
  if (!fileRes.body) throw new Error('O navegador não suporta streaming de download');
  
  const reader = fileRes.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    if (value) {
      chunks.push(value);
      received += value.length;
      if (total && onProgress) {
        onProgress(Math.round((received / total) * 100));
      } else if (onProgress) {
        // Fallback for missing Content-Length: show MBs received up to 99%
        onProgress(Math.min(99, Math.round(received / (2 * 1024 * 1024))));
      }
    }
  }

  return new Blob(chunks as any, { 
    type: isAudio ? 'audio/mpeg' : 'video/mp4' 
  });
};

