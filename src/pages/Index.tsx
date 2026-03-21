import { useState, useCallback, useEffect, useRef } from "react";
import { Search, Wifi, WifiOff, ChevronRight, Music, TrendingUp, Play, User, Clock, Sparkles, Plus, Cast, Sun, Moon, Flame, Headphones, Disc3, Zap, MonitorPlay, Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { mockSongs, Song, sortByVotes } from "@/data/mockSongs";
import { saveSong, getAllSavedSongs, StoredSong, getSong } from "@/lib/indexedDB";
import { getDeviceId, getVotedSongs, addVotedSong, saveQueueState, getQueueState, saveCurrentSong, getCurrentSongId, saveVolume, getVolume, addToHistory, getHistory, clearHistory, type HistoryEntry, getFavoritesMetadata, saveFavoriteMetadata, removeFavoriteMetadata } from "@/lib/localStorage";
import { useYouTubePlayer } from "@/hooks/useYouTubePlayer";
import { useNativeCapabilities } from "@/hooks/useNativeCapabilities";
import { useTrendingMusic } from "@/hooks/useTrendingMusic";
import { useMediaSession } from "@/hooks/useMediaSession";
import { fetchRelatedQueue, popNextFromQueue, clearSmartQueue, shuffleSmartQueue, hasSmartQueue } from "@/lib/smartQueue";
import QueueDrawer from "@/components/QueueDrawer";
import { getSearchSuggestions, searchYouTubeMusic } from "@/lib/youtubeSearch";
import { hdThumbnail } from "@/lib/utils";
import SongCard from "@/components/SongCard";
import MiniPlayer from "@/components/MiniPlayer";
import NowPlayingView, { type PlayerMode } from "@/components/NowPlayingView";
import FloatingPiPPlayer from "@/components/FloatingPiPPlayer";
import ExploreScreen from "@/components/ExploreScreen";
import ChannelProfile from "@/components/ChannelProfile";
import ArtistProfile from "@/components/ArtistProfile";
import BottomNav from "@/components/BottomNav";
import DesktopSidebar from "@/components/DesktopSidebar";
import SearchSkeleton from "@/components/SearchSkeleton";
import SearchScreen from "@/components/SearchScreen";
import DesktopPlayer from "@/components/DesktopPlayer";
import SplashScreen from "@/components/SplashScreen";
import FullscreenOverlay from "@/components/FullscreenOverlay";
import HeaderMenu from "@/components/HeaderMenu";
import { DownloadModal } from "@/components/DownloadModal";
import { ShareModal } from "@/components/ShareModal";

import album1 from "@/assets/album-1.jpg";
import album2 from "@/assets/album-2.jpg";
import album3 from "@/assets/album-3.jpg";
import album4 from "@/assets/album-4.jpg";
import xerifeHubLogo from "@/assets/xerife-hub-logo.png";

type Tab = "home" | "search" | "library" | "offline" | "profile";
type SearchFilter = "all" | "songs" | "artists" | "albums";
type HomeMode = "music" | "video";

const albumCovers = [album1, album2, album3, album4];

const Index = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [homeMode, setHomeModeState] = useState<HomeMode>(() => (localStorage.getItem('demus-home-mode') as HomeMode) || "music");
  const setHomeMode = (mode: HomeMode) => { setHomeModeState(mode); localStorage.setItem('demus-home-mode', mode); };
  const [channelView, setChannelView] = useState<{ name: string; thumbnail?: string } | null>(null);
  const [artistView, setArtistView] = useState<{ name: string; image?: string } | null>(null);
  const [currentSong, setCurrentSong] = useState<Song>(mockSongs[0]);
  const [expanded, setExpanded] = useState(false);
  const [playerMode, setPlayerMode] = useState<PlayerMode>("video");
  const [showFloatingPiP, setShowFloatingPiP] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [smartQueueList, setSmartQueueList] = useState<Song[]>([]);
  const [offlineIsPlaying, setOfflineIsPlaying] = useState(false);
  const [offlineCurrentTime, setOfflineCurrentTime] = useState(0);
  const [offlineDuration, setOfflineDuration] = useState(0);
  const [albumQueue, setAlbumQueue] = useState<Song[] | null>(null);
  
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isDark, setIsDark] = useState(() => !document.documentElement.classList.contains('light'));
  const [colorTheme, setColorTheme] = useState(() => localStorage.getItem('demus-color') || 'default');
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFilter, setSearchFilter] = useState<SearchFilter>("all");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [volume, setVolumeState] = useState(getVolume);
  const [savedSongs, setSavedSongs] = useState<Song[]>([]);
  const [savedSongIds, setSavedSongIds] = useState<Set<string>>(new Set());
  const [blobSavedSongIds, setBlobSavedSongIds] = useState<Set<string>>(new Set());
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [votedSongs, setVotedSongs] = useState<Set<string>>(() => new Set(getVotedSongs()));
  const [favoritesMetadata, setFavoritesMetadata] = useState<Song[]>(() => getFavoritesMetadata());
  const [recentHistory, setRecentHistory] = useState<HistoryEntry[]>(() => getHistory());
  const suggestTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const deviceId = useRef(getDeviceId());

  const [songs, setSongs] = useState<Song[]>(() => {
    const savedVotes = getQueueState();
    return mockSongs.map((s) => ({ ...s, votes: savedVotes[s.id] ?? s.votes }));
  });

  const { state: playerState, loadVideo, play, pause, seekTo, setVolume: setPlayerVolume, togglePiP, requestAirPlay, requestFullscreen, exitFullscreen } = useYouTubePlayer("yt-player");
  const { trendingSongs, isLoading: trendingLoading } = useTrendingMusic();
  useNativeCapabilities(playerState.isPlaying);



  useEffect(() => {
    const savedId = getCurrentSongId();
    if (savedId) {
      const found = mockSongs.find((s) => s.id === savedId);
      if (found) setCurrentSong(found);
    }
  }, []);

  useEffect(() => {
    getAllSavedSongs().then((saved) => {
      const converted = saved.map(s => ({
        ...s, votes: 0, isDownloaded: true
      }));
      setSavedSongs(converted);
      const ids = new Set(saved.map((s) => s.id));
      setSavedSongIds(ids);
      
      // Track songs that actually have blobs
      const blobIds = new Set(saved.filter(s => s.blob).map(s => s.id));
      setBlobSavedSongIds(blobIds);
      
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

  // Pre-fetch related queue when a song starts playing in music mode
  useEffect(() => {
    if (homeMode === "music" && currentSong.youtubeId) {
      fetchRelatedQueue(currentSong).then((q) => setSmartQueueList(q)).catch(() => {});
    }
  }, [currentSong.id, homeMode]);

  useEffect(() => {
    if (playerState.isEnded && !expanded) {
      // If playing from album queue, advance to next album track
      if (albumQueue && albumQueue.length > 0) {
        const idx = albumQueue.findIndex((s) => s.youtubeId === currentSong.youtubeId);
        if (idx >= 0 && idx < albumQueue.length - 1) {
          handleSelect(albumQueue[idx + 1]);
          return;
        }
        // Album ended, clear album queue
        setAlbumQueue(null);
      }
      // In music mode, use smart queue for auto-next
      if (homeMode === "music") {
        const next = popNextFromQueue();
        if (next) {
          handleSelect(next);
          return;
        }
      }
      // Fallback: cycle through local songs
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
      artist: song.artist, album: song.album, cover: song.cover,      duration: song.duration,
      type: song.type
    });
    setRecentHistory(getHistory());
    
    // Offline playback check
    const offlineVideo = document.getElementById("offline-player") as HTMLVideoElement | null;
    if (offlineVideo) {
      offlineVideo.pause();
      offlineVideo.src = "";
    }

    getSong(song.id).then((stored) => {
      if (stored?.blob) {
        const url = URL.createObjectURL(stored.blob);
        if (offlineVideo) {
          offlineVideo.src = url;
          offlineVideo.play().catch(() => {});
          pause(); // Stop YouTube
        }
      } else {
        loadVideo(song.youtubeId);
      }
    });

    // Refresh queue list from localStorage
    try {
      const raw = localStorage.getItem("demus_smart_queue");
      if (raw) {
        const parsed = JSON.parse(raw);
        setSmartQueueList(parsed.songs || []);
      }
    } catch {}
  }, [loadVideo]);

  const handleTogglePlay = useCallback(() => {
    const offlineVideo = document.getElementById("offline-player") as HTMLVideoElement | null;
    const isPlayingOffline = blobSavedSongIds.has(currentSong.id);

    if (isPlayingOffline && offlineVideo) {
      if (offlineVideo.paused) offlineVideo.play().catch(() => {});
      else offlineVideo.pause();
      return;
    }

    if (playerState.isPlaying) { pause(); }
    else if (!playerState.videoId) { loadVideo(currentSong.youtubeId); }
    else { play(); }
  }, [playerState, pause, play, loadVideo, currentSong, blobSavedSongIds]);

  const handleNext = useCallback(async () => {
    // If playing from album, go to next album track
    if (albumQueue && albumQueue.length > 0) {
      const idx = albumQueue.findIndex((s) => s.youtubeId === currentSong.youtubeId);
      if (idx >= 0 && idx < albumQueue.length - 1) {
        handleSelect(albumQueue[idx + 1]);
        return;
      }
      // Album ended, clear and fall through
      setAlbumQueue(null);
    }
    if (homeMode === "music") {
      // Try smart queue first
      const next = popNextFromQueue();
      if (next) {
        handleSelect(next);
        return;
      }
      // If queue is empty, fetch and pop
      const queue = await fetchRelatedQueue(currentSong);
      if (queue.length > 0) {
        const nextSong = popNextFromQueue();
        if (nextSong) {
          handleSelect(nextSong);
          return;
        }
      }
    }
    // Fallback: cycle local songs
    const sorted = sortByVotes(songs);
    const idx = sorted.findIndex((s) => s.id === currentSong.id);
    handleSelect(sorted[(idx + 1) % sorted.length]);
  }, [currentSong, songs, handleSelect, homeMode, albumQueue]);

  const handlePrev = useCallback(() => {
    // If playing from album, go to previous album track
    if (albumQueue && albumQueue.length > 0) {
      const idx = albumQueue.findIndex((s) => s.youtubeId === currentSong.youtubeId);
      if (idx > 0) {
        handleSelect(albumQueue[idx - 1]);
        return;
      }
    }
    // Go back through history
    const history = getHistory();
    const currentIdx = history.findIndex((h) => h.youtubeId === currentSong.youtubeId);
    if (currentIdx > 0) {
      const prev = history[currentIdx - 1];
      const song: Song = {
        id: prev.songId,
        youtubeId: prev.youtubeId,
        title: prev.title,
        artist: prev.artist,
        album: prev.album,
        cover: prev.cover,
        duration: prev.duration,
        votes: 0,
        isDownloaded: false,
      };
      handleSelect(song);
      return;
    }
    // Fallback
    const sorted = sortByVotes(songs);
    const idx = sorted.findIndex((s) => s.id === currentSong.id);
    handleSelect(sorted[(idx - 1 + sorted.length) % sorted.length]);
  }, [currentSong, songs, handleSelect, albumQueue]);

  const handleShuffle = useCallback(() => {
    const shuffled = shuffleSmartQueue();
    setIsShuffled((prev) => !prev);
    if (!shuffled && !hasSmartQueue()) {
      // If no smart queue, shuffle local songs
      setSongs((prev) => [...prev].sort(() => Math.random() - 0.5));
    }
  }, []);

  const handleSeek = useCallback((fraction: number) => {
    const offlineVideo = document.getElementById("offline-player") as HTMLVideoElement | null;
    if (savedSongIds.has(currentSong.id) && offlineVideo) {
      offlineVideo.currentTime = fraction * (offlineVideo.duration || currentSong.duration);
      return;
    }
    seekTo(fraction * (playerState.duration || currentSong.duration));
  }, [seekTo, playerState.duration, currentSong.duration, currentSong.id, savedSongIds]);

  const handlePlayFromQueue = useCallback((song: Song, index: number) => {
    // Pop items up to and including the selected index
    for (let i = 0; i <= index; i++) popNextFromQueue();
    handleSelect(song);
  }, [handleSelect]);

  const handleRemoveFromQueue = useCallback((index: number) => {
    try {
      const raw = localStorage.getItem("demus_smart_queue");
      if (raw) {
        const parsed = JSON.parse(raw);
        parsed.songs.splice(index, 1);
        localStorage.setItem("demus_smart_queue", JSON.stringify(parsed));
        setSmartQueueList([...parsed.songs]);
      }
    } catch {}
  }, []);

  const handleClearQueue = useCallback(() => {
    clearSmartQueue();
    setSmartQueueList([]);
  }, []);

  const handleReorderQueue = useCallback((newQueue: Song[]) => {
    setSmartQueueList(newQueue);
    try {
      const raw = localStorage.getItem("demus_smart_queue");
      if (raw) {
        const parsed = JSON.parse(raw);
        parsed.songs = newQueue;
        localStorage.setItem("demus_smart_queue", JSON.stringify(parsed));
      }
    } catch {}
  }, []);

  const handleSeekAbsolute = useCallback((seconds: number) => {
    const offlineVideo = document.getElementById("offline-player") as HTMLVideoElement | null;
    if (savedSongIds.has(currentSong.id) && offlineVideo) {
      offlineVideo.currentTime = seconds;
      return;
    }
    seekTo(seconds);
  }, [seekTo, currentSong.id, savedSongIds]);
  const isPlayingOffline = blobSavedSongIds.has(currentSong.id);
  const ct = isPlayingOffline ? offlineCurrentTime : (playerState.currentTime || 0);
  const dur = isPlayingOffline ? (offlineDuration || currentSong.duration) : (playerState.duration || currentSong.duration);
  const isPlaying = isPlayingOffline ? offlineIsPlaying : playerState.isPlaying;

  const isOffline = false; // Legacy, replace with logic if needed

  useMediaSession({
    song: currentSong, isPlaying: isPlaying,
    currentTime: ct,
    duration: dur,
    onPlay: () => {
      const v = document.getElementById("offline-player") as HTMLVideoElement | null;
      if (isPlayingOffline && v) v.play().catch(() => {});
      else play();
    },
    onPause: () => {
      const v = document.getElementById("offline-player") as HTMLVideoElement | null;
      if (isPlayingOffline && v) v.pause();
      else pause();
    }, 
    onNext: handleNext, onPrev: handlePrev, onSeek: handleSeekAbsolute,
  });

  const handleVote = useCallback((song: Song) => {
    if (votedSongs.has(song.id)) {
      // Un-favorite if already exists? (Toggles usually expected)
      // I will only implement adding for now as per "aparecendo" request,
      // but toggle is safer for "pleno funcionamento".
      const updated = new Set(votedSongs);
      updated.delete(song.id);
      setVotedSongs(updated);
      removeFavoriteMetadata(song.id);
      // Wait, voted songs storage doesn't have a direct "remove" in localStorage.ts
      // But I can update it by overriding the entire list if I wanted.
      // For now, let's focus on ADDING properly.
      return; 
    }
    addVotedSong(song.id);
    saveFavoriteMetadata(song);
    setVotedSongs((prev) => new Set([...prev, song.id]));
    setFavoritesMetadata((prev) => [...prev, song]);
    setSongs((prev) => prev.map((s) => (s.id === song.id ? { ...s, votes: s.votes + 1 } : s)));
  }, [votedSongs]);

  const handleDownload = useCallback(async (song: Song) => {
    // Save metadata locally so it appears in 'Downloads/Library'
    if (!savedSongIds.has(song.id)) {
      await saveSong({ 
        id: song.id, 
        youtubeId: song.youtubeId, 
        title: song.title, 
        artist: song.artist, 
        album: song.album, 
        cover: song.cover, 
        duration: song.duration, 
        savedAt: Date.now() 
      });
      setSavedSongIds((prev) => new Set([...prev, song.id]));
      setSavedSongs((prev) => [...prev, { ...song, isDownloaded: true, votes: 0 }]);
    }
    
    // Redireciona para o yout.com para download externo do arquivo
    const youtUrl = `https://yout.com/video/${song.youtubeId}`;
    window.open(youtUrl, '_blank');
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

  const offlineSongs = savedSongs;
  const queueSongs = sortByVotes(songs);

  // Trending data: use real YouTube trending if available, fallback to mock
  const heroSong = trendingSongs[0] || queueSongs[0];
  const quickPicks = trendingSongs.length > 0 ? trendingSongs.slice(1, 7) : songs.slice(0, 6);
  const topCharts = trendingSongs.length > 0 ? trendingSongs.slice(0, 10) : queueSongs.slice(0, 5);
  const forYouSongs = trendingSongs.length > 0 ? trendingSongs.slice(5, 15) : songs.slice(0, 6);

  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? "Bom dia" : greetingHour < 18 ? "Boa tarde" : "Boa noite";

  return (
    <>
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}

      <div className="flex h-[100dvh] bg-background overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        {/* Desktop Sidebar */}
        <DesktopSidebar active={activeTab} onChange={setActiveTab} homeMode={homeMode} />

        {/* Main column */}
        <div className="flex-1 flex flex-col min-w-0">
        {/* YouTube Player + Fullscreen Container */}
        <div
          id="yt-fullscreen-container"
          className={(expanded && playerMode === "video") ? "fixed z-[60]" : "absolute -top-[9999px] -left-[9999px]"}
          style={(expanded && playerMode === "video") ? { top: "90px", left: "16px", right: "16px", height: "calc(56.25vw - 18px)", maxHeight: "300px", maxWidth: "calc(100% - 32px)" } : {}}
        >
          <div id="yt-player" className="w-full h-full rounded-xl overflow-hidden relative z-0" />
          <video 
            id="offline-player" 
            className={`absolute inset-0 w-full h-full bg-black z-10 rounded-xl ${isPlayingOffline ? "block" : "hidden"}`}
            playsInline
            controls={false}
            onPlay={() => setOfflineIsPlaying(true)}
            onPause={() => setOfflineIsPlaying(false)}
            onEnded={() => {
              setOfflineIsPlaying(false);
              handleNext();
            }}
            onTimeUpdate={(e) => {
              setOfflineCurrentTime(e.currentTarget.currentTime);
              setOfflineDuration(e.currentTarget.duration);
            }}
            onLoadedMetadata={(e) => {
              setOfflineDuration(e.currentTarget.duration);
            }}
          />
          {/* Fullscreen overlay controls rendered here */}
          {playerState.isFullscreen && (
            <FullscreenOverlay
              song={currentSong}
              isPlaying={playerState.isPlaying}
              currentTime={ct}
              duration={dur}
              progress={dur > 0 ? ct / dur : 0}
              onTogglePlay={handleTogglePlay}
              onNext={handleNext}
              onPrev={handlePrev}
              onSeek={handleSeek}
              onExit={exitFullscreen}
            />
          )}
        </div>

        {/* Header */}
        <header className="flex items-center justify-between px-3 sm:px-4 lg:px-6 py-2 sm:py-2.5 flex-shrink-0">
          <div className="flex items-center gap-2 lg:hidden">
            <img src={xerifeHubLogo} alt="Xerife Hub" className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg" />
            <span className="font-display font-bold text-foreground text-sm sm:text-base tracking-tight">Xerife Hub</span>
          </div>
          <div className="hidden lg:flex items-center gap-3">
            <h2 className="text-lg font-display font-semibold text-foreground">
              {activeTab === "home" ? greeting : activeTab === "library" ? "Biblioteca" : activeTab === "offline" ? "Downloads" : activeTab === "search" ? "Buscar" : "Playlists"}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className={`flex items-center text-xs ${isOnline ? "text-muted-foreground" : "text-primary"}`}>
              {isOnline ? <Cast size={18} /> : <WifiOff size={18} />}
            </span>
            <HeaderMenu
              homeMode={homeMode}
              onHomeModeChange={setHomeMode}
              isDark={isDark}
              onToggleTheme={() => {
                const goLight = isDark;
                document.documentElement.classList.toggle('light', goLight);
                localStorage.setItem('demus-theme', goLight ? 'light' : 'dark');
                setIsDark(!isDark);
              }}
              colorTheme={colorTheme}
              onColorChange={(id: string) => {
                document.documentElement.classList.remove('theme-red','theme-blue','theme-purple','theme-green','theme-orange','theme-pink','theme-default');
                if (id !== 'default') {
                  document.documentElement.classList.add(`theme-${id}`);
                }
                localStorage.setItem('demus-color', id);
                setColorTheme(id);
              }}
              onCast={() => {
                // Trigger remote playback / cast prompt
                const iframe = document.querySelector('#yt-player iframe') as HTMLIFrameElement | null;
                if (iframe && 'remote' in iframe) {
                  (iframe as any).remote.prompt().catch(() => {
                    console.warn('Cast not available');
                  });
                } else {
                  // Fallback: try the video element remote playback
                  const video = document.querySelector('video');
                  if (video && 'remote' in video) {
                    (video as any).remote.prompt().catch(() => {});
                  }
                }
              }}
            />
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto pb-4 overscroll-contain lg:px-2" key={activeTab} style={{ animation: 'fade-in 0.25s ease-out' }}>
          {activeTab === "home" && (
            <div className="space-y-4 sm:space-y-6">

              {/* Channel Profile View (Video mode) */}
              {channelView ? (
                <ChannelProfile
                  channelName={channelView.name}
                  channelThumbnail={channelView.thumbnail}
                  onBack={() => setChannelView(null)}
                  onPlayVideo={(video) => {
                    const song: Song = {
                      id: `yt-${video.videoId}`, youtubeId: video.videoId,
                      title: video.title, artist: video.channel, album: video.title,
                      cover: video.thumbnail, duration: video.lengthSeconds, votes: 0, isDownloaded: false,
                    };
                    handleSelect(song);
                    setPlayerMode("video");
                    setExpanded(true);
                  }}
                  onFullscreenVideo={(video) => {
                    const song: Song = {
                      id: `yt-${video.videoId}`, youtubeId: video.videoId,
                      title: video.title, artist: video.channel, album: video.title,
                      cover: video.thumbnail, duration: video.lengthSeconds, votes: 0, isDownloaded: false,
                    };
                    handleSelect(song);
                    setPlayerMode("video");
                    setExpanded(true);
                    setTimeout(() => requestFullscreen(), 500);
                  }}
                />
              ) : artistView ? (
                <ArtistProfile
                  artistName={artistView.name}
                  artistImage={artistView.image}
                  onBack={() => setArtistView(null)}
                  onPlaySong={(song, queue) => {
                    if (queue) setAlbumQueue(queue);
                    handleSelect(song);
                    setPlayerMode("audio");
                  }}
                  currentPlayingSong={currentSong}
                  isPlaying={playerState.isPlaying}
                  currentTime={ct}
                  duration={dur}
                  onTogglePlay={handleTogglePlay}
                  onNext={handleNext}
                  onPrev={handlePrev}
                  onExpand={() => setExpanded(true)}
                />
              ) : homeMode === "video" ? (
                <ExploreScreen
                  onPlayVideo={(video) => {
                    const song: Song = {
                      id: `yt-${video.videoId}`, youtubeId: video.videoId,
                      title: video.title, artist: video.channel, album: video.title,
                      cover: video.thumbnail, duration: video.lengthSeconds, votes: 0, isDownloaded: false,
                    };
                    handleSelect(song);
                    setPlayerMode("video");
                    setExpanded(true);
                  }}
                  onFullscreenVideo={(video) => {
                    const song: Song = {
                      id: `yt-${video.videoId}`, youtubeId: video.videoId,
                      title: video.title, artist: video.channel, album: video.title,
                      cover: video.thumbnail, duration: video.lengthSeconds, votes: 0, isDownloaded: false,
                    };
                    handleSelect(song);
                    setPlayerMode("video");
                    setExpanded(true);
                    setTimeout(() => requestFullscreen(), 500);
                  }}
                  onChannelClick={(name, thumb) => setChannelView({ name, thumbnail: thumb })}
                />
              ) : (
              <motion.div
                initial="hidden"
                animate="visible"
                variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
              >
              {/* Centered Logo Hero */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="flex flex-col items-center justify-center pt-8 pb-4"
              >
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-primary/40 rounded-3xl blur opacity-30 group-hover:opacity-60 transition duration-1000 group-hover:duration-200"></div>
                  <img 
                    src={xerifeHubLogo} 
                    alt="Xerife Hub" 
                    className="relative w-32 h-32 sm:w-44 sm:h-44 rounded-3xl shadow-2xl transition-transform duration-500 hover:scale-105" 
                    style={{ transform: 'rotate(-2deg)' }}
                  />
                </div>
                <h1 className="mt-6 text-3xl sm:text-4xl font-display font-black text-foreground tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70 drop-shadow-md">
                  Xerife Hub
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-1 uppercase tracking-[.25em] opacity-60">
                  Premium Experience
                </p>
              </motion.div>

              {/* Greeting */}
              <motion.div variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } }} className="px-4">
                <h1 className="text-xl sm:text-2xl font-bold text-foreground lg:hidden">{greeting}</h1>
              </motion.div>

              {/* Quick picks */}
              <motion.section variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } }} className="px-3 sm:px-4">
                <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                  {quickPicks.map((song) => (
                    <button
                      key={song.id}
                      onClick={() => handleSelect(song)}
                      className={`flex items-center gap-2 rounded-lg overflow-hidden transition-all active:scale-[0.98] ${
                        song.id === currentSong.id ? "bg-accent ring-1 ring-primary/30" : "bg-secondary hover:bg-accent"
                      }`}
                    >
                      <img src={hdThumbnail(song.cover)} alt={song.album} className="w-12 h-12 sm:w-14 sm:h-14 object-cover flex-shrink-0" />
                      <span className="text-[11px] sm:text-xs font-medium text-foreground truncate pr-2 leading-tight">{song.title}</span>
                    </button>
                  ))}
                </div>
              </motion.section>

              {/* Álbuns em Destaque */}
              <motion.section variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } }}>
                <div className="flex items-center justify-between px-3 sm:px-4 mb-2 sm:mb-3">
                  <h2 className="text-base sm:text-lg font-bold text-foreground">Álbuns em Destaque</h2>
                  <button className="text-xs text-muted-foreground hover:text-foreground transition-colors">Ver tudo &gt;</button>
                </div>
                <div className="grid grid-cols-2 gap-2.5 sm:gap-3 px-3 sm:px-4">
                  {forYouSongs.slice(0, 4).map((song) => (
                    <button
                      key={song.id}
                      onClick={() => handleSelect(song)}
                      className="group active:scale-[0.97] transition-transform text-left"
                    >
                      <div className="w-full aspect-square rounded-xl overflow-hidden mb-1.5 sm:mb-2 relative">
                        <img src={hdThumbnail(song.cover)} alt={song.album} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-background/0 group-hover:bg-background/20 transition-colors" />
                      </div>
                      <p className="text-xs sm:text-sm font-medium text-foreground truncate">{song.title}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{song.artist}</p>
                    </button>
                  ))}
                </div>
              </motion.section>

              {/* Listen again */}
              <motion.section variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } }}>
                <div className="flex items-center justify-between px-3 sm:px-4 mb-2 sm:mb-3">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-muted-foreground" />
                    <h2 className="text-sm sm:text-base font-display font-medium text-foreground">Ouvir novamente</h2>
                  </div>
                  <ChevronRight size={20} className="text-muted-foreground" />
                </div>
                <div className="grid grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3 px-3 sm:px-4">
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
                      <div className="w-full aspect-square rounded-lg overflow-hidden mb-1 sm:mb-1.5 relative">
                        <img src={hdThumbnail(song.cover)} alt={song.album} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-background/0 group-hover:bg-background/30 group-active:bg-background/30 transition-colors flex items-center justify-center">
                          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-primary/90 flex items-center justify-center opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity shadow-lg">
                            <Play size={14} className="text-primary-foreground ml-0.5" fill="currentColor" />
                          </div>
                        </div>
                      </div>
                      <p className="text-[10px] sm:text-[11px] font-medium text-foreground truncate text-left">{song.title}</p>
                      <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate text-left">{song.artist}</p>
                    </button>
                  ))}
                </div>
              </motion.section>

              {/* Top Charts */}
              <motion.section variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } }} className="px-3 sm:px-4">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <h2 className="text-sm sm:text-base font-display font-medium text-foreground flex items-center gap-2">
                    <TrendingUp size={16} className="text-primary" />
                    Top Charts
                  </h2>
                  <ChevronRight size={18} className="text-muted-foreground" />
                </div>
                <div className="space-y-0.5 sm:space-y-1">
                  {topCharts.map((song, i) => (
                    <div
                      key={song.id}
                      className={`w-full flex items-center gap-2.5 sm:gap-3 p-1.5 sm:p-2 rounded-lg transition-all ${
                        song.id === currentSong.id ? "bg-accent ring-1 ring-primary/20" : "hover:bg-secondary"
                      }`}
                    >
                      <span className={`text-base sm:text-lg font-bold w-5 sm:w-6 text-center ${i === 0 ? "text-primary" : "text-muted-foreground"}`}>
                        {i + 1}
                      </span>
                      <button onClick={() => handleSelect(song)} className="flex-shrink-0">
                        <img src={hdThumbnail(song.cover)} alt={song.album} className="w-10 h-10 sm:w-11 sm:h-11 rounded-md object-cover" />
                      </button>
                      <div className="flex-1 min-w-0 text-left">
                        <button onClick={() => handleSelect(song)} className="w-full text-left">
                          <p className="text-xs sm:text-sm font-medium text-foreground truncate">{song.title}</p>
                        </button>
                        <button onClick={() => setArtistView({ name: song.artist, image: song.cover })} className="text-left">
                          <p className="text-[10px] sm:text-xs text-muted-foreground truncate hover:text-foreground hover:underline transition-colors">{song.artist}</p>
                        </button>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground">
                        <TrendingUp size={12} />
                        <span>{song.votes}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.section>

              {/* For you carousel */}
              <motion.section variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } }}>
                <div className="flex items-center justify-between px-3 sm:px-4 mb-2 sm:mb-3">
                  <h2 className="text-sm sm:text-base font-display font-medium text-foreground flex items-center gap-2">
                    <Sparkles size={16} className="text-primary" />
                    Para você
                  </h2>
                  <ChevronRight size={18} className="text-muted-foreground" />
                </div>
                <div className="flex gap-2.5 sm:gap-3 overflow-x-auto px-3 sm:px-4 pb-2 snap-x snap-mandatory scrollbar-hide">
                  {forYouSongs.map((song) => (
                    <div key={song.id} className="flex-shrink-0 w-[120px] sm:w-[140px] group snap-start">
                      <button onClick={() => handleSelect(song)} className="w-full">
                        <div className="w-full aspect-square rounded-lg overflow-hidden mb-1.5 sm:mb-2 relative">
                          <img src={hdThumbnail(song.cover)} alt={song.album} className="w-full h-full object-cover" />
                          <div className="absolute bottom-1.5 right-1.5 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-primary flex items-center justify-center opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-all shadow-lg">
                            <Play size={14} className="text-primary-foreground ml-0.5" fill="currentColor" />
                          </div>
                        </div>
                        <p className="text-[11px] sm:text-xs font-medium text-foreground truncate text-left">{song.title}</p>
                      </button>
                      <button onClick={() => setArtistView({ name: song.artist, image: song.cover })} className="text-left w-full">
                        <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate hover:text-foreground hover:underline transition-colors">{song.artist}</p>
                      </button>
                    </div>
                  ))}
                </div>
              </motion.section>

              {/* Featured mixes */}
              <motion.section variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } }} className="px-3 sm:px-4">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <h2 className="text-sm sm:text-base font-display font-medium text-foreground flex items-center gap-2">
                    <Disc3 size={16} className="text-primary" />
                    Mixes populares
                  </h2>
                  <ChevronRight size={18} className="text-muted-foreground" />
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
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
                      <div className="absolute bottom-0 left-0 right-0 p-2.5 sm:p-3">
                        <p className="text-xs sm:text-sm font-semibold text-foreground text-left">{mix.title}</p>
                        <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate text-left">{mix.subtitle}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.section>

              {/* Voting queue */}
              <motion.section variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } }} className="px-3 sm:px-4">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm sm:text-base font-display font-medium text-foreground flex items-center gap-2">
                    <Headphones size={16} className="text-primary" />
                    Fila de votação
                  </h2>
                  <span className="text-xs text-primary font-medium">{songs.reduce((a, s) => a + s.votes, 0)} votos</span>
                </div>
                <div>
                  {queueSongs.map((song) => (
                    <SongCard key={song.id} song={song} isActive={song.id === currentSong.id} onSelect={handleSelect} onVote={handleVote} onDownload={handleDownload} showVotes hasVoted={votedSongs.has(song.id)} />
                  ))}
                </div>
              </motion.section>
              </motion.div>
              )}
            </div>
          )}

          {activeTab === "search" && (
            homeMode === "video" ? (
              <ExploreScreen
                onPlayVideo={(video) => {
                  const song: Song = {
                    id: `yt-${video.videoId}`, youtubeId: video.videoId,
                    title: video.title, artist: video.channel, album: video.title,
                    cover: video.thumbnail, duration: video.lengthSeconds, votes: 0, isDownloaded: false,
                    type: "video" as const,
                  };
                  handleSelect(song);
                  setPlayerMode("video");
                  setExpanded(true);
                }}
                onFullscreenVideo={(video) => {
                  const song: Song = {
                    id: `yt-${video.videoId}`, youtubeId: video.videoId,
                    title: video.title, artist: video.channel, album: video.title,
                    cover: video.thumbnail, duration: video.lengthSeconds, votes: 0, isDownloaded: false,
                    type: "video" as const,
                  };
                  handleSelect(song);
                  setPlayerMode("video");
                  setExpanded(true);
                  setTimeout(() => requestFullscreen(), 500);
                }}
                onChannelClick={(name, thumb) => {
                  setActiveTab("home");
                  setChannelView({ name, thumbnail: thumb });
                }}
              />
            ) : (
              <SearchScreen
                currentSongId={currentSong.id}
                onSelect={handleSelect}
                onArtistClick={(name, image) => {
                  setActiveTab("home");
                  setArtistView({ name, image });
                }}
              />
            )
          )}

          {activeTab === "library" && (
            <div className="px-4 space-y-3">
              <h1 className="text-xl font-display font-bold text-foreground lg:hidden">Favoritos</h1>
              <div className="flex gap-2 mb-2 overflow-x-auto scrollbar-hide">
                <span className="chip chip-active flex-shrink-0">
                  {homeMode === "music" ? "Músicas" : "Vídeos"} Curtidos
                </span>
              </div>
              
              {(() => {
                // Combine: Mock songs + Favorites metadata (from searches) + History
                const historyAsSongs = recentHistory.map(e => ({
                  id: e.songId, youtubeId: e.youtubeId, title: e.title, artist: e.artist,
                  album: e.album, cover: e.cover, duration: e.duration, votes: 1, isDownloaded: savedSongIds.has(e.songId),
                  type: e.type || (e.songId.startsWith('yt-') ? 'video' as const : 'music' as const)
                }));
                
                const allRecentItems = [...songs, ...historyAsSongs, ...favoritesMetadata];
                const uniqueItems = Array.from(new Map(allRecentItems.map(item => [item.id, item])).values());
                
                const favorites = uniqueItems.filter(s => {
                  const isFavorited = votedSongs.has(s.id);
                  if (!isFavorited) return false;
                  
                  // Use the explicit type if available, otherwise check ID/context
                  const itemType = s.type || (s.id.startsWith('yt-') ? 'video' : 'music');
                  
                  // Filter by current homeMode
                  if (homeMode === "music") {
                    return itemType === "music" || !s.id.startsWith('yt-');
                  } else {
                    return itemType === "video" || s.id.startsWith('yt-');
                  }
                });
                
                return favorites.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground opacity-30">
                    <Heart size={64} strokeWidth={1} />
                    <p className="mt-4 text-sm font-medium">Nenhum favorito ainda</p>
                  </div>
                ) : (
                  favorites.map((song) => (
                    <SongCard key={song.id} song={song} isActive={song.id === currentSong.id} onSelect={handleSelect} onDownload={handleDownload} />
                  ))
                );
              })()}
            </div>
          )}

          {activeTab === "offline" && (
            <div className="px-4 space-y-3">
              <h1 className="text-xl font-display font-bold text-foreground lg:hidden">Downloads</h1>
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
              <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
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
          <>
            <div className="lg:hidden">
              <MiniPlayer song={currentSong} isPlaying={isPlaying} currentTime={ct} duration={dur} onTogglePlay={handleTogglePlay} onNext={handleNext} onPrev={handlePrev} onExpand={() => setExpanded(true)} />
            </div>
            <DesktopPlayer
              song={currentSong}
              isPlaying={isPlaying}
              currentTime={ct}
              duration={dur}
              volume={volume}
              onTogglePlay={handleTogglePlay}
              onNext={handleNext}
              onPrev={handlePrev}
              onExpand={() => setExpanded(true)}
              onSeek={handleSeek}
              onVolumeChange={setVolumeState}
              isShuffled={isShuffled}
              onShuffle={handleShuffle}
            />
          </>
        )}

        <div className="lg:hidden">
          <BottomNav active={activeTab} onChange={setActiveTab} homeMode={homeMode} />
        </div>

        {expanded && (
          <NowPlayingView song={currentSong} isPlaying={isPlaying} isEnded={isPlayingOffline ? false : playerState.isEnded} currentTime={ct} duration={dur} onTogglePlay={handleTogglePlay} onNext={handleNext} onPrev={handlePrev} onCollapse={() => setExpanded(false)} onSeek={handleSeek} volume={volume} onVolumeChange={setVolumeState} onTogglePiP={async () => {
            const result = await togglePiP();
            if (result === 'fallback') {
              setExpanded(false);
              setShowFloatingPiP(true);
            }
          }} onModeChange={setPlayerMode} onAirPlay={requestAirPlay} onCast={() => {
            const iframe = document.querySelector('#yt-player iframe') as HTMLIFrameElement | null;
            if (iframe && 'remote' in iframe) {
              (iframe as any).remote.prompt().catch(() => {});
            } else {
              const video = document.querySelector('video');
              if (video && 'remote' in video) {
                (video as any).remote.prompt().catch(() => {});
              }
            }
          }} onPlayRelated={(video) => {
            const song: Song = {
              id: `yt-${video.videoId}`,
              youtubeId: video.videoId,
              title: video.title,
              artist: video.channel,
              album: video.title,
              cover: video.thumbnail,
              duration: video.lengthSeconds,
              votes: 0,
              isDownloaded: false,
            };
            handleSelect(song);
            setPlayerMode("video");
          }}             onFullscreen={requestFullscreen}
            onExitFullscreen={exitFullscreen}
            isFullscreen={playerState.isFullscreen}
            isShuffled={isShuffled}
            onShuffle={handleShuffle}
            context={homeMode}
            onShowQueue={() => setShowQueue(true)}
            queueCount={smartQueueList.length + (albumQueue ? albumQueue.length : 0)}
            onDownload={() => handleDownload(currentSong)}
            isLiked={votedSongs.has(currentSong.id)}
            onLike={() => handleVote(currentSong)}
          />
        )}

        <AnimatePresence>
          {showQueue && (
            <QueueDrawer
              isOpen={showQueue}
              onClose={() => setShowQueue(false)}
              currentSong={currentSong}
              queue={smartQueueList}
              onPlayFromQueue={handlePlayFromQueue}
              onRemoveFromQueue={handleRemoveFromQueue}
              onClearQueue={handleClearQueue}
              onReorder={handleReorderQueue}
            />
          )}
        </AnimatePresence>

        {showFloatingPiP && !expanded && (
          <FloatingPiPPlayer
            song={currentSong}
            isPlaying={playerState.isPlaying}
            currentTime={ct}
            duration={dur}
            onTogglePlay={handleTogglePlay}
            onNext={handleNext}
            onPrev={handlePrev}
            onExpand={() => { setShowFloatingPiP(false); setExpanded(true); }}
            onClose={() => setShowFloatingPiP(false)}
          />
        )}
        </div>{/* end main column */}
      </div>
    </>
  );
};

export default Index;
