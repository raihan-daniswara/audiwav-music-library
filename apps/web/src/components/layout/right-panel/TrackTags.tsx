import { motion, AnimatePresence } from "framer-motion";

interface TrackTagsProps {
  tags: Array<{ id: number; name: string }>;
  isrcList: string[];
  isLoadingDetail: boolean;
}

export function TrackTags({ tags, isrcList, isLoadingDetail }: TrackTagsProps) {
  return (
    <AnimatePresence mode="wait">
      {isLoadingDetail ? (
        <motion.div
          key="tags-skeleton"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="flex flex-wrap gap-2 px-1 shrink-0"
        >
          <span className="h-5 w-12 bg-white/10 rounded animate-pulse" />
          <span className="h-5 w-16 bg-white/10 rounded animate-pulse" />
          <span className="h-5 w-14 bg-white/10 rounded animate-pulse" />
        </motion.div>
      ) : tags.length > 0 || isrcList.length > 0 ? (
        <motion.div
          key="tags-content"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="flex flex-wrap gap-2 px-1 shrink-0"
        >
          {tags.slice(0, 5).map((tag) => (
            <span
              key={tag.id}
              className="text-[10px] font-bold tracking-widest uppercase text-white/50 bg-white/5 px-2 py-1 rounded opacity-75 hover:opacity-100 cursor-pointer transition-opacity"
            >
              {tag.name}
            </span>
          ))}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
