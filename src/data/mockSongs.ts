import album1 from "@/assets/album-1.jpg";
import album2 from "@/assets/album-2.jpg";
import album3 from "@/assets/album-3.jpg";
import album4 from "@/assets/album-4.jpg";

export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  cover: string;
  duration: number; // seconds
  votes: number;
  isDownloaded: boolean;
}

export const mockSongs: Song[] = [
  { id: "1", title: "Neon Pulse", artist: "Synthwave Collective", album: "Electric Dreams", cover: album1, duration: 234, votes: 12, isDownloaded: true },
  { id: "2", title: "Midnight Drive", artist: "RetroCity", album: "Night Cruise", cover: album2, duration: 198, votes: 8, isDownloaded: false },
  { id: "3", title: "Deep Current", artist: "Oceanic", album: "Abyssal", cover: album3, duration: 312, votes: 15, isDownloaded: true },
  { id: "4", title: "Crystal Flame", artist: "Amber Forge", album: "Ignition", cover: album4, duration: 267, votes: 5, isDownloaded: false },
  { id: "5", title: "Aurora Borealis", artist: "Synthwave Collective", album: "Electric Dreams", cover: album1, duration: 289, votes: 20, isDownloaded: true },
  { id: "6", title: "Cyber Sunset", artist: "RetroCity", album: "Night Cruise", cover: album2, duration: 201, votes: 3, isDownloaded: false },
  { id: "7", title: "Tidal Force", artist: "Oceanic", album: "Abyssal", cover: album3, duration: 345, votes: 9, isDownloaded: true },
  { id: "8", title: "Molten Core", artist: "Amber Forge", album: "Ignition", cover: album4, duration: 178, votes: 7, isDownloaded: false },
];

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
