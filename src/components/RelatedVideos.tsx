import { Play } from "lucide-react";
import type { VideoResult } from "@/lib/youtubeGeneralSearch";

interface RelatedVideosProps {
  videos: VideoResult[];
  onPlay: (video: VideoResult) => void;
  loading?: boolean;
}

const RelatedVideos = ({ videos, onPlay, loading }: RelatedVideosProps) => {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="w-40 h-[90px] rounded-lg bg-muted flex-shrink-0" />
            <div className="flex-1 space-y-2 py-1">
              <div className="h-3 bg-muted rounded w-full" />
              <div className="h-3 bg-muted rounded w-3/4" />
              <div className="h-2 bg-muted rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (videos.length === 0) return null;

  return (
    <div className="space-y-3">
      {videos.map((video) => (
        <button
          key={video.videoId}
          onClick={() => onPlay(video)}
          className="flex gap-3 w-full text-left active:scale-[0.98] transition-transform"
        >
          {/* Thumbnail */}
          <div className="relative w-40 aspect-video rounded-lg overflow-hidden bg-card flex-shrink-0">
            <img
              src={video.thumbnail}
              alt={video.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {video.duration && (
              <span className="absolute bottom-1 right-1 bg-background/80 text-foreground text-[9px] font-mono px-1 py-0.5 rounded">
                {video.duration}
              </span>
            )}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 active:opacity-100 transition-opacity">
              <div className="w-8 h-8 rounded-full bg-primary/80 flex items-center justify-center">
                <Play size={14} className="text-primary-foreground ml-0.5" fill="currentColor" />
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 py-0.5">
            <p className="text-xs font-medium text-foreground line-clamp-2 leading-tight">
              {video.title}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1 truncate">{video.channel}</p>
            {video.views && (
              <p className="text-[10px] text-muted-foreground">{video.views}</p>
            )}
          </div>
        </button>
      ))}
    </div>
  );
};

export default RelatedVideos;
