import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, TrendingUp, Loader2, X, PlayCircle, Users, ListVideo, MessageSquare, ChevronRight, Play, LayoutGrid, List } from "lucide-react";
import { searchYouTubeGeneral, type VideoResult } from "@/lib/youtubeGeneralSearch";
import { getSearchSuggestions } from "@/lib/youtubeSearch";
import { hdThumbnail } from "@/lib/utils";
import { fetchVideoInfo, type Comment, type VideoInfo } from "@/lib/youtubeVideoInfo";
import VideoCard from "./VideoCard";
import RelatedVideos from "./RelatedVideos";
import VideoComments from "./VideoComments";
import VideoCategorySelector, { VIDEO_CATEGORIES, type VideoCategory } from "./VideoCategorySelector";

interface ExploreScreenProps {
  onPlayVideo: (video: VideoResult) => void;
  onFullscreenVideo?: (video: VideoResult) => void;
  onChannelClick?: (channelName: string, channelThumbnail?: string) => void;
  onAddToPlaylist?: (video: any) => void;
}

// Categories are now imported from VideoCategorySelector

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
  const remaining = videos.filter(v => !used.has(v.videoId));
  if (remaining.length >= 2) {
    playlists.push({ title: "Mistura variada", videos: remaining.slice(0, 8) });
  }
  return playlists.slice(0, 5);
};

