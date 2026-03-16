import { useState, useCallback, useEffect, useRef } from "react";
import { Search, Wifi, WifiOff, ChevronRight, Music, TrendingUp, Play, User, Clock, Sparkles, Radio, Plus, Cast } from "lucide-react";
import { mockSongs, Song, sortByVotes } from "@/data/mockSongs";
import { saveSong, getAllSavedSongs, StoredSong } from "@/lib/indexedDB";
import { useYouTubePlayer } from "@/hooks/useYouTubePlayer";
import { useMediaSession } from "@/hooks/useMediaSession";
import { getSearchSuggestions, searchYouTubeMusic } from "@/lib/youtubeSearch";
import {
  getDeviceId, getVotedSongs, addVotedSong,
  saveQueueState, getQueueState, saveCurrentSong, getCurrentSongId,
  saveVolume, getVolume, addToHistory, getHistory, clearHistory,
  type HistoryEntry,
} from "@/lib/localStorage";
import SongCard from "@/components/SongCard";
import MiniPlayer from "@/components/MiniPlayer";
import NowPlayingView, { type PlayerMode } from "@/components/NowPlayingView";
import BottomNav from "@/components/BottomNav";
import SearchSkeleton from "@/components/SearchSkeleton";
import SplashScreen from "@/components/SplashScreen";
import RadioScreen from "@/components/RadioScreen";
import album1 from "@/assets/album-1.jpg";
import album2 from "@/assets/album-2.jpg";
import album3 from "@/assets/album-3.jpg";
import album4 from "@/assets/album-4.jpg";

type Tab = "home" | "search" | "library" | "offline" | "profile";
type SearchFilter = "all" | "songs" | "artists" | "albums";

const albumCovers = [album1, album2, album3, album4];

