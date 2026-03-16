import { useState, useRef } from "react";
import { Search, TrendingUp, Loader2, X, Music2, Gamepad2, Trophy, GraduationCap, Newspaper } from "lucide-react";
import { searchYouTubeGeneral, type VideoResult } from "@/lib/youtubeGeneralSearch";
import { getSearchSuggestions } from "@/lib/youtubeSearch";
import VideoCard from "./VideoCard";

interface ExploreScreenProps {
  onPlayVideo: (video: VideoResult) => void;
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

const ExploreScreen = ({ onPlayVideo }: ExploreScreenProps) => {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [results, setResults] = useState<VideoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const suggestTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

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
            placeholder="Pesquisar vídeos, receitas, tutoriais..."
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

        {/* Suggestions dropdown */}
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

      {/* Trending chips (when no search) */}
      {results.length === 0 && !loading && (
        <div className="px-4">
          <div className="flex items-center gap-2 mb-3 mt-2">
            <TrendingUp size={16} className="text-primary" />
            <h2 className="text-sm font-medium text-foreground">Em alta</h2>
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
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 size={28} className="text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Buscando vídeos...</p>
        </div>
      )}

      {/* Results feed */}
      {!loading && results.length > 0 && (
        <div className="space-y-6 px-4 pb-4">
          {results.map((video) => (
            <VideoCard key={video.videoId} video={video} onPlay={onPlayVideo} />
          ))}
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
