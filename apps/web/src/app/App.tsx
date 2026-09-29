import { useEffect, useRef, useState } from "react";
import { AppShell } from "../components/layout/AppShell";
import { useSearchStore } from "../features/search";
import { SearchPage } from "../pages/search/SearchPage";
import { AlbumPage } from "../pages/albums/AlbumPage";
import { ArtistPage } from "../pages/artists/ArtistPage";
import { HomePage } from "../pages/home/HomePage";
import { useNavigationStore } from "../store/useNavigationStore";

export default function App() {
  const query = useSearchStore((state) => state.query);
  const { view, albumMbid, artistMbid, navigate, syncFromUrl } = useNavigationStore();
  const [prevQuery, setPrevQuery] = useState(query);
  const hasTyped = useRef(false);

  // Dengar kejadian popstate (kembali/maju di browser history)
  useEffect(() => {
    const handlePopState = () => {
      syncFromUrl();
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [syncFromUrl]);

  // Automatic routing based on search input changes
  useEffect(() => {
    if (query !== prevQuery) {
      setPrevQuery(query);
      
      // Jika user sedang aktif mengetik di search bar (dan panjang > 2 karakter)
      if (query.trim().length >= 2) {
         hasTyped.current = true;
         // Paksa user pindah ke halaman /search jika saat dia sedang mengetik 
         // ia sedang berada di halaman Home, Artist, atau Album.
         if (view === "home" || view === "album" || view === "artist") {
           navigate("search", undefined, true);
         }
      }
    }
  }, [query, prevQuery, view, navigate]);

  const unhandledViews = ["explore", "radio", "songs", "favorites", "recently-played", "custom-playlists", "settings"];

  return (
    <AppShell>
      <div className="h-full">
        {view === "artist" && artistMbid && (
          <ArtistPage mbid={artistMbid} onBack={() => navigate("search")} />
        )}

        {view === "album" && albumMbid && (
          <AlbumPage mbid={albumMbid} onBack={() => navigate("search")} />
        )}
        
        {view === "search" && (
           <SearchPage />
        )}

        {view === "home" && (
           <HomePage />
        )}

        {unhandledViews.includes(view) && (
          <div className="flex flex-col items-center justify-center h-[60vh] p-24 text-white/40 fade-in animate-in duration-300">
            <h2 className="text-2xl font-semibold mb-2 capitalize">{view.replace("-", " ")}</h2>
            <p className="text-sm">Halaman ini belum diimplementasikan.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
