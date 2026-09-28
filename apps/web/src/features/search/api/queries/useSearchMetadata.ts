import { useQuery } from "@tanstack/react-query";
import type { SearchResultItem } from "../types";

export const useSearchMetadata = (
  query: string,
  type: "track" | "artist" | "album" = "track",
  limit: number = 5,
) => {
  return useQuery({
    queryKey: ["search", query, type, limit],
    queryFn: async () => {
      if (!query) return { results: [] };
      const searchParams = new URLSearchParams({
        q: query,
        type,
        limit: limit.toString(),
      });
      const res = await fetch(`/api/metadata/search?${searchParams.toString()}`);
      if (!res.ok) throw new Error("Network latency/error from API");

      const payload = await res.json();
      return payload as { results: SearchResultItem[] };
    },
    enabled: query.trim().length > 1,
    staleTime: 1000 * 60 * 5, // Cache hasil search selama 5 menit
  });
};
