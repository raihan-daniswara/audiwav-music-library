
import { useNavigationStore } from "@/store/useNavigationStore";
import { ImgWithFallback } from "@/features/search/components/ImgWithFallback";
import { motion } from "framer-motion";

interface ArtistAlbumsProps {
  albums: any[];
}

export function ArtistAlbums({ albums }: ArtistAlbumsProps) {
  const navigate = useNavigationStore((state) => state.navigate);

  if (!albums || albums.length === 0) return null;

  return (
    <div className="flex flex-col gap-4 mt-12 relative z-10 w-full mb-24">
      <h2 className="text-xl font-bold text-white mb-2">Discography</h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
        {albums.map((album, i) => (
          <motion.div
            key={album.mbid || i}
            role="button"
            tabIndex={0}
            onClick={() => {
              if (album.mbid) navigate("album", album.mbid);
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.3,
              delay: Math.min(i * 0.03, 0.4),
              ease: "easeOut",
            }}
            className="flex flex-col gap-3 group cursor-pointer"
          >
            <div className="aspect-square rounded-xl overflow-hidden relative shadow-md bg-white/5 border border-white/5">
              <ImgWithFallback
                src={album.artworkUrl}
                alt={album.name}
                type="album"
                size={32}
              />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            <div className="flex flex-col">
              <span className="font-semibold text-white/90 group-hover:text-white truncate">
                {album.name}
              </span>
              <span className="text-sm text-white/50 truncate">
                {album.firstReleaseDate?.split("-")[0] || "Unknown Year"} • {album.type || "Album"}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
