import { useState, useEffect } from "react";
import { ArrowLeft, Loader2, Play } from "lucide-react";
import { searchYouTubeGeneral, type VideoResult } from "@/lib/youtubeGeneralSearch";
import VideoCard from "./VideoCard";

interface ChannelProfileProps {
  channelName: string;
  channelThumbnail?: string;
  onBack: () => void;
  onPlayVideo: (video: VideoResult) => void;
  onFullscreenVideo?: (video: VideoResult) => void;
}

const ChannelProfile = ({ channelName, channelThumbnail, onBack, onPlayVideo, onFullscreenVideo }: ChannelProfileProps) => {
  const [videos, setVideos] = useState<VideoResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    searchYouTubeGeneral(channelName).then((res) => {
      setVideos(res);
      setLoading(false);
    });
  }, [channelName]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="px-4 flex items-center gap-3">
        <button onClick={onBack} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center hover:bg-accent transition-colors">
          <ArrowLeft size={18} className="text-foreground" />
        </button>
        <span className="text-sm font-medium text-foreground">Canal</span>
      </div>

      {/* Channel banner */}
      <div className="px-4">
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-secondary/50">
          {channelThumbnail ? (
            <img src={channelThumbnail} alt={channelName} className="w-16 h-16 rounded-full object-cover ring-2 ring-primary/30" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xl font-bold">
              {channelName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-display font-bold text-foreground truncate">{channelName}</h2>
            <p className="text-xs text-muted-foreground">{videos.length} vídeos encontrados</p>
          </div>
        </div>
      </div>

      {/* Videos */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 size={24} className="text-primary animate-spin" />
          <p className="text-xs text-muted-foreground">Carregando vídeos do canal...</p>
        </div>
      ) : (
        <div className="space-y-6 px-4 pb-4">
          {videos.map((video) => (
            <VideoCard
              key={video.videoId}
              video={video}
              onPlay={onPlayVideo}
              onFullscreen={onFullscreenVideo}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ChannelProfile;
