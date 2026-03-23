/**
 * SeekBar — barra de progresso com suporte completo a drag no mobile (touch) e desktop (mouse).
 *
 * Comportamento:
 * - Durante o drag: a barra segue o dedo/cursor em tempo real.
 * - Ao soltar: a barra permanece onde parou E dispara onSeek(fraction) para sincronizar a reprodução.
 * - O player externo NÃO deve sobrescrever a posição durante o drag (controlado pelo flag isSeeking).
 */

import { useRef, useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface SeekBarProps {
  /** Progresso atual da reprodução: 0–1 */
  progress: number;
  /** Chamado quando o usuário SOLTA o slider — fraction 0–1 */
  onSeek: (fraction: number) => void;
  /** Altura da track */
  trackHeight?: "thin" | "normal" | "thick";
  className?: string;
  showThumb?: boolean;
}

export function SeekBar({
  progress,
  onSeek,
  trackHeight = "normal",
  className,
  showThumb = true,
}: SeekBarProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragValue, setDragValue] = useState(0);
  const [seekLock, setSeekLock] = useState<number | null>(null);
  const isDraggingRef = useRef(false);
  const seekTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const heightClass = {
    thin: "h-1",
    normal: "h-[6px]",
    thick: "h-2",
  }[trackHeight];

  /** Calcula a fração (0–1) a partir da posição horizontal do evento */
  const getFraction = useCallback((clientX: number): number => {
    const track = trackRef.current;
    if (!track) return 0;
    const rect = track.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  const commitSeek = useCallback((fraction: number) => {
    isDraggingRef.current = false;
    setIsDragging(false);
    setDragValue(fraction);
    setSeekLock(fraction);
    if (seekTimeoutRef.current) clearTimeout(seekTimeoutRef.current);
    // Ignora o 'progress' externo por 800ms para dar tempo do player do YouTube (ou outro) atualizar
    seekTimeoutRef.current = setTimeout(() => {
      setSeekLock(null);
    }, 800);
    onSeek(fraction);
  }, [onSeek]);

  // ─── Mouse handlers ───────────────────────────────────────────────────────

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDraggingRef.current = true;
      setIsDragging(true);
      if (seekTimeoutRef.current) clearTimeout(seekTimeoutRef.current);
      setSeekLock(null);
      setDragValue(getFraction(e.clientX));
    },
    [getFraction]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      setDragValue(getFraction(e.clientX));
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      commitSeek(getFraction(e.clientX));
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [getFraction, commitSeek]);

  // ─── Touch handlers ───────────────────────────────────────────────────────

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      // Não chama preventDefault() aqui para evitar bloquear scroll
      isDraggingRef.current = true;
      setIsDragging(true);
      if (seekTimeoutRef.current) clearTimeout(seekTimeoutRef.current);
      setSeekLock(null);
      setDragValue(getFraction(e.touches[0].clientX));
    },
    [getFraction]
  );

  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current) return;
      e.preventDefault();
      setDragValue(getFraction(e.touches[0].clientX));
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isDraggingRef.current) return;
      commitSeek(getFraction(e.changedTouches[0].clientX));
    };

    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);
    window.addEventListener("touchcancel", handleTouchEnd);
    return () => {
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [getFraction, commitSeek]);

  // Clique simples (sem drag)
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!isDraggingRef.current) {
        commitSeek(getFraction(e.clientX));
      }
    },
    [getFraction, commitSeek]
  );

  // Valor visual atual: prioriza dragValue durante o drag,
  // dps usa o seekLock para manter parado enquanto o player carrega,
  // ou finalmente volta ao progress normal do player
  const displayValue = isDragging ? dragValue : (seekLock !== null ? seekLock : progress);

  return (
    <div
      ref={trackRef}
      className={cn(
        "relative w-full rounded-full bg-muted/60 cursor-pointer group select-none",
        heightClass,
        // Área de toque expandida verticalmente sem mudar o visual
        "before:absolute before:inset-x-0 before:-top-3 before:-bottom-3 before:content-['']",
        className
      )}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
    >
      {/* Preenchimento */}
      <div
        className="absolute inset-y-0 left-0 rounded-full bg-primary transition-none"
        style={{ width: `${displayValue * 100}%` }}
      />

      {/* Thumb (bolinha) */}
      {showThumb && (
        <div
          className={cn(
            "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full bg-primary shadow-lg",
            "w-5 h-5 border-2 border-white/80",
            isDragging
              ? "scale-125 opacity-100"
              : "scale-100 opacity-0 group-hover:opacity-100",
            "transition-all duration-150 pointer-events-none"
          )}
          style={{ left: `${displayValue * 100}%` }}
        />
      )}
    </div>
  );
}

export default SeekBar;
