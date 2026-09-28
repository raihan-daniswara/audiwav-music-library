import { useState, useEffect } from "react";
import { usePlayerStore } from "../../../features/player";
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

  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [currentTrack?.artworkUrl, currentTrack?.id]);

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
            <span className="text-sm font-semibold truncate hover:underline cursor-pointer">
              {currentTrack?.title || "No Track Selected"}
            </span>
          </div>
          <span className="text-xs text-white/70 truncate hover:underline cursor-pointer">
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
            className="text-white/70 hover:text-white p-2 min-w-0 rounded-full h-auto cursor-pointer focus:outline-none focus:ring-1 focus:ring-white/30"
          >
            <Shuffle size={18} />
          </button>

          <button
            type="button"
            aria-label="Previous track"
            className="text-white/80 hover:text-white p-2 min-w-0 rounded-full h-auto cursor-pointer focus:outline-none focus:ring-1 focus:ring-white/30"
          >
            <SkipBack size={20} />
          </button>

          <button
            type="button"
            aria-label={isPlaying ? "Pause track" : "Play track"}
            onClick={togglePlay}
            className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 shadow-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/50"
          >
            {isPlaying ? (
              <Pause size={18} fill="currentColor" />
            ) : (
              <Play size={18} fill="currentColor" />
            )}
          </button>

          <button
            type="button"
            aria-label="Next track"
            className="text-white/80 hover:text-white p-2 min-w-0 rounded-full h-auto cursor-pointer focus:outline-none focus:ring-1 focus:ring-white/30"
          >
            <SkipForward size={20} />
          </button>

          <button
            type="button"
            aria-label="Repeat playback"
            className="text-white/70 hover:text-white p-2 min-w-0 rounded-full h-auto cursor-pointer focus:outline-none focus:ring-1 focus:ring-white/30"
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

      {/* 3. Extra Actions (Right: Audio Quality + Modular VolumeSlider) */}
      <div className="flex items-center justify-end gap-3 w-1/4 min-w-[200px] text-white/70">
        <AudioQualitySelector />
        <VolumeSlider />
      </div>
    </footer>
  );
}
