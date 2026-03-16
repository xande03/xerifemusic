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
    <nav className="px-2 pt-1 flex-shrink-0" style={{ paddingBottom: 'calc(0.25rem + env(safe-area-inset-bottom))' }}>
      <div className="flex items-center justify-around py-1">
        {tabs.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`flex flex-col items-center gap-0.5 px-4 py-2 transition-all min-w-[64px] ${
              active === id
                ? "text-primary"
                : "text-muted-foreground"
            }`}
          >
            <Icon size={24} strokeWidth={active === id ? 2.2 : 1.5} />
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
