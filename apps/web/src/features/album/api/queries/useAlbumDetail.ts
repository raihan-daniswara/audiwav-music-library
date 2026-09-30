import { useQuery } from "@tanstack/react-query";
import type { AlbumDetailResponse } from "@/features/album/api/types";

export const useAlbumDetail = (mbid: string | undefined) => {
  return useQuery({
    queryKey: ["albumDetail", mbid],
    queryFn: async () => {
      if (!mbid) return null;
      const res = await fetch(`/api/metadata/album/detail/${encodeURIComponent(mbid)}`);
      if (!res.ok) {
        throw new Error("Failed to fetch album detail");
      }
      const data = await res.json() as { result: AlbumDetailResponse };
      return data.result;
    },
    enabled: !!mbid,
    staleTime: 1000 * 60 * 10, // Cache 10 minutes
  });
};
