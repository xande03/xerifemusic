import { useState, useRef, useEffect } from "react";
import { MoreVertical, Music, MonitorPlay, Sun, Moon, Palette, Cast, X } from "lucide-react";

type HomeMode = "music" | "video";

interface HeaderMenuProps {
  homeMode: HomeMode;
  onHomeModeChange: (mode: HomeMode) => void;
  isDark: boolean;
  onToggleTheme: () => void;
  colorTheme: string;
  onColorChange: (color: string) => void;
  onCast?: () => void;
}

const COLOR_OPTIONS = [
  { id: "red", color: "bg-[hsl(0,100%,50%)]", label: "Vermelho" },
  { id: "blue", color: "bg-[hsl(217,91%,60%)]", label: "Azul" },
  { id: "purple", color: "bg-[hsl(271,76%,53%)]", label: "Roxo" },
  { id: "green", color: "bg-[hsl(142,71%,45%)]", label: "Verde" },
  { id: "orange", color: "bg-[hsl(25,95%,53%)]", label: "Laranja" },
  { id: "pink", color: "bg-[hsl(330,81%,60%)]", label: "Rosa" },
] as const;

const HeaderMenu = ({
  homeMode,
  onHomeModeChange,
  isDark,
  onToggleTheme,
  colorTheme,
  onColorChange,
  onCast,
}: HeaderMenuProps) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center hover:bg-accent transition-colors active:scale-95"
        aria-label="Menu"
      >
        {open ? <X size={16} className="text-foreground" /> : <MoreVertical size={16} className="text-muted-foreground" />}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-56 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Module switcher */}
          <div className="p-3 space-y-2 border-b border-border">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Módulo</span>
            <div className="flex gap-1.5">
              <button
                onClick={() => { onHomeModeChange("music"); }}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  homeMode === "music"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                <Music size={14} />
                Music
              </button>
              <button
                onClick={() => { onHomeModeChange("video"); }}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  homeMode === "video"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                <MonitorPlay size={14} />
                Video
              </button>
            </div>
          </div>

          {/* Theme toggle */}
          <button
            onClick={onToggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
          >
            {isDark ? <Moon size={16} /> : <Sun size={16} />}
            <span>{isDark ? "Modo Claro" : "Modo Escuro"}</span>
          </button>

          {/* Color theme */}
          <div className="px-3 py-2.5 border-t border-border space-y-2">
            <div className="flex items-center gap-2 text-sm text-foreground">
              <Palette size={16} />
              <span>Cor do tema</span>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {COLOR_OPTIONS.map((t) => (
                <button
                  key={t.id}
                  title={t.label}
                  onClick={() => onColorChange(t.id)}
                  className={`w-7 h-7 rounded-full ${t.color} transition-all ${
                    colorTheme === t.id
                      ? "ring-2 ring-foreground ring-offset-2 ring-offset-card scale-110"
                      : "opacity-70 hover:opacity-100"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Chromecast */}
          {onCast && (
            <button
              onClick={() => { onCast(); setOpen(false); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-foreground hover:bg-accent transition-colors border-t border-border"
            >
              <Cast size={16} />
              <span>Transmitir (Cast)</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default HeaderMenu;
