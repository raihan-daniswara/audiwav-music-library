import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePlayerStore, useSongDetail } from "../../../features/player";
import { useSongLyrics } from "../../../features/lyrics";
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

  const rawArtwork = detailData?.album?.artwork?.url || currentTrack?.artworkUrl;
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

  // Data mapping langsung dari SQL MusicBrainz
  const tags = detailData?.track?.tags || [];
  const trackTitle = detailData?.track?.title || currentTrack.title;
  const artistName = detailData?.artists?.[0]?.name || currentTrack.artist;

  // Album info
  const albumName = detailData?.album?.name;
  const releaseYear = detailData?.album?.firstReleaseDate
    ? detailData.album.firstReleaseDate.split("-")[0]
    : null;

  // ISRC / technical info
  const isrcList = detailData?.track?.isrc || [];

  // Artist biography / annotation dari database
  const annotation = detailData?.artists?.[0]?.annotation;

  // Kunci unik untuk memicu transisi track baru
  const trackKey = (currentTrack as any).recordingMbid || currentTrack.id || currentTrack.title;

  return (
    <aside className="w-[320px] lg:w-[400px] hidden xl:flex flex-col border-l border-white/5 shrink-0 h-full overflow-hidden relative">
      {/* Background artwork blur di belakang dengan transisi crossfade halus */}
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

      {/* Kontainer scroll dengan animasi masuk bergantian (staggered cascade) */}
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
            {/* 1. Track & Album Header */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut", delay: 0.05 }}
            >
              <TrackHeader
                artwork={artwork}
                rawArtwork={rawArtwork}
                trackTitle={trackTitle}
                artistName={artistName}
                albumName={albumName}
                releaseYear={releaseYear}
                isLoadingDetail={isLoadingDetail}
                onImageError={() => setImageError(true)}
              />
            </motion.div>

            {/* 2. Audio Tags & Mini Badges */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut", delay: 0.1 }}
            >
              <TrackTags
                tags={tags}
                isrcList={isrcList}
                isLoadingDetail={isLoadingDetail}
              />
            </motion.div>

            {/* 3. Lyrics Card */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut", delay: 0.15 }}
            >
              <LyricsCard
                plainLyrics={lyricsData?.plainLyrics}
                isLoadingLyrics={isLoadingLyrics}
              />
            </motion.div>

            {/* 4. About the Artist Card */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut", delay: 0.2 }}
            >
              <ArtistCard
                artistName={artistName}
                artistArtwork={artistArtwork}
                annotation={annotation}
                isLoadingDetail={isLoadingDetail}
              />
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>
    </aside>
  );
}
