import { motion } from "framer-motion";

const RECENT_ITEMS = [
  { id: 1, title: "Lonesome Dreams", artist: "Lord Huron", type: "Album", color: "from-teal-600 to-teal-900" },
  { id: 2, title: "Your Favorites", artist: "340 songs", type: "Playlist", color: "from-purple-600 to-purple-900" },
  { id: 3, title: "Paramore", artist: "Artist", type: "Artist", color: "from-orange-500 to-red-600" },
  { id: 4, title: "Midnight Vibes", artist: "Compilation", type: "Playlist", color: "from-indigo-600 to-blue-800" },
  { id: 5, title: "Currents", artist: "Tame Impala", type: "Album", color: "from-amber-600 to-red-900" },
];

export const RecentActivity = () => {
  return (
    <section className="flex flex-col gap-4 mt-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white hover:underline cursor-pointer">
          Jump Back In
        </h2>
        <span className="text-xs font-semibold text-white/50 hover:text-white uppercase tracking-wider cursor-pointer transition-colors">
          Show All
        </span>
      </div>

      <div className="flex overflow-x-auto pb-4 gap-4 md:gap-6 custom-scrollbar snap-x">
        {RECENT_ITEMS.map((item, idx) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: idx * 0.1 }}
            className="flex flex-col gap-3 min-w-[140px] md:min-w-[160px] p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-colors group snap-start border border-transparent hover:border-white/5"
            role="button"
          >
            {/* Box Image / Avatar */}
            <div 
              className={`aspect-square w-full shadow-lg border border-white/10 shrink-0 bg-gradient-to-br ${item.color} ${item.type === "Artist" ? "rounded-full" : "rounded-lg"}`} 
            />

            <div className="flex flex-col px-1 min-w-0">
              <span className="text-sm font-semibold text-white/90 truncate group-hover:text-white">
                {item.title}
              </span>
              <span className="text-sm font-medium text-white/50 truncate">
                {item.artist}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};
