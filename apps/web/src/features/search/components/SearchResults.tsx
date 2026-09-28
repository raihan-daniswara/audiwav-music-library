import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useSearchStore } from "../store";
import { useSearchMetadata, useArtistArtwork, type SearchResultItem } from "../api";
import { useDebounce } from "../../../hooks/useDebounce";
import { Disc3, Mic2, Music, Play, Clock } from "lucide-react";
import { usePlayerStore } from "../../player";

const TrackSkeleton = () => (
  <div className="flex items-center gap-4 px-3 py-2.5 rounded-lg">
    <div className="w-11 h-11 bg-white/5 rounded-md shrink-0 animate-pulse" />
    <div className="flex flex-col flex-1 gap-2 justify-center min-w-0">
      <div className="h-3.5 w-1/3 bg-white/10 rounded animate-pulse" />
      <div className="h-2.5 w-1/4 bg-white/5 rounded animate-pulse" />
    </div>
    <div className="w-24 h-2.5 bg-white/5 rounded animate-pulse hidden md:block" />
    <div className="w-10 h-2.5 bg-white/5 rounded animate-pulse hidden sm:block ml-auto" />
  </div>
);

const ArtistCard = ({
  artist,
}: {
  artist: { name: string; mbid?: string; artworkUrl?: string };
}) => {
  const { data: wikiArtwork } = useArtistArtwork(artist.mbid, artist.artworkUrl);
  const finalArtwork = wikiArtwork || artist.artworkUrl;

  return (
    <div className="flex flex-col items-center gap-3 p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-colors group text-center border border-transparent hover:border-white/5">
      <div className="w-20 h-20 rounded-full shadow-lg group-hover:shadow-xl transition-shadow border border-white/5 overflow-hidden ring-1 ring-white/10">
        <ImgWithFallback
          src={finalArtwork}
          alt={artist.name}
          IconComponent={Mic2}
          size={24}
        />
      </div>
      <span className="text-sm font-semibold line-clamp-2 px-1 text-white/90 group-hover:text-white">
        {artist.name}
      </span>
    </div>
  );
};

const AlbumSkeleton = () => (
  <div className="flex flex-col gap-2 p-3 bg-white/[0.02] rounded-xl border border-white/5">
    <div className="aspect-square bg-white/5 rounded-lg animate-pulse border border-white/5" />
    <div className="flex flex-col gap-2 mt-1">
      <div className="h-3.5 w-3/4 bg-white/10 rounded animate-pulse" />
      <div className="h-2.5 w-1/2 bg-white/5 rounded animate-pulse" />
    </div>
  </div>
);

