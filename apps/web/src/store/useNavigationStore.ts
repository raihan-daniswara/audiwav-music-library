import { create } from "zustand";

interface NavigationState {
  view: string;
  albumMbid: string | null;
  artistMbid: string | null;
  navigate: (view: string, mbid?: string, replace?: boolean) => void;
  goBack: () => void;
  syncFromUrl: () => void;
}

const getInitialState = () => {
  const path = window.location.pathname;
  if (path.startsWith("/search/album/")) {
    const mbid = path.split("/").pop();
    return { view: "album", albumMbid: mbid || null, artistMbid: null };
  }
  if (path.startsWith("/search/artist/")) {
    const mbid = path.split("/").pop();
    return { view: "artist", artistMbid: mbid || null, albumMbid: null };
  }
  if (path.startsWith("/search")) {
    return { view: "search", albumMbid: null, artistMbid: null };
  }
  
  const firstPath = path.split("/")[1];
  if (firstPath) {
    if (firstPath === "album") return { view: "album", albumMbid: path.split("/").pop() || null, artistMbid: null };
    if (firstPath === "artist") return { view: "artist", artistMbid: path.split("/").pop() || null, albumMbid: null };
    return { view: firstPath, albumMbid: null, artistMbid: null };
  }

  return { view: "home", albumMbid: null, artistMbid: null };
};

export const useNavigationStore = create<NavigationState>((set) => ({
  ...getInitialState(),
  
  navigate: (view, mbid, replace = false) => {
    let url = "/";
    if (view !== "home") url = `/${view}`;
    if (view === "album" && mbid) url = `/search/album/${mbid}`;
    else if (view === "album" && !mbid) url = "/albums";
    if (view === "artist" && mbid) url = `/search/artist/${mbid}`;
    else if (view === "artist" && !mbid) url = "/artists";
    
    if (window.location.pathname !== url) {
      if (replace) {
        window.history.replaceState({}, "", url);
      } else {
        window.history.pushState({}, "", url);
      }
    }
    
    set({ 
      view, 
      albumMbid: view === "album" ? (mbid || null) : null,
      artistMbid: view === "artist" ? (mbid || null) : null 
    });
  },

  goBack: () => {
    window.history.back();
  },

  syncFromUrl: () => {
    set(getInitialState());
  }
}));
