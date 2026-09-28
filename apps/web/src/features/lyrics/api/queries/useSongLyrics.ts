import { useQuery } from "@tanstack/react-query";

export const useSongLyrics = (trackTitle?: string, artistName?: string) => {
  return useQuery({
    queryKey: ["songLyrics", trackTitle, artistName],
    queryFn: async () => {
      if (!trackTitle || !artistName) return null;
      
      const params = new URLSearchParams({
        title: trackTitle,
        artist: artistName
      });

      const res = await fetch(`/api/lyrics/search?${params.toString()}`);
      
      if (!res.ok) {
         if(res.status === 404) return { lyrics: null };
         throw new Error("Failed to fetch lyrics");
      }
      
      const data = await res.json();
      return data.result || data;
    },
    enabled: !!trackTitle && !!artistName,
    staleTime: 1000 * 60 * 30, // 30 Menit cache
  });
};
