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

  const playlists = videos.length > 4
    ? [
        { title: `Populares de ${channelName}`, videos: videos.slice(0, 5) },
        ...(videos.length > 8 ? [{ title: "Mais recentes", videos: videos.slice(5, 10) }] : []),
      ]
    : [];

  return (
    <div className="space-y-0 min-h-screen bg-background pb-20">
      {/* Premium Header / Banner Area */}
      <div className="relative">
        <div className="h-32 sm:h-48 lg:h-64 overflow-hidden bg-gradient-to-br from-primary/20 via-background to-background border-b border-border/40">
           {videos[0] && <img src={videos[0].thumbnail} alt="" className="w-full h-full object-cover opacity-20 blur-xl scale-110" />}
           <div className="absolute inset-0 bg-background/40 backdrop-blur-[20px]" />
        </div>

        {/* Back Button Overlay */}
        <div className="absolute top-4 left-4 z-20">
          <button onClick={onBack} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center hover:bg-primary transition-all text-white shadow-lg">
            <ArrowLeft size={20} />
          </button>
        </div>

        {/* Profile Info Card Overlay */}
        <div className="absolute -bottom-16 left-0 right-0 px-4 sm:px-8 lg:px-12 flex flex-col sm:flex-row items-end gap-4 sm:gap-6">
          <div className="relative group flex-shrink-0">
             {channelThumbnail ? (
               <img src={channelThumbnail} alt={channelName} className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl object-cover ring-4 ring-background shadow-2xl" />
             ) : (
               <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl bg-secondary flex items-center justify-center text-primary text-3xl font-bold ring-4 ring-background shadow-2xl">
                 {channelName.charAt(0)}
               </div>
             )}
             <div className="absolute inset-0 rounded-3xl bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          </div>
          <div className="flex-1 pb-2 sm:pb-4 text-center sm:text-left">
            <h1 className="text-2xl sm:text-4xl font-black text-foreground tracking-tight mb-0.5 sm:mb-1">{channelName}</h1>
            <div className="flex items-center justify-center sm:justify-start gap-3 text-xs sm:text-sm text-muted-foreground font-medium">
               <span className="flex items-center gap-1"><Users size={14} className="text-primary" /> Canal Oficial</span>
               <span className="w-1 h-1 rounded-full bg-border" />
               <span>{videos.length} vídeos</span>
            </div>
          </div>
          <div className="pb-2 sm:pb-4 flex-shrink-0">
             <button className="px-8 py-2.5 rounded-full bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all active:scale-95 shadow-lg shadow-primary/20">
               Inscrever-se
             </button>
          </div>
        </div>
      </div>

      {/* Spacing for info card */}
      <div className="h-20 sm:h-24" />

      {/* Tabs - Sticky */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/40 px-4 sm:px-8 lg:px-12 py-1.5 flex gap-2 overflow-x-auto scrollbar-hide">
        {([
          { id: "videos" as ChannelTab, icon: Play, label: "Vídeos" },
          { id: "playlists" as ChannelTab, icon: ListVideo, label: "Playlists" },
          { id: "about" as ChannelTab, icon: Info, label: "Sobre" },
        ]).map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === id
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/10"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            }`}
          >
            <Icon size={14} className={activeTab === id ? "animate-pulse" : ""} />
            {label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="px-4 sm:px-8 lg:px-12 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 size={32} className="text-primary animate-spin" />
            <p className="text-sm font-medium text-muted-foreground">Sintonizando canal...</p>
          </div>
        ) : activeTab === "videos" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 sm:gap-8">
            {videos.map((video) => (
              <VideoCard
                key={video.videoId}
                video={video}
                onPlay={onPlayVideo}
                onFullscreen={onFullscreenVideo}
                viewMode="grid"
              />
            ))}
          </div>
        ) : activeTab === "playlists" ? (
          <div className="space-y-12 max-w-7xl mx-auto">
            {playlists.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-40">
                <ListVideo size={48} />
                <p className="font-medium">Nenhuma playlist organizada ainda</p>
              </div>
            ) : (
              playlists.map((playlist, pi) => (
                <div key={pi} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                      <ListVideo size={18} className="text-primary" />
                      {playlist.title}
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
                    {playlist.videos.map((video) => (
                      <button
                        key={video.videoId}
                        onClick={() => onPlayVideo(video)}
                        className="group/item flex flex-col text-left active:scale-[0.98] transition-transform"
                      >
                        <div className="relative aspect-video rounded-2xl overflow-hidden bg-card border border-white/5 shadow-lg">
                          <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover transition-transform group-hover/item:scale-110 duration-500" loading="lazy" />
                          <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity">
                             <div className="flex justify-center"><Play size={20} className="text-white fill-white" /></div>
                          </div>
                          {video.duration && (
                            <span className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md border border-white/10 italic">
                              {video.duration}
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-foreground line-clamp-2 mt-2 leading-tight group-hover:text-primary transition-colors">{video.title}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="max-w-3xl mx-auto py-4">
            <div className="bg-card/40 border border-border/40 rounded-3xl p-6 sm:p-10 space-y-8 backdrop-blur-sm">
              <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
                {channelThumbnail ? (
                  <img src={channelThumbnail} alt={channelName} className="w-20 h-20 rounded-2xl object-cover ring-2 ring-primary/20" />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center text-primary text-2xl font-bold">
                    {channelName.charAt(0)}
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-2xl font-black text-foreground mb-1">{channelName}</h3>
                  <p className="text-sm text-muted-foreground flex items-center justify-center sm:justify-start gap-1.5 font-medium">
                    <Info size={16} className="text-primary" />
                    Parceiro Oficial Xerife Hub
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-background/60 border border-border/20 rounded-2xl p-4 text-center">
                  <p className="text-3xl font-black text-primary leading-none mb-1">{videos.length}</p>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Vídeos</p>
                </div>
                <div className="bg-background/60 border border-border/20 rounded-2xl p-4 text-center">
                  <p className="text-3xl font-black text-primary leading-none mb-1">{playlists.length}</p>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Playlists</p>
                </div>
              </div>

              <div className="space-y-4">
                 <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Descrição</h4>
                 <p className="text-sm text-muted-foreground leading-relaxed">
                   Bem-vindo ao canal oficial de {channelName} no Xerife Hub. Aqui você encontra os melhores conteúdos, produções originais e transmissões de alta qualidade selecionadas especialmente para você. Aproveite a experiência definitiva em streaming.
                 </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChannelProfile;
