import { useState, useRef, useEffect } from "react";

interface BlurImageProps {
  src: string;
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
}

/**
 * Image component with lazy loading and a blur-up placeholder effect.
 * Shows a tiny blurred version (via CSS blur on a low-res inline placeholder)
 * then fades in the full image once loaded.
 */
const BlurImage = ({ src, alt, className = "", loading = "lazy" }: BlurImageProps) => {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // Reset on src change
    setLoaded(false);

    // If the image is already cached by the browser
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [src]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Blurred placeholder background */}
      <div
        className={`absolute inset-0 bg-muted transition-opacity duration-500 ${
          loaded ? "opacity-0" : "opacity-100"
        }`}
        style={{
          backgroundImage: `url(${src})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(20px)",
          transform: "scale(1.1)",
        }}
      />
      {/* Actual image */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        loading={loading}
        onLoad={() => setLoaded(true)}
        className={`relative z-10 w-full h-full object-cover transition-opacity duration-500 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
};

export default BlurImage;
