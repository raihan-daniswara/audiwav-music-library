import { motion } from "framer-motion";
import { usePlayerStore } from "@/features/player";
import { Volume2, VolumeX } from "lucide-react";

const BAR_COUNT = 18;

const eqPatterns = [
  [0.15, 0.85, 0.35, 1.0, 0.25],
  [0.3, 0.7, 0.45, 0.9, 0.35],
  [0.6, 0.3, 0.95, 0.5, 0.75],
  [0.85, 0.45, 0.75, 0.25, 0.9],
  [0.4, 0.9, 0.3, 0.8, 0.45],
  [0.25, 0.65, 0.9, 0.35, 0.7],
  [0.75, 0.35, 0.65, 0.95, 0.3],
  [0.5, 0.8, 0.25, 0.6, 0.85],
  [0.9, 0.4, 0.75, 0.3, 0.85],
  [0.35, 0.85, 0.5, 0.95, 0.4],
  [0.65, 0.3, 0.85, 0.45, 0.7],
  [0.8, 0.5, 0.3, 0.75, 0.9],
  [0.45, 0.9, 0.6, 0.35, 0.8],
  [0.2, 0.7, 0.95, 0.5, 0.35],
  [0.7, 0.4, 0.8, 0.95, 0.25],
  [0.55, 0.85, 0.35, 0.65, 0.9],
  [0.85, 0.45, 0.7, 0.3, 0.8],
  [0.3, 0.65, 0.4, 0.85, 0.45],
];

export function VolumeSlider() {
  const volume = usePlayerStore((state) => state.volume);
  const setVolume = usePlayerStore((state) => state.setVolume);
  const isMuted = usePlayerStore((state) => state.isMuted);
  const toggleMute = usePlayerStore((state) => state.toggleMute);
  const isPlaying = usePlayerStore((state) => state.isPlaying);

  const activeVolume = isMuted ? 0 : volume;
  const isAudioActive = isPlaying && activeVolume > 0;

  return (
    <div className="flex items-center gap-1.5">
      {/* Volume Button */}
      <button
        type="button"
        aria-label={isMuted ? "Unmute volume" : "Mute volume"}
        onClick={toggleMute}
        className="hover:text-white p-1.5 rounded-full cursor-pointer focus:outline-none focus:ring-1 focus:ring-white/30 flex items-center justify-center shrink-0"
        title={isMuted ? "Unmute" : "Mute"}
      >
        {activeVolume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>

      {/* Integrated Volume & EQ Bar Container */}
      <div className="w-28 relative h-8 flex items-center group cursor-pointer translate-y-[2px]">
        {/* Input Range Slider dengan label aksesibilitas */}
        <input
          id="volume-slider"
          type="range"
          aria-label="Volume level"
          min={0}
          max={1}
          step={0.01}
          value={activeVolume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-20"
        />

        {/* Garis Dasar Volume Track */}
        <div className="w-full h-1 group-hover:h-1.5 bg-white/20 rounded-full overflow-hidden relative">
          <div
            className="h-full bg-white/80 group-hover:bg-white rounded-full"
            style={{ width: `${activeVolume * 100}%` }}
          />
        </div>

        {/* Volume Thumb Indicator */}
        <div
          className="absolute -translate-x-1/2 w-2.5 h-2.5 bg-white rounded-full shadow-md hidden group-hover:block pointer-events-none top-1/2 -translate-y-1/2"
          style={{ left: `${activeVolume * 100}%` }}
        />

        {/* EQ Visualizer Bars */}
        <div
          className="absolute inset-x-0 bottom-[calc(50%+3px)] flex items-end justify-between px-[1px] pointer-events-none transition-[height,opacity] duration-200 ease-out"
          style={{
            height: isAudioActive ? `${Math.max(3, activeVolume * 14)}px` : "0px",
            opacity: isAudioActive ? 1 : 0,
          }}
        >
          {Array.from({ length: BAR_COUNT }).map((_, index) => {
            const pattern = eqPatterns[index % eqPatterns.length];
            const barThreshold = (index + 0.5) / BAR_COUNT;
            const isBarCovered = activeVolume >= barThreshold;

            return (
              <motion.div
                key={index}
                className={`w-[2px] rounded-t-sm transition-colors duration-150 ${
                  isBarCovered
                    ? "bg-white/60 group-hover:bg-white"
                    : "bg-white/20"
                }`}
                style={{
                  height: "100%",
                  transformOrigin: "bottom center",
                }}
                animate={
                  isAudioActive
                    ? {
                        scaleY: pattern,
                      }
                    : {
                        scaleY: 0.1,
                      }
                }
                transition={
                  isAudioActive
                    ? {
                        duration: 1.4 + (index % 5) * 0.15,
                        repeat: Infinity,
                        repeatType: "mirror",
                        ease: "easeIn",
                        delay: 0,
                      }
                    : {
                        duration: 0.25,
                        ease: "easeIn",
                      }
                }
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
