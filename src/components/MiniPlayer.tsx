import { Play, Pause, SkipForward } from "lucide-react";
import { Song } from "@/data/mockSongs";
import { hdThumbnail } from "@/lib/utils";
import BlurImage from "@/components/BlurImage";

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
    <div className="mx-3 mb-1 rounded-xl overflow-hidden bg-card animate-slide-up shadow-lg flex-shrink-0">
      {/* Progress */}
      <div className="h-[2px] bg-muted">
        <div className="h-full bg-primary transition-all duration-200" style={{ width: `${progress * 100}%` }} />
      </div>
      <div className="flex items-center gap-3 p-2">
        <button onClick={onExpand} className="flex items-center gap-3 flex-1 min-w-0">
          <BlurImage src={hdThumbnail(song.cover)} alt={song.album} className="w-10 h-10 rounded" />
          <div className="min-w-0">
            <p className="text-sm font-normal truncate text-foreground">{song.title}</p>
            <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
          </div>
        </button>
        <div className="flex items-center gap-1">
          <button onClick={onTogglePlay} className="p-2 text-foreground hover:text-primary transition-colors">
            {isPlaying ? <Pause size={22} /> : <Play size={22} />}
          </button>
          <button onClick={onNext} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
            <SkipForward size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MiniPlayer;
