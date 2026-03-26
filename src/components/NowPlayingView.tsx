import { ChevronDown, Heart, Volume2, VolumeX, Video, Music2, PictureInPicture2, Mic2, SkipBack, Play, Pause, SkipForward, Shuffle, Repeat, Loader2, Airplay, Cast, ListVideo, MessageSquare, SkipForward as AutoPlayIcon, Maximize2, ListMusic, Download, Plus } from "lucide-react";

import { Song, formatDuration } from "@/data/mockSongs";
import { hdThumbnail } from "@/lib/utils";
import AudioVisualizer from "./AudioVisualizer";
import BlurImage from "@/components/BlurImage";
import RelatedVideos from "./RelatedVideos";
import VideoComments from "./VideoComments";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { fetchLyrics, type LyricsResult } from "@/lib/lyrics";
import { fetchVideoInfo, type VideoInfo } from "@/lib/youtubeVideoInfo";
import type { VideoResult } from "@/lib/youtubeGeneralSearch";
import xerifeHubLogo from "@/assets/xerife-hub-logo.png";
import SeekBar from "@/components/SeekBar";

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
  isShuffled?: boolean;
  onShuffle?: () => void;
  onAirPlay?: (mode: 'audio' | 'video') => void;
  onCast?: () => void;
  onPlayRelated?: (video: VideoResult) => void;
  onFullscreen?: () => void;
  onExitFullscreen?: () => void;
  isFullscreen?: boolean;
  context?: "music" | "video";
  onShowQueue?: () => void;
  queueCount?: number;
  onShare?: () => void;
  onDownload?: () => void;
  isLiked?: boolean;
  onLike?: () => void;
  onArtistClick?: (artist: { name: string; image: string }) => void;
  onAddToPlaylist?: (song: Song) => void;
  initialMode?: PlayerMode;
}

