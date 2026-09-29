import { motion } from "framer-motion";
import { Play } from "lucide-react";

// Mock data (dummy) untuk melengkapi layout homepage (bisa diganti call API nantinya)
const QUICK_PICKS = [
  { id: 1, name: "Liked Songs", type: "Playlist", color: "from-indigo-600 to-indigo-900" },
  { id: 2, name: "Daily Mix 1", type: "Made for you", color: "from-blue-600 to-blue-900" },
  { id: 3, name: "Top Hits 2026", type: "Playlist", color: "from-emerald-subtitle to-emerald-900" },
  { id: 4, name: "Acoustic Pop", type: "Radio", color: "from-orange-600 to-orange-900" },
  { id: 5, name: "Local Files", type: "Collection", color: "from-slate-600 to-slate-900" },
  { id: 6, name: "Discover Weekly", type: "New releases", color: "from-pink-600 to-pink-900" },
];

export const QuickPicks = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {QUICK_PICKS.map((item, idx) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: idx * 0.05 }}
          className="group flex items-center h-20 bg-white/5 hover:bg-white/10 rounded-lg overflow-hidden transition-colors cursor-pointer border border-transparent hover:border-white/10 relative"
          role="button"
          tabIndex={0}
        >
          {/* Mock Artwork */}
          <div className={`w-20 h-20 shrink-0 bg-gradient-to-br ${item.color} shadow-inner flex items-center justify-center`}>
            {/* Bisa tambahin fallback image kalau ada url-nya */}
          </div>
          
          <div className="flex flex-col px-4 flex-1">
            <span className="text-white font-bold text-[15px] truncate">{item.name}</span>
            <span className="text-xs text-white/50 truncate font-medium">{item.type}</span>
          </div>

          <div className="mr-5 shrink-0 bg-emerald-500 rounded-full w-10 h-10 flex items-center justify-center shadow-xl opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
            <Play fill="black" stroke="black" size={18} className="translate-x-[1px]" />
          </div>
        </motion.div>
      ))}
    </div>
  );
};
