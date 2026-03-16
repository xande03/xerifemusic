import { useState, useRef, useEffect } from "react";
import { Search, TrendingUp, Loader2, X } from "lucide-react";
import { searchYouTubeGeneral, type VideoResult } from "@/lib/youtubeGeneralSearch";
import { getSearchSuggestions } from "@/lib/youtubeSearch";
import VideoCard from "./VideoCard";

interface ExploreScreenProps {
  onPlayVideo: (video: VideoResult) => void;
}

const TRENDING_QUERIES = [
  "receitas fáceis", "rock in rio", "treino em casa",
  "resumo novela", "gameplay", "tutorial",
  "notícias hoje", "música nova", "comédia",
];

const ExploreScreen = ({ onPlayVideo }: ExploreScreenProps) => {
  const [query, setQuery] = useState("");
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    doSearch(query);
  };

  return (
    <div className="space-y-4">
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
              onClick={() => { setQuery(""); setResults([]); setSuggestions([]); }}
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

      {/* Trending chips (when no search) */}
      {results.length === 0 && !loading && (
        <div className="px-4">
          <div className="flex items-center gap-2 mb-3">
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
