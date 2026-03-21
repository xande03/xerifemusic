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
  <div className={`w-full ${viewMode === 'list' ? 'flex flex-row gap-4 items-start bg-secondary/10 hover:bg-secondary/20 p-2 rounded-2xl transition-colors' : 'flex flex-col'}`}>
    {/* Thumbnail — plays video */}
    <button
      onClick={() => onPlay(video)}
      className={`text-left active:scale-[0.98] transition-transform flex-shrink-0 ${viewMode === 'list' ? 'w-48 sm:w-64 aspect-video' : 'w-full aspect-video'}`}
    >
      <div className="relative w-full h-full rounded-xl overflow-hidden bg-card group">
         <BlurImage src={hdThumbnail(video.thumbnail)} alt={video.title} className="w-full h-full object-cover" />
        {video.duration && (
          <span className="absolute bottom-2 right-2 bg-background/80 text-foreground text-[10px] font-mono px-1.5 py-0.5 rounded">
            {video.duration}
          </span>
        )}
        <div className="absolute inset-0 bg-background/0 group-hover:bg-background/20 group-active:bg-background/20 transition-colors flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-primary/90 flex items-center justify-center opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity shadow-lg">
            <Play size={18} className="text-primary-foreground ml-0.5" fill="currentColor" />
          </div>
        </div>
        {onFullscreen && (
          <button
            onClick={(e) => { e.stopPropagation(); onFullscreen(video); }}
            className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-background/70 flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-background/90 z-10"
            title="Tela cheia"
          >
            <Maximize size={14} className="text-foreground" />
          </button>
        )}
      </div>
    </button>

    {/* Info row */}
    <div className={`flex flex-1 gap-3 px-0.5 ${viewMode === 'list' ? 'mt-0 py-1' : 'mt-2.5'}`}>
      {/* Channel avatar — clickable (only in Grid mode or if needed) */}
      {viewMode === 'grid' && (
        <button
          onClick={() => onChannelClick?.(video.channel, video.channelThumbnail)}
          className="flex-shrink-0 mt-0.5 active:scale-95 transition-transform"
        >
          {video.channelThumbnail ? (
            <img
              src={video.channelThumbnail}
              alt={video.channel}
              className="w-9 h-9 rounded-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-secondary" />
          )}
        </button>
      )}

      <div className="min-w-0 flex-1 flex flex-col">
        {/* Title — plays video */}
        <button onClick={() => onPlay(video)} className="text-left w-full group">
          <p className={`font-medium text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors ${viewMode === 'list' ? 'text-base sm:text-lg' : 'text-sm'}`}>
            {video.title}
          </p>
        </button>
        
        <div className={viewMode === 'list' ? 'flex items-center gap-2 mt-2' : ''}>
          {viewMode === 'list' && video.channelThumbnail && (
            <img src={video.channelThumbnail} className="w-5 h-5 rounded-full" alt="" />
          )}
          {/* Channel name — clickable */}
          <button
            onClick={() => onChannelClick?.(video.channel, video.channelThumbnail)}
            className="text-left mt-1 active:underline"
          >
            <span className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              {video.channel}
            </span>
          </button>
        </div>

        {(video.views || video.publishedTime) && (
          <p className="text-xs text-muted-foreground mt-1">
            {video.views}
            {video.views && video.publishedTime && " · "}
            {video.publishedTime}
          </p>
        )}

        {viewMode === 'list' && video.videoId && (
           <p className="hidden sm:line-clamp-2 text-xs text-muted-foreground/60 mt-3 max-w-lg">
             Assista agora a este vídeo incrível no Xerife Hub. Qualidade alta e som cristalino.
           </p>
        )}
      </div>
    </div>
  </div>
);

export default VideoCard;
