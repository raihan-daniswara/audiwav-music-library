import { useQuery } from "@tanstack/react-query";
import type { SearchResultItem } from "../../../search";

export const useSongDetail = (track: SearchResultItem | null) => {
  const trackId = (track as any)?.recordingMbid || (track as any)?.mbid || track?.id;

  return useQuery({
    queryKey: ["songDetail", trackId, track?.title, track?.artist],
    queryFn: async () => {
      if (!track) return null;

      const res = await fetch("/api/metadata/song/detail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: track.title,
          artist: track.artist,
          album: track.album,
          recordingMbid: trackId,
        }),
      });

      if (!res.ok) throw new Error("Failed to fetch detail");
      const data = await res.json();
      return data.result || data;
    },
    enabled: !!track,
    staleTime: 1000 * 60 * 10, // Cache 10 menit
  });
};
