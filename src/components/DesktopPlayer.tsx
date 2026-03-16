import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Shuffle, Repeat, Maximize2 } from "lucide-react";
import { Song, formatDuration } from "@/data/mockSongs";

interface DesktopPlayerProps {
  song: Song;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onExpand: () => void;
  onSeek: (fraction: number) => void;
  onVolumeChange: (vol: number) => void;
}

const DesktopPlayer = ({
  song, isPlaying, currentTime, duration, volume,
  onTogglePlay, onNext, onPrev, onExpand, onSeek, onVolumeChange,
}: DesktopPlayerProps) => {
  const progress = duration > 0 ? currentTime / duration : 0;

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    onSeek(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)));
  };

  return (
    <div className="hidden lg:flex items-center h-[72px] bg-card border-t border-border px-4 gap-4 flex-shrink-0 animate-fade-in">
      {/* Song info */}
      <button onClick={onExpand} className="flex items-center gap-3 min-w-[200px] max-w-[280px] group">
        <img
          src={song.cover}
          alt={song.album}
          className="w-12 h-12 rounded-lg object-cover shadow-md group-hover:shadow-lg transition-shadow"
        />
        <div className="min-w-0 text-left">
          <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{song.title}</p>
          <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
        </div>
      </button>

      {/* Center controls + progress */}
      <div className="flex-1 flex flex-col items-center gap-1 max-w-[600px] mx-auto">
        {/* Transport */}
        <div className="flex items-center gap-3">
          <button className="p-1.5 text-muted-foreground hover:text-foreground transition-colors active:scale-90">
            <Shuffle size={16} />
          </button>
          <button onClick={onPrev} className="p-1.5 text-foreground hover:text-primary transition-colors active:scale-90">
            <SkipBack size={18} fill="currentColor" />
          </button>
          <button
            onClick={onTogglePlay}
            className="w-9 h-9 rounded-full bg-foreground flex items-center justify-center text-background hover:scale-110 active:scale-95 transition-transform"
          >
            {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
          </button>
          <button onClick={onNext} className="p-1.5 text-foreground hover:text-primary transition-colors active:scale-90">
            <SkipForward size={18} fill="currentColor" />
          </button>
          <button className="p-1.5 text-muted-foreground hover:text-foreground transition-colors active:scale-90">
            <Repeat size={16} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="w-full flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground font-mono w-10 text-right">{formatDuration(currentTime)}</span>
          <div
            className="flex-1 h-1 rounded-full bg-muted overflow-hidden cursor-pointer group relative"
            onClick={handleProgressClick}
          >
            <div
              className="h-full rounded-full bg-primary transition-all duration-150 relative"
              style={{ width: `${progress * 100}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity shadow-md" />
            </div>
          </div>
          <span className="text-[10px] text-muted-foreground font-mono w-10">{formatDuration(duration)}</span>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2 min-w-[160px] justify-end">
        <button
          onClick={() => onVolumeChange(volume > 0 ? 0 : 70)}
          className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          {volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
        <input
          type="range"
          min={0}
          max={100}
          value={volume}
          onChange={(e) => onVolumeChange(Number(e.target.value))}
          className="w-20 h-1 appearance-none rounded-full bg-muted accent-primary"
        />
        <button onClick={onExpand} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors" title="Expandir">
          <Maximize2 size={16} />
        </button>
      </div>
    </div>
  );
};

export default DesktopPlayer;
