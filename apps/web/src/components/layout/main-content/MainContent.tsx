import React, { useEffect, useRef } from "react";
import { useNavigationStore } from "@/store/useNavigationStore";

export function MainContent({ children }: { children: React.ReactNode }) {
  const scrollRef = useRef<HTMLElement>(null);
  const view = useNavigationStore((state) => state.view);
  const albumMbid = useNavigationStore((state) => state.albumMbid);
  const artistMbid = useNavigationStore((state) => state.artistMbid);

  // Auto-scroll to top when primary navigation changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo(0, 0);
    }
  }, [view, albumMbid, artistMbid]);

  return (
    <main
      ref={scrollRef}
      className="flex-1 overflow-y-auto select-text relative z-0 custom-scrollbar"
    >
      <div className="h-full px-6 pb-24 relative">{children}</div>
    </main>
  );
}
