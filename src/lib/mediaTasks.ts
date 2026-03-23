import { uploadToTmpFiles } from "./tmpFilesUpload";

export { uploadToTmpFiles };

export const downloadCobaltMedia = async (
  _youtubeId: string,
  _isAudio: boolean,
  _onProgress?: (progress: number) => void
): Promise<Blob> => {
  // Supabase connection disabled as requested.
  // Downloads via proxy are currently unavailable.
  throw new Error('Download via proxy desativado. Use o download externo via yout.com');
};
