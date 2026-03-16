import { useState, useEffect } from "react";
import { ArrowLeft, Loader2, Play, ListVideo, Info, Users } from "lucide-react";
import { searchYouTubeGeneral, type VideoResult } from "@/lib/youtubeGeneralSearch";
import VideoCard from "./VideoCard";

interface ChannelProfileProps {
  channelName: string;
  channelThumbnail?: string;
  onBack: () => void;
  onPlayVideo: (video: VideoResult) => void;
  onFullscreenVideo?: (video: VideoResult) => void;
}

type ChannelTab = "videos" | "playlists" | "about";

const ChannelProfile = ({ channelName, channelThumbnail, onBack, onPlayVideo, onFullscreenVideo }: ChannelProfileProps) => {
  const [videos, setVideos] = useState<VideoResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ChannelTab>("videos");

  useEffect(() => {
    setLoading(true);
    searchYouTubeGeneral(channelName).then((res) => {
      setVideos(res);
      setLoading(false);
    });
  }, [channelName]);

  // Group videos that might be playlists (same channel, related titles)
  const playlists = videos.length > 4
    ? [
        { title: `Populares de ${channelName}`, videos: videos.slice(0, 5) },
        ...(videos.length > 8 ? [{ title: "Mais recentes", videos: videos.slice(5, 10) }] : []),
      ]
    : [];

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
          <button className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors">
            Inscrever
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 overflow-x-auto scrollbar-hide">
        {([
          { id: "videos" as ChannelTab, icon: Play, label: "Vídeos" },
          { id: "playlists" as ChannelTab, icon: ListVideo, label: "Playlists" },
          { id: "about" as ChannelTab, icon: Info, label: "Sobre" },
        ]).map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              activeTab === id
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 size={24} className="text-primary animate-spin" />
          <p className="text-xs text-muted-foreground">Carregando vídeos do canal...</p>
        </div>
      ) : activeTab === "videos" ? (
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
      ) : activeTab === "playlists" ? (
        <div className="space-y-6 px-4 pb-4">
          {playlists.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <ListVideo size={32} className="text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Nenhuma playlist encontrada</p>
            </div>
          ) : (
            playlists.map((playlist, pi) => (
              <div key={pi}>
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <ListVideo size={14} className="text-primary" />
                  {playlist.title}
                </h3>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
                  {playlist.videos.map((video) => (
                    <button
                      key={video.videoId}
                      onClick={() => onPlayVideo(video)}
                      className="flex-shrink-0 w-[200px] active:scale-[0.98] transition-transform text-left"
                    >
                      <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-card">
                        <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" loading="lazy" />
                        {video.duration && (
                          <span className="absolute bottom-1 right-1 bg-background/80 text-foreground text-[9px] font-mono px-1 py-0.5 rounded">
                            {video.duration}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-medium text-foreground line-clamp-2 mt-1.5 leading-tight">{video.title}</p>
                      {video.views && <p className="text-[10px] text-muted-foreground mt-0.5">{video.views}</p>}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="px-4 pb-4">
          <div className="bg-secondary/50 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              {channelThumbnail ? (
                <img src={channelThumbnail} alt={channelName} className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary text-lg font-bold">
                  {channelName.charAt(0)}
                </div>
              )}
              <div>
                <h3 className="text-base font-bold text-foreground">{channelName}</h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users size={12} />
                  Canal do YouTube
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-background/50 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-foreground">{videos.length}</p>
                <p className="text-[10px] text-muted-foreground">Vídeos</p>
              </div>
              <div className="bg-background/50 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-foreground">{playlists.length}</p>
                <p className="text-[10px] text-muted-foreground">Playlists</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChannelProfile;
