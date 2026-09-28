import { useQuery } from "@tanstack/react-query";

export const useArtistArtwork = (mbid?: string, fallbackUrl?: string) => {
  return useQuery({
    queryKey: ["artistArtwork", mbid],
    queryFn: async () => {
      if (!mbid) return fallbackUrl || null;
      try {
        const res = await fetch(`/api/metadata/artist/artwork?mbid=${encodeURIComponent(mbid)}`);
        if (!res.ok) return fallbackUrl || null;
        const data = await res.json();
        return data.url || fallbackUrl || null;
      } catch {
        return fallbackUrl || null;
      }
    },
    enabled: !!mbid,
    staleTime: 1000 * 60 * 60 * 24, // Cache foto 24 jam
  });
};
