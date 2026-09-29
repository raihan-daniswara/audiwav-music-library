import { SearchResults, useSearchStore } from "@/features/search";
import { Search } from "lucide-react";

export function SearchPage() {
  const query = useSearchStore((state) => state.query);

  if (query.trim().length < 2) {
    return (
      <div className="flex flex-col items-center justify-center p-24 h-[60vh] text-white/40 animate-in fade-in duration-300">
        <Search size={48} className="mb-4 opacity-50" />
        <h2 className="text-xl font-semibold text-white/80 mb-2">Pencarian Audiwav</h2>
        <p className="text-sm text-center max-w-sm">Ketik judul lagu, nama artis, atau album di kotak pencarian di atas untuk memulai pencarian.</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-300 pt-4">
      <SearchResults />
    </div>
  );
}
