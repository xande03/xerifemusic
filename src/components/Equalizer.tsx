import { useState, useCallback } from "react";
import { X, RotateCcw, ChevronDown, Volume2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* ─── types ─── */
interface Band {
  freq: string;
  label: string;
  value: number;
}

interface Preset {
  name: string;
  icon: string;
  bands: number[];
}

/* ─── presets ─── */
const PRESETS: Preset[] = [
  { name: "Flat",         icon: "⊝", bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { name: "Bass Boost",   icon: "🔊", bands: [8, 6, 4, 2, 0, 0, 0, 0, 0, 0] },
  { name: "Treble Boost", icon: "🔔", bands: [0, 0, 0, 0, 0, 0, 2, 4, 6, 8] },
  { name: "Rock",         icon: "🎸", bands: [5, 4, 2, 0, -1, -1, 2, 3, 4, 5] },
  { name: "Pop",          icon: "🎤", bands: [-1, 1, 3, 4, 3, 1, -1, -1, 1, 2] },
  { name: "Jazz",         icon: "🎷", bands: [3, 2, 0, 1, -1, -1, 0, 1, 2, 3] },
  { name: "Classical",    icon: "🎻", bands: [4, 3, 2, 1, -1, -1, 0, 2, 3, 4] },
  { name: "Hip-Hop",      icon: "🎧", bands: [6, 5, 3, 1, 0, 0, 1, 0, 1, 3] },
  { name: "Electronic",   icon: "⚡", bands: [5, 4, 2, 0, -2, -1, 0, 3, 5, 6] },
  { name: "R&B",          icon: "💜", bands: [3, 6, 4, 1, -2, -1, 1, 2, 3, 2] },
  { name: "Vocal",        icon: "🎙️", bands: [-2, -1, 0, 2, 4, 4, 2, 0, -1, -2] },
  { name: "Acústico",     icon: "🪕", bands: [3, 2, 0, 0, 1, 1, 2, 3, 2, 1] },
];

const DEFAULT_BANDS: Band[] = [
  { freq: "32",  label: "32",  value: 0 },
  { freq: "64",  label: "64",  value: 0 },
  { freq: "125", label: "125", value: 0 },
  { freq: "250", label: "250", value: 0 },
  { freq: "500", label: "500", value: 0 },
  { freq: "1K",  label: "1K",  value: 0 },
  { freq: "2K",  label: "2K",  value: 0 },
  { freq: "4K",  label: "4K",  value: 0 },
  { freq: "8K",  label: "8K",  value: 0 },
  { freq: "16K", label: "16K", value: 0 },
];

const STORAGE_KEY = "xerife-eq-bands";
const PRESET_KEY = "xerife-eq-preset";

function loadBands(): Band[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const vals: number[] = JSON.parse(raw);
      return DEFAULT_BANDS.map((b, i) => ({ ...b, value: vals[i] ?? 0 }));
    }
  } catch {}
  return DEFAULT_BANDS.map(b => ({ ...b }));
}
function saveBands(bands: Band[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bands.map(b => b.value)));
}
function loadPreset(): string {
  return localStorage.getItem(PRESET_KEY) || "Flat";
}
function savePreset(name: string) {
  localStorage.setItem(PRESET_KEY, name);
}

/* ─── component ─── */
interface EqualizerProps {
  open: boolean;
  onClose: () => void;
}

const DB_MIN = -12;
const DB_MAX = 12;
const SLIDER_H = 150;

