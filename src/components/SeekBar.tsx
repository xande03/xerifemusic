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
  const isDraggingRef = useRef(false);

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

  // ─── Mouse handlers ───────────────────────────────────────────────────────

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDraggingRef.current = true;
      setIsDragging(true);
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
      const fraction = getFraction(e.clientX);
      isDraggingRef.current = false;
      setIsDragging(false);
      setDragValue(fraction);
      onSeek(fraction);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [getFraction, onSeek]);

  // ─── Touch handlers ───────────────────────────────────────────────────────

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      // Não chama preventDefault() aqui para não bloquear scroll de outras áreas,
      // mas vamos setar o flag de dragging.
      isDraggingRef.current = true;
      setIsDragging(true);
      setDragValue(getFraction(e.touches[0].clientX));
    },
    [getFraction]
  );

  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current) return;
      // Previne scroll vertical enquanto arrasta a seek bar
      e.preventDefault();
      setDragValue(getFraction(e.touches[0].clientX));
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isDraggingRef.current) return;
      const touch = e.changedTouches[0];
      const fraction = getFraction(touch.clientX);
      isDraggingRef.current = false;
      setIsDragging(false);
      setDragValue(fraction);
      onSeek(fraction);
    };

    // passive: false é necessário para poder chamar preventDefault() no touchmove
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);
    window.addEventListener("touchcancel", handleTouchEnd);
    return () => {
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [getFraction, onSeek]);

  // Clique simples (sem drag)
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      // Só dispara se não foi um drag
      if (!isDraggingRef.current) {
        const fraction = getFraction(e.clientX);
        onSeek(fraction);
      }
    },
    [getFraction, onSeek]
  );

  // Valor visual atual: durante drag usa dragValue, caso contrário usa progress
  const displayValue = isDragging ? dragValue : progress;

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
