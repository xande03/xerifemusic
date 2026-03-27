import { useState, useRef, useEffect } from "react";
import { Home, Search, Heart, Download, Settings, Compass, MonitorPlay, Clock, ListMusic, Music, Sun, Moon, Palette, Cast, X, ZoomIn, Plus, Minus, Sparkles, User, LogOut, LogIn, SlidersHorizontal } from "lucide-react";
import Equalizer from "@/components/Equalizer";
import xerifeHubLogo from "@/assets/xerife-hub-logo.png";

type Tab = "home" | "search" | "library" | "offline" | "profile" | "history" | "playlists";
type HomeMode = "music" | "video";

const COLOR_OPTIONS = [
  { id: "default", color: "bg-[hsl(142,70%,30%)]", label: "Verde Escuro (Padrão)" },
  { id: "red", color: "bg-[hsl(0,100%,50%)]", label: "Vermelho" },
  { id: "blue", color: "bg-[hsl(217,91%,60%)]", label: "Azul" },
  { id: "purple", color: "bg-[hsl(271,76%,53%)]", label: "Roxo" },
  { id: "green", color: "bg-[hsl(142,71%,45%)]", label: "Verde Claro" },
  { id: "orange", color: "bg-[hsl(25,95%,53%)]", label: "Laranja" },
  { id: "pink", color: "bg-[hsl(330,81%,60%)]", label: "Rosa" },
] as const;

interface DesktopSidebarProps {
  active: Tab;
  onChange: (tab: Tab) => void;
  homeMode?: HomeMode;
  // Tools menu props (desktop)
  isDark?: boolean;
  onToggleTheme?: () => void;
  colorTheme?: string;
  onColorChange?: (color: string) => void;
  onHomeModeChange?: (mode: HomeMode) => void;
  onCast?: () => void;
  onOpenHistory?: () => void;
  onOpenPlaylists?: () => void;
  onZoomChange?: (zoom: number) => void;
  onOpenChat?: () => void;
  onLogin?: () => void;
  onLogout?: () => void;
  user?: any;
  isLoadingUser?: boolean;
  currentZoom?: number;
}

const musicTabs: { id: Tab; icon: typeof Home; label: string }[] = [
  { id: "home", icon: Home, label: "Início" },
  { id: "search", icon: Search, label: "Buscar" },
  { id: "library", icon: Heart, label: "Favoritas" },
  { id: "offline", icon: Download, label: "Downloads" },
  { id: "history", icon: Clock, label: "Histórico" },
  { id: "playlists", icon: ListMusic, label: "Playlists" },
];

const videoTabs: { id: Tab; icon: typeof Home; label: string }[] = [
  { id: "home", icon: Home, label: "Início" },
  { id: "search", icon: Compass, label: "Explorar" },
  { id: "library", icon: MonitorPlay, label: "Inscrições" },
  { id: "offline", icon: Download, label: "Downloads" },
  { id: "history", icon: Clock, label: "Histórico" },
  { id: "playlists", icon: ListMusic, label: "Playlists" },
];