const Equalizer = ({ open, onClose }: EqualizerProps) => {
  const [bands, setBands] = useState<Band[]>(loadBands);
  const [activePreset, setActivePreset] = useState(loadPreset);
  const [showPresets, setShowPresets] = useState(false);

  const applyPreset = useCallback((preset: Preset) => {
    const updated = bands.map((b, i) => ({ ...b, value: preset.bands[i] ?? 0 }));
    setBands(updated);
    saveBands(updated);
    setActivePreset(preset.name);
    savePreset(preset.name);
    setShowPresets(false);
  }, [bands]);

  const updateBand = useCallback((index: number, value: number) => {
    setBands(prev => {
      const next = prev.map((b, i) => i === index ? { ...b, value } : b);
      saveBands(next);
      setActivePreset("Personalizado");
      savePreset("Personalizado");
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    applyPreset(PRESETS[0]);
  }, [applyPreset]);

  const handlePointerDown = (index: number) => (e: React.PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const rect = el.getBoundingClientRect();

    const calc = (clientY: number) => {
      const ratio = 1 - Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
      return Math.round(DB_MIN + ratio * (DB_MAX - DB_MIN));
    };

    updateBand(index, calc(e.clientY));

    const move = (ev: PointerEvent) => updateBand(index, calc(ev.clientY));
    const up = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[199] bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            className="fixed inset-x-0 bottom-0 z-[200] flex flex-col bg-gradient-to-b from-card to-background rounded-t-3xl max-h-[92vh] overflow-y-auto shadow-2xl border-t border-border/50"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 350 }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
                  <Volume2 size={18} className="text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">Equalizador</h2>
                  <p className="text-[10px] text-muted-foreground">Aplicado a todas as músicas</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={reset} className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors" title="Resetar">
                  <RotateCcw size={16} />
                </button>
                <button onClick={onClose} className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Preset selector */}
            <div className="px-5 pb-3">
              <button
                onClick={() => setShowPresets(!showPresets)}
                className="w-full flex items-center justify-between rounded-xl bg-muted/40 border border-border/50 px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted/60 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{PRESETS.find(p => p.name === activePreset)?.icon || "🎵"}</span>
                  <span>{activePreset}</span>
                </div>
                <ChevronDown size={16} className={`text-muted-foreground transition-transform duration-200 ${showPresets ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {showPresets && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-3 gap-1.5 pt-3">
                      {PRESETS.map(p => (
                        <button
                          key={p.name}
                          onClick={() => applyPreset(p)}
                          className={`flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-medium transition-all ${
                            activePreset === p.name
                              ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 scale-[1.02]"
                              : "bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                          }`}
                        >
                          <span className="text-sm">{p.icon}</span>
                          <span className="truncate">{p.name}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Curve preview */}
            <div className="px-5 pb-2">
              <div className="rounded-2xl bg-muted/20 border border-border/30 p-3 overflow-hidden">
                <svg viewBox="0 0 200 50" className="w-full h-12" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="eq-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.5" />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>
                  <line x1="0" y1="25" x2="200" y2="25" stroke="hsl(var(--border))" strokeWidth="0.5" strokeDasharray="2,3" />
                  <path
                    d={buildCurvePath(bands, 200, 50)}
                    fill="url(#eq-grad)"
                    stroke="hsl(var(--primary))"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* dots on the curve */}
                  {bands.map((b, i) => {
                    const x = (i / (bands.length - 1)) * 200;
                    const y = 25 - (b.value / DB_MAX) * 25;
                    return (
                      <circle
                        key={i}
                        cx={x}
                        cy={y}
                        r="2.5"
                        fill="hsl(var(--primary))"
                        opacity="0.7"
                      />
                    );
                  })}
                </svg>
              </div>
            </div>

            {/* Sliders */}
            <div className="flex-1 px-5 pb-6 pt-2">
              <div className="w-full max-w-md mx-auto flex">
                {/* dB scale */}
                <div className="flex flex-col justify-between pr-2 py-0.5" style={{ height: SLIDER_H }}>
                  {["+12", "+6", "0", "-6", "-12"].map((label, i) => (
                    <span key={i} className={`text-[9px] font-mono leading-none ${label === "0" ? "text-primary font-bold" : "text-muted-foreground/60"}`}>
                      {label}
                    </span>
                  ))}
                </div>

                {/* Band sliders */}
                <div className="flex-1 flex justify-between">
                  {bands.map((band, i) => {
                    const ratio = (band.value - DB_MIN) / (DB_MAX - DB_MIN);
                    const thumbY = (1 - ratio) * SLIDER_H;

                    return (
                      <div key={band.freq} className="flex flex-col items-center gap-1">
                        {/* Current value */}
                        <span className={`text-[9px] font-mono font-semibold leading-none ${
                          band.value > 0 ? "text-primary" : band.value < 0 ? "text-destructive" : "text-muted-foreground/50"
                        }`}>
                          {band.value > 0 ? `+${band.value}` : band.value === 0 ? "·" : band.value}
                        </span>

                        {/* Track */}
                        <div
                          className="relative w-5 rounded-full bg-muted/30 cursor-pointer touch-none"
                          style={{ height: SLIDER_H }}
                          onPointerDown={handlePointerDown(i)}
                        >
                          {/* Track groove */}
                          <div className="absolute left-1/2 -translate-x-1/2 w-[3px] h-full rounded-full bg-border/40" />

                          {/* Zero line */}
                          <div className="absolute left-0 right-0 top-1/2 h-[1.5px] bg-primary/20 rounded-full" />

                          {/* Fill bar */}
                          {band.value !== 0 && (
                            <div
                              className="absolute left-1/2 -translate-x-1/2 w-[5px] rounded-full bg-primary/40"
                              style={
                                band.value > 0
                                  ? { bottom: `${SLIDER_H / 2}px`, height: `${(ratio - 0.5) * SLIDER_H}px` }
                                  : { top: `${SLIDER_H / 2}px`, height: `${(0.5 - ratio) * SLIDER_H}px` }
                              }
                            />
                          )}

                          {/* Thumb */}
                          <div
                            className="absolute left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-primary shadow-lg shadow-primary/30 border-2 border-background transition-none pointer-events-none"
                            style={{ top: thumbY - 8 }}
                          />
                        </div>

                        {/* Freq label */}
                        <span className="text-[8px] text-muted-foreground/70 font-mono">{band.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

function buildCurvePath(bands: Band[], w: number, h: number): string {
  const midY = h / 2;
  const points = bands.map((b, i) => {
    const x = (i / (bands.length - 1)) * w;
    const y = midY - (b.value / DB_MAX) * midY;
    return { x, y };
  });

  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx = (prev.x + curr.x) / 2;
    d += ` C${cpx},${prev.y} ${cpx},${curr.y} ${curr.x},${curr.y}`;
  }
  d += ` L${w},${h} L0,${h} Z`;
  return d;
}

export default Equalizer;
