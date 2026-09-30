import { Search, X } from "lucide-react";
import { useSearchStore } from "@/features/search";

export function Topbar() {
  const { query, setQuery, clearQuery } = useSearchStore();

  return (
    <header className="absolute top-0 left-0 h-16 flex items-center justify-between px-6 shrink-0 bg-[#0f0f0f]/40 backdrop-blur-xl border-b border-white/5 relative z-50 w-full transition-colors duration-300">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative w-full max-w-sm">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Search className="text-white/50" strokeWidth={2} size={16} />
          </div>
          <input
            id="global-music-search"
            type="search"
            role="searchbox"
            aria-label="Search artists, albums, songs"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search artists, albums, songs..."
            className="w-full pl-10 pr-10 text-sm text-white bg-white/5 hover:bg-white/10 outline-none focus:bg-white/10 rounded-full h-9 min-h-[36px] border border-white/15 placeholder:text-white/60 transition-colors focus:ring-1 focus:ring-white/30 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden shadow-sm"
          />
          {query.length > 0 && (
            <button
              type="button"
              aria-label="Clear search input"
              onClick={clearQuery}
              className="absolute inset-y-0 right-3 flex items-center justify-center text-white/60 hover:text-white transition-colors cursor-pointer"
            >
              <X size={14} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4 shrink-0">
        <div
          role="button"
          tabIndex={0}
          aria-label="User profile"
          className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-semibold text-white/90 border border-white/15 shrink-0 cursor-pointer hover:bg-white/20 transition-colors focus:outline-none focus:ring-1 focus:ring-white/30 shadow-sm"
        >
          Me
        </div>
      </div>
    </header>
  );
}
