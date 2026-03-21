/**
 * Utility for uploading blobs to tmpfiles.org
 * Returns a direct download link
 */
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
          if (res.status === 'success' && res.data?.url) {
            // Convert to DL link for direct access
            const directUrl = res.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
            resolve(directUrl);
          } else {
            reject(new Error('Invalid response from tmpfiles.org'));
          }
        } catch (err) {
          reject(new Error('Failed to parse tmpfiles.org response'));
        }
      } else {
        reject(new Error(`Upload failed with status: ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
    xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));

    xhr.open('POST', 'https://tmpfiles.org/api/v1/upload');
    xhr.send(formData);
  });
};
