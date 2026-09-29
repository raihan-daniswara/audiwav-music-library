import { useState, useEffect } from "react";
import { Mic2 } from "lucide-react";
import { ImgWithFallback } from "./ImgWithFallback";
import { useNavigationStore } from "@/store/useNavigationStore";
import { motion } from "framer-motion";

const ArtistCardItem = ({ artist }: { artist: any }) => {
  const [finalArtwork, setFinalArtwork] = useState<string | undefined>(
    artist.artworkUrl,
  );
  const navigate = useNavigationStore((state) => state.navigate);

  useEffect(() => {
    // Kalau artwork dari array artists belum ada, coba fetch Wiki Image secara async (via endpoint /artist/artwork)
    let isMounted = true;
    if (!artist.artworkUrl && artist.mbid) {
      fetch(`/api/metadata/artist/artwork?mbid=${artist.mbid}`)
        .then((r) => r.json())
        .then((res) => {
          if (isMounted && res.url) {
            setFinalArtwork(res.url);
          }
        })
        .catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, [artist.mbid, artist.artworkUrl]);

  return (
    <div 
      className="flex flex-col items-center gap-3 p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-colors group text-center border border-transparent hover:border-white/5"
      onClick={() => {
        if (artist.mbid) navigate("artist", artist.mbid);
      }}
    >
      <div className="w-20 h-20 rounded-full shadow-lg group-hover:shadow-xl transition-shadow border border-white/5 overflow-hidden ring-1 ring-white/10">
        <ImgWithFallback
          src={finalArtwork}
          alt={artist.name}
          type="artist"
          size={24}
        />
      </div>
      <span className="text-sm font-semibold line-clamp-2 px-1 text-white/90 group-hover:text-white">
        {artist.name}
      </span>
    </div>
  );
};

export const ArtistsSection = ({ artists, isLoading }: { artists: any[]; isLoading: boolean }) => {
  return (
    <section className="flex flex-col gap-4">
      <h3 className="text-lg font-semibold flex items-center gap-2 border-b border-white/10 pb-2 text-white">
        <Mic2 size={18} className="text-white/70" /> Artists
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-2 gap-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-3 p-3 text-center bg-white/[0.02] rounded-xl border border-white/5"
            >
              <div className="w-20 h-20 bg-white/5 rounded-full animate-pulse border border-white/5" />
              <div className="h-3 w-16 bg-white/10 rounded animate-pulse" />
            </div>
          ))
        ) : artists.length > 0 ? (
          artists.map((artist, i) => (
            <motion.div
              key={artist.mbid || artist.name || i}
              role="button"
              tabIndex={0}
              aria-label={`View artist ${artist.name}`}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                duration: 0.25,
                delay: Math.min(i * 0.04, 0.3),
                ease: "easeOut",
              }}
            >
              <ArtistCardItem artist={artist} />
            </motion.div>
          ))
        ) : (
          <div className="col-span-full py-6 text-center text-white/30 text-sm">
            No artists found
          </div>
        )}
      </div>
    </section>
  );
};
