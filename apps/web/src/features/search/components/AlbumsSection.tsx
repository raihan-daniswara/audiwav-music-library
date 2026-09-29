import { motion } from "framer-motion";
import { Disc3 } from "lucide-react";
import { ImgWithFallback } from "./ImgWithFallback";
import { useNavigationStore } from "@/store/useNavigationStore";

const AlbumSkeleton = () => (
  <div className="flex flex-col gap-2 p-3 bg-white/[0.02] rounded-xl border border-white/5">
    <div className="aspect-square bg-white/5 rounded-lg animate-pulse border border-white/5" />
    <div className="flex flex-col gap-2 mt-1">
      <div className="h-3.5 w-3/4 bg-white/10 rounded animate-pulse" />
      <div className="h-2.5 w-1/2 bg-white/5 rounded animate-pulse" />
    </div>
  </div>
);

export const AlbumsSection = ({ albums, isLoading }: { albums: any[]; isLoading: boolean }) => {
  const navigate = useNavigationStore((state) => state.navigate);

  return (
    <section className="flex flex-col gap-4 pt-4 border-t border-white/10">
      <h3 className="text-lg font-semibold flex items-center gap-2 text-white">
        <Disc3 size={18} className="text-white/70" /> Albums
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <AlbumSkeleton key={i} />)
        ) : albums.length > 0 ? (
          albums.map((album, i) => (
            <motion.div
              key={album.id || album.mbid || i}
              role="button"
              tabIndex={0}
              aria-label={`View album ${album.title || album.name || "Unknown"}`}
              onClick={() => {
                 if (album.mbid) navigate("album", album.mbid);
              }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.3,
                delay: Math.min(i * 0.03, 0.3),
                ease: "easeOut",
              }}
              className="flex flex-col gap-2 p-2.5 rounded-xl hover:bg-white/5 transition-colors group cursor-pointer border border-transparent hover:border-white/5 focus:outline-none focus:ring-1 focus:ring-white/30"
            >
              <div className="aspect-square rounded-lg group-hover:bg-white/15 transition-colors border border-white/5 shadow-md overflow-hidden relative">
                <ImgWithFallback
                  src={album.artworkUrl}
                  alt={album.title || "Album"}
                  type="album"
                  size={32}
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold truncate text-white/90 group-hover:text-white">
                  {album.title || album.name || "Unknown"}
                </span>
                <span className="text-xs text-white/60 truncate">Album</span>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="text-sm text-white/50 py-2 col-span-full">
            No albums found.
          </div>
        )}
      </div>
    </section>
  );
};