const DesktopSidebar = ({
  active,
  onChange,
  homeMode = "music",
  isDark = false,
  onToggleTheme,
  colorTheme = "default",
  onColorChange,
  onHomeModeChange,
  onCast,
  onOpenHistory,
  onOpenPlaylists,
  onZoomChange,
  onOpenChat,
  onLogin,
  onLogout,
  user,
  isLoadingUser,
  currentZoom = 1,
}: DesktopSidebarProps) => {
  const mainTabs = homeMode === "video" ? videoTabs : musicTabs;
  const [toolsOpen, setToolsOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) {
        setToolsOpen(false);
      }
    };
    if (toolsOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [toolsOpen]);

  return (
    <aside className="hidden md:flex flex-col w-20 lg:w-[240px] h-full bg-sidebar border-r border-sidebar-border flex-shrink-0 transition-all duration-300">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6 lg:py-5 justify-center lg:justify-start">
        <img src={xerifeHubLogo} alt="Xerife Hub" className="w-10 h-10 lg:w-11 lg:h-11 rounded-xl shadow-lg shadow-primary/10" />
        <span className="hidden lg:block font-display font-black text-sidebar-foreground text-lg tracking-tighter italic">XERIFE <span className="text-primary">HUB</span></span>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-3 py-4 lg:py-2 space-y-2 lg:space-y-1">
        {mainTabs.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`w-full flex flex-col lg:flex-row items-center gap-1.5 lg:gap-3 px-2 lg:px-3 py-3 lg:py-2.5 rounded-2xl lg:rounded-xl text-[10px] lg:text-sm font-semibold transition-all group ${
              active === id
                ? "bg-primary/10 lg:bg-sidebar-accent text-primary"
                : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
            }`}
          >
            <Icon
              size={22}
              strokeWidth={active === id ? 2.5 : 1.5}
              className={`flex-shrink-0 transition-all ${active === id ? "text-primary scale-110" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/80 group-hover:scale-110"}`}
            />
            <span className="lg:block transition-all">{label}</span>
            {active === id && (
              <div className="hidden lg:block ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            )}
          </button>
        ))}
        
        {/* AI Chat Button in Sidebar */}
        <button
          onClick={onOpenChat}
          className="w-full flex flex-col lg:flex-row items-center gap-1.5 lg:gap-3 px-2 lg:px-3 py-3 lg:py-2.5 rounded-2xl lg:rounded-xl text-[10px] lg:text-sm font-semibold transition-all group text-sidebar-foreground/70 hover:text-primary hover:bg-primary/10 mt-2"
        >
          <Sparkles
            size={22}
            className="flex-shrink-0 transition-all text-primary animate-pulse group-hover:scale-110"
          />
          <span className="lg:block transition-all">Xerife AI</span>
          <div className="hidden lg:block ml-auto">
            <div className="bg-primary/20 text-primary text-[8px] px-1.5 py-0.5 rounded-full uppercase font-bold tracking-tighter">AI</div>
          </div>
        </button>
      </nav>

      {/* Bottom section — Settings/Tools button */}
      <div className="px-3 pb-6 lg:pb-4 space-y-2 lg:space-y-1 relative" ref={toolsRef}>
        <div className="h-px bg-sidebar-border mx-2 mb-2 opacity-50" />
        <button
          onClick={() => setToolsOpen((v) => !v)}
          className="w-full flex flex-col lg:flex-row items-center gap-1.5 lg:gap-3 px-2 lg:px-3 py-3 lg:py-2.5 rounded-2xl lg:rounded-xl text-[10px] lg:text-sm text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all group"
        >
          <Settings size={20} strokeWidth={1.5} className="group-hover:rotate-45 transition-transform" />
          <span className="lg:block">Ferramentas</span>
        </button>

        {/* Tools dropdown — opens upward */}
        {toolsOpen && (
          <div className="absolute bottom-full left-2 right-2 mb-2 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Ferramentas</span>
              <button onClick={() => setToolsOpen(false)} className="p-1 rounded-lg hover:bg-accent transition-colors">
                <X size={14} className="text-muted-foreground" />
              </button>
            </div>

            {/* Module switcher */}
            {onHomeModeChange && (
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
            )}


            {/* Theme toggle */}
            {onToggleTheme && (
              <button
                onClick={onToggleTheme}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
              >
                {isDark ? <Moon size={16} /> : <Sun size={16} />}
                <span>{isDark ? "Modo Claro" : "Modo Escuro"}</span>
              </button>
            )}

            {/* Color theme */}
            {onColorChange && (
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
            )}

            {/* History */}
            {onOpenHistory && (
              <button
                onClick={() => { onOpenHistory(); setToolsOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-foreground hover:bg-accent transition-colors border-t border-border"
              >
                <Clock size={16} className="text-muted-foreground" />
                <span>Histórico</span>
              </button>
            )}

            {/* Playlists */}
            {onOpenPlaylists && (
              <button
                onClick={() => { onOpenPlaylists(); setToolsOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-foreground hover:bg-accent transition-colors border-t border-border"
              >
                <ListMusic size={16} className="text-muted-foreground" />
                <span>Playlists</span>
              </button>
            )}

            {/* Zoom Controls */}
            {onZoomChange && (
              <div className="px-3 py-2.5 border-t border-border space-y-2">
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <ZoomIn size={16} className="text-muted-foreground" />
                  <span>Zoom</span>
                  <span className="ml-auto text-[10px] bg-secondary px-1.5 py-0.5 rounded font-mono">
                    {Math.round(currentZoom * 100)}%
                  </span>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => onZoomChange(Math.max(0.5, currentZoom - 0.1))}
                    className="flex-1 flex items-center justify-center p-2 rounded-lg bg-secondary hover:bg-accent hover:text-primary transition-colors border border-border"
                    title="Reduzir Zoom"
                  >
                    <Minus size={14} />
                  </button>
                  <button
                    onClick={() => onZoomChange(1)}
                    className="px-3 py-2 rounded-lg bg-secondary hover:bg-accent text-[10px] font-bold border border-border"
                    title="Resetar Zoom"
                  >
                    100%
                  </button>
                  <button
                    onClick={() => onZoomChange(Math.min(2, currentZoom + 0.1))}
                    className="flex-1 flex items-center justify-center p-2 rounded-lg bg-secondary hover:bg-accent hover:text-primary transition-colors border border-border"
                    title="Ampliar Zoom"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* Chromecast */}
            {onCast && (
              <button
                onClick={() => { onCast(); setToolsOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-foreground hover:bg-accent transition-colors border-t border-border"
              >
                <Cast size={16} />
                <span>Transmitir (Cast / AirPlay)</span>
              </button>
            )}

            {/* Version Info */}
            <div className="px-3 py-2 bg-muted/30 border-t border-border mt-1">
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-tight">Versão do App</span>
                <span className="text-[10px] text-muted-foreground/80 font-medium">v1.2.9 • Mar 2026</span>
                <span className="text-[8px] text-muted-foreground/50 tracking-tighter">Última atualização: 22/03/2026</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default DesktopSidebar;
