import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePlayerStore, useSongDetail } from "@/features/player";
import { useSongLyrics } from "@/features/lyrics";
import { Music } from "lucide-react";

import { TrackHeader } from "./TrackHeader";
import { TrackTags } from "./TrackTags";
import { LyricsCard } from "./LyricsCard";
import { ArtistCard } from "./ArtistCard";

export function RightPanel() {
  const currentTrack = usePlayerStore((state) => state.currentTrack);

  const { data: detailData, isLoading: isLoadingDetail } =
    useSongDetail(currentTrack);

  const { data: lyricsData, isLoading: isLoadingLyrics } = useSongLyrics(
    currentTrack?.title,
    currentTrack?.artist,
  );

  // Kunci cover art prioritas utama ke currentTrack agar gambar yang sedang tampil 
  // tidak lompat berganti kalau SQL membawa mbid rilis album berlabel kompilasi/berbeda.
  const rawArtwork = currentTrack?.artworkUrl || detailData?.album?.artwork?.url;
  const [imageError, setImageError] = useState(false);

  // Reset error state saat track berganti
  useEffect(() => {
    setImageError(false);
  }, [rawArtwork, currentTrack?.id, currentTrack?.title]);

  if (!currentTrack) {
    return (
      <aside className="w-[320px] lg:w-[400px] hidden xl:flex flex-col border-l border-white/5 bg-surface/30 backdrop-blur-md shrink-0 h-full overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="flex-1 flex flex-col items-center justify-center text-white/30 gap-4"
        >
          <Music size={48} strokeWidth={1} />
          <span className="text-sm font-medium">No track playing</span>
        </motion.div>
      </aside>
    );
  }

  const artwork = imageError ? null : rawArtwork;
  const artistArtwork = detailData?.artists?.[0]?.artwork?.url;

  // PRIORITASKAN SEMUA DATA AWAL DARI PLAYER (Agar UI tidak lompat/berubah setelah query SQL selesai)
  // karena "recording" di database bisa tertaut ke banyak "release/album" yang berbeda-beda.
  const trackTitle = currentTrack.title || detailData?.track?.title;
  const artistName = currentTrack.artist || detailData?.artists?.[0]?.name;
  
  const albumName = currentTrack.album || detailData?.album?.name;
  const albumMbid = currentTrack.mbid || detailData?.album?.mbid; 
  
  // Amankan pembacaan data dinamis tanpa Error TS
  const currentTrackAny = currentTrack as any;
  const releaseYear = currentTrackAny.releaseYear || detailData?.album?.firstReleaseDate
    ? (currentTrackAny.releaseYear?.toString() || detailData?.album?.firstReleaseDate?.split("-")[0])
    : null;

  // Gabungkan genre dari currentTrack (kalau ada) dan tags dari DB
  let tags = detailData?.track?.tags || [];
  if (currentTrackAny.genre && tags.length === 0) {
     tags = [{ name: currentTrackAny.genre }];
  }

  // ISRC / technical info
  const isrcList = detailData?.track?.isrc || [];

  // Artist biography / annotation dari database
  const annotation = detailData?.artists?.[0]?.annotation;

  // Kunci unik untuk memicu transisi track baru
  const trackKey = currentTrackAny.recordingMbid || currentTrack.id || currentTrack.title;

  return (
    <aside className="w-[320px] lg:w-[400px] hidden xl:flex flex-col border-l border-white/5 shrink-0 h-full overflow-hidden relative">
      <AnimatePresence mode="wait">
        {artwork && (
          <motion.div
            key={artwork}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute inset-0 z-0 pointer-events-none overflow-hidden"
          >
            <div className="absolute -inset-full origin-center animate-[spin_30s_linear_infinite]">
              <img
                src={artwork}
                alt=""
                className="w-full h-full object-cover scale-[1.2] blur-[24px] mix-blend-screen opacity-70"
              />
            </div>

            <div className="absolute inset-0 bg-gradient-to-b from-[#121212]/10 via-[#121212]/30 to-[#121212]" />
            <div className="absolute inset-0 bg-[#121212]/50" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute inset-0 overflow-y-auto overflow-x-hidden p-4 pb-12 flex flex-col gap-6 custom-scrollbar z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={trackKey}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col gap-6"
          >
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.05, ease: "easeOut" }}>
              <TrackHeader
                artwork={artwork || undefined}
                rawArtwork={rawArtwork || undefined}
                trackTitle={trackTitle || "Unknown Track"}
                artistName={artistName || "Unknown Artist"}
                albumName={albumName}
                albumMbid={albumMbid}
                releaseYear={releaseYear}
                isLoadingDetail={isLoadingDetail}
                onImageError={() => setImageError(true)}
              />
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1, ease: "easeOut" }}>
              <TrackTags tags={tags} isrcList={isrcList} isLoadingDetail={isLoadingDetail} />
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.15, ease: "easeOut" }}>
              <ArtistCard
                artistName={artistName || "Unknown"}
                artistArtwork={artistArtwork}
                annotation={annotation}
                isLoadingDetail={isLoadingDetail}
              />
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.2, ease: "easeOut" }}>
              <LyricsCard
                plainLyrics={lyricsData?.lyrics || lyricsData?.plainLyrics}
                isLoadingLyrics={isLoadingLyrics}
              />
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>
    </aside>
  );
}
