import { useState, useEffect } from "react";
import { usePlayerStore } from "../../../features/player";
import { useSearchStore } from "../../../features/search";
import { useNavigationStore } from "../../../store/useNavigationStore";
import { AudioQualitySelector } from "./AudioQualitySelector";
import { VolumeSlider } from "./VolumeSlider";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Music,
} from "lucide-react";

export function BottomPlayer() {
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const togglePlay = usePlayerStore((state) => state.togglePlay);

  const setQuery = useSearchStore((state) => state.setQuery);
  const navigate = useNavigationStore((state) => state.navigate);

  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [currentTrack?.artworkUrl, currentTrack?.id]);

  const handleSearchClick = (keyword: string) => {
    setQuery(keyword);
    navigate("search");
  };

  return (
    <footer className="h-[90px] border-t border-white/10 bg-surface/90 backdrop-blur-xl flex items-center justify-between px-4 sm:px-6 shrink-0 relative z-50 select-none">
      {/* 1. Track Information (Left) */}
      <div className="flex items-center gap-4 w-1/4 min-w-[200px]">
        <div className="w-14 h-14 rounded-md bg-white/10 shrink-0 border border-white/10 overflow-hidden relative group cursor-pointer flex items-center justify-center">
          {currentTrack?.artworkUrl && !imageError ? (
            <img
              src={currentTrack.artworkUrl}
              alt={currentTrack.title ? `Album cover for ${currentTrack.title}` : "Album cover"}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <Music size={20} className="text-white/40" />
          )}
        </div>

        <div className="flex flex-col truncate">
          <div className="flex items-center gap-2">
            <span 
              onClick={() => {
                if (currentTrack?.title) handleSearchClick(`${currentTrack.title} ${currentTrack.artist || ''}`);
              }}
              className="text-sm font-semibold truncate hover:underline cursor-pointer"
            >
              {currentTrack?.title || "No Track Selected"}
            </span>
          </div>
          <span 
            onClick={() => {
              if (currentTrack?.artist) handleSearchClick(currentTrack.artist);
            }}
            className="text-xs text-white/70 truncate hover:underline cursor-pointer"
          >
            {currentTrack?.artist || "-"}
          </span>
        </div>
      </div>

      {/* 2. Playback Controls & Progress Seek Bar (Center) */}
      <div className="flex flex-col items-center justify-center max-w-[600px] w-full flex-1 gap-2">
        <div className="flex items-center gap-4 sm:gap-6">
          <button
            type="button"
            aria-label="Shuffle playback"
            className="text-white/50 hover:text-white transition-colors focus:outline-none focus:ring-1 focus:ring-white/30 rounded"
          >
            <Shuffle size={18} />
          </button>
          <button
            type="button"
            aria-label="Previous track"
            className="text-white/75 hover:text-white transition-colors focus:outline-none focus:ring-1 focus:ring-white/30 rounded"
          >
            <SkipBack size={24} fill="currentColor" className="opacity-90" />
          </button>
          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-black hover:scale-105 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-white/50"
          >
            {isPlaying ? (
              <Pause size={20} fill="currentColor" />
            ) : (
              <Play size={20} fill="currentColor" className="ml-0.5" />
            )}
          </button>
          <button
            type="button"
            aria-label="Next track"
            className="text-white/75 hover:text-white transition-colors focus:outline-none focus:ring-1 focus:ring-white/30 rounded"
          >
            <SkipForward size={24} fill="currentColor" className="opacity-90" />
          </button>
          <button
            type="button"
            aria-label="Toggle repeat"
            className="text-white/50 hover:text-white transition-colors focus:outline-none focus:ring-1 focus:ring-white/30 rounded"
          >
            <Repeat size={18} />
          </button>
        </div>

        {/* Seek Bar */}
        <div className="flex items-center gap-2.5 w-full max-w-[500px]">
          <span className="text-xs text-white/75 w-10 text-right font-mono">
            {isPlaying ? "1:04" : "0:00"}
          </span>

          <div
            role="slider"
            aria-label="Track playback progress"
            aria-valuemin={0}
            aria-valuemax={210}
            aria-valuenow={isPlaying ? 64 : 0}
            tabIndex={0}
            className="flex-1 relative h-4 flex items-center group cursor-pointer focus:outline-none focus:ring-1 focus:ring-white/30 rounded-full"
          >
            <div className="w-full h-1 group-hover:h-1.5 bg-white/20 rounded-full overflow-hidden relative">
              <div
                className="h-full bg-white/80 group-hover:bg-white rounded-full"
                style={{ width: "30%" }}
              />
            </div>
            <div
              className="absolute -translate-x-1/2 w-2.5 h-2.5 bg-white rounded-full shadow-md hidden group-hover:block pointer-events-none"
              style={{ left: "30%" }}
            />
          </div>

          <span className="text-xs text-white/75 w-10 font-mono">3:30</span>
        </div>
      </div>

      {/* 3. Extra Actions */}
      <div className="flex items-center justify-end gap-3 w-1/4 min-w-[200px] text-white/70">
        <AudioQualitySelector />
        <VolumeSlider />
      </div>
    </footer>
  );
}
