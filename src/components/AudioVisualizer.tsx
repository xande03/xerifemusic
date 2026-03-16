import { useEffect, useState } from "react";

interface AudioVisualizerProps {
  isPlaying: boolean;
  barCount?: number;
  className?: string;
}

const AudioVisualizer = ({ isPlaying, barCount = 32, className = "" }: AudioVisualizerProps) => {
  const [bars, setBars] = useState<number[]>(Array(barCount).fill(0.15));

  useEffect(() => {
    if (!isPlaying) {
      setBars(Array(barCount).fill(0.1));
      return;
    }
    const interval = setInterval(() => {
      setBars(prev => prev.map(() => 0.1 + Math.random() * 0.9));
    }, 80);
    return () => clearInterval(interval);
  }, [isPlaying, barCount]);

  return (
    <div className={`flex items-end gap-[1px] h-12 ${className}`}>
      {bars.map((height, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm transition-all duration-75"
          style={{
            height: `${height * 100}%`,
            backgroundColor: `hsl(var(--primary))`,
            opacity: isPlaying ? 0.8 : 0.2,
          }}
        />
      ))}
    </div>
  );
};

export default AudioVisualizer;
