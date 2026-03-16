import { useState, useEffect } from "react";
import { ArrowLeft, Loader2, Play, Shuffle, Music2, Disc3, UserCircle } from "lucide-react";
import { hdThumbnail } from "@/lib/utils";
import { searchYouTubeMusic } from "@/lib/youtubeSearch";
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

  const popularSongs = songs.slice(0, 5);
  const discography = songs.slice(5);

  const handleShuffleAll = () => {
    if (songs.length === 0) return;
    const random = songs[Math.floor(Math.random() * songs.length)];
    onPlaySong(random);
  };

  return (
    <div className="space-y-5 pb-8">
      {/* Header with back button */}
      <div className="px-4 flex items-center gap-3">
        <button onClick={onBack} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center hover:bg-accent transition-colors">
          <ArrowLeft size={18} className="text-foreground" />
        </button>
        <span className="text-sm font-medium text-foreground">Artista</span>
      </div>

      {/* Artist banner */}
      <div className="px-4">
        <div className="relative rounded-2xl overflow-hidden bg-secondary/50 p-6 flex flex-col items-center gap-4 text-center">
          {/* Decorative gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />

          {artistImage ? (
             <img
               src={hdThumbnail(artistImage)}
              alt={artistName}
              className="w-24 h-24 rounded-full object-cover ring-4 ring-primary/30 shadow-xl relative z-10"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center ring-4 ring-primary/30 relative z-10">
              <UserCircle size={48} className="text-primary" />
            </div>
          )}

          <div className="relative z-10">
            <h2 className="text-xl font-display font-bold text-foreground">{artistName}</h2>
            <p className="text-xs text-muted-foreground mt-1">
              {songs.length > 0 ? `${songs.length} músicas encontradas` : "Carregando..."}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 relative z-10">
            <button
              onClick={() => popularSongs[0] && onPlaySong(popularSongs[0])}
              disabled={songs.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-bold active:scale-95 transition-transform disabled:opacity-50"
            >
              <Play size={16} fill="currentColor" className="ml-0.5" />
              Ouvir
            </button>
            <button
              onClick={handleShuffleAll}
              disabled={songs.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-secondary text-foreground text-sm font-medium active:scale-95 transition-transform disabled:opacity-50 border border-border"
            >
              <Shuffle size={16} />
              Aleatório
            </button>
          </div>
        </div>
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
            <section className="px-4">
              <h3 className="text-sm font-display font-semibold text-foreground flex items-center gap-2 mb-3">
                <Music2 size={14} className="text-primary" />
                Músicas populares
              </h3>
              <div className="space-y-1">
                {popularSongs.map((song, i) => (
                  <button
                    key={song.id}
                    onClick={() => onPlaySong(song)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent active:bg-accent transition-colors"
                  >
                    <span className="text-sm font-bold w-5 text-center text-muted-foreground">{i + 1}</span>
                    <img src={song.cover} alt={song.album} className="w-11 h-11 rounded-md object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium text-foreground truncate">{song.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <Play size={14} className="text-primary ml-0.5" fill="currentColor" />
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Discography */}
          {discography.length > 0 && (
            <section className="px-4">
              <h3 className="text-sm font-display font-semibold text-foreground flex items-center gap-2 mb-3">
                <Disc3 size={14} className="text-primary" />
                Discografia
              </h3>
              <div className="grid grid-cols-3 lg:grid-cols-4 gap-3">
                {discography.map((song) => (
                  <button
                    key={song.id}
                    onClick={() => onPlaySong(song)}
                    className="group active:scale-95 transition-transform"
                  >
                    <div className="w-full aspect-square rounded-lg overflow-hidden mb-1.5 relative">
                      <img src={song.cover} alt={song.album} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-background/0 group-hover:bg-background/30 transition-colors flex items-center justify-center">
                        <div className="w-9 h-9 rounded-full bg-primary/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                          <Play size={16} className="text-primary-foreground ml-0.5" fill="currentColor" />
                        </div>
                      </div>
                    </div>
                    <p className="text-[11px] font-medium text-foreground truncate text-left">{song.title}</p>
                    <p className="text-[10px] text-muted-foreground truncate text-left">{song.album}</p>
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
