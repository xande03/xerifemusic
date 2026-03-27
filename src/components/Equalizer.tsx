import { useState, useCallback } from "react";
import { X, RotateCcw, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* ─── types ─── */
interface Band {
  freq: string;
  label: string;
  value: number;          // –12 … +12 dB
}

interface Preset {
  name: string;
  bands: number[];        // one value per band
}

/* ─── presets (same order as BANDS) ─── */
const PRESETS: Preset[] = [
  { name: "Flat",          bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { name: "Bass Boost",    bands: [8, 6, 4, 2, 0, 0, 0, 0, 0, 0] },
  { name: "Treble Boost",  bands: [0, 0, 0, 0, 0, 0, 2, 4, 6, 8] },
  { name: "Rock",          bands: [5, 4, 2, 0, -1, -1, 2, 3, 4, 5] },
  { name: "Pop",           bands: [-1, 1, 3, 4, 3, 1, -1, -1, 1, 2] },
  { name: "Jazz",          bands: [3, 2, 0, 1, -1, -1, 0, 1, 2, 3] },
  { name: "Classical",     bands: [4, 3, 2, 1, -1, -1, 0, 2, 3, 4] },
  { name: "Hip-Hop",       bands: [6, 5, 3, 1, 0, 0, 1, 0, 1, 3] },
  { name: "Electronic",    bands: [5, 4, 2, 0, -2, -1, 0, 3, 5, 6] },
  { name: "R&B",           bands: [3, 6, 4, 1, -2, -1, 1, 2, 3, 2] },
  { name: "Vocal",         bands: [-2, -1, 0, 2, 4, 4, 2, 0, -1, -2] },
  { name: "Acústico",      bands: [3, 2, 0, 0, 1, 1, 2, 3, 2, 1] },
];

const DEFAULT_BANDS: Band[] = [
  { freq: "32",   label: "32",   value: 0 },
  { freq: "64",   label: "64",   value: 0 },
  { freq: "125",  label: "125",  value: 0 },
  { freq: "250",  label: "250",  value: 0 },
  { freq: "500",  label: "500",  value: 0 },
  { freq: "1K",   label: "1K",   value: 0 },
  { freq: "2K",   label: "2K",   value: 0 },
  { freq: "4K",   label: "4K",   value: 0 },
  { freq: "8K",   label: "8K",   value: 0 },
  { freq: "16K",  label: "16K",  value: 0 },
];

const STORAGE_KEY = "xerife-eq-bands";
const PRESET_KEY  = "xerife-eq-preset";

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
const SLIDER_H = 160;              // track height px

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
    const flat = PRESETS[0];
    applyPreset(flat);
  }, [applyPreset]);

  /* vertical slider via pointer */
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
        <motion.div
          className="fixed inset-0 z-[200] flex flex-col bg-background"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
        >
          {/* header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground">
              <ChevronDown size={22} />
            </button>
            <h2 className="text-base font-bold text-foreground tracking-wide">Equalizador</h2>
            <button onClick={reset} className="p-1.5 text-muted-foreground hover:text-foreground" title="Resetar">
              <RotateCcw size={18} />
            </button>
          </div>

          {/* preset selector */}
          <div className="px-4 pt-4 pb-2">
            <button
              onClick={() => setShowPresets(!showPresets)}
              className="w-full flex items-center justify-between rounded-xl bg-muted/60 px-4 py-2.5 text-sm font-medium text-foreground"
            >
              <span>{activePreset}</span>
              <ChevronDown size={16} className={`transition-transform ${showPresets ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
              {showPresets && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-3 gap-2 pt-3 pb-1">
                    {PRESETS.map(p => (
                      <button
                        key={p.name}
                        onClick={() => applyPreset(p)}
                        className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                          activePreset === p.name
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/40 text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* dB labels */}
          <div className="flex-1 flex flex-col items-center justify-center px-4 pb-6">
            <div className="w-full max-w-md flex">
              {/* dB scale */}
              <div className="flex flex-col justify-between pr-2" style={{ height: SLIDER_H }}>
                <span className="text-[10px] text-muted-foreground font-mono">+12</span>
                <span className="text-[10px] text-muted-foreground font-mono">+6</span>
                <span className="text-[10px] text-primary font-mono font-bold">0</span>
                <span className="text-[10px] text-muted-foreground font-mono">-6</span>
                <span className="text-[10px] text-muted-foreground font-mono">-12</span>
              </div>

              {/* sliders */}
              <div className="flex-1 flex justify-between gap-0">
                {bands.map((band, i) => {
                  const ratio = (band.value - DB_MIN) / (DB_MAX - DB_MIN);
                  const thumbY = (1 - ratio) * SLIDER_H;

                  return (
                    <div key={band.freq} className="flex flex-col items-center gap-1.5">
                      {/* value */}
                      <span className={`text-[10px] font-mono font-medium ${band.value > 0 ? "text-primary" : band.value < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                        {band.value > 0 ? `+${band.value}` : band.value}
                      </span>

                      {/* track */}
                      <div
                        className="relative w-6 rounded-full bg-muted/50 cursor-pointer touch-none"
                        style={{ height: SLIDER_H }}
                        onPointerDown={handlePointerDown(i)}
                      >
                        {/* zero line */}
                        <div className="absolute left-0 right-0 top-1/2 h-px bg-border" />

                        {/* fill */}
                        {band.value !== 0 && (
                          <div
                            className="absolute left-1 right-1 rounded-full bg-primary/30"
                            style={
                              band.value > 0
                                ? { bottom: `${SLIDER_H / 2}px`, height: `${(ratio - 0.5) * SLIDER_H}px` }
                                : { top: `${SLIDER_H / 2}px`, height: `${(0.5 - ratio) * SLIDER_H}px` }
                            }
                          />
                        )}

                        {/* thumb */}
                        <div
                          className="absolute left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.5)] border-2 border-primary-foreground transition-none pointer-events-none"
                          style={{ top: thumbY - 10 }}
                        />
                      </div>

                      {/* freq label */}
                      <span className="text-[9px] text-muted-foreground font-mono">{band.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* curve preview */}
            <div className="w-full max-w-md mt-6">
              <svg viewBox="0 0 200 60" className="w-full h-14" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="eq-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.05" />
                  </linearGradient>
                </defs>
                {/* area */}
                <path
                  d={buildCurvePath(bands, 200, 60)}
                  fill="url(#eq-grad)"
                  stroke="hsl(var(--primary))"
                  strokeWidth="1.5"
                />
                {/* zero */}
                <line x1="0" y1="30" x2="200" y2="30" stroke="hsl(var(--border))" strokeWidth="0.5" strokeDasharray="3,3" />
              </svg>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* build smooth curve path for the SVG */
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
  // close area
  d += ` L${w},${h} L0,${h} Z`;
  return d;
}

export default Equalizer;
