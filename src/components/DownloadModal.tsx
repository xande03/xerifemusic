import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Download } from "lucide-react";
import { Song } from "@/data/mockSongs";
import { useEffect } from "react";

interface DownloadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  song: Song | null;
  isVideo: boolean;
  onSuccess: () => void;
}

export const DownloadModal = ({ open, onOpenChange, song, isVideo, onSuccess }: DownloadModalProps) => {
  useEffect(() => {
    if (open) {
      // Direct redirect logic could go here if needed
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-[90vw] rounded-2xl p-6 bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="text-primary" />
            Download de Mídia
          </DialogTitle>
          <DialogDescription className="pt-2">
            {song?.title} - {song?.artist}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 flex flex-col items-center">
           <Download className="w-16 h-16 text-primary mb-4 opacity-50" />
           <p className="text-sm text-center text-foreground/80 mb-6">
              Você será redirecionado para o site <b>yout.com</b> para baixar esta mídia em alta qualidade.
           </p>
           
           <button 
             onClick={() => {
                if (song) {
                  const youtUrl = `https://yout.com/video/${song.youtubeId}`;
                  window.open(youtUrl, '_blank');
                  onOpenChange(false);
                }
             }} 
             className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
           >
             <Download size={20} />
             Ir para Download
           </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
