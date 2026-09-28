import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Music, Maximize2, MonitorSmartphone, ChevronUp } from "lucide-react";

interface LyricsCardProps {
  plainLyrics?: string | null;
  isLoadingLyrics: boolean;
}

export function LyricsCard({ plainLyrics, isLoadingLyrics }: LyricsCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="bg-[#242424]/60 backdrop-blur-xl rounded-[16px] overflow-hidden flex flex-col mt-2 shrink-0">
      <div className="flex items-center justify-between p-4">
        <span className="font-bold text-white text-[15px]">Lyrics</span>

        <div className="flex items-center gap-2 text-white/70">
          <button
            type="button"
            aria-label="Display on other devices"
            className="hover:bg-white/10 p-1.5 rounded-full transition-colors focus:outline-none focus:ring-1 focus:ring-white/30 cursor-pointer"
          >
            <MonitorSmartphone size={16} />
          </button>

          <button
            type="button"
            aria-label="Expand lyrics full screen"
            className="hover:bg-white/10 p-1.5 rounded-full transition-colors focus:outline-none focus:ring-1 focus:ring-white/30 cursor-pointer"
          >
            <Maximize2 size={16} />
          </button>

          <button
            type="button"
            aria-label={isExpanded ? "Collapse lyrics" : "Expand lyrics"}
            aria-expanded={isExpanded}
            onClick={() => setIsExpanded((prev) => !prev)}
            className="hover:bg-white/10 p-1.5 rounded-full transition-colors focus:outline-none focus:ring-1 focus:ring-white/30 cursor-pointer"
          >
            <motion.div
              animate={{ rotate: isExpanded ? 0 : 180 }}
              transition={{
                type: "spring",
                damping: 20,
                stiffness: 260,
                mass: 0.85,
              }}
            >
              <ChevronUp size={16} />
            </motion.div>
          </button>
        </div>
      </div>

      {/* Konten Lirik dengan Spring Collapse/Expand yang Halus */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="lyrics-collapsible-wrapper"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: {
                type: "spring",
                damping: 24,
                stiffness: 240,
                mass: 0.85,
              },
              opacity: {
                duration: 0.2,
                ease: "easeInOut",
              },
            }}
            className="overflow-hidden"
          >
            <AnimatePresence mode="wait">
              {isLoadingLyrics ? (
                <motion.div
                  key="lyrics-skeleton"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex flex-col gap-3 p-4 min-h-[220px]"
                >
                  <div className="h-4 w-3/4 bg-white/10 rounded animate-pulse" />
                  <div className="h-4 w-1/2 bg-white/10 rounded animate-pulse" />
                  <div className="h-5 w-4/5 bg-white/15 rounded animate-pulse my-1" />
                  <div className="h-4 w-2/3 bg-white/10 rounded animate-pulse" />
                  <div className="h-4 w-3/5 bg-white/10 rounded animate-pulse" />
                  <div className="h-4 w-1/3 bg-white/5 rounded animate-pulse" />
                </motion.div>
              ) : plainLyrics ? (
                <motion.div
                  key="lyrics-content"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="relative max-h-[300px] overflow-y-auto px-4 pb-6 custom-scrollbar overscroll-contain"
                >
                  <div className="flex flex-col gap-1.5">
                    {plainLyrics.split("\n").map((line: string, i: number) => {
                      if (line.trim() === "") {
                        return <div key={i} className="h-4" />;
                      }

                      if (line.startsWith("[") && line.endsWith("]")) {
                        return (
                          <p
                            key={i}
                            className="text-white/60 text-[14px] font-bold tracking-widest uppercase mt-4 mb-1"
                          >
                            {line.replace(/\[|\]/g, "")}
                          </p>
                        );
                      }

                      return (
                        <p
                          key={i}
                          className="text-white/90 text-[18px] font-bold tracking-tight leading-tight hover:text-white transition-colors"
                        >
                          {line}
                        </p>
                      );
                    })}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="lyrics-empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col gap-2 items-center justify-center pt-10 pb-12 text-center min-h-[200px]"
                >
                  <Music className="text-white/30" size={32} />
                  <span className="text-white/70 text-[15px] font-semibold">
                    No lyrics available
                  </span>
                  <span className="text-white/50 text-xs">
                    This track might be instrumental or lyrics aren&apos;t added yet.
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
