import { Song } from "@/data/mockSongs";
import { searchYouTubeMusic } from "@/lib/youtubeSearch";

const QUEUE_KEY = "demus_smart_queue";
const MAX_QUEUE = 30;

interface SmartQueue {
  songs: Song[];
  seedArtist: string;
  seedTitle: string;
}

function getQueue(): SmartQueue | null {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveQueue(queue: SmartQueue) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {}
}

/**
 * Build search queries to find similar music based on artist + title
 */
function buildRelatedQueries(artist: string, title: string): string[] {
  const cleanArtist = artist.replace(/\s*-\s*Topic$/i, "").trim();
  return [
    `${cleanArtist} mix`,
    `${cleanArtist} melhores músicas`,
    `músicas parecidas com ${title} ${cleanArtist}`,
    `${cleanArtist} playlist`,
  ];
}

/**
 * Fetch related songs for the given seed song.
 * Returns a queue of songs similar to the current one.
 */
export async function fetchRelatedQueue(currentSong: Song): Promise<Song[]> {
  const cached = getQueue();
  // If we already have a queue for this artist and it has songs, return it
  if (
    cached &&
    cached.seedArtist === currentSong.artist &&
    cached.songs.length > 0
  ) {
    return cached.songs;
  }

  const queries = buildRelatedQueries(currentSong.artist, currentSong.title);

  // Try first query, fallback to second
  for (const query of queries.slice(0, 2)) {
    try {
      const results = await searchYouTubeMusic(query, "all");
      if (results.length > 0) {
        // Filter out the current song and deduplicate
        const filtered = results
          .filter((s) => s.youtubeId !== currentSong.youtubeId)
          .slice(0, MAX_QUEUE);

        if (filtered.length > 0) {
          const queue: SmartQueue = {
            songs: filtered,
            seedArtist: currentSong.artist,
            seedTitle: currentSong.title,
          };
          saveQueue(queue);
          return filtered;
        }
      }
    } catch {
      continue;
    }
  }

  return [];
}

/**
 * Get next song from the smart queue, removing it from the queue.
 * If queue is empty, returns null (caller should fallback).
 */
export function popNextFromQueue(): Song | null {
  const cached = getQueue();
  if (!cached || cached.songs.length === 0) return null;

  const [next, ...rest] = cached.songs;
  saveQueue({ ...cached, songs: rest });
  return next;
}

/**
 * Get previous song from history (managed externally via localStorage history).
 */
export function clearSmartQueue() {
  localStorage.removeItem(QUEUE_KEY);
}
