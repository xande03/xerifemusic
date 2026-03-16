import { ChevronDown, Heart, Share2, Volume2, Video, Music2 } from "lucide-react";
import { Song, formatDuration } from "@/data/mockSongs";
import AudioVisualizer from "./AudioVisualizer";
import heroBg from "@/assets/hero-bg.jpg";
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
  onCollapse, onSeek,
  volume, onVolumeChange,
}: NowPlayingViewProps) => {
  const [showVideo, setShowVideo] = useState(true);
  const progress = duration > 0 ? currentTime / duration : 0;

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const fraction = (e.clientX - rect.left) / rect.width;
    onSeek(Math.max(0, Math.min(1, fraction)));
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col animate-slide-up">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden">
        <img src={heroBg} alt="" className="w-full h-full object-cover opacity-10 blur-3xl scale-110" />
        <div className="absolute inset-0 gradient-mesh" />
      </div>

      <div className="relative flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 z-10">
          <button onClick={onCollapse} className="text-muted-foreground hover:text-foreground transition-colors">
            <ChevronDown size={28} />
          </button>
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            Reproduzindo via YouTube
          </span>
          <button
            onClick={() => setShowVideo((v) => !v)}
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            {showVideo ? <Music2 size={20} /> : <Video size={20} />}
          </button>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col items-center px-6 gap-4 max-w-lg mx-auto w-full overflow-y-auto pb-6">
          {/* Video area - the actual yt-player is positioned here by parent */}
          {showVideo ? (
            <div className="w-full aspect-video rounded-2xl overflow-hidden shadow-glow-cyan bg-card">
              {/* YouTube player is overlaid here by Index.tsx */}
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                Player do YouTube
              </div>
            </div>
          ) : (
            <div className="w-full aspect-video rounded-2xl overflow-hidden shadow-glow-cyan relative">
              <img src={song.cover} alt={song.album} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-background/40 flex items-center justify-center">
                <AudioVisualizer isPlaying={isPlaying} barCount={48} className="w-3/4 h-20" />
              </div>
            </div>
          )}

          {/* Song info */}
          <div className="w-full flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold text-foreground truncate">{song.title}</h2>
              <p className="text-sm text-muted-foreground">{song.artist}</p>
            </div>
            <div className="flex gap-3">
              <button className="text-muted-foreground hover:text-secondary transition-colors">
                <Heart size={20} />
              </button>
              <button className="text-muted-foreground hover:text-primary transition-colors">
                <Share2 size={18} />
              </button>
            </div>
          </div>

          {/* Visualizer */}
          <AudioVisualizer isPlaying={isPlaying} barCount={64} className="w-full" />

          {/* Progress */}
          <div className="w-full space-y-1">
            <div
              className="h-1.5 w-full rounded-full bg-muted overflow-hidden cursor-pointer"
              onClick={handleProgressClick}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-200"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground font-mono">
              <span>{formatDuration(currentTime)}</span>
              <span>{formatDuration(duration)}</span>
            </div>
          </div>

          {/* Volume */}
          <div className="w-full flex items-center gap-3">
            <Volume2 size={16} className="text-muted-foreground" />
            <input
              type="range"
              min={0}
              max={100}
              value={volume}
              onChange={(e) => onVolumeChange(Number(e.target.value))}
              className="flex-1 h-1 appearance-none rounded-full bg-muted accent-primary"
            />
          </div>

          <p className="text-[10px] text-muted-foreground text-center">
            Use os controles nativos do YouTube no player acima
          </p>
        </div>
      </div>
    </div>
  );
};

export default NowPlayingView;
