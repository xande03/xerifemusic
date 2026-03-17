import { useState, useRef } from "react";
import { Search, X, Loader2, User, Disc3 } from "lucide-react";
import { getSearchSuggestions, searchYouTubeMusic } from "@/lib/youtubeSearch";
import SongCard from "./SongCard";
import type { Song } from "@/data/mockSongs";

type MusicFilter = "all" | "songs" | "artists" | "albums";

interface SearchScreenProps {
  currentSongId: string;
  onSelect: (song: Song) => void;
  onArtistClick?: (name: string, image?: string) => void;
}

const GENRES = [
  { label: "Pop", gradient: "from-pink-500 to-rose-600" },
  { label: "Hip Hop", gradient: "from-violet-500 to-purple-700" },
  { label: "Rock", gradient: "from-red-600 to-red-800" },
  { label: "Eletrônica", gradient: "from-blue-500 to-blue-700" },
  { label: "R&B", gradient: "from-teal-500 to-emerald-700" },
  { label: "Sertanejo", gradient: "from-amber-500 to-orange-600" },
  { label: "Funk", gradient: "from-green-500 to-green-700" },
  { label: "MPB", gradient: "from-cyan-500 to-cyan-700" },
  { label: "Jazz", gradient: "from-indigo-500 to-indigo-700" },
  { label: "Reggaeton", gradient: "from-orange-500 to-red-600" },
  { label: "Gospel", gradient: "from-yellow-500 to-amber-600" },
  { label: "Pagode", gradient: "from-lime-500 to-green-600" },
];

const FILTERS: { id: MusicFilter; label: string }[] = [
  { id: "all", label: "Tudo" },
  { id: "songs", label: "Músicas" },
  { id: "artists", label: "Artistas" },
  { id: "albums", label: "Álbuns" },
];

const SearchScreen = ({ currentSongId, onSelect, onArtistClick }: SearchScreenProps) => {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<MusicFilter>("all");
  const [results, setResults] = useState<Song[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const suggestTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const doSearch = async (q: string, f: MusicFilter = filter) => {
    if (q.length < 2) return;
    setLoading(true);
    setShowSuggestions(false);
    const res = await searchYouTubeMusic(q, "all");
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
      searchTimeoutRef.current = setTimeout(() => doSearch(val), 600);
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

  const handleGenreClick = (genre: string) => {
    setQuery(genre);
    doSearch(genre);
  };

  const handleFilterChange = (f: MusicFilter) => {
    setFilter(f);
    if (query.length >= 2) doSearch(query, f);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    doSearch(query);
  };

  // Derive unique artists and albums from results
  const uniqueArtists = [...new Set(results.map((s) => s.artist).filter(a => a && a !== "Desconhecido"))];
  const uniqueAlbums = [...new Set(results.map((s) => `${s.album}|||${s.artist}|||${s.cover}`).filter(a => !a.startsWith("|||")))];

  const showFilteredResults = !loading && results.length > 0;

  return (
    <div className="px-4 space-y-4">
      {/* Title */}
      <h1 className="text-2xl font-bold text-foreground lg:hidden">Buscar</h1>

      {/* Search bar */}
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleInput(e.target.value)}
            onFocus={() => query.length >= 2 && setShowSuggestions(true)}
            placeholder="Buscar músicas, artistas, álbuns..."
            className="w-full pl-10 pr-9 py-3 rounded-lg bg-secondary text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
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

        {/* Suggestions */}
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

      {/* Filter chips — visible when there's a query */}
      {query.length >= 2 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {FILTERS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => handleFilterChange(id)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                filter === id
                  ? "bg-foreground text-background"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Genre grid (shown when no search) */}
      {results.length === 0 && !loading && query.length < 2 && (
        <div>
          <h2 className="text-base font-bold text-foreground mb-3">Navegar por Gêneros</h2>
          <div className="grid grid-cols-2 gap-3">
            {GENRES.map((genre) => (
              <button
                key={genre.label}
                onClick={() => handleGenreClick(genre.label)}
                className={`bg-gradient-to-br ${genre.gradient} rounded-xl px-4 py-5 text-left active:scale-[0.97] transition-transform`}
              >
                <span className="text-sm font-bold text-white">{genre.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 size={24} className="text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Buscando...</p>
        </div>
      )}

      {/* Results */}
      {showFilteredResults && (
        <div className="space-y-5">
          {/* Artists section */}
          {(filter === "all" || filter === "artists") && uniqueArtists.length > 0 && (
            <div>
              {filter === "all" && <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1.5"><User size={14} /> Artistas</h3>}
              <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
                {uniqueArtists.slice(0, 10).map((artist) => {
                  const cover = results.find(s => s.artist === artist)?.cover;
                  return (
                    <button
                      key={artist}
                      onClick={() => onArtistClick?.(artist, cover)}
                      className="flex flex-col items-center gap-1.5 flex-shrink-0 w-20 active:scale-95 transition-transform"
                    >
                      <div className="w-16 h-16 rounded-full overflow-hidden bg-secondary">
                        {cover && <img src={cover} alt={artist} className="w-full h-full object-cover" />}
                      </div>
                      <span className="text-[11px] text-foreground truncate w-full text-center">{artist}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Albums section */}
          {(filter === "all" || filter === "albums") && uniqueAlbums.length > 0 && (
            <div>
              {filter === "all" && <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1.5"><Disc3 size={14} /> Álbuns</h3>}
              <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
                {uniqueAlbums.slice(0, 10).map((raw) => {
                  const [album, artist, cover] = raw.split("|||");
                  return (
                    <button
                      key={raw}
                      onClick={() => {
                        const song = results.find(s => s.album === album);
                        if (song) onSelect(song);
                      }}
                      className="flex flex-col items-center gap-1.5 flex-shrink-0 w-28 active:scale-95 transition-transform text-left"
                    >
                      <div className="w-28 h-28 rounded-xl overflow-hidden bg-secondary">
                        {cover && <img src={cover} alt={album} className="w-full h-full object-cover" />}
                      </div>
                      <span className="text-[11px] font-medium text-foreground truncate w-full">{album}</span>
                      <span className="text-[10px] text-muted-foreground truncate w-full -mt-1">{artist}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Songs */}
          {(filter === "all" || filter === "songs") && (
            <div>
              {filter === "all" && results.length > 0 && <h3 className="text-sm font-semibold text-muted-foreground mb-2">Músicas</h3>}
              {results.map((song) => (
                <SongCard
                  key={song.id}
                  song={song}
                  isActive={song.id === currentSongId}
                  onSelect={onSelect}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!loading && query.length >= 2 && results.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-2">
          <Search size={32} className="text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Nenhum resultado encontrado</p>
        </div>
      )}
    </div>
  );
};

export default SearchScreen;