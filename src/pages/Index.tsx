import { useState, useEffect, useCallback } from "react";
import { Search, Wifi, WifiOff, ChevronRight } from "lucide-react";
import { mockSongs, Song } from "@/data/mockSongs";
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Simulate progress
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setProgress(p => (p >= 1 ? 0 : p + 0.005));
    }, 100);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleSelect = useCallback((song: Song) => {
    setCurrentSong(song);
    setIsPlaying(true);
    setProgress(0);
  }, []);

  const handleNext = useCallback(() => {
    const idx = mockSongs.findIndex(s => s.id === currentSong.id);
    const next = mockSongs[(idx + 1) % mockSongs.length];
    handleSelect(next);
  }, [currentSong, handleSelect]);

  const handlePrev = useCallback(() => {
    const idx = mockSongs.findIndex(s => s.id === currentSong.id);
    const prev = mockSongs[(idx - 1 + mockSongs.length) % mockSongs.length];
    handleSelect(prev);
  }, [currentSong, handleSelect]);

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (q.length > 0) {
      setIsSearching(true);
      setTimeout(() => setIsSearching(false), 800);
    }
  };

  const filteredSongs = searchQuery
    ? mockSongs.filter(s =>
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.artist.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : mockSongs;

  const offlineSongs = mockSongs.filter(s => s.isDownloaded);

  const featuredAlbums = [
    { title: "Electric Dreams", artist: "Synthwave Collective", cover: album1 },
    { title: "Night Cruise", artist: "RetroCity", cover: album2 },
    { title: "Abyssal", artist: "Oceanic", cover: album3 },
  ];

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-2 text-xs text-muted-foreground">
        <span className="font-bold text-primary text-sm">DEMUS</span>
        <button
          onClick={() => setIsOnline(o => !o)}
          className={`flex items-center gap-1 ${isOnline ? "text-primary" : "text-secondary"}`}
        >
          {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
          {isOnline ? "Online" : "Offline"}
        </button>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-32">
        {activeTab === "home" && (
          <div className="px-4 space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Boa noite 🎵</h1>
              <p className="text-sm text-muted-foreground">O que você quer ouvir?</p>
            </div>

            {/* Featured */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-foreground">Em destaque</h2>
                <ChevronRight size={18} className="text-muted-foreground" />
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                {featuredAlbums.map((album, i) => (
                  <div key={i} className="flex-shrink-0 w-36">
                    <div className="w-36 h-36 rounded-xl overflow-hidden mb-2 shadow-glow-cyan/20">
                      <img src={album.cover} alt={album.title} className="w-full h-full object-cover" />
                    </div>
                    <p className="text-sm font-medium text-foreground truncate">{album.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{album.artist}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Queue */}
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">Fila de reprodução</h2>
              <div className="space-y-1">
                {mockSongs.slice(0, 5).map(song => (
                  <SongCard
                    key={song.id}
                    song={song}
                    isActive={song.id === currentSong.id}
                    onSelect={handleSelect}
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
                onChange={e => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-muted border-none text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            {isSearching ? (
              <SearchSkeleton />
            ) : (
              <div className="space-y-1">
                {filteredSongs.map(song => (
                  <SongCard
                    key={song.id}
                    song={song}
                    isActive={song.id === currentSong.id}
                    onSelect={handleSelect}
                  />
                ))}
                {filteredSongs.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">Nenhuma música encontrada</p>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "library" && (
          <div className="px-4 space-y-4">
            <h1 className="text-2xl font-bold text-foreground">Sua Biblioteca</h1>
            <div className="space-y-1">
              {mockSongs.map(song => (
                <SongCard
                  key={song.id}
                  song={song}
                  isActive={song.id === currentSong.id}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          </div>
        )}

        {activeTab === "offline" && (
          <div className="px-4 space-y-4">
            <h1 className="text-2xl font-bold text-foreground">Músicas Offline</h1>
            <p className="text-sm text-muted-foreground">
              {offlineSongs.length} músicas salvas no dispositivo
            </p>
            <div className="space-y-1">
              {offlineSongs.map(song => (
                <SongCard
                  key={song.id}
                  song={song}
                  isActive={song.id === currentSong.id}
                  onSelect={handleSelect}
                />
              ))}
            </div>
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
                { label: "Músicas", value: mockSongs.length },
                { label: "Offline", value: offlineSongs.length },
                { label: "Votos", value: mockSongs.reduce((a, s) => a + s.votes, 0) },
              ].map(stat => (
                <div key={stat.label} className="glass rounded-xl p-4 text-center">
                  <p className="text-xl font-bold text-primary">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Mini player */}
      {!expanded && (
        <MiniPlayer
          song={currentSong}
          isPlaying={isPlaying}
          progress={progress}
          onTogglePlay={() => setIsPlaying(p => !p)}
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
          isPlaying={isPlaying}
          progress={progress}
          onTogglePlay={() => setIsPlaying(p => !p)}
          onNext={handleNext}
          onPrev={handlePrev}
          onCollapse={() => setExpanded(false)}
        />
      )}
    </div>
  );
};

export default Index;
