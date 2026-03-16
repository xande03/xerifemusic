import { Heart, ThumbsUp } from "lucide-react";
import type { Comment } from "@/lib/youtubeVideoInfo";

interface VideoCommentsProps {
  comments: Comment[];
  loading?: boolean;
}

const VideoComments = ({ comments, loading }: VideoCommentsProps) => {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-muted flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-2 bg-muted rounded w-1/3" />
              <div className="h-3 bg-muted rounded w-full" />
              <div className="h-3 bg-muted rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        Comentários não disponíveis
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {comments.map((comment, i) => (
        <div key={i} className="flex gap-3">
          {/* Avatar */}
          {comment.authorThumbnail ? (
            <img
              src={comment.authorThumbnail}
              alt={comment.author}
              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
              loading="lazy"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-secondary flex-shrink-0 flex items-center justify-center text-[10px] text-muted-foreground font-bold">
              {comment.author.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="flex-1 min-w-0">
            {/* Author + time */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-foreground truncate">{comment.author}</span>
              {comment.publishedTime && (
                <span className="text-[10px] text-muted-foreground flex-shrink-0">{comment.publishedTime}</span>
              )}
            </div>

            {/* Content */}
            <p className="text-xs text-foreground/80 mt-0.5 leading-relaxed line-clamp-4">
              {comment.content}
            </p>

            {/* Actions */}
            <div className="flex items-center gap-3 mt-1.5">
              {comment.likes > 0 && (
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <ThumbsUp size={11} />
                  {comment.likes}
                </span>
              )}
              {comment.isHearted && (
                <Heart size={11} className="text-primary fill-primary" />
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default VideoComments;
