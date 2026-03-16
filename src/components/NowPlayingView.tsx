import { ChevronDown, Heart, Share2, Volume2, Video, Music2, PictureInPicture2, Mic2, SkipBack, Play, Pause, SkipForward, Shuffle, Repeat, Loader2, Airplay, Cast, ListVideo, MessageSquare, SkipForward as AutoPlayIcon, Maximize2 } from "lucide-react";
import { Song, formatDuration } from "@/data/mockSongs";
import { hdThumbnail } from "@/lib/utils";
import AudioVisualizer from "./AudioVisualizer";
import RelatedVideos from "./RelatedVideos";
import VideoComments from "./VideoComments";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { fetchLyrics, type LyricsResult } from "@/lib/lyrics";
import { fetchVideoInfo, type VideoInfo } from "@/lib/youtubeVideoInfo";
import type { VideoResult } from "@/lib/youtubeGeneralSearch";

export type PlayerMode = "video" | "audio" | "lyrics";

interface NowPlayingViewProps {
  song: Song;
  isPlaying: boolean;
  isEnded?: boolean;
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
  onModeChange?: (mode: PlayerMode) => void;
  onAirPlay?: (mode: 'audio' | 'video') => void;
  onPlayRelated?: (video: VideoResult) => void;
  onFullscreen?: () => void;
  onExitFullscreen?: () => void;
  isFullscreen?: boolean;
}

