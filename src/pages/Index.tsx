import { useState, useCallback, useEffect, useRef } from "react";
import { Search, Wifi, WifiOff, ChevronRight, Music, TrendingUp, Play, User, Clock, Sparkles, Plus, Cast, Sun, Moon, Flame, Headphones, Disc3, Zap, MonitorPlay, Heart, ListMusic } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { mockSongs, Song, sortByVotes } from "@/data/mockSongs";
import { saveSong, getAllSavedSongs, StoredSong, getSong } from "@/lib/indexedDB";
import { getDeviceId, getVotedSongs, addVotedSong, removeVotedSong, saveQueueState, getQueueState, saveCurrentSong, getCurrentSongId, saveVolume, getVolume, addToHistory, getHistory, clearHistory, type HistoryEntry, getFavoritesMetadata, saveFavoriteMetadata, removeFavoriteMetadata, getPlaylists, savePlaylist, deletePlaylist, addSongToPlaylist, Playlist } from "@/lib/localStorage";
import { useYouTubePlayer } from "@/hooks/useYouTubePlayer";
import { useNativeCapabilities } from "@/hooks/useNativeCapabilities";
import { useTrendingMusic } from "@/hooks/useTrendingMusic";
import { useMediaSession } from "@/hooks/useMediaSession";
import { fetchRelatedQueue, popNextFromQueue, clearSmartQueue, shuffleSmartQueue, hasSmartQueue } from "@/lib/smartQueue";
import QueueDrawer from "@/components/QueueDrawer";
import { getSearchSuggestions, searchYouTubeMusic } from "@/lib/youtubeSearch";
import { hdThumbnail } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
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
import { PlaylistModal } from "@/components/PlaylistModal";
import AIChat from "@/components/AIChat";

import album1 from "@/assets/album-1.jpg";
import album2 from "@/assets/album-2.jpg";
import album3 from "@/assets/album-3.jpg";
import album4 from "@/assets/album-4.jpg";
import xerifeHubLogo from "@/assets/xerife-hub-logo.png";

