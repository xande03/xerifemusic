import { ChevronDown, Heart, Share2, Volume2 } from "lucide-react";
import { Song, formatDuration } from "@/data/mockSongs";
import AudioVisualizer from "./AudioVisualizer";
import PlayerControls from "./PlayerControls";
import heroBg from "@/assets/hero-bg.jpg";

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
  onTogglePlay, onNext, onPrev, onCollapse, onSeek,
  volume, onVolumeChange,
}: NowPlayingViewProps) => {
  const progress = duration > 0 ? currentTime / duration : 0;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col animate-slide-up">
      {/* Background art */}
      <div className="absolute inset-0 overflow-hidden">
        <img src={heroBg} alt="" className="w-full h-full object-cover opacity-20 blur-2xl scale-110" />
        <div className="absolute inset-0 gradient-mesh" />
      </div>

      {/* Content */}
      <div className="relative flex flex-col h-full px-6 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button onClick={onCollapse} className="text-muted-foreground hover:text-foreground transition-colors">
            <ChevronDown size={28} />
          </button>
          <div className="text-center">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Reproduzindo via YouTube</span>
          </div>
          <div className="w-7" />
        </div>

        {/* Album art */}
        <div className="flex-1 flex flex-col items-center justify-center gap-6 max-w-sm mx-auto w-full">
          <div className="w-full aspect-square rounded-2xl overflow-hidden shadow-glow-cyan">
            <img src={song.cover} alt={song.album} className="w-full h-full object-cover" />
          </div>

          {/* Visualizer */}
          <AudioVisualizer isPlaying={isPlaying} barCount={48} className="w-full" />

          {/* Song info */}
          <div className="w-full flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold text-foreground truncate">{song.title}</h2>
              <p className="text-sm text-muted-foreground">{song.artist}</p>
            </div>
            <div className="flex gap-3">
              <button className="text-muted-foreground hover:text-secondary transition-colors">
                <Heart size={22} />
              </button>
              <button className="text-muted-foreground hover:text-primary transition-colors">
                <Share2 size={20} />
              </button>
            </div>
          </div>

          {/* Controls */}
          <PlayerControls
            song={song}
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            onTogglePlay={onTogglePlay}
            onNext={onNext}
            onPrev={onPrev}
            onSeek={onSeek}
          />

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
        </div>
      </div>
    </div>
  );
};

export default NowPlayingView;
