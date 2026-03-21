import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronDown, Play, Pause, SkipBack, SkipForward } from "lucide-react";
import { Song, formatDuration } from "@/data/mockSongs";

interface FullscreenOverlayProps {
  song: Song;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  progress: number;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (fraction: number) => void;
  onExit: () => void;
}

const FullscreenOverlay = ({
  song, isPlaying, currentTime, duration, progress,
  onTogglePlay, onNext, onPrev, onSeek, onExit,
}: FullscreenOverlayProps) => {
  const [showControls, setShowControls] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const resetTimer = useCallback(() => {
    setShowControls(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setShowControls(false), 3500);
  }, []);

  useEffect(() => {
    resetTimer();
    
    // Lock orientation to landscape on mount
    const lockOrientation = async () => {
      try {
        if (screen.orientation && (screen.orientation as any).lock) {
          await (screen.orientation as any).lock("landscape");
        }
      } catch (err) {
        console.warn("Could not lock orientation:", err);
      }
    };
    
    lockOrientation();

    return () => { 
      if (timerRef.current) clearTimeout(timerRef.current);
      // Unlock orientation on unmount
      try {
        if (screen.orientation && (screen.orientation as any).unlock) {
          (screen.orientation as any).unlock();
        }
      } catch {}
    };
  }, [resetTimer]);

  return (
    <div
      className="absolute inset-0 z-[200] flex flex-col justify-between pointer-events-auto"
      onClick={resetTimer}
    >
      {/* Top bar */}
      <div
        className={`flex items-center justify-between px-5 pt-5 pb-10 bg-gradient-to-b from-black/70 to-transparent transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <button
          onClick={(e) => { e.stopPropagation(); onExit(); }}
          className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors"
        >
          <ChevronDown size={22} className="text-white" />
        </button>
        <div className="flex-1 text-center px-4 min-w-0">
          <p className="text-white text-sm font-medium truncate">{song.title}</p>
          <p className="text-white/60 text-xs truncate">{song.artist}</p>
        </div>
        <div className="w-11" />
      </div>

      {/* Bottom controls */}
      <div
        className={`px-5 pb-6 pt-12 bg-gradient-to-t from-black/70 to-transparent transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Progress bar */}
        <div
          className="h-1.5 w-full rounded-full bg-white/30 overflow-hidden cursor-pointer mb-2 relative"
          onClick={(e) => {
            e.stopPropagation();
            const rect = e.currentTarget.getBoundingClientRect();
            onSeek(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)));
          }}
        >
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress * 100}%` }} />
        </div>
        <div className="flex justify-between text-[10px] text-white/60 font-mono mb-4">
          <span>{formatDuration(currentTime)}</span>
          <span>{formatDuration(duration)}</span>
        </div>

        {/* Transport */}
        <div className="flex items-center justify-center gap-8">
          <button onClick={(e) => { e.stopPropagation(); onPrev(); }} className="p-2 text-white hover:text-white/80 active:scale-90 transition-all">
            <SkipBack size={26} fill="currentColor" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onTogglePlay(); }}
            className="w-16 h-16 rounded-full bg-white flex items-center justify-center hover:bg-white/90 active:scale-90 transition-all shadow-lg"
          >
            {isPlaying
              ? <Pause size={28} className="text-black" fill="currentColor" />
              : <Play size={28} className="text-black ml-1" fill="currentColor" />
            }
          </button>
          <button onClick={(e) => { e.stopPropagation(); onNext(); }} className="p-2 text-white hover:text-white/80 active:scale-90 transition-all">
            <SkipForward size={26} fill="currentColor" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default FullscreenOverlay;
