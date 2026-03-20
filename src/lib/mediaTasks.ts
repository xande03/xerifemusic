export const downloadCobaltMedia = async (
  youtubeId: string,
  isAudio: boolean,
  onProgress?: (progress: number) => void
): Promise<Blob> => {
  // First, get the direct URL from a public cobalt instance
  // Note: api.cobalt.tools recently restricted API keys. Using an alternative known public instance or fallback.
  // Actually, we'll use co.wuk.sh (another public instance).
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

  // Fetch the actual file to get progress and Blob
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
        // Fake progress if no content length
        onProgress(Math.min(99, Math.round(received / 1000000)));
      }
    }
  }

  return new Blob(chunks as unknown as BlobPart[], { type: isAudio ? 'audio/mpeg' : 'video/mp4' });
};

export const uploadToTmpFiles = async (
  blob: Blob,
  filename: string,
  onProgress?: (progress: number) => void
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', blob, filename);

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          // tmpfiles.org returns {"status":"success","data":{"url":"https://tmpfiles.org/XXXX/file.mp4"}}
          // To download directly or view, we usually format as https://tmpfiles.org/dl/XXXX/file.mp4
          // But the user just wants the tmpfiles URL.
          if (res.status === 'success' && res.data?.url) {
            // Convert to DL link for direct access if needed, or just return the page link
            const directUrl = res.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
            resolve(directUrl);
          } else {
            reject(new Error('Invalid response from tmpfiles.org'));
          }
        } catch (err) {
          reject(new Error('Failed to parse tmpfiles.org response'));
        }
      } else {
        reject(new Error(`Upload failed securely with status: ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload aborted'));
    });

    // Tempfiles requires the file input
    xhr.open('POST', 'https://tmpfiles.org/api/v1/upload');
    xhr.send(formData);
  });
};
