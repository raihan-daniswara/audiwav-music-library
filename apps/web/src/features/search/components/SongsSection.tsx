import { motion } from "framer-motion";
import { Music, Play, Clock } from "lucide-react";
import { ImgWithFallback } from "./ImgWithFallback";
import { usePlayerStore } from "@/features/player";

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

const formatDuration = (ms?: number) => {
  if (!ms) return "-";
  const totalSecs = Math.floor(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
};

export const SongsSection = ({ tracks, isLoading }: { tracks: any[]; isLoading: boolean }) => {
  const setCurrentTrack = usePlayerStore((state) => state.setCurrentTrack);

  return (
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
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => <TrackSkeleton key={i} />)
        ) : tracks.length > 0 ? (
          tracks.map((track, i) => (
            <motion.div
              key={track.recordingMbid || track.mbid || track.id || i}
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
              <span className="text-xs text-white/60 w-5 text-right font-medium shrink-0 group-hover:hidden">
                {i + 1}
              </span>
              <span className="text-xs text-white w-5 text-right font-medium shrink-0 hidden group-hover:inline-block">
                <Play size={12} fill="currentColor" />
              </span>

              <div className="w-10 h-10 rounded overflow-hidden relative shrink-0">
                <ImgWithFallback
                  src={track.artworkUrl}
                  alt={track.title || "Track"}
                  type="track"
                  size={16}
                />
              </div>

              <div className="flex flex-col flex-1 min-w-0 pr-2">
                <span className="text-sm font-semibold truncate group-hover:text-white text-white">
                  {track.title || "Unknown Title"}
                </span>
                <span className="text-xs text-white/65 truncate group-hover:text-white/85">
                  {track.artist || "Unknown Artist"}
                </span>
              </div>

              {track.album && (
                <div className="text-xs text-white/60 truncate hidden md:block max-w-[150px] lg:max-w-[200px]">
                  {track.album}
                </div>
              )}

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
  );
};
