import { Home, Search, Library, Download, Cast } from "lucide-react";

type Tab = "home" | "search" | "library" | "offline" | "profile";

interface BottomNavProps {
  active: Tab;
  onChange: (tab: Tab) => void;
}

const tabs: { id: Tab; icon: typeof Home; label: string }[] = [
  { id: "home", icon: Home, label: "Início" },
  { id: "search", icon: Search, label: "Explorar" },
  { id: "library", icon: Library, label: "Biblioteca" },
  { id: "offline", icon: Download, label: "Downloads" },
  { id: "profile", icon: Cast, label: "Perfil" },
];

const BottomNav = ({ active, onChange }: BottomNavProps) => (
  <nav className="bg-background/95 backdrop-blur-sm border-t border-border/30 px-1 pb-safe">
    <div className="flex items-center justify-around py-1">
      {tabs.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded transition-colors min-w-[56px] ${
            active === id ? "text-foreground" : "text-muted-foreground"
          }`}
        >
          <Icon size={22} strokeWidth={active === id ? 2.5 : 1.5} />
          <span className="text-[10px] font-medium">{label}</span>
        </button>
      ))}
    </div>
  </nav>
);

export default BottomNav;
