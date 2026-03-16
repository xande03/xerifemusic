import { ChevronDown, Heart, Share2, Volume2, Video, Music2, PictureInPicture2, Mic2, SkipBack, Play, Pause, SkipForward, Shuffle, Repeat } from "lucide-react";
import { Song, formatDuration } from "@/data/mockSongs";
import AudioVisualizer from "./AudioVisualizer";
import { useState } from "react";

type PlayerMode = "video" | "audio" | "lyrics";

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
  onTogglePiP?: () => void;
}

const NowPlayingView = ({
  song, isPlaying, currentTime, duration,
  onTogglePlay, onNext, onPrev,
  onCollapse, onSeek, volume, onVolumeChange, onTogglePiP,
}: NowPlayingViewProps) => {
  const [mode, setMode] = useState<PlayerMode>("video");
  const progress = duration > 0 ? currentTime / duration : 0;

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    onSeek(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)));
  };

  const handleProgressTouch = (e: React.TouchEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0];
    onSeek(Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width)));
  };

  // Mock lyrics for demo
  const mockLyrics = [
    { time: 0, text: "♪ Instrumental ♪" },
    { time: 10, text: song.title },
    { time: 20, text: `por ${song.artist}` },
    { time: 30, text: "♪ ♪ ♪" },
    { time: 40, text: "As letras aparecerão aqui" },
    { time: 50, text: "quando disponíveis" },
    { time: 60, text: "♪ ♪ ♪" },
  ];

  const currentLyricIndex = mockLyrics.reduce((acc, lyric, i) => 
    currentTime >= lyric.time ? i : acc, 0
  );

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col animate-slide-up safe-area-inset">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <button onClick={onCollapse} className="p-1 -ml-1 text-muted-foreground hover:text-foreground transition-colors active:scale-95">
          <ChevronDown size={28} />
        </button>
        <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Tocando agora</span>
        <div className="flex items-center gap-1">
          {onTogglePiP && (
            <button onClick={onTogglePiP} className="p-2 text-muted-foreground hover:text-foreground transition-colors active:scale-95" title="Picture-in-Picture">
              <PictureInPicture2 size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 flex flex-col items-center px-4 sm:px-8 gap-3 max-w-lg mx-auto w-full overflow-y-auto pb-6">
        
        {/* Mode tabs - YouTube Music style */}
        <div className="flex items-center gap-1 bg-secondary/60 rounded-full p-1 w-fit">
          <button
            onClick={() => setMode("video")}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
              mode === "video" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Video size={14} />
            <span>Vídeo</span>
          </button>
          <button
            onClick={() => setMode("audio")}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
              mode === "audio" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Music2 size={14} />
            <span>Áudio</span>
          </button>
          <button
            onClick={() => setMode("lyrics")}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
              mode === "lyrics" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Mic2 size={14} />
            <span>Letra</span>
          </button>
        </div>

        {/* Video mode */}
        {mode === "video" && (
          <div className="w-full aspect-video rounded-xl overflow-hidden bg-card shadow-lg">
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
              Player do YouTube
            </div>
          </div>
        )}

        {/* Audio mode - album art + visualizer */}
        {mode === "audio" && (
          <div className="w-full flex flex-col items-center gap-4">
            <div className="w-[260px] h-[260px] sm:w-[300px] sm:h-[300px] rounded-2xl overflow-hidden shadow-2xl relative">
              <img src={song.cover} alt={song.album} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
            </div>
            <AudioVisualizer isPlaying={isPlaying} barCount={48} className="w-full max-w-[300px] h-10" />
          </div>
        )}

        {/* Lyrics mode */}
        {mode === "lyrics" && (
          <div className="w-full flex-1 flex flex-col items-center justify-center min-h-[260px] rounded-2xl bg-card/50 p-6">
            <div className="space-y-4 text-center">
              {mockLyrics.map((lyric, i) => (
                <p
                  key={i}
                  className={`text-lg font-medium transition-all duration-300 ${
                    i === currentLyricIndex
                      ? "text-foreground scale-105"
                      : i < currentLyricIndex
                      ? "text-muted-foreground/40"
                      : "text-muted-foreground/60"
                  }`}
                >
                  {lyric.text}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Song info */}
        <div className="w-full flex items-center justify-between mt-2">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-xl font-semibold text-foreground truncate">{song.title}</h2>
            <p className="text-sm text-muted-foreground">{song.artist}</p>
          </div>
          <div className="flex gap-1">
            <button className="p-2.5 text-muted-foreground hover:text-foreground active:scale-95 transition-all"><Heart size={22} /></button>
            <button className="p-2.5 text-muted-foreground hover:text-foreground active:scale-95 transition-all"><Share2 size={20} /></button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full space-y-1">
          <div
            className="h-1.5 w-full rounded-full bg-muted overflow-hidden cursor-pointer touch-none"
            onClick={handleProgressClick}
            onTouchMove={handleProgressTouch}
          >
            <div className="h-full rounded-full bg-primary transition-all duration-200 relative" style={{ width: `${progress * 100}%` }}>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary shadow-md" />
            </div>
          </div>
          <div className="flex justify-between text-[11px] text-muted-foreground font-mono">
            <span>{formatDuration(currentTime)}</span>
            <span>{formatDuration(duration)}</span>
          </div>
        </div>

        {/* Transport controls - YouTube Music style */}
        <div className="w-full flex items-center justify-between px-4 sm:px-8 py-2">
          <button className="p-2 text-muted-foreground hover:text-foreground active:scale-90 transition-all">
            <Shuffle size={20} />
          </button>
          <button onClick={onPrev} className="p-3 text-foreground hover:text-primary active:scale-90 transition-all">
            <SkipBack size={28} fill="currentColor" />
          </button>
          <button
            onClick={onTogglePlay}
            className="w-16 h-16 rounded-full bg-foreground flex items-center justify-center text-background hover:scale-105 active:scale-95 transition-transform shadow-lg"
          >
            {isPlaying ? <Pause size={30} fill="currentColor" /> : <Play size={30} fill="currentColor" className="ml-1" />}
          </button>
          <button onClick={onNext} className="p-3 text-foreground hover:text-primary active:scale-90 transition-all">
            <SkipForward size={28} fill="currentColor" />
          </button>
          <button className="p-2 text-muted-foreground hover:text-foreground active:scale-90 transition-all">
            <Repeat size={20} />
          </button>
        </div>

        {/* Volume */}
        <div className="w-full flex items-center gap-3 px-2">
          <Volume2 size={16} className="text-muted-foreground flex-shrink-0" />
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
  );
};

export default NowPlayingView;
