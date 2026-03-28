import { useState, useCallback, useRef, useEffect } from "react";
import { X, RotateCcw, ChevronDown, Volume2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* ─── types ─── */
interface Band {
  freq: number;
  label: string;
  value: number;
}

interface Preset {
  name: string;
  icon: string;
  bands: number[];
}

/* ─── 20 bands ─── */
const FREQ_LIST: { freq: number; label: string }[] = [
  { freq: 20, label: "20" },
  { freq: 31, label: "31" },
  { freq: 44, label: "44" },
  { freq: 63, label: "63" },
  { freq: 87, label: "87" },
  { freq: 125, label: "125" },
  { freq: 175, label: "175" },
  { freq: 250, label: "250" },
  { freq: 350, label: "350" },
  { freq: 500, label: "500" },
  { freq: 700, label: "700" },
  { freq: 1000, label: "1K" },
  { freq: 1400, label: "1.4K" },
  { freq: 2000, label: "2K" },
  { freq: 2800, label: "2.8K" },
  { freq: 4000, label: "4K" },
  { freq: 5600, label: "5.6K" },
  { freq: 8000, label: "8K" },
  { freq: 11300, label: "11K" },
  { freq: 16000, label: "16K" },
];

const BAND_COUNT = FREQ_LIST.length;

/* ─── presets (20 bands) ─── */
const PRESETS: Preset[] = [
  { name: "Flat", icon: "⊝", bands: Array(BAND_COUNT).fill(0) },
  { name: "Bass Boost", icon: "🔊", bands: [8,7,6,5,4,3,2,1,0,0,0,0,0,0,0,0,0,0,0,0] },
  { name: "Treble Boost", icon: "🔔", bands: [0,0,0,0,0,0,0,0,0,0,0,0,1,2,3,4,5,6,7,8] },
  { name: "Rock", icon: "🎸", bands: [5,5,4,3,2,1,0,-1,-1,0,0,1,2,3,3,4,4,5,5,5] },
  { name: "Pop", icon: "🎤", bands: [-1,0,1,2,3,4,4,3,2,1,0,-1,-1,0,1,2,2,1,1,2] },
  { name: "Jazz", icon: "🎷", bands: [3,3,2,2,1,0,0,-1,-1,0,0,1,1,2,2,3,3,3,2,2] },
  { name: "Classical", icon: "🎻", bands: [4,4,3,3,2,1,0,-1,-1,0,0,0,1,2,2,3,3,4,4,4] },
  { name: "Hip-Hop", icon: "🎧", bands: [6,6,5,4,3,2,1,0,0,0,0,1,1,0,0,1,2,2,3,3] },
  { name: "Electronic", icon: "⚡", bands: [5,5,4,3,2,1,0,-1,-2,-1,0,0,1,2,3,4,5,6,6,6] },
  { name: "R&B", icon: "💜", bands: [3,4,5,6,5,4,3,1,0,-1,-2,-1,0,1,2,2,3,3,2,2] },
  { name: "Vocal", icon: "🎙️", bands: [-2,-2,-1,-1,0,0,1,2,3,4,4,4,3,2,1,0,0,-1,-1,-2] },
  { name: "Acústico", icon: "🪕", bands: [3,3,2,2,1,0,0,0,0,1,1,2,2,3,3,3,2,2,1,1] },
  { name: "Loudness", icon: "📢", bands: [6,5,4,2,0,-1,-2,-3,-3,-2,-2,-2,-1,0,1,3,4,5,6,7] },
  { name: "Late Night", icon: "🌙", bands: [3,3,2,1,0,0,0,1,2,2,2,2,2,1,0,0,0,1,2,3] },
];

const DEFAULT_BANDS: Band[] = FREQ_LIST.map(f => ({ ...f, value: 0 }));

const STORAGE_KEY = "xerife-eq-bands-20";
const PRESET_KEY = "xerife-eq-preset";
const EQ_EVENT_NAME = "xerife-eq-change";

function loadBands(): Band[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const vals: number[] = JSON.parse(raw);
      if (vals.length === BAND_COUNT) {
        return DEFAULT_BANDS.map((b, i) => ({ ...b, value: vals[i] ?? 0 }));
      }
    }
  } catch {}
  return DEFAULT_BANDS.map(b => ({ ...b }));
}
function saveBands(bands: Band[]) {
  const values = bands.map(b => b.value);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<number[]>(EQ_EVENT_NAME, { detail: values }));
  }
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

