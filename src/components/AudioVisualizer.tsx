import { useEffect, useState } from "react";

interface AudioVisualizerProps {
  isPlaying: boolean;
  barCount?: number;
  className?: string;
}

const AudioVisualizer = ({ isPlaying, barCount = 32, className = "" }: AudioVisualizerProps) => {
  const [bars, setBars] = useState<number[]>(Array(barCount).fill(0.3));

  useEffect(() => {
    if (!isPlaying) {
      setBars(Array(barCount).fill(0.15));
      return;
    }
    const interval = setInterval(() => {
      setBars(prev => prev.map(() => 0.15 + Math.random() * 0.85));
    }, 80);
    return () => clearInterval(interval);
  }, [isPlaying, barCount]);

  return (
    <div className={`flex items-end gap-[2px] h-16 ${className}`}>
      {bars.map((height, i) => (
        <div
          key={i}
          className="flex-1 rounded-full transition-all duration-100"
          style={{
            height: `${height * 100}%`,
            background: `linear-gradient(to top, hsl(var(--primary)), hsl(var(--secondary)))`,
            opacity: isPlaying ? 0.9 : 0.3,
          }}
        />
      ))}
    </div>
  );
};

export default AudioVisualizer;
