import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Disc3 } from "lucide-react";

// Simple fallback image component reused logic
function ImgWithFallback({ src, alt, IconComponent, size }: { src?: string; alt: string; IconComponent: any; size: number }) {
  const [error, setError] = useState(!src);

  useEffect(() => {
    if (src) setError(false);
  }, [src]);

  if (error || !src) {
    return (
      <div className="w-full h-full flex items-center justify-center text-white/40 bg-white/5 border border-white/5">
        <IconComponent size={size} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className="w-full h-full object-cover"
      referrerPolicy="no-referrer"
      onError={() => setError(true)}
    />
  );
}

interface AlbumHeaderProps {
  album: any;
  tracks: any[];
  albumArtist: string;
}

export function AlbumHeader({ album, tracks, albumArtist }: AlbumHeaderProps) {
  const artwork = album.artwork?.url;

  return (
    <div className="flex flex-col md:flex-row gap-5 md:gap-6 items-center md:items-end">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-40 h-40 md:w-48 md:h-48 rounded-lg shadow-2xl overflow-hidden shrink-0 border border-white/[0.15]"
      >
        <ImgWithFallback 
          src={artwork} 
          alt={album.name} 
          IconComponent={Disc3} 
          size={48} 
        />
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
        className="flex flex-col gap-2 flex-1 text-center md:text-left mt-2 md:mt-0"
      >
        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight line-clamp-2 leading-tight">
          {album.name}
        </h1>
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-2 gap-y-1 text-sm mt-1">
          <span className="font-semibold text-white">{albumArtist}</span>
          {album.firstReleaseDate && (
            <>
              <span className="text-white/40">•</span>
              <span className="text-white/70 font-medium">
                {album.firstReleaseDate.split("-")[0]}
              </span>
            </>
          )}
          <span className="text-white/40">•</span>
          <span className="text-white/70 font-medium">
            {tracks.length} songs
          </span>
        </div>
        {album.tags && album.tags.length > 0 && (
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-3">
            {album.tags.slice(0, 4).map((tag: any, idx: number) => (
              <span key={idx} className="text-[10px] font-bold tracking-widest uppercase text-white/50 bg-white/5 px-2 py-1 rounded opacity-75 hover:opacity-100 cursor-pointer transition-opacity">
                 {tag.name}
              </span>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
