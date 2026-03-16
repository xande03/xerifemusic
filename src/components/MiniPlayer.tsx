import { Play, Pause, SkipForward } from "lucide-react";
import { Song } from "@/data/mockSongs";

interface MiniPlayerProps {
  song: Song;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onTogglePlay: () => void;
  onNext: () => void;
  onExpand: () => void;
}

const MiniPlayer = ({ song, isPlaying, currentTime, duration, onTogglePlay, onNext, onExpand }: MiniPlayerProps) => {
  const progress = duration > 0 ? currentTime / duration : 0;

  return (
    <div className="glass rounded-xl mx-3 mb-2 animate-slide-up overflow-hidden">
      <div className="h-0.5 bg-muted">
        <div
          className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-200"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <div className="flex items-center gap-3 p-3">
        <button onClick={onExpand} className="flex items-center gap-3 flex-1 min-w-0">
          <img src={song.cover} alt={song.album} className="w-10 h-10 rounded-md object-cover" />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate text-foreground">{song.title}</p>
            <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
          </div>
        </button>
        <div className="flex items-center gap-2">
          <button onClick={onTogglePlay} className="text-foreground hover:text-primary transition-colors p-1">
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>
          <button onClick={onNext} className="text-muted-foreground hover:text-foreground transition-colors p-1">
            <SkipForward size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MiniPlayer;
