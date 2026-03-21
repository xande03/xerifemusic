import { Home, Search, Heart, Download, Compass, User, MonitorPlay, Music } from "lucide-react";

type Tab = "home" | "search" | "library" | "offline" | "profile" | "history" | "playlists";
type HomeMode = "music" | "video";

interface BottomNavProps {
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

const BottomNav = ({ active, onChange, homeMode = "music" }: BottomNavProps) => {
  const tabs = homeMode === "video" ? videoTabs : musicTabs;

  return (
    <nav className="w-full flex-shrink-0 bg-background/95 backdrop-blur-md border-t border-border/10 z-50">
      <div 
        className="flex items-center justify-around px-1 sm:px-2 pt-2 pb-2" 
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)' }}
      >
        {tabs.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`flex flex-col items-center gap-1 px-3 sm:px-4 py-1 transition-all min-w-[64px] ${
              active === id
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon size={22} strokeWidth={active === id ? 2.2 : 1.5} />
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
