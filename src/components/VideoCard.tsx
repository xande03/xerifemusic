import { Play } from "lucide-react";
import type { VideoResult } from "@/lib/youtubeGeneralSearch";

interface VideoCardProps {
  video: VideoResult;
  onPlay: (video: VideoResult) => void;
}

const VideoCard = ({ video, onPlay }: VideoCardProps) => (
  <button
    onClick={() => onPlay(video)}
    className="w-full text-left active:scale-[0.98] transition-transform"
  >
    {/* Thumbnail */}
    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-card group">
      <img
        src={video.thumbnail}
        alt={video.title}
        className="w-full h-full object-cover"
        loading="lazy"
      />
      {/* Duration badge */}
      {video.duration && (
        <span className="absolute bottom-2 right-2 bg-background/80 text-foreground text-[10px] font-mono px-1.5 py-0.5 rounded">
          {video.duration}
        </span>
      )}
      {/* Play overlay */}
      <div className="absolute inset-0 bg-background/0 group-hover:bg-background/20 group-active:bg-background/20 transition-colors flex items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity shadow-lg">
          <Play size={20} className="text-primary-foreground ml-0.5" fill="currentColor" />
        </div>
      </div>
    </div>

    {/* Info row */}
    <div className="flex gap-3 mt-2.5 px-0.5">
      {video.channelThumbnail ? (
        <img
          src={video.channelThumbnail}
          alt={video.channel}
          className="w-9 h-9 rounded-full object-cover flex-shrink-0 mt-0.5"
          loading="lazy"
        />
      ) : (
        <div className="w-9 h-9 rounded-full bg-secondary flex-shrink-0 mt-0.5" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground line-clamp-2 leading-tight">
          {video.title}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {video.channel}
          {video.views && <> · {video.views}</>}
          {video.publishedTime && <> · {video.publishedTime}</>}
        </p>
      </div>
    </div>
  </button>
);

export default VideoCard;