type Tab = "home" | "search" | "library" | "offline" | "profile" | "history" | "playlists";
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
  const [playlists, setPlaylists] = useState<Playlist[]>(() => getPlaylists());
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [songToAddToPlaylist, setSongToAddToPlaylist] = useState<Song | null>(null);
  const [playlistModalMode, setPlaylistModalMode] = useState<"manage" | "add">("manage");
  const [appZoom, setAppZoom] = useState(() => parseFloat(localStorage.getItem('xerife-zoom') || '1'));
  const [miniPlayerVisible, setMiniPlayerVisible] = useState(true);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
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
    // Apply zoom to document root for global scaling
    (document.documentElement.style as any).zoom = appZoom.toString();
    localStorage.setItem('xerife-zoom', appZoom.toString());
  }, [appZoom]);

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

  // Auth logic
  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsLoadingUser(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsLoadingUser(false);
      
      if (_event === 'SIGNED_IN') {
        setIsSyncing(true);
        setTimeout(() => setIsSyncing(false), 2000); // Simulate data sync loading
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

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
    setMiniPlayerVisible(true); // Reexibe o mini player ao trocar de música
    
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
      // Un-favorite
      removeVotedSong(song.id);
      removeFavoriteMetadata(song.id);
      setVotedSongs((prev) => {
        const next = new Set(prev);
        next.delete(song.id);
        return next;
      });
      setFavoritesMetadata((prev) => prev.filter(f => f.id !== song.id));
      setSongs((prev) => prev.map((s) => (s.id === song.id ? { ...s, votes: Math.max(0, s.votes - 1) } : s)));
    } else {
      // Favorite
      addVotedSong(song.id);
      saveFavoriteMetadata(song);
      setVotedSongs((prev) => new Set([...prev, song.id]));
      setFavoritesMetadata((prev) => [...prev, song]);
      setSongs((prev) => prev.map((s) => (s.id === song.id ? { ...s, votes: s.votes + 1 } : s)));
    }
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
      
      {/* Syncing Overlay */}
      <AnimatePresence>
        {isSyncing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-background/80 backdrop-blur-md flex flex-col items-center justify-center text-center px-6"
          >
            <div className="relative mb-6">
              <div className="w-20 h-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="text-primary animate-pulse" size={32} />
              </div>
            </div>
            <h2 className="text-2xl font-display font-bold text-foreground mb-2">Sincronizando Xerife Hub</h2>
            <p className="text-sm text-muted-foreground max-w-xs">Puxando seus históricos, playlists e preferências para a melhor experiência personalizada.</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex h-[100dvh] bg-background overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        {/* Desktop Sidebar */}
        <DesktopSidebar
          active={activeTab}
          onChange={(tab) => {
            if (tab === "home" && activeTab === "home") {
              setChannelView(null);
              setArtistView(null);
            }
            setActiveTab(tab);
          }}
          homeMode={homeMode}
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
          onHomeModeChange={setHomeMode}
          onCast={() => {
            const iframe = document.querySelector('#yt-player iframe') as HTMLIFrameElement | null;
            if (iframe && 'remote' in iframe) {
              (iframe as any).remote.prompt().catch(() => {});
            } else {
              const video = document.querySelector('video');
              if (video && 'remote' in video) {
                (video as any).remote.prompt().catch(() => {});
              }
            }
          }}
          onOpenHistory={() => setActiveTab("history")}
          onOpenPlaylists={() => setActiveTab("playlists")}
          onOpenChat={() => setIsAIChatOpen(true)}
          onLogin={handleLogin}
          onLogout={handleLogout}
          user={user}
          isLoadingUser={isLoadingUser}
          currentZoom={appZoom}
        />

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
            {/* Mobile-only: Tools button (replaces 3-dots submenu) */}
            <div className="md:hidden">
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
                  const iframe = document.querySelector('#yt-player iframe') as HTMLIFrameElement | null;
                  if (iframe && 'remote' in iframe) {
                    (iframe as any).remote.prompt().catch(() => {
                      console.warn('Cast not available');
                    });
                  } else {
                    const video = document.querySelector('video');
                    if (video && 'remote' in video) {
                      (video as any).remote.prompt().catch(() => {});
                    }
                  }
                }}
                onOpenHistory={() => setActiveTab("history")}
                onOpenPlaylists={() => setActiveTab("playlists")}
                onOpenChat={() => setIsAIChatOpen(true)}
                onLogin={handleLogin}
                onLogout={handleLogout}
                user={user}
                isLoadingUser={isLoadingUser}
                currentZoom={appZoom}
              />
            </div>
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
                  {/* Centered Logo Hero with 3D visible angle */}
                  <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="flex flex-col items-center justify-center pt-2 sm:pt-4 pb-2 sm:pb-4 px-4 text-center overflow-hidden"
                  >
                    <div className="relative group [perspective:1000px]">
                      <motion.div 
                        initial={{ rotateY: 30, rotateX: 10 }}
                        animate={{ rotateY: 15, rotateX: 5 }}
                        whileHover={{ rotateY: 0, rotateX: 0, scale: 1.05 }}
                        transition={{ duration: 0.8 }}
                        className="relative z-10"
                      >
                        <img 
                          src={xerifeHubLogo} 
                          alt="Xerife Hub" 
                          className="w-48 h-48 sm:w-64 sm:h-64 lg:w-72 lg:h-72 drop-shadow-[0_25px_50px_rgba(0,0,0,0.5)] rounded-3xl"
                        />
                      </motion.div>
                      <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full scale-150 opacity-20 animate-pulse pointer-events-none" />
                    </div>
                    <div className="relative z-10">
                      <h1 className="text-4xl sm:text-6xl lg:text-7xl font-display font-black tracking-tighter text-foreground italic">
                        XERIFE <span className="text-primary drop-shadow-[0_0_15px_hsl(var(--primary)/0.5)]">HUB</span>
                      </h1>
                      <p className="text-sm sm:text-lg text-muted-foreground font-medium tracking-[0.4em] uppercase opacity-60">Premium Experience</p>
                    </div>
                  </motion.div>

                  {/* Greeting (Mobile only now as desktop has its own) */}
                  <motion.div variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } }} className="px-4 lg:hidden">
                    <h1 className="text-xl sm:text-2xl font-bold text-foreground">{greeting}</h1>
                  </motion.div>

                  {/* Quick picks */}
                  <motion.section variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } }} className="px-3 sm:px-4">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
                      {quickPicks.map((song) => (
                        <button
                          key={song.id}
                          onClick={() => handleSelect(song)}
                          className={`flex items-center gap-2.5 sm:gap-3 rounded-2xl overflow-hidden transition-all active:scale-[0.98] p-1 ${
                            song.id === currentSong.id ? "bg-primary/10 ring-1 ring-primary/30" : "bg-card hover:bg-accent/40 shadow-sm"
                          }`}
                        >
                          <img src={hdThumbnail(song.cover)} alt={song.album} className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl object-cover flex-shrink-0" />
                          <span className="text-xs sm:text-sm font-bold text-foreground truncate pr-2 leading-tight text-left">{song.title}</span>
                        </button>
                      ))}
                    </div>
                  </motion.section>

                  {/* Featured Albums */}
                  <motion.section variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } }}>
                    <div className="flex items-center justify-between px-3 sm:px-4 mb-3 sm:mb-4">
                      <h2 className="text-base sm:text-xl font-black text-foreground uppercase tracking-widest italic">Destaques</h2>
                      <button className="text-xs font-bold text-primary hover:underline">VER MAIS</button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-5 px-3 sm:px-4">
                      {forYouSongs.slice(0, 5).map((song) => (
                        <button
                          key={song.id}
                          onClick={() => handleSelect(song)}
                          className="group active:scale-[0.97] transition-transform text-left"
                        >
                          <div className="w-full aspect-square rounded-2xl overflow-hidden mb-2 relative shadow-lg">
                            <img src={hdThumbnail(song.cover)} alt={song.album} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-700" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                               <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center text-white scale-75 group-hover:scale-100 transition-transform">
                                  <Play size={24} fill="currentColor" className="ml-1" />
                               </div>
                            </div>
                          </div>
                          <p className="text-sm font-bold text-foreground truncate">{song.title}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{song.artist}</p>
                        </button>
                      ))}
                    </div>
                  </motion.section>

                  {/* Listen again */}
                  <motion.section variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } }}>
                    <div className="flex items-center justify-between px-3 sm:px-4 mb-3 sm:mb-4 pt-4 border-t border-white/5">
                      <div className="flex items-center gap-2">
                        <Clock size={18} className="text-primary" />
                        <h2 className="text-base sm:text-lg font-black text-foreground italic">Ouvir novamente</h2>
                      </div>
                      <ChevronRight size={20} className="text-muted-foreground" />
                    </div>
                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 sm:gap-4 px-3 sm:px-4">
                      {(recentHistory.length > 0
                        ? recentHistory.slice(0, 8).map(e => ({
                            id: e.songId, youtubeId: e.youtubeId, title: e.title, artist: e.artist,
                            album: e.album, cover: e.cover, duration: e.duration, votes: 0, isDownloaded: false,
                          }))
                        : songs.slice(0, 8)
                      ).map((song) => (
                        <button
                          key={song.id}
                          onClick={() => handleSelect(song)}
                          className="group relative active:scale-95 transition-transform"
                        >
                          <div className="w-full aspect-square rounded-2xl overflow-hidden mb-2 relative shadow-md">
                            <img src={hdThumbnail(song.cover)} alt={song.album} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                              <div className="w-10 h-10 rounded-full bg-primary/95 flex items-center justify-center opacity-0 group-hover:opacity-100 shadow-2xl">
                                <Play size={18} className="text-white ml-0.5" fill="currentColor" />
                              </div>
                            </div>
                          </div>
                          <p className="text-xs font-bold text-foreground truncate text-left">{song.title}</p>
                          <p className="text-[10px] text-muted-foreground truncate text-left">{song.artist}</p>
                        </button>
                      ))}
                    </div>
                  </motion.section>

                  {/* Top Charts */}
                  <motion.section variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } }} className="px-3 sm:px-4 pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-base sm:text-lg font-black text-foreground flex items-center gap-2 italic">
                        <TrendingUp size={20} className="text-primary" />
                        Top Charts
                      </h2>
                      <ChevronRight size={18} className="text-muted-foreground" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                      {topCharts.map((song, i) => (
                        <div
                          key={song.id}
                          className={`w-full flex items-center gap-4 p-2 sm:p-3 rounded-2xl transition-all ${
                            song.id === currentSong.id ? "bg-primary/10 ring-1 ring-primary/20" : "hover:bg-secondary/60"
                          }`}
                        >
                          <span className={`text-base sm:text-2xl font-black w-8 text-center ${i < 3 ? "text-primary italic" : "text-muted-foreground/30"}`}>
                            {i + 1}
                          </span>
                          <button onClick={() => handleSelect(song)} className="flex-shrink-0 relative group">
                            <img src={hdThumbnail(song.cover)} alt={song.album} className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl object-cover shadow-lg" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 rounded-xl flex items-center justify-center">
                               <Play size={20} className="text-white opacity-0 group-hover:opacity-100 fill-white" />
                            </div>
                          </button>
                          <div className="flex-1 min-w-0 text-left">
                            <button onClick={() => handleSelect(song)} className="w-full text-left">
                              <p className="text-sm sm:text-base font-bold text-foreground truncate leading-tight">{song.title}</p>
                            </button>
                            <button onClick={() => setArtistView({ name: song.artist, image: song.cover })} className="text-left">
                              <p className="text-[11px] sm:text-xs text-muted-foreground truncate hover:text-primary mt-1">{song.artist}</p>
                            </button>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs font-black italic text-primary bg-primary/5 px-2 py-1 rounded-lg">
                            <Flame size={14} />
                            <span>{song.votes}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.section>

                  {/* For you carousel */}
                  <motion.section variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } }} className="pt-6">
                    <div className="flex items-center justify-between px-3 sm:px-4 mb-4">
                      <h2 className="text-base sm:text-lg font-black text-foreground flex items-center gap-2 italic uppercase tracking-tighter">
                        <Sparkles size={18} className="text-primary animate-pulse" />
                        Recomendados para você
                      </h2>
                    </div>
                    <div className="flex gap-4 sm:gap-6 overflow-x-auto px-3 sm:px-4 pb-4 snap-x snap-mandatory scrollbar-hide">
                      {forYouSongs.map((song) => (
                        <div key={song.id} className="flex-shrink-0 w-[140px] sm:w-[180px] md:w-[220px] lg:w-[260px] group snap-start">
                          <button onClick={() => handleSelect(song)} className="w-full text-left">
                            <div className="w-full aspect-square rounded-[32px] overflow-hidden mb-3 relative shadow-2xl-glow">
                              <img src={hdThumbnail(song.cover)} alt={song.album} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                              <div className="absolute inset-0 bg-gradient-to-tr from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                              <div className="absolute bottom-4 right-4 w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 shadow-2xl scale-75 group-hover:scale-100 transition-all">
                                <Play size={24} className="ml-1" fill="currentColor" />
                              </div>
                            </div>
                            <p className="text-sm sm:text-base font-black text-foreground truncate mt-1">{song.title}</p>
                          </button>
                          <button onClick={() => setArtistView({ name: song.artist, image: song.cover })} className="text-left w-full">
                            <p className="text-[11px] sm:text-xs text-muted-foreground truncate hover:text-primary transition-colors">{song.artist}</p>
                          </button>
                        </div>
                      ))}
                    </div>
                  </motion.section>

                  {/* Featured mixes */}
                  <motion.section variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } }} className="px-3 sm:px-4 pt-4">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-base sm:text-lg font-black italic text-foreground flex items-center gap-2">
                        <Disc3 size={20} className="text-primary" />
                        Sua Vibe
                      </h2>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { title: "Rock Clássico", subtitle: "Queen, Led Zeppelin", color: "from-red-600/20" },
                        { title: "Pop Hits", subtitle: "Ed Sheeran, Adele", color: "from-blue-600/20" },
                        { title: "Mix Latino", subtitle: "Shakira, Bad Bunny", color: "from-orange-600/20" },
                        { title: "Chill & Relax", subtitle: "Lofi Beats, Acoustic", color: "from-emerald-600/20" },
                      ].map((mix, i) => (
                        <button
                          key={mix.title}
                          onClick={() => handleSelect(songs[i % songs.length])}
                          className="relative rounded-[28px] overflow-hidden aspect-[4/3] group active:scale-[0.98] transition-transform shadow-xl"
                        >
                          <img src={albumCovers[i]} alt={mix.title} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                          <div className={`absolute inset-0 bg-gradient-to-tr ${mix.color} to-transparent`} />
                          <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
                          <div className="absolute bottom-0 left-0 right-0 p-4">
                            <p className="text-xs sm:text-base font-black text-white text-left italic tracking-tighter">{mix.title}</p>
                            <p className="text-[9px] sm:text-[11px] text-white/70 font-medium truncate text-left">{mix.subtitle}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.section>

                  {/* Voting queue */}
                  <motion.section variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } }} className="px-3 sm:px-4 py-8">
                    <div className="flex items-center justify-between mb-4 bg-secondary/30 p-4 rounded-2xl border border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-lg">
                           <Headphones size={20} />
                        </div>
                        <div>
                           <h2 className="text-base sm:text-lg font-black text-foreground italic">Comunidade</h2>
                           <p className="text-[10px] sm:text-xs text-muted-foreground uppercase font-bold tracking-widest">{songs.reduce((a, s) => a + s.votes, 0)} Votos Ativos</p>
                        </div>
                      </div>
                      <Plus className="text-muted-foreground" size={24} />
                    </div>
                    <div className="space-y-1">
                      {queueSongs.map((song) => (
                        <SongCard key={song.id} song={song} isActive={song.id === currentSong.id} onSelect={handleSelect} onVote={handleVote} onDownload={handleDownload} onAddToPlaylist={(s) => { setSongToAddToPlaylist(s); setPlaylistModalMode("add"); setShowPlaylistModal(true); }} showVotes hasVoted={votedSongs.has(song.id)} />
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
                onAddToPlaylist={(v) => {
                  const song: Song = {
                    id: `yt-${v.videoId}`, youtubeId: v.videoId,
                    title: v.title, artist: v.channel, album: v.title,
                    cover: v.thumbnail, duration: v.lengthSeconds || 0, votes: 0, isDownloaded: false,
                    type: "video" as const,
                  };
                  setSongToAddToPlaylist(song);
                  setPlaylistModalMode("add");
                  setShowPlaylistModal(true);
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
                onAddToPlaylist={(s) => {
                  setSongToAddToPlaylist(s);
                  setPlaylistModalMode("add");
                  setShowPlaylistModal(true);
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
                    <SongCard key={song.id} song={song} isActive={song.id === currentSong.id} onSelect={handleSelect} onDownload={handleDownload} onAddToPlaylist={(s) => { setSongToAddToPlaylist(s); setPlaylistModalMode("add"); setShowPlaylistModal(true); }} />
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
                  <SongCard key={song.id} song={song} isActive={song.id === currentSong.id} onSelect={handleSelect} onAddToPlaylist={(s) => { setSongToAddToPlaylist(s); setPlaylistModalMode("add"); setShowPlaylistModal(true); }} />
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

          {activeTab === "history" && (
            <div className="px-4 space-y-4 pb-24">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-display font-bold text-foreground">Histórico</h1>
                <button 
                  onClick={() => { if(confirm("Limpar histórico?")) { clearHistory(); setRecentHistory([]); } }}
                  className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-full bg-secondary"
                >
                  Limpar Tudo
                </button>
              </div>
              
              {recentHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-20">
                  <Clock size={64} />
                  <p className="mt-4 text-sm font-medium">Histórico vazio</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {recentHistory.map((item) => {
                    const song: Song = {
                      id: item.songId, youtubeId: item.youtubeId, title: item.title, artist: item.artist,
                      album: item.album, cover: item.cover, duration: item.duration, votes: 0, isDownloaded: savedSongIds.has(item.songId),
                      type: item.type as any || (item.songId.startsWith('yt-') ? 'video' : 'music')
                    };
                    return (
                      <SongCard 
                        key={`${item.songId}-${item.playedAt}`} 
                        song={song} 
                        isActive={song.id === currentSong.id} 
                        onSelect={handleSelect} 
                        onDownload={handleDownload}
                        onAddToPlaylist={(s) => { setSongToAddToPlaylist(s); setPlaylistModalMode("add"); setShowPlaylistModal(true); }}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "playlists" && (
            <div className="px-4 space-y-4 pb-24">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-display font-bold text-foreground">Minhas Playlists</h1>
                <button 
                  onClick={() => { setPlaylistModalMode("manage"); setShowPlaylistModal(true); }}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-full font-bold text-xs"
                >
                  <Plus size={14} /> Criar Playlist
                </button>
              </div>

              {playlists.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-20">
                  <ListMusic size={64} />
                  <p className="mt-4 text-sm font-medium">Nenhuma playlist personalizada</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {playlists.map(playlist => (
                    <button 
                      key={playlist.id}
                      onClick={() => { 
                         // Logic to play playlist songs
                         if (playlist.songs.length > 0) {
                           handleSelect(playlist.songs[0]);
                           setAlbumQueue(playlist.songs.slice(1));
                         }
                      }}
                      className="flex items-center gap-4 p-4 bg-secondary/40 hover:bg-secondary rounded-2xl transition-all text-left group"
                    >
                      <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                        <ListMusic size={32} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-foreground truncate">{playlist.name}</p>
                        <p className="text-xs text-muted-foreground">{playlist.songs.length} itens</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>

        {!expanded && (
          <>
            <div className="md:hidden">
              {miniPlayerVisible && (
                <MiniPlayer
                  song={currentSong}
                  isPlaying={isPlaying}
                  currentTime={ct}
                  duration={dur}
                  onTogglePlay={handleTogglePlay}
                  onNext={handleNext}
                  onPrev={handlePrev}
                  onExpand={() => setExpanded(true)}
                  onDismiss={() => setMiniPlayerVisible(false)}
                />
              )}
            </div>
            <div className="hidden md:block">
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
            </div>
          </>
        )}

        <div className="md:hidden">
          <BottomNav
            active={activeTab}
            onChange={(tab) => {
              if (tab === "home" && activeTab === "home") {
                setChannelView(null);
                setArtistView(null);
              }
              setActiveTab(tab);
            }}
            homeMode={homeMode}
          />
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
            onArtistClick={(artist) => setArtistView(artist)}
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

        <PlaylistModal 
           isOpen={showPlaylistModal}
           onClose={() => setShowPlaylistModal(false)}
           playlists={playlists}
           onUpdate={() => setPlaylists(getPlaylists())}
           mode={playlistModalMode}
           songToAdd={songToAddToPlaylist}
           onSongAdded={() => {
             setShowPlaylistModal(false);
             setSongToAddToPlaylist(null);
           }}
         />
        </div>{/* end main column */}

        <AIChat 
          isOpen={isAIChatOpen} 
          onClose={() => setIsAIChatOpen(false)} 
          onPlaySong={handleSelect} 
        />
      </div>
    </>
  );
};

export default Index;
