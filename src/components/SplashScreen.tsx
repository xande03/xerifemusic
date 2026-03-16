import { useState, useEffect } from "react";
import xerifeHubLogo from "@/assets/xerife-hub-logo.png";

const SplashScreen = ({ onFinish }: { onFinish: () => void }) => {
  const [phase, setPhase] = useState<"logo" | "fade">("logo");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("fade"), 1800);
    const t2 = setTimeout(() => onFinish(), 2400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center transition-opacity duration-500 ${
        phase === "fade" ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Gradient background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-primary/10 blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/4 left-1/3 w-[200px] h-[200px] rounded-full bg-primary/5 blur-[80px] animate-pulse" style={{ animationDelay: "0.5s" }} />
      </div>

      {/* Logo */}
      <div className="relative flex flex-col items-center gap-4 animate-splash-logo">
        <img src={xerifeHubLogo} alt="Xerife Hub" className="w-28 h-28 drop-shadow-2xl" />
        <div className="flex flex-col items-center gap-1">
          <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">Xerife Hub</h1>
          <p className="text-xs text-muted-foreground tracking-widest uppercase">Music Streaming</p>
        </div>
      </div>

      {/* Loading bar */}
      <div className="absolute bottom-24 w-32 h-0.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-primary rounded-full animate-splash-progress" />
      </div>
    </div>
  );
};

export default SplashScreen;
