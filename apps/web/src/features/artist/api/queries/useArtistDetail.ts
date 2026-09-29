import { useQuery } from "@tanstack/react-query";

export const useArtistDetail = (mbid?: string) => {
  return useQuery({
    queryKey: ["artist-detail", mbid],
    queryFn: async () => {
      if (!mbid) return null;
      const res = await fetch(`/api/metadata/artist/detail/${mbid}`);
      if (!res.ok) throw new Error("Failed to fetch artist detail");
      const json = await res.json();
      return json.result as any;
    },
    enabled: !!mbid,
    staleTime: 1000 * 60 * 30, // 30 minutes cache
  });
};

export const useArtistArtwork = (mbid?: string) => {
  return useQuery({
    queryKey: ["artist-artwork", mbid],
    queryFn: async () => {
      if (!mbid) return null;
      const res = await fetch(`/api/metadata/artist/artwork?mbid=${mbid}`);
      if (!res.ok) return null;
      const json = await res.json();
      return json.url as string | null;
    },
    enabled: !!mbid,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });
};
