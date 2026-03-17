import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, TrendingUp, Loader2, X, Music2, Gamepad2, Trophy, GraduationCap, Newspaper, PlayCircle, Users, ListVideo, MessageSquare, ChevronRight, Play } from "lucide-react";
import { searchYouTubeGeneral, type VideoResult } from "@/lib/youtubeGeneralSearch";
import { getSearchSuggestions } from "@/lib/youtubeSearch";
import { fetchVideoInfo, type Comment } from "@/lib/youtubeVideoInfo";
import VideoCard from "./VideoCard";
import RelatedVideos from "./RelatedVideos";
import VideoComments from "./VideoComments";

interface ExploreScreenProps {
  onPlayVideo: (video: VideoResult) => void;
  onFullscreenVideo?: (video: VideoResult) => void;
  onChannelClick?: (channelName: string, channelThumbnail?: string) => void;
}

const CATEGORIES = [
  { id: "all", label: "Tudo", icon: TrendingUp, query: "" },
  { id: "music", label: "Música", icon: Music2, query: "música" },
  { id: "gaming", label: "Gaming", icon: Gamepad2, query: "gameplay" },
  { id: "sports", label: "Esportes", icon: Trophy, query: "esportes highlights" },
  { id: "education", label: "Educação", icon: GraduationCap, query: "aula tutorial" },
  { id: "news", label: "Notícias", icon: Newspaper, query: "notícias hoje" },
];

const TRENDING_QUERIES = [
  "receitas fáceis", "rock in rio", "treino em casa",
  "resumo novela", "gameplay fortnite", "tutorial programação",
  "notícias hoje", "música nova 2026", "comédia stand up",
];

type SectionTab = "videos" | "channels" | "playlists" | "comments";

// Group videos by channel
const groupByChannel = (videos: VideoResult[]) => {
  const groups: Record<string, { channel: string; thumbnail?: string; videos: VideoResult[] }> = {};
  videos.forEach((v) => {
    if (!groups[v.channel]) {
      groups[v.channel] = { channel: v.channel, thumbnail: v.channelThumbnail, videos: [] };
    }
    groups[v.channel].videos.push(v);
  });
  return Object.values(groups).filter((g) => g.videos.length >= 1).slice(0, 10);
};

// Group videos into pseudo-playlists by similarity
const groupPlaylists = (videos: VideoResult[]) => {
  if (videos.length < 3) return [];
  const playlists: { title: string; videos: VideoResult[] }[] = [];
  // Group by common keywords in titles
  const keywords = new Map<string, VideoResult[]>();
  videos.forEach((v) => {
    const words = v.title.toLowerCase().split(/\s+/).filter(w => w.length > 4);
    words.forEach((w) => {
      if (!keywords.has(w)) keywords.set(w, []);
      keywords.get(w)!.push(v);
    });
  });
  const used = new Set<string>();
  Array.from(keywords.entries())
    .sort(([, a], [, b]) => b.length - a.length)
    .forEach(([word, vids]) => {
      const unique = vids.filter(v => !used.has(v.videoId));
      if (unique.length >= 2) {
        playlists.push({ title: word.charAt(0).toUpperCase() + word.slice(1), videos: unique.slice(0, 8) });
        unique.forEach(v => used.add(v.videoId));
      }
    });
  // Add remaining as "Mistura"
  const remaining = videos.filter(v => !used.has(v.videoId));
  if (remaining.length >= 2) {
    playlists.push({ title: "Mistura variada", videos: remaining.slice(0, 8) });
  }
  return playlists.slice(0, 5);
};

