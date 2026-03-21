import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Download, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Song } from "@/data/mockSongs";
import { downloadCobaltMedia } from "@/lib/mediaTasks";
import { useState, useEffect } from "react";

interface DownloadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  song: Song | null;
  isVideo: boolean;
  onSuccess: (blob: Blob) => void;
}

export const DownloadModal = ({ open, onOpenChange, song, isVideo, onSuccess }: DownloadModalProps) => {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "downloading" | "success" | "error">("idle");
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    if (open && song && status === "idle") {
      startDownload();
    }
    if (!open) {
      setTimeout(() => {
        setProgress(0);
        setStatus("idle");
        setErrorText("");
      }, 300);
    }
  }, [open, song, status]);

  const startDownload = async () => {
    if (!song) return;
    setStatus("downloading");
    setProgress(5); // Initial progress

    try {
      const blob = await downloadCobaltMedia(
        song.youtubeId,
        !isVideo,
        (p) => setProgress(Math.max(5, p)) // Map from 5% to 100%
      );


      setStatus("success");
      onSuccess(blob);
    } catch (err: any) {
      console.error("Download failed:", err);
      setStatus("error");
      setErrorText(err.message || "Erro desconhecido ao baixar");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-[90vw] rounded-2xl p-6 bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {status === "success" ? <Download className="text-primary" /> : <Loader2 className="animate-spin text-primary" />}
            {status === "success" ? "Download Concluído!" : status === "error" ? "Erro no Download" : "Baixando Mídia..."}
          </DialogTitle>
          <DialogDescription className="pt-2">
            {song?.title} - {song?.artist}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 flex flex-col items-center">
          {status === "downloading" && (
            <>
              <Progress value={progress} className="h-2 w-full mb-2 bg-muted transition-all [&>div]:bg-primary" />
              <span className="text-sm text-muted-foreground font-mono">{progress}%</span>
            </>
          )}

          {status === "success" && (
            <p className="text-sm text-center text-foreground/80">
              O arquivo foi salvo no seu dispositivo com sucesso.
            </p>
          )}

          {status === "error" && (
            <div className="text-destructive text-sm text-center bg-destructive/10 p-3 rounded-lg w-full">
              Falha ao baixar do YouTube. Verifique sua conexão ou tente novamente mais tarde.
              {errorText && <div className="text-xs mt-1 text-destructive/80 font-mono">{errorText}</div>}
            </div>
          )}
        </div>

        {status === "error" && (
          <button 
            onClick={startDownload} 
            className="w-full py-2 bg-primary text-primary-foreground rounded-lg font-medium"
          >
            Tentar Novamente
          </button>
        )}
      </DialogContent>
    </Dialog>
  );
};
