// Demus Evolution - Client-Side Storage (localStorage)

const DEVICE_ID_KEY = "demus_device_id";
const VOTES_KEY = "demus_voted_songs";
const QUEUE_KEY = "demus_queue";
const CURRENT_SONG_KEY = "demus_current_song";
const VOLUME_KEY = "demus_volume";
const PREFS_KEY = "demus_preferences";

// Generate a unique device ID (persists across sessions)
function generateDeviceId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  const screen = `${window.screen.width}x${window.screen.height}`;
  return `dev_${timestamp}_${random}_${btoa(screen).substring(0, 6)}`;
}

export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = generateDeviceId();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

// Voted songs (prevents double voting)
export function getVotedSongs(): string[] {
  try {
    return JSON.parse(localStorage.getItem(VOTES_KEY) || "[]");
  } catch {
    return [];
  }
}

export function addVotedSong(songId: string): void {
  const voted = getVotedSongs();
  if (!voted.includes(songId)) {
    voted.push(songId);
    localStorage.setItem(VOTES_KEY, JSON.stringify(voted));
  }
}

export function hasVotedForSong(songId: string): boolean {
  return getVotedSongs().includes(songId);
}

export function removeVotedSong(songId: string): void {
  const voted = getVotedSongs().filter(id => id !== songId);
  localStorage.setItem(VOTES_KEY, JSON.stringify(voted));
}

// Full metadata for favorites
const FAVORITES_METADATA_KEY = "demus_favorites_metadata";

export function getFavoritesMetadata(): any[] {
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_METADATA_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveFavoriteMetadata(song: any): void {
  const favorites = getFavoritesMetadata();
  if (!favorites.some(f => f.id === song.id)) {
    favorites.push(song);
    localStorage.setItem(FAVORITES_METADATA_KEY, JSON.stringify(favorites));
  }
}

export function removeFavoriteMetadata(songId: string): void {
  const favorites = getFavoritesMetadata().filter(f => f.id !== songId);
  localStorage.setItem(FAVORITES_METADATA_KEY, JSON.stringify(favorites));
}

// Queue state (vote counts)
export function saveQueueState(votes: Record<string, number>): void {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(votes));
}

export function getQueueState(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || "{}");
  } catch {
    return {};
  }
}

// Current song
export function saveCurrentSong(songId: string): void {
  localStorage.setItem(CURRENT_SONG_KEY, songId);
}

export function getCurrentSongId(): string | null {
  return localStorage.getItem(CURRENT_SONG_KEY);
}

// Volume
export function saveVolume(vol: number): void {
  localStorage.setItem(VOLUME_KEY, String(vol));
}

export function getVolume(): number {
  const v = localStorage.getItem(VOLUME_KEY);
  return v ? Number(v) : 80;
}

// Recently played history
const HISTORY_KEY = "demus_history";
const MAX_HISTORY = 50;

export interface HistoryEntry {
  songId: string;
  youtubeId: string;
  title: string;
  artist: string;
  album: string;
  cover: string;
  duration: number;
  playedAt: number;
  type?: "music" | "video";
}

export function getHistory(): HistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

export function addToHistory(entry: Omit<HistoryEntry, "playedAt">): void {
  const history = getHistory().filter((h) => h.songId !== entry.songId);
  history.unshift({ ...entry, playedAt: Date.now() });
  if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function clearHistory(): void {
  localStorage.removeItem(HISTORY_KEY);
}

// User preferences
export interface UserPrefs {
  displayName: string;
  isHost: boolean;
  theme: string;
}

export function savePrefs(prefs: UserPrefs): void {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

export function getPrefs(): UserPrefs {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) || "{}") as UserPrefs;
  } catch {
    return { displayName: "Convidado", isHost: false, theme: "dark" };
  }
}

// Playlists
export interface Playlist {
  id: string;
  name: string;
  songs: any[];
  createdAt: number;
}

const PLAYLISTS_KEY = "demus_playlists";

export function getPlaylists(): Playlist[] {
  try {
    return JSON.parse(localStorage.getItem(PLAYLISTS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function savePlaylist(playlist: Playlist): void {
  const playlists = getPlaylists();
  const index = playlists.findIndex(p => p.id === playlist.id);
  if (index >= 0) {
    playlists[index] = playlist;
  } else {
    playlists.push(playlist);
  }
  localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(playlists));
}

export function deletePlaylist(id: string): void {
  const playlists = getPlaylists().filter(p => p.id !== id);
  localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(playlists));
}

export function addSongToPlaylist(playlistId: string, song: any): void {
  const playlists = getPlaylists();
  const playlist = playlists.find(p => p.id === playlistId);
  if (playlist) {
    if (!playlist.songs.some(s => s.id === song.id)) {
      playlist.songs.push(song);
      savePlaylist(playlist);
    }
  }
}
