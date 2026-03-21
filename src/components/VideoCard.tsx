import { Play, Maximize } from "lucide-react";
import type { VideoResult } from "@/lib/youtubeGeneralSearch";
import { hdThumbnail } from "@/lib/utils";
import BlurImage from "@/components/BlurImage";

interface VideoCardProps {
  video: VideoResult;
  onPlay: (video: VideoResult) => void;
  onChannelClick?: (channelName: string, channelThumbnail?: string) => void;
  onFullscreen?: (video: VideoResult) => void;
  viewMode?: 'grid' | 'list';
}

const VideoCard = ({ video, onPlay, onChannelClick, onFullscreen, viewMode = 'grid' }: VideoCardProps) => (
  <div className={`group/card w-full rounded-2xl transition-all duration-300 ${
    viewMode === 'list' 
      ? 'flex flex-row gap-4 items-center bg-card/40 hover:bg-card/80 p-2.5 sm:p-3 border border-border/40 hover:shadow-xl hover:shadow-primary/5 active:scale-[0.99]' 
      : 'flex flex-col hover:bg-accent/30 p-2 -mx-2'
  }`}>
    {/* Thumbnail */}
    <div className={`relative flex-shrink-0 cursor-pointer overflow-hidden rounded-xl bg-muted group/thumb ${
      viewMode === 'list' ? 'w-36 sm:w-60 aspect-video' : 'w-full aspect-video shadow-md'
    }`} onClick={() => onPlay(video)}>
       <BlurImage src={hdThumbnail(video.thumbnail)} alt={video.title} className="w-full h-full object-cover transition-transform duration-500 group-hover/thumb:scale-105" />
      
      {/* Duration Badge */}
      {video.duration && (
        <span className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-md text-white text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-md border border-white/10">
          {video.duration}
        </span>
      )}

      {/* Play Overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover/thumb:bg-black/20 transition-all flex items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-primary/90 text-primary-foreground flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 scale-90 group-hover/thumb:scale-100 transition-all shadow-2xl">
          <Play size={20} className="ml-0.5" fill="currentColor" />
        </div>
      </div>

      {/* Fullscreen Trigger */}
      {onFullscreen && (
        <button
          onClick={(e) => { e.stopPropagation(); onFullscreen(video); }}
          className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-black/40 backdrop-blur-md text-white flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 hover:bg-primary transition-all z-10"
          title="Tela cheia"
        >
          <Maximize size={14} />
        </button>
      )}
    </div>

    {/* Info row */}
    <div className={`flex flex-1 gap-3 ${viewMode === 'list' ? 'min-w-0' : 'mt-3'}`}>
      {/* Channel avatar (Grid only) */}
      {viewMode === 'grid' && (
        <button
          onClick={() => onChannelClick?.(video.channel, video.channelThumbnail)}
          className="flex-shrink-0 mt-0.5 active:scale-90 transition-transform hidden sm:block"
        >
          {video.channelThumbnail ? (
            <img src={video.channelThumbnail} alt={video.channel} className="w-9 h-9 rounded-full object-cover border border-border" loading="lazy" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground">
              {video.channel.charAt(0)}
            </div>
          )}
        </button>
      )}

      <div className="min-w-0 flex-1 flex flex-col">
        {/* Title */}
        <h3 
          onClick={() => onPlay(video)} 
          className={`font-semibold text-foreground line-clamp-2 leading-snug cursor-pointer hover:text-primary transition-colors ${
            viewMode === 'list' ? 'text-sm sm:text-base mb-1' : 'text-[13px] sm:text-sm'
          }`}
        >
          {video.title}
        </h3>
        
        <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 ${viewMode === 'list' ? 'sm:mt-2' : ''}`}>
          {/* Channel Name */}
          <button
            onClick={() => onChannelClick?.(video.channel, video.channelThumbnail)}
            className="flex items-center gap-1.5 group/author shrink-0"
          >
            {viewMode === 'list' && video.channelThumbnail && (
              <img src={video.channelThumbnail} className="w-4 h-4 rounded-full border border-border sm:hidden" alt="" />
            )}
            <span className="text-[11px] sm:text-xs text-muted-foreground group-hover/author:text-primary transition-colors truncate max-w-[120px] sm:max-w-none">
              {video.channel}
            </span>
          </button>

          {/* Views & Date */}
          {(video.views || video.publishedTime) && (
            <div className="flex items-center text-[10px] sm:text-[11px] text-muted-foreground/70 whitespace-nowrap">
              <span className="hidden sm:inline mx-1.5 opacity-30">•</span>
              <span>{video.views}</span>
              {video.publishedTime && <span className="mx-1">•</span>}
              <span>{video.publishedTime}</span>
            </div>
          )}
        </div>

        {/* Desktop Description (List only) */}
        {viewMode === 'list' && (
           <p className="hidden md:line-clamp-2 text-[11px] text-muted-foreground/60 mt-2.5 leading-relaxed">
             Assista a este conteúdo premium no Xerife Hub. Vídeo em alta definição com áudio masterizado para a melhor experiência.
           </p>
        )}
      </div>
    </div>
  </div>
);

export default VideoCard;
