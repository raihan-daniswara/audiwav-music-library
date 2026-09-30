import { Play } from "lucide-react";
import { usePlayerStore } from "@/features/player/store";
import { ImgWithFallback } from "@/features/search/components/ImgWithFallback";

interface ArtistTopTracksProps {
  tracks: any[];
}

const formatDuration = (ms?: number) => {
  if (!ms) return "-";
  const totalSecs = Math.floor(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
};

export function ArtistTopTracks({ tracks }: ArtistTopTracksProps) {
  const setCurrentTrack = usePlayerStore((state) => state.setCurrentTrack);

  if (!tracks || tracks.length === 0) return null;

  return (
    <div className="flex flex-col gap-4 mt-8 relative z-10 w-full ">
      <h2 className="text-xl font-bold text-white mb-2">Popular Tracks</h2>

      <div className="flex flex-col divide-y divide-white/[0.05]">
        {tracks.map((track, i) => {
          const artworkUrl = track.albumMbid
            ? `https://coverartarchive.org/release-group/${track.albumMbid}/front-250`
            : track.artworkUrl;
          const artistName = track.artists
            ? track.artists.map((a: any) => a.name).join(", ")
            : "Unknown";

          const handlePlay = () => {
             setCurrentTrack({
                id: track.recordingMbid,
                mbid: track.recordingMbid,
                title: track.title,
                artist: artistName,
                album: track.albumName,
                durationMs: track.durationMs,
                artworkUrl: artworkUrl,
                recordingMbid: track.recordingMbid, 
              });
          };

          return (
            <div
              key={`${track.recordingMbid || 'track'}-${i}`}
              role="button"
              tabIndex={0}
              onClick={handlePlay}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handlePlay();
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
                  src={artworkUrl}
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
                  {artistName}
                </span>
              </div>

              {track.albumName && (
                <div className="text-xs text-white/60 truncate hidden md:block max-w-[150px] lg:max-w-[300px]">
                    {track.albumName}
                </div>
              )}

              <div className="text-xs text-white/65 font-mono shrink-0 ml-auto pl-2">
                {formatDuration(track.durationMs)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
