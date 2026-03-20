import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Share2, Loader2, QrCode } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { QRCodeSVG } from "qrcode.react";
import { Song } from "@/data/mockSongs";
import { downloadCobaltMedia, uploadToTmpFiles } from "@/lib/mediaTasks";
import { useState, useEffect } from "react";

interface ShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  song: Song | null;
  isVideo: boolean;
}

export const ShareModal = ({ open, onOpenChange, song, isVideo }: ShareModalProps) => {
  const [status, setStatus] = useState<"idle" | "preparing" | "uploading" | "success" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [errorText, setErrorText] = useState("");

  const getStoredUrl = (id: string) => {
    try {
      const map = JSON.parse(localStorage.getItem('demus-temp-shares') || '{}');
      return map[`${id}-${isVideo}`] || null;
    } catch {
      return null;
    }
  };

  const saveStoredUrl = (id: string, url: string) => {
    try {
      const map = JSON.parse(localStorage.getItem('demus-temp-shares') || '{}');
      map[`${id}-${isVideo}`] = url;
      localStorage.setItem('demus-temp-shares', JSON.stringify(map));
    } catch {}
  };

  useEffect(() => {
    if (open && song && status === "idle") {
      const existing = getStoredUrl(song.id);
      if (existing) {
        setShareUrl(existing);
        setStatus("success");
      } else {
        processShare();
      }
    }
    if (!open) {
      setTimeout(() => {
        setStatus("idle");
        setProgress(0);
        setShareUrl(null);
        setErrorText("");
      }, 300);
    }
  }, [open, song, status]);

  const processShare = async () => {
    if (!song) return;
    setStatus("preparing");
    setProgress(0);

    try {
      // 1. Download
      const blob = await downloadCobaltMedia(
        song.youtubeId,
        !isVideo,
        (p) => setProgress(Math.floor(p * 0.5)) // 0 to 50%
      );

      // 2. Upload
      setStatus("uploading");
      const filename = `${song.artist} - ${song.title}.${isVideo ? "mp4" : "mp3"}`.replace(/[/\\?%*:|"<>]/g, '-');
      const url = await uploadToTmpFiles(
        blob,
        filename,
        (p) => setProgress(50 + Math.floor(p * 0.5)) // 50 to 100%
      );

      saveStoredUrl(song.id, url);
      setShareUrl(url);
      setStatus("success");
    } catch (err: any) {
      console.error("Share gen failed:", err);
      setStatus("error");
      setErrorText(err.message || "Falha ao gerar o link de compartilhamento");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-[90vw] rounded-2xl p-6 bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {status === "success" ? <QrCode className="text-primary" /> : <Loader2 className="animate-spin text-primary" />}
            {status === "success" ? "QR Code para Compartilhar" : status === "error" ? "Erro no Compartilhamento" : "Gerando Link..."}
          </DialogTitle>
          <DialogDescription className="pt-2 truncate">
            {song?.title} - {song?.artist}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 flex flex-col items-center">
          {(status === "preparing" || status === "uploading") && (
            <div className="w-full">
              <p className="text-xs text-muted-foreground text-center mb-2">
                {status === "preparing" ? "Acessando mídia do YouTube..." : "Fazendo upload para servidor seguro..."}
              </p>
              <Progress value={progress} className="h-2 w-full mb-2 bg-muted transition-all [&>div]:bg-primary" />
              <div className="text-center font-mono text-xs text-primary">{progress}%</div>
            </div>
          )}

          {status === "success" && shareUrl && (
            <div className="flex flex-col items-center gap-4 w-full">
              <div className="p-4 bg-white rounded-xl shadow-sm">
                <QRCodeSVG value={shareUrl} size={180} level="M" />
              </div>
              <p className="text-xs text-center text-muted-foreground">
                Escaneie o QR Code acima para baixar a mídia diretamente ou<br/>
                acesse o link do tmpfiles.org abaixo:
              </p>
              <a 
                href={shareUrl} 
                target="_blank" 
                rel="noreferrer" 
                className="text-xs text-primary font-mono truncate w-full text-center bg-primary/10 p-2 rounded-lg"
              >
                {shareUrl}
              </a>
            </div>
          )}

          {status === "error" && (
            <div className="text-destructive text-sm text-center bg-destructive/10 p-3 rounded-lg w-full">
              {errorText}
            </div>
          )}
        </div>

        {status === "error" && (
          <button 
            onClick={processShare} 
            className="w-full py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Tentar Novamente
          </button>
        )}
      </DialogContent>
    </Dialog>
  );
};
