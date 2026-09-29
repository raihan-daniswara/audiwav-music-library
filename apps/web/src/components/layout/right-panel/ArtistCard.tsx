import { motion, AnimatePresence } from "framer-motion";
import { Mic2 } from "lucide-react";

interface ArtistCardProps {
  artistName: string;
  artistArtwork?: string;
  annotation?: string;
  isLoadingDetail: boolean;
}

export function ArtistCard({
  artistName,
  artistArtwork,
  annotation,
  isLoadingDetail,
}: ArtistCardProps) {
  return (
    <div className="bg-[#1e1e1e]/80 backdrop-blur-xl rounded-[16px] overflow-hidden flex flex-col mt-2 group cursor-pointer hover:bg-[#242424]/80 transition-colors shrink-0">
      <div className="relative h-56 bg-white/5 w-full overflow-hidden">
        <AnimatePresence mode="wait">
          {artistArtwork ? (
            <motion.img
              key={`banner-${artistArtwork}`}
              src={artistArtwork}
              alt="Artist Banner"
              initial={{ opacity: 0, scale: 1.08 }}
              animate={{ opacity: 0.9, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : isLoadingDetail ? (
            <motion.div
              key="banner-skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full h-full bg-white/10 animate-pulse"
            />
          ) : (
            <motion.div
              key="banner-fallback"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="w-full h-full flex items-center justify-center bg-[#292929]"
            >
              <Mic2 size={40} className="text-white/10" />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="absolute inset-0 bg-gradient-to-b from-[#1e1e1e]/10 via-transparent to-[#1e1e1e]/95 pointer-events-none" />

        <span className="absolute top-4 left-4 font-bold text-white text-[15px] z-10">
          About the artist
        </span>
      </div>

      <div className="flex flex-col p-5 pt-3 mb-2">
        <span className="font-bold text-lg text-white mb-1">{artistName}</span>
        {isLoadingDetail ? (
          <div className="flex flex-col gap-1.5 mt-2">
            <div className="h-3 w-full bg-white/10 rounded animate-pulse" />
            <div className="h-3 w-5/6 bg-white/10 rounded animate-pulse" />
            <div className="h-3 w-1/2 bg-white/10 rounded animate-pulse" />
          </div>
        ) : annotation ? (
          <p className="text-sm text-white/50 leading-relaxed font-medium line-clamp-4">
            {annotation}
          </p>
        ) : null}
      </div>
    </div>
  );
}
