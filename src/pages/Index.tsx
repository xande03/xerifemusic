import { useState, useCallback, useEffect, useRef } from "react";
import { Search, Wifi, WifiOff, ChevronRight, Music, TrendingUp } from "lucide-react";
import { mockSongs, Song, sortByVotes } from "@/data/mockSongs";
import { saveSong, getAllSavedSongs, StoredSong } from "@/lib/indexedDB";
import { useYouTubePlayer } from "@/hooks/useYouTubePlayer";
import { getSearchSuggestions } from "@/lib/youtubeSearch";
import {
  getDeviceId, getVotedSongs, addVotedSong, hasVotedForSong,
  saveQueueState, getQueueState, saveCurrentSong, getCurrentSongId,
  saveVolume, getVolume,
} from "@/lib/localStorage";
import SongCard from "@/components/SongCard";
import MiniPlayer from "@/components/MiniPlayer";
import NowPlayingView from "@/components/NowPlayingView";
import BottomNav from "@/components/BottomNav";
import SearchSkeleton from "@/components/SearchSkeleton";
import album1 from "@/assets/album-1.jpg";
import album2 from "@/assets/album-2.jpg";
import album3 from "@/assets/album-3.jpg";

type Tab = "home" | "search" | "library" | "offline" | "profile";

const Index = () => {
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [currentSong, setCurrentSong] = useState<Song>(mockSongs[0]);
  const [expanded, setExpanded] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [volume, setVolumeState] = useState(getVolume);
  const [savedSongIds, setSavedSongIds] = useState<Set<string>>(new Set());
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [votedSongs, setVotedSongs] = useState<Set<string>>(() => new Set(getVotedSongs()));
  const suggestTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const deviceId = useRef(getDeviceId());

  // Initialize songs with saved vote counts from localStorage
  const [songs, setSongs] = useState<Song[]>(() => {
    const savedVotes = getQueueState();
    return mockSongs.map((s) => ({
      ...s,
      votes: savedVotes[s.id] ?? s.votes,
    }));
  });

  // YouTube Player
  const { state: playerState, loadVideo, play, pause, seekTo, setVolume: setPlayerVolume } = useYouTubePlayer("yt-player");

  // Restore current song from localStorage
  useEffect(() => {
    const savedId = getCurrentSongId();
    if (savedId) {
      const found = mockSongs.find((s) => s.id === savedId);
      if (found) setCurrentSong(found);
    }
  }, []);

  // Load saved songs from IndexedDB
  useEffect(() => {
    getAllSavedSongs().then((saved) => {
      const ids = new Set(saved.map((s) => s.id));
      setSavedSongIds(ids);
      setSongs((prev) => prev.map((s) => ({ ...s, isDownloaded: ids.has(s.id) })));
    });
  }, []);

  // Online/Offline detection
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // Sync volume to player and localStorage
  useEffect(() => {
    setPlayerVolume(volume);
    saveVolume(volume);
  }, [volume, setPlayerVolume]);

  // Save queue state to localStorage when votes change
  useEffect(() => {
    const votes: Record<string, number> = {};
    songs.forEach((s) => { votes[s.id] = s.votes; });
    saveQueueState(votes);
  }, [songs]);

  // Auto-play next song when current ends
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

  const handleSelect = useCallback(
    (song: Song) => {
      setCurrentSong(song);
      loadVideo(song.youtubeId);
    },
    [loadVideo]
  );

  const handleTogglePlay = useCallback(() => {
    if (playerState.isPlaying) {
      pause();
    } else {
      if (!playerState.videoId) {
        loadVideo(currentSong.youtubeId);
      } else {
        play();
      }
    }
  }, [playerState, pause, play, loadVideo, currentSong]);

  const handleNext = useCallback(() => {
    const sorted = sortByVotes(songs);
    const idx = sorted.findIndex((s) => s.id === currentSong.id);
    const next = sorted[(idx + 1) % sorted.length];
    handleSelect(next);
  }, [currentSong, songs, handleSelect]);

  const handlePrev = useCallback(() => {
    const sorted = sortByVotes(songs);
    const idx = sorted.findIndex((s) => s.id === currentSong.id);
    const prev = sorted[(idx - 1 + sorted.length) % sorted.length];
    handleSelect(prev);
  }, [currentSong, songs, handleSelect]);

  const handleSeek = useCallback(
    (fraction: number) => {
      const dur = playerState.duration || currentSong.duration;
      seekTo(fraction * dur);
    },
    [seekTo, playerState.duration, currentSong.duration]
  );

  const handleVote = useCallback((song: Song) => {
    if (votedSongs.has(song.id)) return; // Single vote per song
    setVotedSongs((prev) => new Set([...prev, song.id]));
    setSongs((prev) =>
      prev.map((s) => (s.id === song.id ? { ...s, votes: s.votes + 1 } : s))
    );
  }, [votedSongs]);

  const handleDownload = useCallback(
    async (song: Song) => {
      if (savedSongIds.has(song.id)) return;
      const stored: StoredSong = {
        id: song.id,
        youtubeId: song.youtubeId,
        title: song.title,
        artist: song.artist,
        album: song.album,
        cover: song.cover,
        duration: song.duration,
        savedAt: Date.now(),
      };
      await saveSong(stored);
      setSavedSongIds((prev) => new Set([...prev, song.id]));
      setSongs((prev) =>
        prev.map((s) => (s.id === song.id ? { ...s, isDownloaded: true } : s))
      );
    },
    [savedSongIds]
  );

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (q.length > 0) {
      setIsSearching(true);
      setTimeout(() => setIsSearching(false), 600);
      
      // Debounced search suggestions
      if (suggestTimeoutRef.current) clearTimeout(suggestTimeoutRef.current);
      suggestTimeoutRef.current = setTimeout(async () => {
        const results = await getSearchSuggestions(q);
        setSuggestions(results);
      }, 300);
    } else {
      setSuggestions([]);
    }
  };

  const handleSuggestionClick = (term: string) => {
    setSearchQuery(term);
    setSuggestions([]);
    setIsSearching(true);
    setTimeout(() => setIsSearching(false), 600);
  };

  const filteredSongs = searchQuery
    ? songs.filter(
        (s) =>
          s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.artist.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : songs;

  const offlineSongs = songs.filter((s) => s.isDownloaded);
  const queueSongs = sortByVotes(songs);

  const featuredAlbums = [
    { title: "Whenever You Need", artist: "Rick Astley", cover: album1 },
    { title: "A Night at the Opera", artist: "Queen", cover: album2 },
    { title: "Nevermind", artist: "Nirvana", cover: album3 },
  ];

  const ct = playerState.currentTime || 0;
  const dur = playerState.duration || currentSong.duration;

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* YouTube Player - visible when expanded, hidden otherwise */}
      <div
        className={`${expanded ? "fixed inset-0 z-[60] pointer-events-none" : "absolute -top-[9999px] -left-[9999px]"}`}
        style={expanded ? { top: "46px", left: "24px", right: "24px", height: "calc(56.25vw - 27px)", maxHeight: "360px", maxWidth: "calc(100% - 48px)", pointerEvents: "auto", zIndex: 60 } : {}}
      >
        <div id="yt-player" className="w-full h-full rounded-2xl overflow-hidden" />
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Music size={16} className="text-primary" />
          <span className="font-bold text-primary text-sm">DEMUS</span>
        </div>
        <button
          onClick={() => setIsOnline((o) => !o)}
          className={`flex items-center gap-1 ${isOnline ? "text-primary" : "text-secondary"}`}
        >
          {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
          {isOnline ? "Online" : "Offline"}
        </button>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-36">
        {activeTab === "home" && (
          <div className="px-4 space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Boa noite 🎵</h1>
              <p className="text-sm text-muted-foreground">
                Vote na próxima música! Fila ordenada por votos.
              </p>
            </div>

            {/* Featured */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-foreground">Em destaque</h2>
                <ChevronRight size={18} className="text-muted-foreground" />
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
                {featuredAlbums.map((album, i) => (
                  <div key={i} className="flex-shrink-0 w-36">
                    <div className="w-36 h-36 rounded-xl overflow-hidden mb-2">
                      <img src={album.cover} alt={album.title} className="w-full h-full object-cover" />
                    </div>
                    <p className="text-sm font-medium text-foreground truncate">{album.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{album.artist}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Queue sorted by votes */}
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-1">
                Fila de Votação 🗳️
              </h2>
              <p className="text-xs text-muted-foreground mb-3">
                Toque no 👍 para votar. A mais votada toca em seguida!
              </p>
              <div className="space-y-1">
                {queueSongs.map((song, index) => (
                  <SongCard
                    key={song.id}
                    song={song}
                    isActive={song.id === currentSong.id}
                    onSelect={handleSelect}
                    onVote={handleVote}
                    onDownload={handleDownload}
                    showVotes
                    hasVoted={votedSongs.has(song.id)}
                  />
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === "search" && (
          <div className="px-4 space-y-4">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar músicas, artistas..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-muted border-none text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* Search Suggestions (YouTube Autocomplete) */}
            {suggestions.length > 0 && (
              <div className="glass rounded-xl overflow-hidden">
                <p className="px-3 pt-2 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Sugestões do YouTube
                </p>
                {suggestions.map((term, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestionClick(term)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors text-left"
                  >
                    <TrendingUp size={14} className="text-primary flex-shrink-0" />
                    <span className="truncate">{term}</span>
                  </button>
                ))}
              </div>
            )}

            {isSearching ? (
              <SearchSkeleton />
            ) : (
              <div className="space-y-1">
                {filteredSongs.map((song) => (
                  <SongCard
                    key={song.id}
                    song={song}
                    isActive={song.id === currentSong.id}
                    onSelect={handleSelect}
                    onVote={handleVote}
                    showVotes
                  />
                ))}
                {filteredSongs.length === 0 && searchQuery && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Nenhuma música local encontrada</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Busca no catálogo YouTube requer Lovable Cloud
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "library" && (
          <div className="px-4 space-y-4">
            <h1 className="text-2xl font-bold text-foreground">Sua Biblioteca</h1>
            <div className="space-y-1">
              {songs.map((song) => (
                <SongCard
                  key={song.id}
                  song={song}
                  isActive={song.id === currentSong.id}
                  onSelect={handleSelect}
                  onDownload={handleDownload}
                />
              ))}
            </div>
          </div>
        )}

        {activeTab === "offline" && (
          <div className="px-4 space-y-4">
            <h1 className="text-2xl font-bold text-foreground">Músicas Offline</h1>
            <p className="text-sm text-muted-foreground">
              {offlineSongs.length} músicas salvas via IndexedDB
            </p>
            {offlineSongs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Music size={48} className="mb-4 opacity-30" />
                <p>Nenhuma música salva ainda</p>
                <p className="text-xs mt-1">Toque no ícone ☁️ para salvar offline</p>
              </div>
            ) : (
              <div className="space-y-1">
                {offlineSongs.map((song) => (
                  <SongCard
                    key={song.id}
                    song={song}
                    isActive={song.id === currentSong.id}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "profile" && (
          <div className="px-4 space-y-6">
            <div className="flex items-center gap-4 pt-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-primary-foreground text-xl font-bold">
                D
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">DJ Host</h1>
                <p className="text-sm text-muted-foreground">Modo: Jukebox Social</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Músicas", value: songs.length },
                { label: "Offline", value: offlineSongs.length },
                { label: "Votos", value: songs.reduce((a, s) => a + s.votes, 0) },
              ].map((stat) => (
                <div key={stat.label} className="glass rounded-xl p-4 text-center">
                  <p className="text-xl font-bold text-primary">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Architecture info */}
            <div className="glass rounded-xl p-4 space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Engenharia</h3>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>▸ Player: YouTube IFrame API</p>
                <p>▸ Storage: IndexedDB (metadados offline)</p>
                <p>▸ Fila: Democracy Mode (votos)</p>
                <p>▸ PWA: Manifest + Standalone</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Mini player */}
      {!expanded && (
        <MiniPlayer
          song={currentSong}
          isPlaying={playerState.isPlaying}
          currentTime={ct}
          duration={dur}
          onTogglePlay={handleTogglePlay}
          onNext={handleNext}
          onExpand={() => setExpanded(true)}
        />
      )}

      {/* Bottom nav */}
      <BottomNav active={activeTab} onChange={setActiveTab} />

      {/* Full player */}
      {expanded && (
        <NowPlayingView
          song={currentSong}
          isPlaying={playerState.isPlaying}
          currentTime={ct}
          duration={dur}
          onTogglePlay={handleTogglePlay}
          onNext={handleNext}
          onPrev={handlePrev}
          onCollapse={() => setExpanded(false)}
          onSeek={handleSeek}
          volume={volume}
          onVolumeChange={setVolume}
        />
      )}
    </div>
  );
};

export default Index;