const NowPlayingView = ({
  song, isPlaying, isEnded, currentTime, duration,
  onTogglePlay, onNext, onPrev,
  onCollapse, onSeek, volume, onVolumeChange, onTogglePiP, onModeChange, onAirPlay, onPlayRelated, onFullscreen, onExitFullscreen, isFullscreen,
}: NowPlayingViewProps) => {
  const [mode, setMode] = useState<PlayerMode>("video");
  const [autoplay, setAutoplay] = useState(() => localStorage.getItem('demus-autoplay') !== 'false');
  const [lyricsResult, setLyricsResult] = useState<LyricsResult | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [videoInfoLoading, setVideoInfoLoading] = useState(false);
  const [bottomTab, setBottomTab] = useState<"related" | "comments">("related");
  const [showFsControls, setShowFsControls] = useState(true);
  const fsControlsTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLParagraphElement>(null);
  const progress = duration > 0 ? currentTime / duration : 0;

  // Auto-hide fullscreen controls after 3s
  const resetFsControlsTimer = useCallback(() => {
    setShowFsControls(true);
    if (fsControlsTimerRef.current) clearTimeout(fsControlsTimerRef.current);
    fsControlsTimerRef.current = setTimeout(() => setShowFsControls(false), 3000);
  }, []);

  useEffect(() => {
    if (isFullscreen) {
      resetFsControlsTimer();
    } else {
      setShowFsControls(true);
      if (fsControlsTimerRef.current) clearTimeout(fsControlsTimerRef.current);
    }
    return () => { if (fsControlsTimerRef.current) clearTimeout(fsControlsTimerRef.current); };
  }, [isFullscreen, resetFsControlsTimer]);

  useEffect(() => {
    if (mode === "lyrics" && !lyricsResult && !lyricsLoading) {
      setLyricsLoading(true);
      fetchLyrics(song.artist, song.title).then((result) => {
        setLyricsResult(result);
        setLyricsLoading(false);
      });
    }
  }, [mode, song.id]);

  // Reset lyrics and fetch video info when song changes
  useEffect(() => {
    setLyricsResult(null);
    setVideoInfo(null);
    if (song.youtubeId) {
      setVideoInfoLoading(true);
      fetchVideoInfo(song.youtubeId).then((info) => {
        setVideoInfo(info);
        setVideoInfoLoading(false);
      });
    }
  }, [song.id]);

  // Find active line index for synced lyrics
  const activeLineIndex = useMemo(() => {
    if (!lyricsResult?.synced) return -1;
    const lines = lyricsResult.lines;
    let idx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].time <= currentTime) idx = i;
      else break;
    }
    return idx;
  }, [lyricsResult, currentTime]);

  // Auto-scroll to active line
  useEffect(() => {
    if (activeLineRef.current && lyricsContainerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeLineIndex]);

  // Autoplay: when video ends, play first related video
  useEffect(() => {
    if (isEnded && autoplay && videoInfo && videoInfo.relatedVideos.length > 0 && onPlayRelated) {
      onPlayRelated(videoInfo.relatedVideos[0]);
    }
  }, [isEnded, autoplay]);

  const handleModeChange = (newMode: PlayerMode) => {
    setMode(newMode);
    onModeChange?.(newMode);
    if (newMode === "lyrics" && !lyricsResult && !lyricsLoading) {
      setLyricsLoading(true);
      fetchLyrics(song.artist, song.title).then((result) => {
        setLyricsResult(result);
        setLyricsLoading(false);
      });
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    onSeek(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)));
  };

  const handleProgressTouch = (e: React.TouchEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0];
    onSeek(Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width)));
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col animate-slide-up" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 flex-shrink-0">
        <button onClick={onCollapse} className="p-1 -ml-1 text-muted-foreground hover:text-foreground transition-colors active:scale-95">
          <ChevronDown size={28} />
        </button>
        <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Tocando agora</span>
        <div className="flex items-center gap-1">
          {onAirPlay && (
            <button
              onClick={() => onAirPlay(mode === "video" ? "video" : "audio")}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors active:scale-95"
              title="AirPlay"
            >
              <Airplay size={20} />
            </button>
          )}
          {onTogglePiP && (
            <button onClick={onTogglePiP} className="p-2 text-muted-foreground hover:text-foreground transition-colors active:scale-95" title="Picture-in-Picture">
              <PictureInPicture2 size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 flex flex-col items-center px-4 sm:px-8 gap-2 max-w-lg mx-auto w-full overflow-y-auto pb-8">
        
        {/* Mode tabs */}
        <div className="flex items-center gap-1 bg-secondary/60 rounded-full p-1 w-fit flex-shrink-0 mb-1">
          {([
            { id: "video" as PlayerMode, icon: Video, label: "Vídeo" },
            { id: "audio" as PlayerMode, icon: Music2, label: "Áudio" },
            { id: "lyrics" as PlayerMode, icon: Mic2, label: "Letra" },
          ]).map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => handleModeChange(id)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                mode === id ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon size={14} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Video mode */}
        {mode === "video" && (
          <div className="w-full aspect-video rounded-xl overflow-hidden bg-card shadow-lg flex-shrink-0 relative group">
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
              Player do YouTube
            </div>
            {onFullscreen && (
              <button
                onClick={onFullscreen}
                className="absolute bottom-3 right-3 w-9 h-9 rounded-lg bg-background/70 flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-background/90 z-10"
                title="Tela cheia"
              >
                <Maximize2 size={16} className="text-foreground" />
              </button>
            )}
          </div>
        )}

        {/* Audio mode */}
        {mode === "audio" && (
          <div className="w-full flex flex-col items-center gap-4 flex-shrink-0">
            <div className="w-[240px] h-[240px] sm:w-[280px] sm:h-[280px] rounded-2xl overflow-hidden shadow-2xl relative">
              <img src={hdThumbnail(song.cover)} alt={song.album} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
            </div>
            <AudioVisualizer isPlaying={isPlaying} barCount={48} className="w-full max-w-[280px] h-10" />
          </div>
        )}

        {/* Lyrics mode */}
        {mode === "lyrics" && (
          <div ref={lyricsContainerRef} className="w-full flex-1 min-h-[240px] rounded-2xl bg-card/30 p-5 overflow-y-auto flex-shrink-0">
            {lyricsLoading ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <Loader2 size={24} className="text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">Buscando letra...</p>
              </div>
            ) : lyricsResult && lyricsResult.lines.length > 0 ? (
              <div className="space-y-4 py-4">
                {lyricsResult.lines.map((line, i) => {
                  const isActive = lyricsResult.synced && i === activeLineIndex;
                  const isPast = lyricsResult.synced && activeLineIndex >= 0 && i < activeLineIndex;
                  const isFuture = lyricsResult.synced && activeLineIndex >= 0 && i > activeLineIndex;
                  return (
                    <p
                      key={i}
                      ref={isActive ? activeLineRef : undefined}
                      onClick={() => {
                        if (lyricsResult.synced && line.time >= 0) {
                          onSeek(line.time / (duration || 1));
                        }
                      }}
                      className={`text-center transition-all duration-500 cursor-pointer ${
                        lyricsResult.synced
                          ? isActive
                            ? "text-xl font-bold text-primary scale-105 drop-shadow-[0_0_8px_hsl(var(--primary)/0.4)]"
                            : isPast
                              ? "text-sm text-muted-foreground/40"
                              : isFuture
                                ? "text-base text-foreground/50"
                                : "text-sm text-foreground/60"
                          : "text-sm sm:text-base text-foreground/90 leading-relaxed"
                      }`}
                    >
                      {line.text}
                    </p>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-2">
                <Mic2 size={32} className="text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Letra não disponível</p>
                <p className="text-xs text-muted-foreground/60">{song.title} — {song.artist}</p>
              </div>
            )}
          </div>
        )}

        {/* Song info */}
        <div className="w-full flex items-center justify-between mt-0 flex-shrink-0">
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
        <div className="w-full space-y-1 flex-shrink-0">
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

        {/* Transport controls */}
        <div className="w-full flex items-center justify-between px-2 sm:px-8 py-2 flex-shrink-0">
          <button className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-90 transition-all">
            <Shuffle size={20} />
          </button>
        <button onClick={onPrev} className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center text-foreground hover:text-primary active:scale-90 transition-all">
            <SkipBack size={28} fill="currentColor" />
          </button>
          <button
            onClick={onTogglePlay}
            className="w-16 h-16 rounded-full bg-foreground flex items-center justify-center text-background hover:scale-105 active:scale-95 transition-transform shadow-lg"
          >
            {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
          </button>
          <button onClick={onNext} className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center text-foreground hover:text-primary active:scale-90 transition-all">
            <SkipForward size={28} fill="currentColor" />
          </button>
          <button className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-90 transition-all">
            <Repeat size={20} />
          </button>
        </div>

        {/* Volume */}
        <div className="w-full flex items-center gap-3 px-2 flex-shrink-0">
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

        {/* Autoplay toggle */}
        <div className="w-full flex items-center justify-between px-2 flex-shrink-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <SkipForward size={14} />
            <span>Autoplay</span>
          </div>
          <button
            onClick={() => {
              const next = !autoplay;
              setAutoplay(next);
              localStorage.setItem('demus-autoplay', String(next));
            }}
            className={`w-10 h-5 rounded-full transition-colors relative ${autoplay ? 'bg-primary' : 'bg-muted'}`}
          >
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-foreground transition-transform ${autoplay ? 'left-[22px]' : 'left-0.5'}`} />
          </button>
        </div>


        <div className="w-full mt-4 flex-shrink-0">
          <div className="flex items-center gap-1 mb-3">
            <button
              onClick={() => setBottomTab("related")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                bottomTab === "related" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ListVideo size={14} />
              A seguir
            </button>
            <button
              onClick={() => setBottomTab("comments")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                bottomTab === "comments" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <MessageSquare size={14} />
              Comentários
              {videoInfo && videoInfo.comments.length > 0 && (
                <span className="text-[10px] opacity-60">({videoInfo.comments.length})</span>
              )}
            </button>
          </div>

          {bottomTab === "related" && (
            <RelatedVideos
              videos={videoInfo?.relatedVideos || []}
              loading={videoInfoLoading}
              onPlay={(video) => {
                onPlayRelated?.(video);
              }}
            />
          )}

          {bottomTab === "comments" && (
            <VideoComments
              comments={videoInfo?.comments || []}
              loading={videoInfoLoading}
            />
          )}
        </div>
      </div>

    </div>
  );
};

export default NowPlayingView;
