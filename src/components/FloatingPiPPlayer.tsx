import { useState, useRef, useCallback, useEffect } from "react";
import { X, Play, Pause, SkipForward, SkipBack, Maximize2 } from "lucide-react";
import { Song } from "@/data/mockSongs";
import { hdThumbnail } from "@/lib/utils";

interface FloatingPiPPlayerProps {
  song: Song;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onExpand: () => void;
  onClose: () => void;
}

const FloatingPiPPlayer = ({
  song, isPlaying, currentTime, duration,
  onTogglePlay, onNext, onPrev, onExpand, onClose,
}: FloatingPiPPlayerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 16, y: Math.max(80, parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sat') || '0') + 60) });
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const progress = duration > 0 ? currentTime / duration : 0;

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    setDragging(true);
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    const maxX = window.innerWidth - (containerRef.current?.offsetWidth || 200);
    const maxY = window.innerHeight - (containerRef.current?.offsetHeight || 80);
    setPosition({
      x: Math.max(0, Math.min(maxX, e.clientX - dragOffset.current.x)),
      y: Math.max(0, Math.min(maxY, e.clientY - dragOffset.current.y)),
    });
  }, [dragging]);

  const handlePointerUp = useCallback(() => setDragging(false), []);

  // Snap to edges on release
  useEffect(() => {
    if (dragging) return;
    const w = containerRef.current?.offsetWidth || 200;
    const midX = position.x + w / 2;
    const screenMid = window.innerWidth / 2;
    setPosition((p) => ({
      ...p,
      x: midX < screenMid ? 12 : window.innerWidth - w - 12,
    }));
  }, [dragging]);

  return (
    <div
      ref={containerRef}
      className="fixed z-[100] rounded-2xl bg-card/95 backdrop-blur-xl shadow-2xl border border-border/50 overflow-hidden select-none touch-none"
      style={{
        left: position.x,
        top: position.y,
        width: "min(220px, calc(100vw - 24px))",
        transition: dragging ? "none" : "left 0.3s ease, top 0.1s ease",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Progress bar */}
      <div className="h-[2px] bg-muted">
        <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress * 100}%` }} />
      </div>

      {/* Cover + info */}
      <div className="flex items-center gap-2.5 p-2.5">
        <img
          src={hdThumbnail(song.cover)}
          alt={song.album}
          className="w-11 h-11 rounded-lg object-cover flex-shrink-0 shadow-md"
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-foreground truncate leading-tight">{song.title}</p>
          <p className="text-[10px] text-muted-foreground truncate">{song.artist}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between px-2 pb-2">
        <button onClick={onPrev} className="p-1.5 text-muted-foreground hover:text-foreground active:scale-90 transition-all">
          <SkipBack size={14} fill="currentColor" />
        </button>
        <button
          onClick={onTogglePlay}
          className="w-8 h-8 rounded-full bg-foreground flex items-center justify-center text-background active:scale-90 transition-transform"
        >
          {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
        </button>
        <button onClick={onNext} className="p-1.5 text-muted-foreground hover:text-foreground active:scale-90 transition-all">
          <SkipForward size={14} fill="currentColor" />
        </button>
        <button onClick={onExpand} className="p-1.5 text-muted-foreground hover:text-foreground active:scale-90 transition-all" title="Expandir">
          <Maximize2 size={13} />
        </button>
        <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground active:scale-90 transition-all" title="Fechar PiP">
          <X size={13} />
        </button>
      </div>
    </div>
  );
};

export default FloatingPiPPlayer;