const NowPlayingView = ({
  song, isPlaying, isEnded, currentTime, duration,
  onTogglePlay, onNext, onPrev,
  onCollapse, onSeek, volume, onVolumeChange, onTogglePiP, onModeChange, onAirPlay, onCast, onPlayRelated, onFullscreen, onExitFullscreen, isFullscreen,
  isShuffled, onShuffle,
  context = "music",
  onShowQueue, queueCount = 0,
  onShare, onDownload,
  isLiked, onLike,
  onArtistClick,
  onAddToPlaylist,
  initialMode,
}: NowPlayingViewProps) => {
  const [mode, setMode] = useState<PlayerMode>(
    initialMode ?? (context === "video" ? "video" : "audio")
  );
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

  // Auto-scroll to active line with better performance
  useEffect(() => {
    if (activeLineRef.current && lyricsContainerRef.current) {
      const container = lyricsContainerRef.current;
      const activeLine = activeLineRef.current;
      
      const targetTop = activeLine.offsetTop - (container.clientHeight / 2) + (activeLine.clientHeight / 2);
      
      container.scrollTo({
        top: Math.max(0, targetTop),
        behavior: 'smooth'
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

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
      {/* Desktop/Tablet Split Header (Optional but clean) */}
      <div className="hidden lg:flex items-center justify-between px-12 py-6 z-30">
        <button onClick={onCollapse} className="p-2 rounded-full bg-secondary/80 hover:bg-primary transition-all text-foreground hover:text-primary-foreground shadow-lg">
          <ChevronDown size={28} />
        </button>
        <div className="flex items-center gap-3">
           <img src={xerifeHubLogo} className="w-10 h-10 rounded-xl" alt="" />
           <span className="font-display font-black text-xl italic tracking-tighter">XERIFE <span className="text-primary">HUB</span></span>
        </div>
        <div className="w-12 h-12" /> {/* spacer */}
      </div>

      {/* Main Layout Container */}
      <div className="flex-1 overflow-hidden">
        <div className={`flex flex-col ${mode === "video" ? "" : "lg:flex-row"} h-full w-full max-w-[1600px] mx-auto lg:px-12 lg:pb-12 ${mode === "video" ? "lg:gap-6" : "lg:gap-16"}`}>
          
          {/* Left Column: Artwork / Lyrics / Video */}
          <div className={`w-full ${mode === "video" ? "" : "lg:w-1/2"} flex flex-col ${mode === "video" ? "items-center" : "justify-center items-center"} relative gap-4`}>
            <div className={`relative w-full group ${mode === "video" ? "aspect-video max-w-full max-h-[50vh] lg:max-h-[55vh]" : "aspect-square max-w-[500px]"}`}>
              {/* Phone Artwork Container (Maintains existing logic) */}
              <div className="w-full h-full relative z-0">
                {mode === "video" ? (
                  <div className="w-full h-full bg-black rounded-3xl overflow-hidden shadow-2xl relative">
                     <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs font-mono">
                        YouTube Stream Layer
                     </div>
                     <div className="absolute top-4 right-4 bg-primary/20 backdrop-blur-md px-3 py-1 rounded-lg text-[10px] font-black text-primary border border-primary/30 uppercase tracking-widest">
                       FHD Stream
                     </div>
                  </div>
                ) : mode === "lyrics" ? (
                  <div className="w-full h-full relative rounded-3xl overflow-hidden shadow-2xl">
                    <BlurImage src={hdThumbnail(song.cover)} alt={song.album} className="w-full h-full" />
                    <div className="absolute inset-0 z-20 bg-background/90 backdrop-blur-xl" />
                    <div ref={lyricsContainerRef} className="absolute inset-0 z-20 overflow-y-auto px-8 py-10 scrollbar-hide">
                      {lyricsLoading ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4">
                          <Loader2 size={32} className="text-primary animate-spin" />
                          <p className="text-sm font-medium text-muted-foreground">Buscando letra...</p>
                        </div>
                      ) : lyricsResult && lyricsResult.lines.length > 0 ? (
                        <div className="space-y-6 py-6">
                          {lyricsResult.lines.map((line, i) => {
                            const isActive = lyricsResult.synced && i === activeLineIndex;
                            return (
                              <p
                                key={i}
                                ref={isActive ? activeLineRef : undefined}
                                onClick={() => { if (lyricsResult.synced && line.time >= 0) onSeek(line.time / (duration || 1)); }}
                                className={`text-center transition-all duration-700 cursor-pointer ${
                                  isActive ? "text-2xl sm:text-3xl font-black text-primary scale-110 drop-shadow-glow" : "text-base sm:text-xl text-foreground font-medium opacity-30 hover:opacity-100"
                                }`}
                              >
                                {line.text}
                              </p>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                          <Mic2 size={48} className="text-muted-foreground/20" />
                          <p className="text-foreground font-bold">{song.title}</p>
                          <p className="text-sm text-muted-foreground">Letra não sincronizada disponível para este título.</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full relative rounded-3xl overflow-hidden shadow-2xl-glow group/art">
                    <BlurImage src={hdThumbnail(song.cover)} alt={song.album} className="w-full h-full transition-transform duration-700 group-hover/art:scale-105" />
                    <AudioVisualizer isPlaying={isPlaying} barCount={64} className="absolute bottom-6 left-6 right-6 h-12" />
                    <div className="absolute inset-0 bg-black/5 opacity-0 group-hover/art:opacity-100 transition-opacity" />
                  </div>
                )}
              </div>

              {/* Navigation overlays for mobile inside Artwork area */}
              <div className="lg:hidden absolute top-4 left-4 z-20">
                <button onClick={onCollapse} className="p-2 rounded-full bg-black/40 backdrop-blur-md text-white">
                  <ChevronDown size={24} />
                </button>
              </div>
            </div>

            {/* Mode Selector - Responsive Positioning */}
            <div className="flex items-center gap-1.5 bg-secondary/40 backdrop-blur-xl rounded-2xl p-1.5 border border-white/5">
                {([
                  { id: "video" as PlayerMode, icon: Video, label: "Vídeo" },
                  { id: "audio" as PlayerMode, icon: Music2, label: "Áudio" },
                  ...(context !== "video" ? [{ id: "lyrics" as PlayerMode, icon: Mic2, label: "Letra" }] : []),
                ]).map(({ id, icon: Icon, label }) => (
                  <button
                    key={id}
                    onClick={() => handleModeChange(id)}
                    className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                      mode === id ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                    }`}
                  >
                    <Icon size={16} />
                    <span>{label}</span>
                  </button>
                ))}
            </div>
          </div>

          {/* Right Column: Title, Progress, Controls, Tabs */}
          <div className={`w-full ${mode === "video" ? "" : "lg:w-1/2"} flex flex-col justify-center lg:items-center min-w-0 px-5 sm:px-8 mt-4 lg:mt-0 relative`}>
            <div className="w-full min-w-0 max-w-xl lg:max-w-2xl mx-auto flex flex-col gap-6 lg:gap-8 lg:items-center touch-pan-y">
              
              {/* Info Header */}
              <div className="flex flex-col gap-2 w-full lg:items-center text-left lg:text-center mt-2 lg:mt-0">
                <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-foreground tracking-tight line-clamp-2 leading-tight mb-1">{song.title}</h1>
                <button onClick={() => onArtistClick?.({ name: song.artist, image: song.cover })} className="group text-left lg:text-center">
                  <p className="text-lg sm:text-2xl text-muted-foreground group-hover:text-primary transition-colors font-medium">{song.artist}</p>
                </button>
              </div>

              {/* Integrated Action Bar (Heart + Tools) - Enhanced Mobile Scroll / Desktop Wrap */}
              <div className="w-full min-w-0 flex items-center lg:flex-wrap lg:justify-center gap-2 sm:gap-3 bg-card/40 backdrop-blur-xl border border-white/10 rounded-[1.5rem] sm:rounded-[2rem] p-1.5 sm:p-3 shadow-2xl overflow-x-auto lg:overflow-visible scrollbar-hide touch-pan-x">
                <button 
                  onClick={onLike}
                  title={isLiked ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                  className={`flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-[1.2rem] sm:rounded-2xl flex items-center justify-center transition-all active:scale-95 ${
                    isLiked ? 'bg-primary text-primary-foreground shadow-glow animate-pulse-slow' : 'bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  <Heart size={24} fill={isLiked ? "currentColor" : "none"} strokeWidth={isLiked ? 0 : 2.5} />
                </button>

                <div className="h-8 sm:h-10 w-px bg-white/10 mx-0.5 sm:mx-1 flex-shrink-0 lg:hidden" />

                {[
                   { icon: Cast, label: 'Transmitir', onClick: onCast },
                   { icon: Airplay, label: 'Airplay', onClick: () => onAirPlay?.(mode === "video" ? "video" : "audio") },
                   { icon: Maximize2, label: 'Tela Cheia', onClick: onFullscreen },
                   { icon: PictureInPicture2, label: 'PiP', onClick: onTogglePiP },
                   { icon: Plus, label: 'Playlist', onClick: onAddToPlaylist ? () => onAddToPlaylist(song) : undefined },
                   { icon: Download, label: 'Download', onClick: onDownload },
                   {
                     icon: Music2,
                     label: 'Buscar Cifra',
                     onClick: () => {
                       const toSlug = (s: string) => {
                         if (!s) return "";
                         return s.toLowerCase()
                           .replace(/\(.*\)/g, '')
                           .normalize('NFD')
                           .replace(/[\u0300-\u036f]/g, '')
                           .replace(/[^a-z0-9\s-]/g, '')
                           .trim()
                           .replace(/\s+/g, '-');
                       };
                       const mainArtist = song.artist.split(/[,&\/]|feat\.|ft\./i)[0].trim();
                       const artistSlug = toSlug(mainArtist);
                       const titleSlug = toSlug(song.title);
                       if (artistSlug && titleSlug) {
                         const directUrl = `https://www.cifraclub.com.br/${artistSlug}/${titleSlug}/`;
                         window.open(directUrl, '_blank', 'noopener');
                       } else {
                         const searchUrl = `https://www.cifraclub.com.br/?q=${encodeURIComponent(song.artist + ' ' + song.title)}`;
                         window.open(searchUrl, '_blank', 'noopener');
                       }
                     }
                   },
                ].map((btn, i) => btn.onClick && (
                  <button
                    key={i}
                    onClick={btn.onClick}
                    title={btn.label}
                    className="w-12 h-12 sm:w-14 sm:h-14 flex-shrink-0 flex items-center justify-center rounded-[1.2rem] sm:rounded-2xl bg-secondary/30 hover:bg-primary/20 hover:text-primary transition-all active:scale-90 text-muted-foreground"
                  >
                    <btn.icon size={20} className="sm:size-[22px]" />
                  </button>
                ))}
              </div>

              {/* Main Player logic (SeekBar & Transport) */}
              <div className="w-full space-y-4">
                <div className="w-full space-y-2">
                  {/* SeekBar — drag funciona no mobile e desktop */}
                  <SeekBar
                    progress={progress}
                    onSeek={onSeek}
                    trackHeight="normal"
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs sm:text-sm font-black italic tracking-widest text-muted-foreground opacity-60">
                    <span>{formatDuration(currentTime)}</span>
                    <span>{formatDuration(duration)}</span>
                  </div>
                </div>

                <div className="w-full flex items-center justify-between lg:justify-center lg:gap-11">
                   <button onClick={onShuffle} className={`p-2 sm:p-4 rounded-xl sm:rounded-2xl transition-all ${isShuffled ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                      <Shuffle size={20} className="sm:w-6 sm:h-6" />
                   </button>
                   <div className="flex items-center gap-3 sm:gap-10">
                     <button onClick={onPrev} className="p-2 sm:p-4 rounded-full bg-secondary hover:bg-accent text-foreground transition-all active:scale-90 shadow-lg flex-shrink-0">
                       <SkipBack size={24} className="sm:w-8 sm:h-8" fill="currentColor" />
                     </button>
                     <button onClick={onTogglePlay} className="w-16 h-16 sm:w-28 sm:h-28 flex-shrink-0 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-2xl shadow-primary/40 hover:scale-105 active:scale-95 transition-transform">
                       {isPlaying ? <Pause size={28} className="sm:w-10 sm:h-10" fill="currentColor" /> : <Play size={28} fill="currentColor" className="sm:w-10 sm:h-10 ml-1.5" />}
                     </button>
                     <button onClick={onNext} className="p-2 sm:p-4 rounded-full bg-secondary hover:bg-accent text-foreground transition-all active:scale-90 shadow-lg flex-shrink-0">
                       <SkipForward size={24} className="sm:w-8 sm:h-8" fill="currentColor" />
                     </button>
                   </div>
                   <button className="p-2 sm:p-4 rounded-xl sm:rounded-2xl text-muted-foreground hover:text-foreground transition-all">
                      <Repeat size={20} className="sm:w-6 sm:h-6" />
                   </button>
                </div>
              </div>

              {/* Volume + Queue Tab Trigger */}
              <div className="w-full flex items-center gap-2 sm:gap-6 mt-2">
                 <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 bg-secondary/30 backdrop-blur-sm rounded-2xl px-3 sm:px-4 py-2 sm:py-3">
                    <button onClick={() => onVolumeChange(volume > 0 ? 0 : 70)} className="flex-shrink-0 text-muted-foreground hover:text-primary transition-colors">
                       {volume === 0 ? <VolumeX size={16} className="sm:w-[18px] sm:h-[18px]" /> : <Volume2 size={16} className="sm:w-[18px] sm:h-[18px]" />}
                    </button>
                    <SeekBar
                      progress={volume / 100}
                      onSeek={(f) => onVolumeChange(Math.round(f * 100))}
                      trackHeight="thin"
                      showThumb={false}
                      className="flex-1 min-w-0"
                    />
                 </div>
                 {onShowQueue && (
                   <button onClick={onShowQueue} className="flex-shrink-0 w-12 h-12 sm:w-auto sm:px-6 sm:py-3 rounded-2xl bg-primary text-primary-foreground font-bold flex items-center justify-center sm:gap-3 shadow-lg hover:shadow-primary/20 transition-all active:scale-95 relative">
                      <ListMusic size={20} />
                      <span className="hidden sm:inline">Fila</span>
                      {queueCount > 0 && <span className="absolute -top-1 -right-1 sm:static sm:bg-white/20 px-2 py-0.5 rounded-lg text-[10px] sm:text-xs bg-primary border-2 border-background">{queueCount}</span>}
                   </button>
                 )}
              </div>

              {/* Bottom Context Section (Comments/Related) - Desktop specific variant */}
              {context === "video" && (
                <div className="mt-4 border-t border-white/5 pt-6 pb-20 lg:pb-0">
                  <div className="flex gap-4 mb-6">
                     <button onClick={() => setBottomTab("related")} className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 ${bottomTab === 'related' ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-secondary'}`}>
                        <ListVideo size={18} /> Recomendados
                     </button>
                     <button onClick={() => setBottomTab("comments")} className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 ${bottomTab === 'comments' ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-secondary'}`}>
                        <MessageSquare size={18} /> Discussão
                     </button>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto scrollbar-hide pr-2">
                     {bottomTab === 'related' ? (
                       <RelatedVideos videos={videoInfo?.relatedVideos || []} loading={videoInfoLoading} onPlay={(v) => onPlayRelated?.(v)} />
                     ) : (
                       <VideoComments comments={videoInfo?.comments || []} loading={videoInfoLoading} />
                     )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default NowPlayingView;
