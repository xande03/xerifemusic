import { Home, Radio, Monitor, Film } from "lucide-react";

type Tab = "home" | "search" | "library" | "offline" | "profile";

interface BottomNavProps {
  active: Tab;
  onChange: (tab: Tab) => void;
}

const tabs: { id: Tab; icon: typeof Home; label: string }[] = [
  { id: "home", icon: Home, label: "Início" },
  { id: "search", icon: Radio, label: "TV ao vivo" },
  { id: "library", icon: Monitor, label: "Séries" },
  { id: "offline", icon: Film, label: "Filmes" },
];

const BottomNav = ({ active, onChange }: BottomNavProps) => (
  <nav className="px-4 pb-safe py-4">
    <div className="flex items-center justify-around bg-card/90 backdrop-blur-xl rounded-2xl border border-border/30 py-1 px-1">
      {tabs.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`flex flex-col items-center gap-1 px-5 py-2.5 rounded-xl transition-all min-w-[72px] ${
            active === id
              ? "bg-accent text-primary"
              : "text-muted-foreground"
          }`}
        >
          <Icon size={22} strokeWidth={active === id ? 2.5 : 1.5} />
          <span className="text-[11px] font-medium">{label}</span>
        </button>
      ))}
    </div>
  </nav>
);

export default BottomNav;
