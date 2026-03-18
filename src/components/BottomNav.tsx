import { Home, Search, Heart, Download, Compass, User, MonitorPlay, Music } from "lucide-react";

type Tab = "home" | "search" | "library" | "offline" | "profile";
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
    <nav className="px-1 sm:px-2 flex-shrink-0 bg-background/95 backdrop-blur-sm border-t border-border/10" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-center justify-around">
        {tabs.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`flex flex-col items-center gap-0.5 px-3 sm:px-4 py-1.5 sm:py-2 transition-all min-w-[56px] sm:min-w-[64px] ${
              active === id
                ? "text-primary"
                : "text-muted-foreground"
            }`}
          >
            <Icon size={22} strokeWidth={active === id ? 2.2 : 1.5} />
            <span className="text-[9px] sm:text-[10px] font-medium">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
