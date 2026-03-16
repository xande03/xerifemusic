import { Home, Library, Download, ListMusic, Settings } from "lucide-react";
import xerifeHubLogo from "@/assets/xerife-hub-logo.png";

type Tab = "home" | "search" | "library" | "offline" | "profile";

interface DesktopSidebarProps {
  active: Tab;
  onChange: (tab: Tab) => void;
}

const mainTabs: { id: Tab; icon: typeof Home; label: string }[] = [
  { id: "home", icon: Home, label: "Início" },
  { id: "library", icon: Library, label: "Biblioteca" },
  { id: "offline", icon: Download, label: "Downloads" },
  { id: "search", icon: ListMusic, label: "Playlists" },
];

const DesktopSidebar = ({ active, onChange }: DesktopSidebarProps) => {
  return (
    <aside className="hidden lg:flex flex-col w-[240px] h-full bg-sidebar border-r border-sidebar-border flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5">
        <img src={xerifeHubLogo} alt="Xerife Hub" className="w-11 h-11 rounded-lg" />
        <span className="font-display font-bold text-sidebar-foreground text-lg tracking-tight">Xerife Hub</span>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-3 py-2 space-y-1">
        {mainTabs.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
              active === id
                ? "bg-sidebar-accent text-sidebar-primary"
                : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
            }`}
          >
            <Icon
              size={20}
              strokeWidth={active === id ? 2.2 : 1.5}
              className={`flex-shrink-0 transition-colors ${active === id ? "text-sidebar-primary" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/80"}`}
            />
            <span>{label}</span>
            {active === id && (
              <div className="ml-auto w-1.5 h-1.5 rounded-full bg-sidebar-primary" />
            )}
          </button>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="px-3 pb-4 space-y-1">
        <div className="h-px bg-sidebar-border mx-2 mb-2" />
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all">
          <Settings size={18} strokeWidth={1.5} />
          <span>Configurações</span>
        </button>
      </div>
    </aside>
  );
};

export default DesktopSidebar;
