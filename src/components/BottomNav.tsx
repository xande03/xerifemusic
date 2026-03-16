import { Home, Search, Library, Download, User } from "lucide-react";

type Tab = "home" | "search" | "library" | "offline" | "profile";

interface BottomNavProps {
  active: Tab;
  onChange: (tab: Tab) => void;
}

const tabs: { id: Tab; icon: typeof Home; label: string }[] = [
  { id: "home", icon: Home, label: "Home" },
  { id: "search", icon: Search, label: "Buscar" },
  { id: "library", icon: Library, label: "Biblioteca" },
  { id: "offline", icon: Download, label: "Offline" },
  { id: "profile", icon: User, label: "Perfil" },
];

const BottomNav = ({ active, onChange }: BottomNavProps) => (
  <nav className="glass border-t border-border/30 px-2 pb-safe">
    <div className="flex items-center justify-around py-2">
      {tabs.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition-all ${
            active === id ? "text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Icon size={20} />
          <span className="text-[10px] font-medium">{label}</span>
        </button>
      ))}
    </div>
  </nav>
);

export default BottomNav;
