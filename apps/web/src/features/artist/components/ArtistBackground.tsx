import { motion, AnimatePresence } from "framer-motion";
import { useArtistArtwork } from "../api/queries/useArtistDetail";

interface ArtistBackgroundProps {
  mbid?: string;
}

export function ArtistBackground({ mbid }: ArtistBackgroundProps) {
  const { data: artworkUrl } = useArtistArtwork(mbid);

  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden rounded-b-xl">
      <AnimatePresence mode="wait">
        {artworkUrl && (
          <motion.div
            key={artworkUrl}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="sticky top-0 left-0 w-full h-[100vh] z-0 pointer-events-none"
            style={{
              maskImage: "radial-gradient(ellipse at 50% 30%, black 0%, transparent 60%)",
              WebkitMaskImage: "radial-gradient(ellipse at 50% 30%, black 0%, transparent 60%)"
            }}
          >
            <div className="absolute -inset-[50%] flex items-center justify-center animate-spin-slow origin-center">
              <img
                src={artworkUrl}
                alt=""
                className="w-full h-full object-cover scale-[1.2] blur-[64px] mix-blend-screen opacity-[0.4]"
              />
            </div>

            <div className="absolute inset-0 bg-[#0f0f0f]/50" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
