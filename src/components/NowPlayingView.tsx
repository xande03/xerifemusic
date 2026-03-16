import { ChevronDown, Heart, Share2 } from "lucide-react";
import { Song } from "@/data/mockSongs";
import AudioVisualizer from "./AudioVisualizer";
import PlayerControls from "./PlayerControls";
import heroBg from "@/assets/hero-bg.jpg";

interface NowPlayingViewProps {
  song: Song;
  isPlaying: boolean;
  progress: number;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onCollapse: () => void;
}

const NowPlayingView = ({ song, isPlaying, progress, onTogglePlay, onNext, onPrev, onCollapse }: NowPlayingViewProps) => (
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
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Reproduzindo</span>
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
            <p className="text-sm text-muted-foreground">{song.artist} · {song.album}</p>
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
          progress={progress}
          onTogglePlay={onTogglePlay}
          onNext={onNext}
          onPrev={onPrev}
        />
      </div>
    </div>
  </div>
);

export default NowPlayingView;
