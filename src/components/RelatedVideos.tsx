import { Play, MoreVertical } from "lucide-react";
import type { VideoResult } from "@/lib/youtubeGeneralSearch";
import { hdThumbnail } from "@/lib/utils";
import BlurImage from "@/components/BlurImage";

interface RelatedVideosProps {
  videos: VideoResult[];
  onPlay: (video: VideoResult) => void;
  loading?: boolean;
}

const RelatedVideos = ({ videos, onPlay, loading }: RelatedVideosProps) => {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="w-full aspect-video rounded-xl bg-muted mb-2" />
            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-full bg-muted flex-shrink-0" />
              <div className="flex-1 space-y-1.5 py-0.5">
                <div className="h-3.5 bg-muted rounded w-full" />
                <div className="h-3.5 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (videos.length === 0) return null;

  return (
    <div className="space-y-5">
      {videos.map((video) => (
        <div key={video.videoId} className="group">
          {/* Thumbnail — full width, rounded */}
          <div
            className="relative w-full aspect-video rounded-xl overflow-hidden bg-muted cursor-pointer mb-2.5"
            onClick={() => onPlay(video)}
          >
            <BlurImage
              src={hdThumbnail(video.thumbnail)}
              alt={video.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {video.duration && (
              <span className="absolute bottom-2 right-2 bg-black/80 text-white text-[11px] font-semibold px-1.5 py-0.5 rounded-md">
                {video.duration}
              </span>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-primary/90 text-primary-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all shadow-xl">
                <Play size={20} className="ml-0.5" fill="currentColor" />
              </div>
            </div>
          </div>

          {/* Info row: avatar + title + menu */}
          <div className="flex gap-3 items-start">
            <div className="w-9 h-9 rounded-full bg-secondary flex-shrink-0 flex items-center justify-center overflow-hidden">
              {video.channelThumbnail ? (
                <img src={video.channelThumbnail} alt={video.channel} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <span className="text-xs font-bold text-muted-foreground">{video.channel?.charAt(0)}</span>
              )}
            </div>
            <div className="flex-1 min-w-0" onClick={() => onPlay(video)}>
              <h3 className="text-[13px] font-semibold text-foreground line-clamp-2 leading-snug cursor-pointer">
                {video.title}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-1 truncate">
                {video.channel}
                {video.views && <><span className="mx-1 opacity-40">•</span>{video.views}</>}
                {video.publishedTime && <><span className="mx-1 opacity-40">•</span>{video.publishedTime}</>}
              </p>
            </div>
            <button className="p-1 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 mt-0.5">
              <MoreVertical size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default RelatedVideos;
