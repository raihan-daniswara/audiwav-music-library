import { motion } from "framer-motion";
import { Play, Clock } from "lucide-react";
import { usePlayerStore } from "@/features/player";

const formatDuration = (ms?: number | null) => {
  if (!ms) return "-";
  const totalSecs = Math.floor(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
};

interface AlbumTrackListProps {
  tracks: any[];
  album: any;
  albumArtist: string;
}

export function AlbumTrackList({ tracks, album, albumArtist }: AlbumTrackListProps) {
  const setCurrentTrack = usePlayerStore((state) => state.setCurrentTrack);
  const artwork = album.artwork?.url;

  const handlePlayTrack = (track: any) => {
    setCurrentTrack({
      id: track.recordingMbid,
      title: track.title,
      artist: track.artists && track.artists.length > 0 
                ? track.artists.map((a: any) => a.name).join(", ") 
                : albumArtist,
      album: album.name,
      artworkUrl: artwork,
      durationMs: track.durationMs,
      recordingMbid: track.recordingMbid,
    } as any);
  };

  return (
    <section className="flex flex-col mt-4 border-t border-white/5 pt-4">
      <div className="grid grid-cols-[40px_1fr_80px] md:grid-cols-[48px_1fr_100px] gap-4 px-4 pb-2 border-b border-white/5 text-xs font-medium text-white/40 uppercase tracking-wider mb-2">
        <div className="text-center">#</div>
        <div>Title</div>
        <div className="flex justify-end pr-2"><Clock size={14} /></div>
      </div>

      <div className="flex flex-col gap-1">
        {tracks.map((track: any, i: number) => (
          <motion.div
            key={track.recordingMbid || i}
            onClick={() => handlePlayTrack(track)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: Math.min(i * 0.03, 0.4), ease: "easeOut" }}
            className="grid grid-cols-[40px_1fr_80px] md:grid-cols-[48px_1fr_100px] gap-4 items-center px-4 py-3 rounded-lg hover:bg-white/[0.06] group cursor-pointer transition-colors focus:outline-none focus:ring-1 focus:ring-white/30"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handlePlayTrack(track);
              }
            }}
          >
            <div className="relative flex justify-center items-center h-full text-white/50 text-sm font-medium w-full">
              <span className="group-hover:hidden">{track.position || i + 1}</span>
              <span className="hidden group-hover:flex">
                <Play size={14} fill="currentColor" className="text-white" />
              </span>
            </div>
            
            <div className="flex flex-col min-w-0 pr-4">
              <span className="text-white group-hover:text-white font-medium text-[15px] truncate transition-colors">
                {track.title || `Track ${i + 1}`}
              </span>
              {track.artists && track.artists.length > 0 && (
                <span className="text-white/50 text-xs truncate mt-0.5 group-hover:text-white/70 transition-colors">
                  {track.artists.map((a: any) => a.name).join(", ")}
                </span>
              )}
            </div>

            <div className="text-right pr-2 text-white/50 text-xs font-mono font-medium group-hover:text-white/80 transition-colors">
              {formatDuration(track.durationMs)}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
