import { AppShell } from "../components/layout/AppShell";
import { SearchResults, useSearchStore } from "../features/search";

export default function App() {
  const query = useSearchStore((state) => state.query);

  return (
    <AppShell>
      <div className="pt-2">
        {query.trim().length >= 2 ? (
           <SearchResults />
        ) : (
           <div className="space-y-8">
             <h1 className="text-3xl font-bold tracking-tight">Good evening</h1>
             <div className="text-white/50 text-sm">
                Cobalah ketik sesuatu di kolom pencarian di atas untuk mengetes Search Engine!
             </div>
           </div>
        )}
      </div>
    </AppShell>
  );
}