function ImgWithFallback({
  src,
  alt,
  IconComponent,
  size,
}: {
  src?: string;
  alt: string;
  IconComponent: any;
  size: number;
}) {
  const [error, setError] = useState(!src);

  if (error || !src) {
    return (
      <div className="w-full h-full flex items-center justify-center text-white/40 bg-white/5">
        <IconComponent size={size} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className="w-full h-full object-cover"
      onError={() => setError(true)}
    />
  );
}

export function SearchResults() {
  const query = useSearchStore((state) => state.query);
  const debouncedQuery = useDebounce(query, 300);
  const setCurrentTrack = usePlayerStore((state) => state.setCurrentTrack);

  // Ambil lagu (tracks) dengan limit 20
  const { data: trackData, isLoading: isTrackLoading } = useSearchMetadata(
    debouncedQuery,
    "track",
    20
  );

  // Ambil album dengan limit 6
  const { data: albumData, isLoading: isAlbumLoading } = useSearchMetadata(
    debouncedQuery,
    "album",
    6
  );

  const tracks = useMemo(() => {
    return (
      (trackData as any)?.results ||
      (trackData as any)?.result ||
      []
    ) as SearchResultItem[];
  }, [trackData]);

  // Derived individual artists dari artist_credit.artists
  const derivedArtists = useMemo(() => {
    const artistMap = new Map<
      string,
      { name: string; mbid?: string; artworkUrl?: string }
    >();

    for (const track of tracks) {
      const credits = track.artist_credit?.artists;

      if (Array.isArray(credits) && credits.length > 0) {
        for (const c of credits) {
          if (c.name && !artistMap.has(c.name.toLowerCase().trim())) {
            artistMap.set(c.name.toLowerCase().trim(), {
              name: c.name,
              mbid: c.mbid,
              artworkUrl: undefined,
            });
          }
        }
      } else if (track.artist) {
        const fallbackName = track.artist.trim();
        if (!artistMap.has(fallbackName.toLowerCase())) {
          artistMap.set(fallbackName.toLowerCase(), {
            name: fallbackName,
            mbid: (track as any).artist_mbid,
            artworkUrl: undefined,
          });
        }
      }
    }

    return Array.from(artistMap.values()).slice(0, 6);
  }, [tracks]);

  const albums = useMemo(() => {
    return (
      (albumData as any)?.results ||
      (albumData as any)?.result ||
      []
    ) as any[];
  }, [albumData]);

  const formatDuration = (ms?: number) => {
    if (!ms) return "-";
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className="flex flex-col gap-10 pb-16">
      {/* Row 1: Grid 2 Kolom (Kiri: Lagu 2/3, Kanan: Artis 1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Kolom KIRI: Songs Section (20 items) */}
        <section className="lg:col-span-2 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-white">
              <Music size={18} className="text-white/70" /> Songs
              <span className="text-xs font-normal text-white/60">
                ({tracks.length} results)
              </span>
            </h3>
            <div className="text-xs text-white/60 hidden sm:flex items-center gap-1 font-medium">
              <Clock size={14} /> Duration
            </div>
          </div>

          <div className="flex flex-col divide-y divide-white/[0.05]">
            {isTrackLoading ? (
              Array.from({ length: 8 }).map((_, i) => <TrackSkeleton key={i} />)
            ) : tracks.length > 0 ? (
              tracks.map((track: SearchResultItem, i: number) => (
                <motion.div
                  key={(track as any).recordingMbid || (track as any).mbid || track.id || i}
                  role="button"
                  tabIndex={0}
                  aria-label={`Play song ${track.title || "Unknown"} by ${track.artist || "Unknown"}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.25,
                    delay: Math.min(i * 0.025, 0.4),
                    ease: "easeOut",
                  }}
                  onClick={() => setCurrentTrack(track)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setCurrentTrack(track);
                    }
                  }}
                  className="flex items-center gap-3 sm:gap-4 px-3 py-2.5 rounded-lg hover:bg-white/[0.06] cursor-pointer group transition-colors focus:outline-none focus:ring-1 focus:ring-white/30"
                >
                  {/* Number index */}
                  <span className="text-xs text-white/60 w-5 text-right font-medium shrink-0 group-hover:hidden">
                    {i + 1}
                  </span>
                  <span className="text-xs text-white w-5 text-right font-medium shrink-0 hidden group-hover:inline-block">
                    <Play size={12} fill="currentColor" />
                  </span>

                  {/* Artwork */}
                  <div className="w-10 h-10 rounded overflow-hidden relative shrink-0">
                    <ImgWithFallback
                      src={track.artworkUrl}
                      alt={track.title || "Track"}
                      IconComponent={Music}
                      size={16}
                    />
                  </div>

                  {/* Title & Artist */}
                  <div className="flex flex-col flex-1 min-w-0 pr-2">
                    <span className="text-sm font-semibold truncate group-hover:text-white text-white">
                      {track.title || "Unknown Title"}
                    </span>
                    <span className="text-xs text-white/65 truncate group-hover:text-white/85">
                      {track.artist || "Unknown Artist"}
                    </span>
                  </div>

                  {/* Album Name (Desktop) */}
                  {track.album && (
                    <div className="text-xs text-white/60 truncate hidden md:block max-w-[150px] lg:max-w-[200px]">
                      {track.album}
                    </div>
                  )}

                  {/* Duration */}
                  <div className="text-xs text-white/65 font-mono shrink-0 ml-auto pl-2">
                    {formatDuration(track.durationMs)}
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-sm text-white/50 py-6 text-center">
                No songs found.
              </div>
            )}
          </div>
        </section>

        {/* Kolom KANAN: Artists Section */}
        <section className="flex flex-col gap-4">
          <h3 className="text-lg font-semibold flex items-center gap-2 border-b border-white/10 pb-2 text-white">
            <Mic2 size={18} className="text-white/70" /> Artists
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-2 gap-3">
            {isTrackLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center gap-3 p-3 text-center bg-white/[0.02] rounded-xl border border-white/5"
                >
                  <div className="w-20 h-20 bg-white/5 rounded-full animate-pulse border border-white/5" />
                  <div className="h-3 w-16 bg-white/10 rounded animate-pulse" />
                </div>
              ))
            ) : derivedArtists.length > 0 ? (
              derivedArtists.map((artist, i) => (
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
                  className="focus:outline-none focus:ring-1 focus:ring-white/30 rounded-xl"
                >
                  <ArtistCard artist={artist} />
                </motion.div>
              ))
            ) : (
              <div className="text-sm text-white/50 py-2 col-span-2">
                No artists found.
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Row 2: Albums PALING BAWAH (Grid Horisontal) */}
      <section className="flex flex-col gap-4 pt-4 border-t border-white/10">
        <h3 className="text-lg font-semibold flex items-center gap-2 text-white">
          <Disc3 size={18} className="text-white/70" /> Albums
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {isAlbumLoading ? (
            Array.from({ length: 6 }).map((_, i) => <AlbumSkeleton key={i} />)
          ) : albums.length > 0 ? (
            albums.map((album, i) => (
              <motion.div
                key={album.id || album.mbid || i}
                role="button"
                tabIndex={0}
                aria-label={`View album ${album.title || album.name || "Unknown"}`}
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
                    IconComponent={Disc3}
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
    </div>
  );
}
