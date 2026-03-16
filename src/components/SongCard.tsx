import { Download, DownloadCloud, Play } from "lucide-react";
import { Song, formatDuration } from "@/data/mockSongs";

interface SongCardProps {
  song: Song;
  isActive: boolean;
  onSelect: (song: Song) => void;
}

const SongCard = ({ song, isActive, onSelect }: SongCardProps) => (
  <button
    onClick={() => onSelect(song)}
    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all group ${
      isActive ? "glass shadow-glow-cyan" : "hover:bg-muted/50"
    }`}
  >
    <div className="relative w-12 h-12 rounded-md overflow-hidden flex-shrink-0">
      <img src={song.cover} alt={song.album} className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-background/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <Play size={16} className="text-primary" />
      </div>
    </div>
    <div className="flex-1 text-left min-w-0">
      <p className={`text-sm font-medium truncate ${isActive ? "text-primary" : "text-foreground"}`}>
        {song.title}
      </p>
      <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
    </div>
    <div className="flex items-center gap-3 flex-shrink-0">
      {song.isDownloaded ? (
        <Download size={14} className="text-primary/60" />
      ) : (
        <DownloadCloud size={14} className="text-muted-foreground" />
      )}
      <span className="text-xs text-muted-foreground font-mono">{formatDuration(song.duration)}</span>
    </div>
  </button>
);

export default SongCard;
