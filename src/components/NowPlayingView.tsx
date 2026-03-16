import { ChevronDown, Heart, Share2, Volume2, Video, Music2 } from "lucide-react";
import { Song, formatDuration } from "@/data/mockSongs";
import AudioVisualizer from "./AudioVisualizer";
import { useState } from "react";

interface NowPlayingViewProps {
  song: Song;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onCollapse: () => void;
  onSeek: (fraction: number) => void;
  volume: number;
  onVolumeChange: (vol: number) => void;
}

const NowPlayingView = ({
  song, isPlaying, currentTime, duration,
  onCollapse, onSeek, volume, onVolumeChange,
}: NowPlayingViewProps) => {
  const [showVideo, setShowVideo] = useState(true);
  const progress = duration > 0 ? currentTime / duration : 0;

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    onSeek(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)));
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col animate-slide-up">
      <div className="relative flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={onCollapse} className="text-muted-foreground hover:text-foreground transition-colors">
            <ChevronDown size={26} />
          </button>
          <span className="text-xs text-muted-foreground uppercase tracking-wider">YouTube Music</span>
          <button onClick={() => setShowVideo((v) => !v)} className="text-muted-foreground hover:text-foreground transition-colors">
            {showVideo ? <Music2 size={20} /> : <Video size={20} />}
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center px-4 gap-4 max-w-lg mx-auto w-full overflow-y-auto pb-6">
          {/* Video / Art area */}
          {showVideo ? (
            <div className="w-full aspect-video rounded-xl overflow-hidden bg-card">
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                Player do YouTube
              </div>
            </div>
          ) : (
            <div className="w-full aspect-video rounded-xl overflow-hidden relative bg-card">
              <img src={song.cover} alt={song.album} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-background/40 flex items-center justify-center">
                <AudioVisualizer isPlaying={isPlaying} barCount={48} className="w-3/4 h-16" />
              </div>
            </div>
          )}

          {/* Info */}
          <div className="w-full flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-medium text-foreground truncate">{song.title}</h2>
              <p className="text-sm text-muted-foreground">{song.artist}</p>
            </div>
            <div className="flex gap-2">
              <button className="p-2 text-muted-foreground hover:text-foreground"><Heart size={20} /></button>
              <button className="p-2 text-muted-foreground hover:text-foreground"><Share2 size={18} /></button>
            </div>
          </div>

          {/* Visualizer */}
          <AudioVisualizer isPlaying={isPlaying} barCount={64} className="w-full" />

          {/* Progress */}
          <div className="w-full space-y-1">
            <div className="h-1 w-full rounded-full bg-muted overflow-hidden cursor-pointer" onClick={handleProgressClick}>
              <div className="h-full rounded-full bg-primary transition-all duration-200" style={{ width: `${progress * 100}%` }} />
            </div>
            <div className="flex justify-between text-[11px] text-muted-foreground font-mono">
              <span>{formatDuration(currentTime)}</span>
              <span>{formatDuration(duration)}</span>
            </div>
          </div>

          {/* Volume */}
          <div className="w-full flex items-center gap-3">
            <Volume2 size={14} className="text-muted-foreground" />
            <input type="range" min={0} max={100} value={volume} onChange={(e) => onVolumeChange(Number(e.target.value))} className="flex-1 h-1 appearance-none rounded-full bg-muted accent-primary" />
          </div>

          <p className="text-[10px] text-muted-foreground">Controles nativos do YouTube no player acima</p>
        </div>
      </div>
    </div>
  );
};

export default NowPlayingView;