const ExploreScreen = ({ onPlayVideo, onFullscreenVideo, onChannelClick, onAddToPlaylist }: ExploreScreenProps) => {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [results, setResults] = useState<VideoResult[]>([]);
  const [trendingResults, setTrendingResults] = useState<VideoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionTab>("videos");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => (localStorage.getItem('demus-view-mode') as 'grid' | 'list') || 'grid');

  const toggleViewMode = () => {
    const next = viewMode === 'grid' ? 'list' : 'grid';
    setViewMode(next);
    localStorage.setItem('demus-view-mode', next);
  };
  
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
      }, 500);
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = setTimeout(() => doSearch(val), 1200);
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

  const handleCategoryClick = (cat: VideoCategory) => {
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
    const cat = VIDEO_CATEGORIES.find(c => c.id === activeCategory);
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
      {/* ═══ BROWSE SECTION ═══ */}
          {/* Search bar + View Toggle */}
          <div className="flex items-center gap-2 px-4 pt-1">
            <form onSubmit={handleSubmit} className="flex-1">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => handleInput(e.target.value)}
                  onFocus={() => query.length >= 2 && setShowSuggestions(true)}
                  placeholder="Pesquisar vídeos, canais..."
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
            </form>

            <button
              onClick={toggleViewMode}
              className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-primary transition-colors"
              title={viewMode === 'grid' ? 'Mudar para Lista' : 'Mudar para Grade'}
            >
              {viewMode === 'grid' ? <List size={20} /> : <LayoutGrid size={20} />}
            </button>
          </div>

          {showSuggestions && suggestions.length > 0 && (
            <div className="mx-4 mt-[-8px] bg-card rounded-xl border border-border shadow-lg overflow-hidden z-20 relative">
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

          {/* Category selector */}
          <div className="flex gap-2 items-center px-4 sticky top-0 bg-background/80 backdrop-blur-xl z-30 py-2 border-b border-white/5">
            <VideoCategorySelector
              activeCategory={activeCategory}
              onSelect={handleCategoryClick}
            />
          </div>

          {/* Desktop Hero Section */}
          {results.length === 0 && !loading && !trendingLoading && activeSection === "videos" && (
            <div className="px-4 hidden lg:block">
              <div className="relative h-[300px] rounded-3xl overflow-hidden group cursor-pointer" onClick={() => trendingResults[0] && onPlayVideo(trendingResults[0])}>
                {trendingResults[0] && (
                  <img src={hdThumbnail(trendingResults[0].thumbnail)} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-8 flex flex-col justify-end">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider">Em Alta</span>
                    <span className="text-white/60 text-xs">{trendingResults[0]?.channel}</span>
                  </div>
                  <h1 className="text-3xl font-bold text-white max-w-2xl line-clamp-2 leading-tight mb-4 group-hover:text-primary transition-colors">
                    {trendingResults[0]?.title}
                  </h1>
                  <div className="flex items-center gap-4">
                    <button className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full font-bold flex items-center gap-2 hover:bg-primary/90 transition-all active:scale-95 shadow-xl shadow-primary/20">
                      <Play size={18} fill="currentColor" /> Assistir Agora
                    </button>
                  </div>
                </div>
                <div className="absolute top-6 right-8 opacity-20 group-hover:opacity-40 transition-opacity">
                   <h2 className="text-2xl font-black text-white italic tracking-tighter">XERIFE <span className="text-primary">VIDEOS</span></h2>
                </div>
              </div>
            </div>
          )}

          {/* Section tabs */}
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

          {/* Trending chips */}
          {results.length === 0 && !loading && activeSection === "videos" && (
            <div className="px-4 lg:hidden">
              <div className="flex items-center gap-2 mb-3 mt-2">
                <TrendingUp size={16} className="text-primary" />
                <h2 className="text-sm font-medium text-foreground">Bombando no Xerife</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {TRENDING_QUERIES.map((t) => (
                  <button
                    key={t}
                    onClick={() => handleSuggestionClick(t)}
                    className="px-3 py-1.5 rounded-full text-xs bg-secondary/80 text-muted-foreground hover:text-foreground transition-all active:scale-95 border border-white/5"
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

          {/* Animated section content */}
          <AnimatePresence mode="wait">
            {/* ═══ SECTION: VÍDEOS ═══ */}
            {!loading && !trendingLoading && displayVideos.length > 0 && activeSection === "videos" && (
              <motion.div
                key="videos"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="space-y-4 px-4 pb-4"
              >
                {results.length === 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp size={14} className="text-primary" />
                      <h2 className="text-sm font-semibold text-foreground">Bombando agora</h2>
                    </div>
                    <div className="hidden lg:flex items-center gap-1 opacity-40 hover:opacity-100 transition-opacity cursor-default">
                       <h2 className="text-lg font-black text-foreground italic tracking-tighter">XERIFE <span className="text-primary">VIDEOS</span></h2>
                    </div>
                  </div>
                )}
                <motion.div
                  className={viewMode === 'grid' 
                    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 sm:gap-8 lg:gap-10" 
                    : "flex flex-col gap-5 sm:gap-6"}
                  initial="hidden"
                  animate="visible"
                  variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.05 } } }}
                >
                  {displayVideos.map((video) => (
                    <motion.div
                      key={video.videoId}
                      className="space-y-2"
                      variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.25 } } }}
                    >
                      <VideoCard
                        video={video}
                        onPlay={onPlayVideo}
                        onChannelClick={handleChannelClick}
                        onFullscreen={onFullscreenVideo}
                        onAddToPlaylist={onAddToPlaylist}
                        viewMode={viewMode}
                      />
                      {viewMode === 'grid' && (
                        <button
                          onClick={() => handleLoadComments(video)}
                          className="flex items-center gap-1.5 ml-12 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <MessageSquare size={12} />
                          Ver comentários
                          <ChevronRight size={12} />
                        </button>
                      )}
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>
            )}

            {/* ═══ SECTION: CANAIS ═══ */}
            {!loading && !trendingLoading && displayVideos.length > 0 && activeSection === "channels" && (
              <motion.div
                key="channels"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="space-y-4 px-4 pb-4"
              >
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
                  <motion.div
                    className={viewMode === 'grid' 
                      ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" 
                      : "space-y-5"}
                    initial="hidden"
                    animate="visible"
                    variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
                  >
                    {channelGroups.map((group) => (
                      <motion.div
                        key={group.channel}
                        className="space-y-3"
                        variants={{ hidden: { opacity: 0, x: -16 }, visible: { opacity: 1, x: 0, transition: { duration: 0.3 } } }}
                      >
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

                        <div className={viewMode === 'grid' ? "grid grid-cols-2 gap-2" : "flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4"}>
                          {group.videos.slice(0, viewMode === 'grid' ? 4 : 6).map((video) => (
                            <button
                              key={video.videoId}
                              onClick={() => onPlayVideo(video)}
                              className={viewMode === 'grid' ? "w-full text-left" : "flex-shrink-0 w-[200px] active:scale-[0.98] transition-transform text-left"}
                            >
                              <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-card">
                                <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" loading="lazy" />
                                {video.duration && (
                                  <span className="absolute bottom-1 right-1 bg-background/80 text-foreground text-[9px] font-mono px-1 py-0.5 rounded">
                                    {video.duration}
                                  </span>
                                )}
                              </div>
                              <p className={`font-medium text-foreground line-clamp-2 mt-1.5 leading-tight ${viewMode === 'grid' ? 'text-[10px]' : 'text-xs'}`}>{video.title}</p>
                            </button>
                          ))}
                        </div>

                        <div className="h-px bg-border/50" />
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* ═══ SECTION: PLAYLISTS ═══ */}
            {!loading && !trendingLoading && displayVideos.length > 0 && activeSection === "playlists" && (
              <motion.div
                key="playlists"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="space-y-4 px-4 pb-4"
              >
                <div className="flex items-center gap-2">
                  <ListVideo size={14} className="text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">Playlists sugeridas</h2>
                </div>

                {playlists.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2">
                    <ListVideo size={32} className="text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">Nenhuma playlist formada</p>
                  </div>
                ) : (
                  playlists.map((pl, pi) => (
                    <motion.div
                      key={pi}
                      className="space-y-3"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: pi * 0.05 }}
                    >
                      <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">{pi + 1}</span>
                        {pl.title}
                        <span className="text-muted-foreground font-normal">• {pl.videos.length} vídeos</span>
                      </h3>
                      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
                        {pl.videos.map((video) => (
                          <button
                            key={video.videoId}
                            onClick={() => onPlayVideo(video)}
                            className="flex-shrink-0 w-[180px] active:scale-[0.98] transition-transform text-left"
                          >
                            <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-card">
                              <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" loading="lazy" />
                              {video.duration && (
                                <span className="absolute bottom-1 right-1 bg-background/80 text-foreground text-[9px] font-mono px-1 py-0.5 rounded">
                                  {video.duration}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] font-medium text-foreground line-clamp-2 mt-1.5 leading-tight">{video.title}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{video.channel}</p>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  ))
                )}
              </motion.div>
            )}

            {/* ═══ SECTION: COMMENTS ═══ */}
            {!loading && !trendingLoading && activeSection === "comments" && (
              <motion.div
                key="comments"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="space-y-4 px-4 pb-4"
              >
                {!selectedVideoForComments ? (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <MessageSquare size={14} className="text-primary" />
                      <h2 className="text-sm font-semibold text-foreground">Escolha um vídeo para ver comentários</h2>
                    </div>
                    <motion.div
                      className="space-y-2"
                      initial="hidden"
                      animate="visible"
                      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.03 } } }}
                    >
                      {displayVideos.slice(0, 15).map((video) => (
                        <motion.button
                          key={video.videoId}
                          onClick={() => handleLoadComments(video)}
                          className="flex items-center gap-3 w-full p-2.5 rounded-xl bg-card/40 hover:bg-card/80 border border-border/30 transition-all active:scale-[0.99] text-left"
                          variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
                        >
                          <div className="relative w-16 aspect-video rounded-lg overflow-hidden bg-muted flex-shrink-0">
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
                        </motion.button>
                      ))}
                    </motion.div>
                  </div>
                ) : (
                  <motion.div
                    className="space-y-4"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2 }}
                  >
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

                    <div>
                      <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
                        <MessageSquare size={12} className="text-primary" />
                        {commentsLoading ? "Carregando..." : `${comments.length} comentários`}
                      </h3>
                      <VideoComments comments={comments} loading={commentsLoading} />
                    </div>

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
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

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
