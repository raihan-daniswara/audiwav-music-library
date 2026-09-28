import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  usePlayerStore,
  AUDIO_QUALITY_PRESETS,
  type AudioQualityId,
  type AudioQualityPreset,
} from "../../../features/player";
import { SlidersHorizontal, Check, ChevronUp } from "lucide-react";

export function AudioQualitySelector() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedQualityId = usePlayerStore((state) => state.audioQuality);
  const setAudioQuality = usePlayerStore((state) => state.setAudioQuality);

  const currentPreset: AudioQualityPreset =
    AUDIO_QUALITY_PRESETS.find((p) => p.id === selectedQualityId) ??
    (AUDIO_QUALITY_PRESETS[0] as AudioQualityPreset);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button: FLAC di atas, Kualitas bit/kHz di bawah */}
      <button
        type="button"
        aria-label={`Select audio quality, currently ${currentPreset.label} ${currentPreset.format} ${currentPreset.bitDepth} ${currentPreset.sampleRate}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1.5 hover:opacity-100 transition-opacity text-left group cursor-pointer focus:outline-none focus:ring-1 focus:ring-white/30 rounded-lg"
        title="Pilih Kualitas Audio Streaming"
      >
        <SlidersHorizontal
          size={16}
          className="text-white/60 group-hover:text-white transition-colors shrink-0"
        />

        <div className="flex flex-col items-start leading-none gap-1">
          {/* Format (FLAC / AAC) di atas */}
          <span className="font-mono text-[10px] font-bold tracking-wider text-white uppercase">
            {currentPreset.format}
          </span>

          {/* Kualitas (bit / sample rate) di bawah dengan badge rounded tidak full */}
          <span className="text-[9px] font-mono font-medium text-white/85 bg-white/10 group-hover:bg-white/15 px-1.5 py-0.5 rounded-[4px] border border-white/15 transition-colors">
            {currentPreset.bitDepth} / {currentPreset.sampleRate}
          </span>
        </div>

        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
        >
          <ChevronUp
            size={12}
            className="text-white/60 group-hover:text-white/80"
          />
        </motion.div>
      </button>

      {/* Dropdown Menu Modal dengan Jelly Spring Bounce Effect dari bawah ke atas */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            role="listbox"
            aria-label="Audio Streaming Quality Presets"
            initial={{
              opacity: 0,
              y: 35,
              scaleY: 0.4,
              scaleX: 1.15,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scaleY: 1,
              scaleX: 1,
            }}
            exit={{
              opacity: 0,
              y: 20,
              scaleY: 0.8,
              scaleX: 0.95,
              transition: { duration: 0.18, ease: "easeIn" },
            }}
            transition={{
              type: "spring",
              damping: 25,
              stiffness: 260,
              mass: 0.85,
            }}
            style={{ transformOrigin: "bottom center" }}
            className="absolute bottom-full right-0 mb-3 w-84 bg-[#141414]/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-2.5 shadow-[0_20px_50px_rgba(0,0,0,0.6)] z-[100]"
          >
            <div className="px-3 py-2 border-b border-white/5 mb-1.5 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-white/70">
                Audio Streaming Quality
              </span>
            </div>

            <div className="flex flex-col gap-1">
              {AUDIO_QUALITY_PRESETS.map((preset, index) => {
                const isSelected = preset.id === selectedQualityId;

                return (
                  <motion.button
                    key={preset.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: 0.05 + index * 0.03,
                      type: "spring",
                      damping: 15,
                      stiffness: 300,
                    }}
                    onClick={() => {
                      setAudioQuality(preset.id as AudioQualityId);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl transition-colors flex items-start justify-between group cursor-pointer ${
                      isSelected
                        ? "bg-white/10 text-white border border-white/15 shadow-sm"
                        : "hover:bg-white/5 text-white/80 hover:text-white"
                    }`}
                  >
                    <div className="flex flex-col gap-1 min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold truncate text-white">
                          {preset.label}
                        </span>
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-[4px] bg-white/10 text-white/90 border border-white/15">
                          {preset.format}
                        </span>
                      </div>

                      {/* Bit Depth & Sample Rate Specs */}
                      <div className="flex items-center gap-1.5 font-mono text-[11px] text-white/70">
                        <span className="text-white font-medium">
                          {preset.bitDepth}
                        </span>
                        <span>•</span>
                        <span className="text-white font-medium">
                          {preset.sampleRate}
                        </span>
                        <span>•</span>
                        <span>{preset.bitrate}</span>
                      </div>

                      <p className="text-[11px] text-white/60 leading-snug line-clamp-1 mt-0.5">
                        {preset.description}
                      </p>
                    </div>

                    {isSelected && (
                      <div className="p-1 rounded-full bg-white/15 text-white shrink-0 mt-0.5">
                        <Check size={14} strokeWidth={2.5} />
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
