import { useState, useEffect } from "react";
import { ArrowLeft, Loader2, Play, MoreHorizontal, Users } from "lucide-react";
import BlurImage from "@/components/BlurImage";
import { hdThumbnail } from "@/lib/utils";
import { searchYouTubeMusic } from "@/lib/youtubeSearch";
import { formatDuration } from "@/data/mockSongs";
import type { Song } from "@/data/mockSongs";

interface ArtistProfileProps {
  artistName: string;
  artistImage?: string;
  onBack: () => void;
  onPlaySong: (song: Song) => void;
}

const ArtistProfile = ({ artistName, artistImage, onBack, onPlaySong }: ArtistProfileProps) => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    searchYouTubeMusic(artistName, "songs").then((res) => {
      setSongs(res);
      setLoading(false);
    });
  }, [artistName]);

  const popularSongs = songs.slice(0, 10);

  return (
    <div className="pb-8">
      {/* Hero banner with artist image */}
      <div className="relative w-full aspect-[3/2] overflow-hidden">
        {artistImage ? (
          <img
            src={hdThumbnail(artistImage)}
            alt={artistName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-secondary" />
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-3" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}>
          <button onClick={onBack} className="flex items-center gap-1.5 text-foreground/90 hover:text-foreground transition-colors">
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">Voltar</span>
          </button>
          <button className="w-8 h-8 rounded-full bg-background/30 backdrop-blur-sm flex items-center justify-center">
            <MoreHorizontal size={18} className="text-foreground/90" />
          </button>
        </div>

        {/* Artist info overlay */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-5">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-1">Artista</p>
          <h1 className="text-2xl font-bold text-foreground">{artistName}</h1>
          <div className="flex items-center gap-1.5 mt-1">
            <Users size={12} className="text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              {songs.length > 0 ? `${(Math.random() * 5 + 0.5).toFixed(1)}M fãs` : "Carregando..."}
            </p>
          </div>
        </div>
      </div>

      {/* Play button */}
      <div className="px-4 -mt-2 relative z-10">
        <button
          onClick={() => popularSongs[0] && onPlaySong(popularSongs[0])}
          disabled={songs.length === 0}
          className="flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground text-sm font-bold active:scale-95 transition-transform disabled:opacity-50"
        >
          <Play size={18} fill="currentColor" className="ml-0.5" />
          Reproduzir
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 size={24} className="text-primary animate-spin" />
          <p className="text-xs text-muted-foreground">Carregando músicas de {artistName}...</p>
        </div>
      ) : (
        <>
          {/* Popular songs */}
          {popularSongs.length > 0 && (
            <section className="px-4 mt-6">
              <h3 className="text-base font-bold text-foreground mb-4">
                Músicas Populares
              </h3>
              <div className="space-y-0.5">
                {popularSongs.map((song, i) => (
                  <button
                    key={song.id}
                    onClick={() => onPlaySong(song)}
                    className="w-full flex items-center gap-3 py-3 hover:bg-accent/50 active:bg-accent rounded-lg transition-colors px-1"
                  >
                    <span className="text-sm font-medium w-5 text-center text-muted-foreground">{i + 1}</span>
                    <BlurImage src={hdThumbnail(song.cover)} alt={song.album} className="w-12 h-12 rounded-md flex-shrink-0" />
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium text-foreground truncate">{song.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono flex-shrink-0">
                      {song.duration > 0 ? formatDuration(song.duration) : ""}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
};

export default ArtistProfile;