const Equalizer = ({ open, onClose }: EqualizerProps) => {
  const [bands, setBands] = useState<Band[]>(loadBands);
  const [activePreset, setActivePreset] = useState(loadPreset);
  const [showPresets, setShowPresets] = useState(false);
  const [activeBand, setActiveBand] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

  /* ─── Canvas curve rendering ─── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const midY = h / 2;

    ctx.clearRect(0, 0, w, h);

    // Grid lines
    const style = getComputedStyle(canvas);
    const borderColor = style.getPropertyValue("--border-color") || "rgba(255,255,255,0.08)";
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 0.5;
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(w, midY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Build points
    const points = bands.map((b, i) => ({
      x: (i / (bands.length - 1)) * w,
      y: midY - (b.value / DB_MAX) * midY * 0.85,
    }));

    // Smooth catmull-rom to bezier
    const curvePath = new Path2D();
    curvePath.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = (prev.x + curr.x) / 2;
      curvePath.bezierCurveTo(cpx, prev.y, cpx, curr.y, curr.x, curr.y);
    }

    // Fill gradient
    const fillPath = new Path2D(curvePath as any);
    // We need to manually rebuild for fill
    const fillPath2 = new Path2D();
    fillPath2.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = (prev.x + curr.x) / 2;
      fillPath2.bezierCurveTo(cpx, prev.y, cpx, curr.y, curr.x, curr.y);
    }
    fillPath2.lineTo(w, h);
    fillPath2.lineTo(0, h);
    fillPath2.closePath();

    // Get primary color from CSS
    const primaryRaw = style.getPropertyValue("--primary")?.trim() || "142 70% 45%";
    const primaryHSL = `hsl(${primaryRaw})`;

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, primaryHSL.replace(")", " / 0.35)").replace("hsl(", "hsla("));
    grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad;
    ctx.fill(fillPath2);

    // Stroke curve
    ctx.strokeStyle = primaryHSL;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke(curvePath);

    // Dots
    points.forEach((p, i) => {
      const isActive = activeBand === i;
      ctx.beginPath();
      ctx.arc(p.x, p.y, isActive ? 5 : 3, 0, Math.PI * 2);
      ctx.fillStyle = primaryHSL;
      ctx.fill();
      if (isActive) {
        ctx.strokeStyle = primaryHSL.replace(")", " / 0.4)").replace("hsl(", "hsla(");
        ctx.lineWidth = 6;
        ctx.stroke();
      }
    });
  }, [bands, activeBand]);

  /* ─── Touch/pointer handling on canvas curve ─── */
  const handleCurvePointer = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const w = rect.width;

    // Find closest band
    const bandIdx = Math.round((x / w) * (bands.length - 1));
    const clampedIdx = Math.max(0, Math.min(bands.length - 1, bandIdx));

    const y = e.clientY - rect.top;
    const h = rect.height;
    const midY = h / 2;
    const ratio = (midY - y) / (midY * 0.85);
    const dbValue = Math.round(Math.max(DB_MIN, Math.min(DB_MAX, ratio * DB_MAX)));

    setActiveBand(clampedIdx);
    updateBand(clampedIdx, dbValue);

    canvas.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      const mx = ev.clientX - rect.left;
      const my = ev.clientY - rect.top;
      const bi = Math.round((mx / w) * (bands.length - 1));
      const ci = Math.max(0, Math.min(bands.length - 1, bi));
      const r = (midY - my) / (midY * 0.85);
      const db = Math.round(Math.max(DB_MIN, Math.min(DB_MAX, r * DB_MAX)));
      setActiveBand(ci);
      updateBand(ci, db);
    };
    const up = () => {
      setActiveBand(null);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
    };
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
  }, [bands.length, updateBand]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[199] bg-black/70 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            className="fixed inset-x-0 bottom-0 z-[200] flex flex-col bg-gradient-to-b from-card via-card to-background rounded-t-3xl max-h-[94vh] overflow-y-auto shadow-2xl border-t border-border/30"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/15 flex items-center justify-center">
                  <Volume2 size={20} className="text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground tracking-tight">Equalizador</h2>
                  <p className="text-[10px] text-muted-foreground/70">20 bandas · Tempo real</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={reset} className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors" title="Resetar">
                  <RotateCcw size={16} />
                </button>
                <button onClick={onClose} className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Preset selector */}
            <div className="px-5 pb-2">
              <button
                onClick={() => setShowPresets(!showPresets)}
                className="w-full flex items-center justify-between rounded-2xl bg-muted/30 border border-border/40 px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">{PRESETS.find(p => p.name === activePreset)?.icon || "🎵"}</span>
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
                    <div className="grid grid-cols-3 gap-1.5 pt-2.5 max-h-40 overflow-y-auto">
                      {PRESETS.map(p => (
                        <button
                          key={p.name}
                          onClick={() => applyPreset(p)}
                          className={`flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-[11px] font-medium transition-all ${
                            activePreset === p.name
                              ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 scale-[1.02]"
                              : "bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
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

            {/* Interactive curve display */}
            <div className="px-5 pb-1">
              <div className="relative rounded-2xl bg-muted/10 border border-border/20 overflow-hidden">
                {/* dB scale labels */}
                <div className="absolute left-2 top-0 bottom-0 flex flex-col justify-between py-2 pointer-events-none z-10">
                  {["+12", "+6", "0", "-6", "-12"].map((l, i) => (
                    <span key={i} className={`text-[8px] font-mono ${l === "0" ? "text-primary/80 font-bold" : "text-muted-foreground/30"}`}>{l}</span>
                  ))}
                </div>

                {/* Active band indicator */}
                {activeBand !== null && (
                  <div className="absolute top-2 right-3 z-10 bg-primary/90 text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-lg shadow-lg">
                    {bands[activeBand].label}Hz · {bands[activeBand].value > 0 ? "+" : ""}{bands[activeBand].value}dB
                  </div>
                )}

                <canvas
                  ref={canvasRef}
                  className="w-full touch-none cursor-crosshair"
                  style={{ height: 140, ["--border-color" as any]: "rgba(255,255,255,0.06)", ["--primary" as any]: undefined }}
                  onPointerDown={handleCurvePointer}
                />
              </div>
            </div>

            {/* Frequency labels under curve */}
            <div className="px-8 pb-2 flex justify-between">
              {[0, 4, 9, 14, 19].map(i => (
                <span key={i} className="text-[8px] text-muted-foreground/50 font-mono">{bands[i]?.label}</span>
              ))}
            </div>

            {/* Band sliders — compact horizontal scrollable */}
            <div className="px-3 pb-3">
              <div className="flex gap-0 overflow-x-auto pb-2 scrollbar-hide">
                {bands.map((band, i) => {
                  const ratio = (band.value - DB_MIN) / (DB_MAX - DB_MIN);
                  const isActive = activeBand === i;

                  return (
                    <div key={band.freq} className="flex flex-col items-center flex-shrink-0" style={{ width: `${100 / BAND_COUNT}%`, minWidth: 18 }}>
                      {/* Value */}
                      <span className={`text-[7px] font-mono font-bold leading-none mb-0.5 ${
                        band.value > 0 ? "text-primary" : band.value < 0 ? "text-destructive" : "text-muted-foreground/30"
                      }`}>
                        {band.value > 0 ? `+${band.value}` : band.value === 0 ? "·" : band.value}
                      </span>

                      {/* Vertical slider track */}
                      <div
                        className={`relative rounded-full cursor-pointer touch-none transition-colors ${isActive ? "bg-primary/15" : "bg-muted/15"}`}
                        style={{ width: 14, height: 110 }}
                        onPointerDown={(e) => {
                          const el = e.currentTarget;
                          el.setPointerCapture(e.pointerId);
                          const rect = el.getBoundingClientRect();
                          const calc = (clientY: number) => {
                            const r = 1 - Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
                            return Math.round(DB_MIN + r * (DB_MAX - DB_MIN));
                          };
                          setActiveBand(i);
                          updateBand(i, calc(e.clientY));
                          const move = (ev: PointerEvent) => updateBand(i, calc(ev.clientY));
                          const up = () => {
                            setActiveBand(null);
                            el.removeEventListener("pointermove", move);
                            el.removeEventListener("pointerup", up);
                          };
                          el.addEventListener("pointermove", move);
                          el.addEventListener("pointerup", up);
                        }}
                      >
                        {/* Track line */}
                        <div className="absolute left-1/2 -translate-x-1/2 w-[2px] h-full rounded-full bg-border/30" />
                        {/* Zero line */}
                        <div className="absolute left-0 right-0 top-1/2 h-px bg-primary/15" />
                        {/* Fill */}
                        {band.value !== 0 && (
                          <div
                            className="absolute left-1/2 -translate-x-1/2 w-[4px] rounded-full bg-primary/50"
                            style={
                              band.value > 0
                                ? { bottom: "50%", height: `${(ratio - 0.5) * 110}px` }
                                : { top: "50%", height: `${(0.5 - ratio) * 110}px` }
                            }
                          />
                        )}
                        {/* Thumb */}
                        <div
                          className={`absolute left-1/2 -translate-x-1/2 rounded-full bg-primary shadow-lg shadow-primary/30 border-2 border-background transition-none pointer-events-none ${
                            isActive ? "w-4 h-4 -ml-0" : "w-3 h-3"
                          }`}
                          style={{ top: (1 - ratio) * 110 - (isActive ? 8 : 6) }}
                        />
                      </div>

                      {/* Freq label */}
                      <span className={`text-[6px] mt-0.5 font-mono ${isActive ? "text-primary font-bold" : "text-muted-foreground/40"}`}>
                        {band.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Info note */}
            <div className="px-5 pb-4">
              <div className="flex items-start gap-2.5 rounded-2xl bg-primary/5 border border-primary/10 px-3.5 py-2.5">
                <span className="text-sm mt-0.5">🎧</span>
                <p className="text-[10px] leading-relaxed text-muted-foreground/80">
                  EQ aplicada via <span className="text-foreground/90 font-medium">Web Audio API</span> em tempo real. Para melhor resultado, use fones de ouvido. No app nativo (Android/iOS), o processamento é feito pelo sistema.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default Equalizer;
