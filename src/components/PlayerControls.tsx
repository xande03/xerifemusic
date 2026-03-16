import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Download, WifiOff } from "lucide-react";
import { Song, formatDuration } from "@/data/mockSongs";

interface PlayerControlsProps {
  song: Song;
  isPlaying: boolean;
  progress: number;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
}

const PlayerControls = ({ song, isPlaying, progress, onTogglePlay, onNext, onPrev }: PlayerControlsProps) => {
  const elapsed = Math.floor(song.duration * progress);

  return (
    <div className="w-full space-y-4">
      {/* Progress bar */}
      <div className="space-y-1">
        <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-300"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground font-mono">
          <span>{formatDuration(elapsed)}</span>
          <span>{formatDuration(song.duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-6">
        <button className="text-muted-foreground hover:text-foreground transition-colors">
          <Shuffle size={18} />
        </button>
        <button onClick={onPrev} className="text-foreground hover:text-primary transition-colors">
          <SkipBack size={24} />
        </button>
        <button
          onClick={onTogglePlay}
          className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-glow-cyan hover:scale-105 transition-transform"
        >
          {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
        </button>
        <button onClick={onNext} className="text-foreground hover:text-primary transition-colors">
          <SkipForward size={24} />
        </button>
        <button className="text-muted-foreground hover:text-foreground transition-colors">
          <Repeat size={18} />
        </button>
      </div>

      {/* Status indicators */}
      <div className="flex justify-center gap-4 text-xs text-muted-foreground">
        {song.isDownloaded && (
          <span className="flex items-center gap-1 text-primary">
            <Download size={12} /> Offline
          </span>
        )}
        <span className="flex items-center gap-1">
          <WifiOff size={12} /> Crossfade: 3s
        </span>
      </div>
    </div>
  );
};

export default PlayerControls;