const Index = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [currentSong, setCurrentSong] = useState<Song>(mockSongs[0]);
  const [expanded, setExpanded] = useState(false);
  const [playerMode, setPlayerMode] = useState<PlayerMode>("video");
  const [showRadio, setShowRadio] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFilter, setSearchFilter] = useState<SearchFilter>("all");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [volume, setVolumeState] = useState(getVolume);
  const [savedSongIds, setSavedSongIds] = useState<Set<string>>(new Set());
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [votedSongs, setVotedSongs] = useState<Set<string>>(() => new Set(getVotedSongs()));
  const [recentHistory, setRecentHistory] = useState<HistoryEntry[]>(() => getHistory());
  const suggestTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const deviceId = useRef(getDeviceId());

  const [songs, setSongs] = useState<Song[]>(() => {
    const savedVotes = getQueueState();
    return mockSongs.map((s) => ({ ...s, votes: savedVotes[s.id] ?? s.votes }));
  });

  const { state: playerState, loadVideo, play, pause, seekTo, setVolume: setPlayerVolume, togglePiP } = useYouTubePlayer("yt-player");

  useEffect(() => {
    const savedId = getCurrentSongId();
    if (savedId) {
      const found = mockSongs.find((s) => s.id === savedId);
      if (found) setCurrentSong(found);
    }
  }, []);

  useEffect(() => {
    getAllSavedSongs().then((saved) => {
      const ids = new Set(saved.map((s) => s.id));
      setSavedSongIds(ids);
      setSongs((prev) => prev.map((s) => ({ ...s, isDownloaded: ids.has(s.id) })));
    });
  }, []);

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  useEffect(() => { setPlayerVolume(volume); saveVolume(volume); }, [volume, setPlayerVolume]);

  useEffect(() => {
    const votes: Record<string, number> = {};
    songs.forEach((s) => { votes[s.id] = s.votes; });
    saveQueueState(votes);
  }, [songs]);

  useEffect(() => {
    if (playerState.isEnded) {
      const sorted = sortByVotes(songs);
      const idx = sorted.findIndex((s) => s.id === currentSong.id);
      const next = sorted[(idx + 1) % sorted.length];
      setCurrentSong(next);
      saveCurrentSong(next.id);
      loadVideo(next.youtubeId);
    }
  }, [playerState.isEnded]);

  const handleSelect = useCallback((song: Song) => {
    setCurrentSong(song);
    saveCurrentSong(song.id);
    addToHistory({
      songId: song.id, youtubeId: song.youtubeId, title: song.title,
      artist: song.artist, album: song.album, cover: song.cover, duration: song.duration,
    });
    setRecentHistory(getHistory());
    loadVideo(song.youtubeId);
  }, [loadVideo]);

  const handleTogglePlay = useCallback(() => {
    if (playerState.isPlaying) { pause(); }
    else if (!playerState.videoId) { loadVideo(currentSong.youtubeId); }
    else { play(); }
  }, [playerState, pause, play, loadVideo, currentSong]);

  const handleNext = useCallback(() => {
    const sorted = sortByVotes(songs);
    const idx = sorted.findIndex((s) => s.id === currentSong.id);
    handleSelect(sorted[(idx + 1) % sorted.length]);
  }, [currentSong, songs, handleSelect]);

  const handlePrev = useCallback(() => {
    const sorted = sortByVotes(songs);
    const idx = sorted.findIndex((s) => s.id === currentSong.id);
    handleSelect(sorted[(idx - 1 + sorted.length) % sorted.length]);
  }, [currentSong, songs, handleSelect]);

  const handleSeek = useCallback((fraction: number) => {
    seekTo(fraction * (playerState.duration || currentSong.duration));
  }, [seekTo, playerState.duration, currentSong.duration]);

  const handleSeekAbsolute = useCallback((seconds: number) => {
    seekTo(seconds);
  }, [seekTo]);

  useMediaSession({
    song: currentSong, isPlaying: playerState.isPlaying,
    currentTime: playerState.currentTime || 0,
    duration: playerState.duration || currentSong.duration,
    onPlay: play, onPause: pause, onNext: handleNext, onPrev: handlePrev, onSeek: handleSeekAbsolute,
  });

  const handleVote = useCallback((song: Song) => {
    if (votedSongs.has(song.id)) return;
    addVotedSong(song.id);
    setVotedSongs((prev) => new Set([...prev, song.id]));
    setSongs((prev) => prev.map((s) => (s.id === song.id ? { ...s, votes: s.votes + 1 } : s)));
  }, [votedSongs]);

  const handleDownload = useCallback(async (song: Song) => {
    if (savedSongIds.has(song.id)) return;
    await saveSong({ id: song.id, youtubeId: song.youtubeId, title: song.title, artist: song.artist, album: song.album, cover: song.cover, duration: song.duration, savedAt: Date.now() });
    setSavedSongIds((prev) => new Set([...prev, song.id]));
    setSongs((prev) => prev.map((s) => (s.id === song.id ? { ...s, isDownloaded: true } : s)));
  }, [savedSongIds]);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (q.length >= 2) {
      if (suggestTimeoutRef.current) clearTimeout(suggestTimeoutRef.current);
      suggestTimeoutRef.current = setTimeout(async () => {
        setSuggestions(await getSearchSuggestions(q));
      }, 300);
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = setTimeout(async () => {
        setIsSearching(true);
        setSearchResults(await searchYouTubeMusic(q, searchFilter));
        setIsSearching(false);
      }, 600);
    } else {
      setSuggestions([]);
      setSearchResults([]);
    }
  };

  const handleSuggestionClick = (term: string) => {
    setSearchQuery(term);
    setSuggestions([]);
    setIsSearching(true);
    searchYouTubeMusic(term, searchFilter).then((results) => {
      setSearchResults(results);
      setIsSearching(false);
    });
  };

  useEffect(() => {
    if (searchQuery.length >= 2) {
      setIsSearching(true);
      searchYouTubeMusic(searchQuery, searchFilter).then((results) => {
        setSearchResults(results);
        setIsSearching(false);
      });
    }
  }, [searchFilter]);

  const uniqueArtists = searchQuery.length >= 2
    ? [...new Set(searchResults.map((s) => s.artist).filter(a => a && a !== "Desconhecido"))]
    : [];
  const uniqueAlbums = searchQuery.length >= 2
    ? [...new Set(searchResults.map((s) => `${s.album}|||${s.artist}|||${s.cover}`).filter(a => !a.startsWith("|||")))]
    : [];

  const offlineSongs = songs.filter((s) => s.isDownloaded);
  const queueSongs = sortByVotes(songs);
  const ct = playerState.currentTime || 0;
  const dur = playerState.duration || currentSong.duration;

  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? "Bom dia" : greetingHour < 18 ? "Boa tarde" : "Boa noite";

  return (
    <>
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}

      <div className="flex flex-col h-[100dvh] bg-background overflow-hidden">
        {/* YouTube Player */}
        <div
          className={(expanded && playerMode === "video") ? "fixed z-[60]" : "absolute -top-[9999px] -left-[9999px]"}
          style={(expanded && playerMode === "video") ? { top: "90px", left: "16px", right: "16px", height: "calc(56.25vw - 18px)", maxHeight: "300px", maxWidth: "calc(100% - 32px)" } : {}}
        >
          <div id="yt-player" className="w-full h-full rounded-xl overflow-hidden" />
        </div>

        {/* Header — YouTube Music style */}
        <header className="flex items-center justify-between px-4 py-2.5 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-glow-red">
              <Play size={13} className="text-primary-foreground ml-0.5" fill="currentColor" />
            </div>
            <span className="font-display font-bold text-foreground text-base tracking-tight">Music</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setActiveTab("search")} className="text-muted-foreground hover:text-foreground transition-colors">
              <Search size={20} />
            </button>
            <span className={`flex items-center text-xs ${isOnline ? "text-muted-foreground" : "text-primary"}`}>
              {isOnline ? <Cast size={18} /> : <WifiOff size={18} />}
            </span>
            <div className="w-7 h-7 rounded-full bg-secondary overflow-hidden flex items-center justify-center ring-2 ring-border">
              <User size={14} className="text-muted-foreground" />
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto pb-36 overscroll-contain">
          {activeTab === "home" && (
            <div className="space-y-6">
              {/* Mood chips — YT Music style */}
              <div className="flex gap-2 overflow-x-auto px-4 pt-1 pb-1 scrollbar-hide">
                {["Relax", "Workout", "Focus", "Energize", "Party", "Commute"].map((mood) => (
                  <button key={mood} className="chip chip-inactive flex-shrink-0 whitespace-nowrap rounded-full">
                    {mood}
                  </button>
                ))}
              </div>

              {/* CREATE A RADIO — hero section like YT Music */}
              <section className="px-4">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Crie uma rádio</p>
                <h2 className="text-lg font-display font-bold text-foreground mb-3">Seu sintonizador musical</h2>
                <button
                  onClick={() => handleSelect(songs[Math.floor(Math.random() * songs.length)])}
                  className="relative w-full rounded-2xl overflow-hidden aspect-[16/9] group active:scale-[0.99] transition-transform"
                >
                  {/* Collage of album covers */}
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-2">
                    {songs.slice(0, 6).map((s, i) => (
                      <div key={s.id} className="overflow-hidden">
                        <img src={s.cover} alt={s.album} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-r from-background/40 to-transparent" />
                  {/* Plus button overlay */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-foreground/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Plus size={28} className="text-background" />
                  </div>
                </button>
              </section>

              {/* Listen again — grid layout like YT Music */}
              <section>
                <div className="flex items-center justify-between px-4 mb-3">
                  <h2 className="text-lg font-display font-bold text-foreground">Ouvir novamente</h2>
                  <ChevronRight size={20} className="text-muted-foreground" />
                </div>
                <div className="grid grid-cols-3 gap-3 px-4">
                  {(recentHistory.length > 0
                    ? recentHistory.slice(0, 6).map(e => ({
                        id: e.songId, youtubeId: e.youtubeId, title: e.title, artist: e.artist,
                        album: e.album, cover: e.cover, duration: e.duration, votes: 0, isDownloaded: false,
                      }))
                    : songs.slice(0, 6)
                  ).map((song) => (
                    <button
                      key={song.id}
                      onClick={() => handleSelect(song)}
                      className="group relative active:scale-95 transition-transform"
                    >
                      <div className="w-full aspect-square rounded-lg overflow-hidden mb-1.5 relative">
                        <img src={song.cover} alt={song.album} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-background/0 group-hover:bg-background/30 group-active:bg-background/30 transition-colors flex items-center justify-center">
                          <div className="w-9 h-9 rounded-full bg-primary/90 flex items-center justify-center opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity shadow-lg">
                            <Play size={16} className="text-primary-foreground ml-0.5" fill="currentColor" />
                          </div>
                        </div>
                      </div>
                      <p className="text-[11px] font-medium text-foreground truncate text-left">{song.title}</p>
                      <p className="text-[10px] text-muted-foreground truncate text-left">{song.artist}</p>
                    </button>
                  ))}
                </div>
              </section>

              {/* Quick picks row */}
              <section>
                <div className="flex items-center justify-between px-4 mb-3">
                  <h2 className="text-base font-display font-medium text-foreground flex items-center gap-2">
                    <Sparkles size={16} className="text-primary" />
                    Seleção rápida
                  </h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 px-4">
                  {songs.slice(0, 4).map((song) => (
                    <button
                      key={song.id}
                      onClick={() => handleSelect(song)}
                      className={`flex items-center gap-2.5 rounded-lg overflow-hidden transition-all active:scale-[0.98] ${
                        song.id === currentSong.id ? "bg-accent ring-1 ring-primary/30" : "bg-secondary hover:bg-accent"
                      }`}
                    >
                      <img src={song.cover} alt={song.album} className="w-12 h-12 object-cover flex-shrink-0" />
                      <span className="text-xs font-medium text-foreground truncate pr-3">{song.title}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* For you carousel */}
              <section>
                <div className="flex items-center justify-between px-4 mb-3">
                  <h2 className="text-base font-display font-medium text-foreground">Para você</h2>
                  <ChevronRight size={18} className="text-muted-foreground" />
                </div>
                <div className="flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory scrollbar-hide">
                  {songs.slice(0, 6).map((song) => (
                    <button key={song.id} onClick={() => handleSelect(song)} className="flex-shrink-0 w-[140px] group snap-start">
                      <div className="w-full aspect-square rounded-lg overflow-hidden mb-2 relative">
                        <img src={song.cover} alt={song.album} className="w-full h-full object-cover" />
                        <div className="absolute bottom-2 right-2 w-9 h-9 rounded-full bg-primary flex items-center justify-center opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-all shadow-lg">
                          <Play size={16} className="text-primary-foreground ml-0.5" fill="currentColor" />
                        </div>
                      </div>
                      <p className="text-xs font-medium text-foreground truncate text-left">{song.title}</p>
                      <p className="text-[11px] text-muted-foreground truncate text-left">{song.artist}</p>
                    </button>
                  ))}
                </div>
              </section>

              {/* Featured mixes */}
              <section className="px-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-display font-medium text-foreground">Mixes populares</h2>
                  <ChevronRight size={18} className="text-muted-foreground" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { title: "Mix Rock Clássico", subtitle: "Queen, Nirvana, Led Zeppelin", color: "from-red-900/40 to-transparent" },
                    { title: "Mix Pop Hits", subtitle: "Ed Sheeran, Adele, Katy Perry", color: "from-blue-900/40 to-transparent" },
                    { title: "Mix Latino", subtitle: "Luis Fonsi, Shakira, Bad Bunny", color: "from-yellow-900/40 to-transparent" },
                    { title: "Mix Chill", subtitle: "Lo-fi, Ambient, Acoustic", color: "from-green-900/40 to-transparent" },
                  ].map((mix, i) => (
                    <button
                      key={mix.title}
                      onClick={() => handleSelect(songs[i % songs.length])}
                      className="relative rounded-xl overflow-hidden aspect-[4/3] group active:scale-[0.98] transition-transform"
                    >
                      <img src={albumCovers[i]} alt={mix.title} className="w-full h-full object-cover" />
                      <div className={`absolute inset-0 bg-gradient-to-t ${mix.color}`} />
                      <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/30 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <p className="text-sm font-semibold text-foreground text-left">{mix.title}</p>
                        <p className="text-[10px] text-muted-foreground truncate text-left">{mix.subtitle}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              {/* Voting queue */}
              <section className="px-4">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-base font-display font-medium text-foreground">Fila de votação</h2>
                  <span className="text-xs text-primary font-medium">{songs.reduce((a, s) => a + s.votes, 0)} votos</span>
                </div>
                <div>
                  {queueSongs.map((song) => (
                    <SongCard key={song.id} song={song} isActive={song.id === currentSong.id} onSelect={handleSelect} onVote={handleVote} onDownload={handleDownload} showVotes hasVoted={votedSongs.has(song.id)} />
                  ))}
                </div>
              </section>
            </div>
          )}

          {activeTab === "search" && (
            <div className="px-4 space-y-3">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Músicas, artistas, álbuns, podcasts"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  autoFocus
                  className="w-full pl-10 pr-4 py-3 rounded-full bg-secondary border-none text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-muted-foreground/30"
                />
              </div>

              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                {(["all", "songs", "artists", "albums"] as SearchFilter[]).map((f) => (
                  <button key={f} onClick={() => setSearchFilter(f)} className={`chip flex-shrink-0 ${searchFilter === f ? "chip-active" : "chip-inactive"}`}>
                    {f === "all" ? "Tudo" : f === "songs" ? "Músicas" : f === "artists" ? "Artistas" : "Álbuns"}
                  </button>
                ))}
              </div>

              {suggestions.length > 0 && searchQuery.length > 0 && (
                <div className="rounded-lg overflow-hidden bg-card">
                  {suggestions.map((term, i) => (
                    <button key={i} onClick={() => handleSuggestionClick(term)} className="w-full flex items-center gap-3 px-3 py-3 text-sm text-foreground hover:bg-accent active:bg-accent transition-colors text-left">
                      <Search size={14} className="text-muted-foreground flex-shrink-0" />
                      <span className="truncate">{term}</span>
                    </button>
                  ))}
                </div>
              )}

              {isSearching ? (
                <SearchSkeleton />
              ) : searchQuery.length >= 2 ? (
                <div className="space-y-4">
                  {(searchFilter === "all" || searchFilter === "artists") && uniqueArtists.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-2">Artistas</h3>
                      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                        {uniqueArtists.slice(0, 6).map((artist) => {
                          const artistSong = searchResults.find((s) => s.artist === artist);
                          return (
                            <button key={artist} onClick={() => artistSong && handleSelect(artistSong)} className="flex flex-col items-center gap-1.5 flex-shrink-0 active:scale-95 transition-transform">
                              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-secondary ring-2 ring-border">
                                {artistSong && <img src={artistSong.cover} alt={artist} className="w-full h-full object-cover" />}
                              </div>
                              <span className="text-xs text-foreground truncate max-w-[80px]">{artist}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {(searchFilter === "all" || searchFilter === "albums") && uniqueAlbums.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-2">Álbuns</h3>
                      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                        {uniqueAlbums.slice(0, 6).map((raw) => {
                          const [album, artist, cover] = raw.split("|||");
                          return (
                            <button key={raw} onClick={() => { const s = searchResults.find((s) => s.album === album); s && handleSelect(s); }} className="flex-shrink-0 w-[120px] active:scale-95 transition-transform">
                              <div className="w-full aspect-square rounded-lg overflow-hidden mb-1.5">
                                <img src={cover} alt={album} className="w-full h-full object-cover" />
                              </div>
                              <p className="text-xs font-medium text-foreground truncate text-left">{album}</p>
                              <p className="text-[11px] text-muted-foreground truncate text-left">{artist}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {(searchFilter === "all" || searchFilter === "songs") && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-2">Músicas</h3>
                      {searchResults.length > 0 ? (
                        searchResults.map((song) => (
                          <SongCard key={song.id} song={song} isActive={song.id === currentSong.id} onSelect={handleSelect} />
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground py-4">Nenhum resultado</p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Tendências</h3>
                  {songs.slice(0, 5).map((song) => (
                    <SongCard key={song.id} song={song} isActive={song.id === currentSong.id} onSelect={handleSelect} />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "library" && (
            <div className="px-4 space-y-3">
              <h1 className="text-xl font-display font-bold text-foreground">Biblioteca</h1>
              <div className="flex gap-2 mb-2 overflow-x-auto scrollbar-hide">
                <span className="chip chip-active flex-shrink-0">Músicas</span>
                <span className="chip chip-inactive flex-shrink-0">Álbuns</span>
                <span className="chip chip-inactive flex-shrink-0">Artistas</span>
              </div>
              {songs.map((song) => (
                <SongCard key={song.id} song={song} isActive={song.id === currentSong.id} onSelect={handleSelect} onDownload={handleDownload} />
              ))}
            </div>
          )}

          {activeTab === "offline" && (
            <div className="px-4 space-y-3">
              <h1 className="text-xl font-display font-bold text-foreground">Downloads</h1>
              <p className="text-xs text-muted-foreground">{offlineSongs.length} músicas salvas</p>
              {offlineSongs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Music size={48} className="mb-4 opacity-20" />
                  <p className="text-sm">Nenhum download ainda</p>
                  <p className="text-xs mt-1">Toque em ☁️ para salvar offline</p>
                </div>
              ) : (
                offlineSongs.map((song) => (
                  <SongCard key={song.id} song={song} isActive={song.id === currentSong.id} onSelect={handleSelect} />
                ))
              )}
            </div>
          )}

          {activeTab === "profile" && (
            <div className="px-4 space-y-5">
              <div className="flex items-center gap-4 pt-2">
                <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-lg font-bold shadow-glow-red">D</div>
                <div>
                  <h1 className="text-lg font-display font-bold text-foreground">DJ Host</h1>
                  <p className="text-xs text-muted-foreground font-mono">ID: {deviceId.current.substring(0, 16)}...</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Músicas", value: songs.length },
                  { label: "Downloads", value: offlineSongs.length },
                  { label: "Votos", value: songs.reduce((a, s) => a + s.votes, 0) },
                ].map((stat) => (
                  <div key={stat.label} className="bg-secondary rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-foreground">{stat.value}</p>
                    <p className="text-[11px] text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>
              <div className="bg-secondary rounded-lg p-3 space-y-1.5">
                <h3 className="text-xs font-medium text-foreground">Sobre</h3>
                <div className="space-y-1 text-[11px] text-muted-foreground">
                  <p>Player: YouTube IFrame API</p>
                  <p>Storage: IndexedDB + localStorage</p>
                  <p>Fila: Democracy Mode</p>
                  <p>PWA: Standalone</p>
                </div>
              </div>
            </div>
          )}
        </main>

        {!expanded && (
          <MiniPlayer song={currentSong} isPlaying={playerState.isPlaying} currentTime={ct} duration={dur} onTogglePlay={handleTogglePlay} onNext={handleNext} onExpand={() => setExpanded(true)} />
        )}

        <BottomNav active={activeTab} onChange={setActiveTab} />

        {expanded && (
          <NowPlayingView song={currentSong} isPlaying={playerState.isPlaying} currentTime={ct} duration={dur} onTogglePlay={handleTogglePlay} onNext={handleNext} onPrev={handlePrev} onCollapse={() => setExpanded(false)} onSeek={handleSeek} volume={volume} onVolumeChange={setVolumeState} onTogglePiP={togglePiP} onModeChange={setPlayerMode} />
        )}
      </div>
    </>
  );
};

export default Index;
