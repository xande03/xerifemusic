import { Play } from "lucide-react";
import type { VideoResult } from "@/lib/youtubeGeneralSearch";

interface VideoCardProps {
  video: VideoResult;
  onPlay: (video: VideoResult) => void;
  onChannelClick?: (channelName: string) => void;
}

const VideoCard = ({ video, onPlay, onChannelClick }: VideoCardProps) => (
  <div className="w-full">
    {/* Thumbnail — plays video */}
    <button
      onClick={() => onPlay(video)}
      className="w-full text-left active:scale-[0.98] transition-transform"
    >
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-card group">
        <img
          src={video.thumbnail}
          alt={video.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {video.duration && (
          <span className="absolute bottom-2 right-2 bg-background/80 text-foreground text-[10px] font-mono px-1.5 py-0.5 rounded">
            {video.duration}
          </span>
        )}
        <div className="absolute inset-0 bg-background/0 group-hover:bg-background/20 group-active:bg-background/20 transition-colors flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity shadow-lg">
            <Play size={20} className="text-primary-foreground ml-0.5" fill="currentColor" />
          </div>
        </div>
      </div>
    </button>

    {/* Info row */}
    <div className="flex gap-3 mt-2.5 px-0.5">
      {/* Channel avatar — clickable */}
      <button
        onClick={() => onChannelClick?.(video.channel)}
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

      <div className="min-w-0 flex-1">
        {/* Title — plays video */}
        <button onClick={() => onPlay(video)} className="text-left w-full">
          <p className="text-sm font-medium text-foreground line-clamp-2 leading-tight">
            {video.title}
          </p>
        </button>
        {/* Channel name — clickable */}
        <button
          onClick={() => onChannelClick?.(video.channel)}
          className="text-left mt-1 active:underline"
        >
          <span className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            {video.channel}
          </span>
        </button>
        {(video.views || video.publishedTime) && (
          <p className="text-xs text-muted-foreground">
            {video.views}
            {video.views && video.publishedTime && " · "}
            {video.publishedTime}
          </p>
        )}
      </div>
    </div>
  </div>
);

export default VideoCard;
