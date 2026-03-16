import { Download, DownloadCloud, Play, ThumbsUp, Check } from "lucide-react";
import { Song, formatDuration } from "@/data/mockSongs";
import { motion } from "framer-motion";

interface SongCardProps {
  song: Song;
  isActive: boolean;
  onSelect: (song: Song) => void;
  onVote?: (song: Song) => void;
  onDownload?: (song: Song) => void;
  showVotes?: boolean;
  hasVoted?: boolean;
}

const SongCard = ({ song, isActive, onSelect, onVote, onDownload, showVotes = false, hasVoted = false }: SongCardProps) => (
  <motion.div
    layout
    transition={{ type: "spring", stiffness: 350, damping: 30 }}
    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors group ${
      isActive ? "glass shadow-glow-cyan" : "hover:bg-muted/50"
    }`}
  >
    <button onClick={() => onSelect(song)} className="relative w-12 h-12 rounded-md overflow-hidden flex-shrink-0">
      <img src={song.cover} alt={song.album} className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-background/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <Play size={16} className="text-primary" />
      </div>
    </button>
    <button onClick={() => onSelect(song)} className="flex-1 text-left min-w-0">
      <p className={`text-sm font-medium truncate ${isActive ? "text-primary" : "text-foreground"}`}>
        {song.title}
      </p>
      <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
    </button>
    <div className="flex items-center gap-2 flex-shrink-0">
      {showVotes && onVote && (
        <button
          onClick={() => onVote(song)}
          disabled={hasVoted}
          className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors ${
            hasVoted
              ? "bg-primary/20 text-primary cursor-default"
              : "bg-muted hover:bg-primary/20 hover:text-primary"
          }`}
        >
          {hasVoted ? <Check size={12} /> : <ThumbsUp size={12} />}
          <span className="font-mono">{song.votes}</span>
        </button>
      )}
      {onDownload && (
        <button
          onClick={() => onDownload(song)}
          className={`p-1 rounded transition-colors ${
            song.isDownloaded
              ? "text-primary"
              : "text-muted-foreground hover:text-primary"
          }`}
        >
          {song.isDownloaded ? <Download size={14} /> : <DownloadCloud size={14} />}
        </button>
      )}
      <span className="text-xs text-muted-foreground font-mono">{formatDuration(song.duration)}</span>
    </div>
  </motion.div>
);

export default SongCard;
