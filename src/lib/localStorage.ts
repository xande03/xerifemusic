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
