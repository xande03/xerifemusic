import { Home, Search, Heart, Download, Settings, Compass, MonitorPlay, Music } from "lucide-react";
import xerifeHubLogo from "@/assets/xerife-hub-logo.png";

type Tab = "home" | "search" | "library" | "offline" | "profile" | "history" | "playlists";
type HomeMode = "music" | "video";

interface DesktopSidebarProps {
  active: Tab;
  onChange: (tab: Tab) => void;
  homeMode?: HomeMode;
}

const musicTabs: { id: Tab; icon: typeof Home; label: string }[] = [
  { id: "home", icon: Home, label: "Início" },
  { id: "search", icon: Search, label: "Buscar" },
  { id: "library", icon: Heart, label: "Favoritas" },
  { id: "offline", icon: Download, label: "Downloads" },
];

const videoTabs: { id: Tab; icon: typeof Home; label: string }[] = [
  { id: "home", icon: Home, label: "Início" },
  { id: "search", icon: Compass, label: "Explorar" },
  { id: "library", icon: MonitorPlay, label: "Inscrições" },
  { id: "offline", icon: Download, label: "Downloads" },
];

const DesktopSidebar = ({ active, onChange, homeMode = "music" }: DesktopSidebarProps) => {
  const mainTabs = homeMode === "video" ? videoTabs : musicTabs;

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
      </nav>

      {/* Bottom section */}
      <div className="px-3 pb-6 lg:pb-4 space-y-2 lg:space-y-1">
        <div className="h-px bg-sidebar-border mx-2 mb-2 opacity-50" />
        <button className="w-full flex flex-col lg:flex-row items-center gap-1.5 lg:gap-3 px-2 lg:px-3 py-3 lg:py-2.5 rounded-2xl lg:rounded-xl text-[10px] lg:text-sm text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all group">
          <Settings size={20} strokeWidth={1.5} className="group-hover:rotate-45 transition-transform" />
          <span className="lg:block">Ajustes</span>
        </button>
      </div>
    </aside>
  );
};

export default DesktopSidebar;
