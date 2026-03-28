import { useEffect, useRef } from "react";

const STORAGE_KEY = "xerife-eq-bands-20";
const EQ_EVENT_NAME = "xerife-eq-change";

const FREQ_LIST = [
  20, 31, 44, 63, 87, 125, 175, 250, 350, 500,
  700, 1000, 1400, 2000, 2800, 4000, 5600, 8000, 11300, 16000,
];

type EqGraph = {
  context: AudioContext;
  source: MediaElementAudioSourceNode;
  filters: BiquadFilterNode[];
  media: HTMLMediaElement;
};

const DEFAULT_BANDS = Array(FREQ_LIST.length).fill(0);

function loadStoredBands(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...DEFAULT_BANDS];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length !== FREQ_LIST.length) return [...DEFAULT_BANDS];
    return parsed.map((v) => Number(v) || 0);
  } catch {
    return [...DEFAULT_BANDS];
  }
}

function getAudioContextClass(): typeof AudioContext | null {
  if (typeof window === "undefined") return null;
  return window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext || null;
}

function createEqGraph(media: HTMLMediaElement): EqGraph | null {
  const AC = getAudioContextClass();
  if (!AC) return null;

  try {
    const context = new AC();
    const source = context.createMediaElementSource(media);
    const filters = FREQ_LIST.map((freq) => {
      const filter = context.createBiquadFilter();
      filter.type = "peaking";
      filter.frequency.value = freq;
      filter.Q.value = 1.05;
      filter.gain.value = 0;
      return filter;
    });

    source.connect(filters[0]);
    for (let i = 0; i < filters.length - 1; i++) {
      filters[i].connect(filters[i + 1]);
    }
    filters[filters.length - 1].connect(context.destination);

    return { context, source, filters, media };
  } catch {
    return null;
  }
}

function applyBands(graph: EqGraph, bands: number[]) {
  const now = graph.context.currentTime;
  graph.filters.forEach((filter, i) => {
    filter.gain.cancelScheduledValues(now);
    filter.gain.setTargetAtTime(bands[i] ?? 0, now, 0.015);
  });
}

export function useGlobalEqualizer() {
  const graphMapRef = useRef<Map<HTMLMediaElement, EqGraph>>(new Map());
  const bandsRef = useRef<number[]>(DEFAULT_BANDS);

  useEffect(() => {
    bandsRef.current = loadStoredBands();

    const connectEqToMedia = (media: HTMLMediaElement) => {
      if (graphMapRef.current.has(media)) return;

      const graph = createEqGraph(media);
      if (!graph) return;

      applyBands(graph, bandsRef.current);

      const resumeContext = () => {
        if (graph.context.state === "suspended") {
          graph.context.resume().catch(() => {});
        }
      };

      media.addEventListener("play", resumeContext, { passive: true });
      graphMapRef.current.set(media, graph);
    };

    const scanMedia = () => {
      const mediaEls = document.querySelectorAll<HTMLMediaElement>('audio[data-eq-enabled="true"], video[data-eq-enabled="true"]');
      mediaEls.forEach(connectEqToMedia);
    };

    const handleEqChange = (event: Event) => {
      const detail = (event as CustomEvent<number[]>).detail;
      if (!Array.isArray(detail) || detail.length !== FREQ_LIST.length) return;
      bandsRef.current = detail.map((v) => Number(v) || 0);
      graphMapRef.current.forEach((graph) => applyBands(graph, bandsRef.current));
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      bandsRef.current = loadStoredBands();
      graphMapRef.current.forEach((graph) => applyBands(graph, bandsRef.current));
    };

    const observer = new MutationObserver(() => scanMedia());
    observer.observe(document.body, { childList: true, subtree: true });

    scanMedia();
    window.addEventListener(EQ_EVENT_NAME, handleEqChange as EventListener);
    window.addEventListener("storage", handleStorage);

    return () => {
      observer.disconnect();
      window.removeEventListener(EQ_EVENT_NAME, handleEqChange as EventListener);
      window.removeEventListener("storage", handleStorage);
      graphMapRef.current.forEach((graph) => {
        try {
          graph.source.disconnect();
          graph.filters.forEach((f) => f.disconnect());
          graph.context.close().catch(() => {});
        } catch {
          // no-op
        }
      });
      graphMapRef.current.clear();
    };
  }, []);
}