const ExploreScreen = ({ onPlayVideo, onFullscreenVideo, onChannelClick }: ExploreScreenProps) => {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [results, setResults] = useState<VideoResult[]>([]);
  const [trendingResults, setTrendingResults] = useState<VideoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionTab>("videos");
  
  // Comments state
  const [selectedVideoForComments, setSelectedVideoForComments] = useState<VideoResult | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [relatedFromComments, setRelatedFromComments] = useState<VideoResult[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const suggestTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const hasFetchedTrending = useRef(false);

  useEffect(() => {
    if (hasFetchedTrending.current) return;
    hasFetchedTrending.current = true;
    setTrendingLoading(true);
    searchYouTubeGeneral("tendências Brasil").then((res) => {
      setTrendingResults(res);
      setTrendingLoading(false);
    });
  }, []);

  const doSearch = async (q: string) => {
    if (q.length < 2) return;
    setLoading(true);
    setShowSuggestions(false);
    const res = await searchYouTubeGeneral(q);
    setResults(res);
    setLoading(false);
  };

  const handleInput = (val: string) => {
    setQuery(val);
    if (val.length >= 2) {
      setShowSuggestions(true);
      if (suggestTimeoutRef.current) clearTimeout(suggestTimeoutRef.current);
      suggestTimeoutRef.current = setTimeout(async () => {
        setSuggestions(await getSearchSuggestions(val));
      }, 250);
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = setTimeout(() => doSearch(val), 800);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
      if (val.length === 0) setResults([]);
    }
  };

  const handleSuggestionClick = (term: string) => {
    setQuery(term);
    setSuggestions([]);
    setShowSuggestions(false);
    doSearch(term);
  };

  const handleChannelClick = (channelName: string, channelThumbnail?: string) => {
    if (!channelName) return;
    if (onChannelClick) {
      onChannelClick(channelName, channelThumbnail);
    } else {
      setQuery(channelName);
      setActiveCategory("all");
      doSearch(channelName);
    }
  };

  const handleCategoryClick = (cat: typeof CATEGORIES[number]) => {
    setActiveCategory(cat.id);
    if (cat.query) {
      const combined = query.length >= 2 ? `${query} ${cat.query}` : cat.query;
      doSearch(combined);
    } else if (query.length >= 2) {
      doSearch(query);
    } else {
      setResults([]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    const cat = CATEGORIES.find(c => c.id === activeCategory);
    const combined = cat?.query && query.length >= 2 ? `${query} ${cat.query}` : query;
    doSearch(combined || query);
  };

  const handleLoadComments = async (video: VideoResult) => {
    setSelectedVideoForComments(video);
    setActiveSection("comments");
    setCommentsLoading(true);
    try {
      const info = await fetchVideoInfo(video.videoId);
      setComments(info.comments);
      setRelatedFromComments(info.relatedVideos);
    } catch {
      setComments([]);
      setRelatedFromComments([]);
    }
    setCommentsLoading(false);
  };

  const displayVideos = results.length > 0 ? results : trendingResults;
  const channelGroups = groupByChannel(displayVideos);
  const playlists = groupPlaylists(displayVideos);

  const SECTIONS: { id: SectionTab; icon: React.ElementType; label: string; count?: number }[] = [
    { id: "videos", icon: PlayCircle, label: "Vídeos", count: displayVideos.length },
    { id: "channels", icon: Users, label: "Canais", count: channelGroups.length },
    { id: "playlists", icon: ListVideo, label: "Playlists", count: playlists.length },
    { id: "comments", icon: MessageSquare, label: "Comentários" },
  ];

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <form onSubmit={handleSubmit} className="px-4 pt-1">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleInput(e.target.value)}
            onFocus={() => query.length >= 2 && setShowSuggestions(true)}
            placeholder="Pesquisar vídeos, canais, playlists..."
            className="w-full pl-10 pr-9 py-2.5 rounded-full bg-secondary text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(""); setResults([]); setSuggestions([]); setActiveCategory("all"); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {showSuggestions && suggestions.length > 0 && (
          <div className="mt-1 bg-card rounded-xl border border-border shadow-lg overflow-hidden z-10 relative">
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSuggestionClick(s)}
                className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors flex items-center gap-2"
              >
                <Search size={14} className="text-muted-foreground flex-shrink-0" />
                <span className="truncate">{s}</span>
              </button>
            ))}
          </div>
        )}
      </form>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto px-4 scrollbar-hide">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                isActive
                  ? "bg-foreground text-background"
                  : "bg-secondary text-secondary-foreground hover:bg-accent"
              }`}
            >
              <Icon size={14} />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Section tabs — divided navigation */}
      {!loading && !trendingLoading && displayVideos.length > 0 && (
        <div className="flex gap-1 px-4 overflow-x-auto scrollbar-hide">
          {SECTIONS.map(({ id, icon: Icon, label, count }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                activeSection === id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-secondary/70 text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <Icon size={13} />
              {label}
              {count !== undefined && count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  activeSection === id ? "bg-primary-foreground/20" : "bg-muted"
                }`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Trending chips (when no search) */}
      {results.length === 0 && !loading && activeSection === "videos" && (
        <div className="px-4">
          <div className="flex items-center gap-2 mb-3 mt-2">
            <TrendingUp size={16} className="text-primary" />
            <h2 className="text-sm font-medium text-foreground">Pesquisas populares</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {TRENDING_QUERIES.map((t) => (
              <button
                key={t}
                onClick={() => handleSuggestionClick(t)}
                className="chip chip-inactive rounded-full text-xs"
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {(loading || (trendingLoading && results.length === 0)) && (
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <Loader2 size={24} className="text-primary animate-spin" />
          <p className="text-xs text-muted-foreground">{loading ? "Buscando vídeos..." : "Carregando tendências..."}</p>
        </div>
      )}

      {/* ═══ SECTION: VÍDEOS ═══ */}
      {!loading && !trendingLoading && displayVideos.length > 0 && activeSection === "videos" && (
        <div className="space-y-4 px-4 pb-4">
          {results.length === 0 && (
            <div className="flex items-center gap-2">
              <TrendingUp size={14} className="text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Em alta agora</h2>
            </div>
          )}
          <div className="space-y-6">
            {displayVideos.map((video) => (
              <div key={video.videoId} className="space-y-2">
                <VideoCard
                  video={video}
                  onPlay={onPlayVideo}
                  onChannelClick={handleChannelClick}
                  onFullscreen={onFullscreenVideo}
                />
                {/* Quick comment button */}
                <button
                  onClick={() => handleLoadComments(video)}
                  className="flex items-center gap-1.5 ml-12 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  <MessageSquare size={12} />
                  Ver comentários
                  <ChevronRight size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ SECTION: CANAIS ═══ */}
      {!loading && !trendingLoading && displayVideos.length > 0 && activeSection === "channels" && (
        <div className="space-y-4 px-4 pb-4">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Canais encontrados</h2>
          </div>
          
          {channelGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Users size={32} className="text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Nenhum canal identificado</p>
            </div>
          ) : (
            <div className="space-y-5">
              {channelGroups.map((group) => (
                <div key={group.channel} className="space-y-3">
                  {/* Channel header card */}
                  <button
                    onClick={() => handleChannelClick(group.channel, group.thumbnail)}
                    className="flex items-center gap-3 w-full p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors active:scale-[0.98]"
                  >
                    {group.thumbnail ? (
                      <img src={group.thumbnail} alt={group.channel} className="w-12 h-12 rounded-full object-cover ring-2 ring-primary/20" loading="lazy" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary text-lg font-bold">
                        {group.channel.charAt(0)}
                      </div>
                    )}
                    <div className="text-left flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{group.channel}</p>
                      <p className="text-[11px] text-muted-foreground">{group.videos.length} vídeo{group.videos.length > 1 ? "s" : ""}</p>
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground flex-shrink-0" />
                  </button>

                  {/* Channel videos horizontal scroll */}
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
                    {group.videos.slice(0, 6).map((video) => (
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
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                            <div className="w-8 h-8 rounded-full bg-primary/80 flex items-center justify-center">
                              <Play size={14} className="text-primary-foreground ml-0.5" fill="currentColor" />
                            </div>
                          </div>
                        </div>
                        <p className="text-xs font-medium text-foreground line-clamp-2 mt-1.5 leading-tight">{video.title}</p>
                        {video.views && <p className="text-[10px] text-muted-foreground mt-0.5">{video.views}</p>}
                      </button>
                    ))}
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-border/50" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ SECTION: PLAYLISTS ═══ */}
      {!loading && !trendingLoading && displayVideos.length > 0 && activeSection === "playlists" && (
        <div className="space-y-4 px-4 pb-4">
          <div className="flex items-center gap-2">
            <ListVideo size={14} className="text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Playlists sugeridas</h2>
          </div>

          {playlists.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <ListVideo size={32} className="text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Nenhuma playlist encontrada</p>
            </div>
          ) : (
            <div className="space-y-6">
              {playlists.map((playlist, pi) => (
                <div key={pi} className="space-y-3">
                  {/* Playlist header */}
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <ListVideo size={16} className="text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{playlist.title}</h3>
                      <p className="text-[10px] text-muted-foreground">{playlist.videos.length} vídeos</p>
                    </div>
                  </div>

                  {/* Playlist videos */}
                  <div className="space-y-2">
                    {playlist.videos.map((video, vi) => (
                      <button
                        key={video.videoId}
                        onClick={() => onPlayVideo(video)}
                        className="flex items-center gap-3 w-full text-left p-2 rounded-lg hover:bg-secondary/50 active:scale-[0.98] transition-all"
                      >
                        <span className="text-xs text-muted-foreground w-5 text-center flex-shrink-0 font-mono">{vi + 1}</span>
                        <div className="relative w-16 aspect-video rounded overflow-hidden bg-card flex-shrink-0">
                          <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" loading="lazy" />
                          {video.duration && (
                            <span className="absolute bottom-0.5 right-0.5 bg-background/80 text-foreground text-[8px] font-mono px-1 rounded">
                              {video.duration}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground line-clamp-2 leading-tight">{video.title}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{video.channel}</p>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Divider */}
                  {pi < playlists.length - 1 && <div className="h-px bg-border/50" />}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ SECTION: COMENTÁRIOS ═══ */}
      {!loading && !trendingLoading && activeSection === "comments" && (
        <div className="space-y-4 px-4 pb-4">
          <div className="flex items-center gap-2">
            <MessageSquare size={14} className="text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Comentários</h2>
          </div>

          {!selectedVideoForComments ? (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">Selecione um vídeo para ver os comentários</p>
              {/* Show videos to select from */}
              <div className="space-y-2">
                {displayVideos.slice(0, 8).map((video) => (
                  <button
                    key={video.videoId}
                    onClick={() => handleLoadComments(video)}
                    className="flex items-center gap-3 w-full text-left p-2 rounded-lg hover:bg-secondary/50 active:scale-[0.98] transition-all"
                  >
                    <div className="relative w-20 aspect-video rounded overflow-hidden bg-card flex-shrink-0">
                      <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground line-clamp-2 leading-tight">{video.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                        <MessageSquare size={10} />
                        Toque para ver comentários
                      </p>
                    </div>
                    <ChevronRight size={14} className="text-muted-foreground flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Selected video header */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
                <div className="relative w-20 aspect-video rounded-lg overflow-hidden bg-card flex-shrink-0">
                  <img src={selectedVideoForComments.thumbnail} alt={selectedVideoForComments.title} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground line-clamp-2 leading-tight">{selectedVideoForComments.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{selectedVideoForComments.channel}</p>
                </div>
                <button
                  onClick={() => { setSelectedVideoForComments(null); setComments([]); setRelatedFromComments([]); }}
                  className="p-1.5 rounded-full hover:bg-accent transition-colors"
                >
                  <X size={14} className="text-muted-foreground" />
                </button>
              </div>

              {/* Comments */}
              <div>
                <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
                  <MessageSquare size={12} className="text-primary" />
                  {commentsLoading ? "Carregando..." : `${comments.length} comentários`}
                </h3>
                <VideoComments comments={comments} loading={commentsLoading} />
              </div>

              {/* Related videos from this video */}
              {relatedFromComments.length > 0 && (
                <div className="pt-2">
                  <div className="h-px bg-border/50 mb-4" />
                  <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
                    <PlayCircle size={12} className="text-primary" />
                    Vídeos relacionados
                  </h3>
                  <RelatedVideos
                    videos={relatedFromComments}
                    onPlay={(video) => onPlayVideo(video)}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!loading && query.length >= 2 && results.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-2">
          <Search size={32} className="text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Nenhum vídeo encontrado</p>
        </div>
      )}
    </div>
  );
};

export default ExploreScreen;
