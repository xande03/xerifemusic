import { uploadToTmpFiles } from "./tmpFilesUpload";

export { uploadToTmpFiles };

export const downloadCobaltMedia = async (
  youtubeId: string,
  isAudio: boolean,
  onProgress?: (progress: number) => void
): Promise<Blob> => {
  // Use co.wuk.sh (public cobalt instance)
  const apiUrl = 'https://co.wuk.sh/api/json';
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      url: `https://www.youtube.com/watch?v=${youtubeId}`,
      aFormat: "mp3",
      isAudioOnly: isAudio,
      vQuality: "720"
    })
  });

  const data = await response.json();
  if (data.status === 'error' || !data.url) {
    throw new Error(data.error?.text || 'Failed to get download URL');
  }

  // Fetch with progress
  const fileRes = await fetch(data.url);
  if (!fileRes.ok) throw new Error(`HTTP error! status: ${fileRes.status}`);
  
  const contentLength = fileRes.headers.get('content-length');
  const total = contentLength ? parseInt(contentLength, 10) : 0;
  
  if (!fileRes.body) throw new Error('ReadableStream not supported');
  
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
        onProgress(Math.min(99, Math.round(received / 1000000)));
      }
    }
  }

  return new Blob(chunks as unknown as BlobPart[], { 
    type: isAudio ? 'audio/mpeg' : 'video/mp4' 
  });
};

