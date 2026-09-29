import { motion, AnimatePresence } from "framer-motion";
import { Music, Disc3 } from "lucide-react";
import { useNavigationStore } from "@/store/useNavigationStore";
import { useSearchStore } from "@/features/search";

interface TrackHeaderProps {
  artwork: string | null;
  rawArtwork?: string;
  trackTitle: string;
  artistName: string;
  albumName?: string;
  albumMbid?: string;
  releaseYear?: string | null;
  isLoadingDetail: boolean;
  onImageError: () => void;
}

export function TrackHeader({
  artwork,
  rawArtwork,
  trackTitle,
  artistName,
  albumName,
  albumMbid,
  releaseYear,
  isLoadingDetail,
  onImageError,
}: TrackHeaderProps) {
  const navigate = useNavigationStore((state) => state.navigate);
  const setQuery = useSearchStore((state) => state.setQuery);

  const handleArtistClick = (keyword: string) => {
    setQuery(keyword);
    navigate("search");
  };

  const handleAlbumClick = () => {
    if (albumMbid) {
      navigate("album", albumMbid);
    } else if (albumName) {
      setQuery(`${albumName} album`);
      navigate("search");
    }
  };

  return (
    <div className="flex flex-col gap-4 shrink-0">
      {/* Artwork dengan transisi halus */}
      <div
        onClick={handleAlbumClick}
        className="relative w-full aspect-square rounded-[12px] overflow-hidden border border-white/5 shadow-2xl cursor-pointer hover:opacity-90 transition-opacity"
        role="button"
      >
        <AnimatePresence mode="wait">
          {artwork ? (
            <motion.img
              key={`art-${rawArtwork}`}
              src={artwork}
              alt="Cover"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="w-full h-full object-cover"
              onError={onImageError}
            />
          ) : isLoadingDetail ? (
            <motion.div
              key="art-skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full h-full bg-white/5 animate-pulse"
            />
          ) : (
            <motion.div
              key="art-fallback"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="w-full h-full flex items-center justify-center bg-white/[0.04]"
            >
              <Music size={56} className="text-white/20" strokeWidth={1.5} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-start justify-between px-1">
        <div className="flex flex-col min-w-0 flex-1 pr-2">
          <h2
            onClick={handleAlbumClick}
            className="text-2xl font-bold tracking-tight text-white hover:underline cursor-pointer break-words"
          >
            {trackTitle}
          </h2>

          <div className="flex items-center gap-1.5 flex-wrap mt-1">
            <p
              onClick={() => handleArtistClick(artistName)}
              className="text-white/60 font-medium text-sm hover:underline cursor-pointer hover:text-white transition-colors"
            >
              {artistName}
            </p>

            {/* Transisi Album Info */}
            <AnimatePresence mode="wait">
              {albumName ? (
                <motion.div
                  key="album-content"
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="flex items-center gap-1.5"
                >
                  <span className="text-white/30 text-xs">•</span>
                  <p
                    onClick={handleAlbumClick}
                    className="text-white/40 font-medium text-sm hover:underline cursor-pointer hover:text-white/80 transition-colors flex items-center gap-1"
                  >
                    <Disc3 size={12} />
                    {albumName}
                  </p>
                </motion.div>
              ) : isLoadingDetail ? (
                <motion.span
                  key="album-skeleton"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="h-3 w-20 bg-white/10 rounded animate-pulse inline-block"
                />
              ) : null}
            </AnimatePresence>

            {/* Transisi Release Year */}
            <AnimatePresence mode="wait">
              {releaseYear ? (
                <motion.span
                  key="year-content"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="text-white/30 text-xs ml-1 bg-white/5 px-1.5 py-0.5 rounded"
                >
                  {releaseYear}
                </motion.span>
              ) : isLoadingDetail ? (
                <motion.span
                  key="year-skeleton"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="h-3 w-8 bg-white/10 rounded animate-pulse inline-block ml-1"
                />
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
