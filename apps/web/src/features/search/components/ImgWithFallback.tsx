import { useState, useEffect } from "react";
import { Mic2, Music, Disc3 } from "lucide-react";

export function ImgWithFallback({
  src,
  alt,
  type,
  size = 24,
}: {
  src?: string;
  alt: string;
  type: "track" | "artist" | "album";
  size?: number;
}) {
  const [error, setError] = useState(!src);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (src) {
      setError(false);
      setLoaded(false);
    }
  }, [src]);

  let IconComponent = Music;
  if (type === "artist") IconComponent = Mic2;
  if (type === "album") IconComponent = Disc3;

  return (
    <div className="relative w-full h-full bg-white/5 overflow-hidden">
      {/* 1. Loading Skeleton / Shimmer (Tampil saat gambar belum selesai di-download) */}
      {!loaded && !error && src && (
        <div className="absolute inset-0 bg-white/10 animate-pulse" />
      )}

      {/* 2. Error Fallback / Default Icon (Tampil jika gagal dimuat atau tidak ada src) */}
      {(error || !src) ? (
        <div className="absolute inset-0 flex items-center justify-center text-white/40">
          <IconComponent size={size} />
        </div>
      ) : null}

      {/* 3. Actual Image */}
      {!error && src ? (
        <img
          src={src}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-500 ease-in-out ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
          referrerPolicy="no-referrer"
          onLoad={() => setLoaded(true)}
          onError={() => {
            setError(true);
            setLoaded(true); // Matikan loading skeleton jika terjadi error
          }}
        />
      ) : null}
    </div>
  );
}
