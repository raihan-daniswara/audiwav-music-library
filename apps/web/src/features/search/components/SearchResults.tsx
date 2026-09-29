import { useMemo } from "react";
import { useSearchStore } from "../store";
import { useSearchMetadata, type SearchResultItem } from "../api";
import { useDebounce } from "@/hooks/useDebounce";
import { SongsSection } from "./SongsSection";
import { ArtistsSection } from "./ArtistsSection";
import { AlbumsSection } from "./AlbumsSection";

export function SearchResults() {
  const query = useSearchStore((state) => state.query);
  const debouncedQuery = useDebounce(query, 300);

  // Fetch track
  const { data: trackData, isLoading: isTrackLoading, isFetching: isTrackFetching } = useSearchMetadata(
    debouncedQuery,
    "track",
    20
  );

  // Fetch album
  const { data: albumData, isLoading: isAlbumLoading, isFetching: isAlbumFetching } = useSearchMetadata(
    debouncedQuery,
    "album",
    6
  );

  const isSearching = query !== debouncedQuery || isTrackLoading || isTrackFetching;
  const isAlbumSearching = query !== debouncedQuery || isAlbumLoading || isAlbumFetching;

  const tracks = useMemo(() => {
    return (
      (trackData as any)?.results ||
      (trackData as any)?.result ||
      []
    ) as SearchResultItem[];
  }, [trackData]);

  // Derived individual artists dari artist_credit.artists
  const derivedArtists = useMemo(() => {
    const artistMap = new Map<
      string,
      { name: string; mbid?: string; artworkUrl?: string }
    >();

    for (const track of tracks) {
      const credits = track.artist_credit?.artists;

      if (Array.isArray(credits) && credits.length > 0) {
        for (const c of credits) {
          if (c.name && !artistMap.has(c.name.toLowerCase().trim())) {
            artistMap.set(c.name.toLowerCase().trim(), {
              name: c.name,
              mbid: c.mbid,
              artworkUrl: undefined,
            });
          }
        }
      } else if (track.artist) {
        const fallbackName = track.artist.trim();
        if (!artistMap.has(fallbackName.toLowerCase())) {
          artistMap.set(fallbackName.toLowerCase(), {
            name: fallbackName,
            mbid: (track as any).artist_mbid,
            artworkUrl: undefined,
          });
        }
      }
    }

    return Array.from(artistMap.values());
  }, [tracks]);

  const albums = useMemo(() => {
    return (
      (albumData as any)?.results ||
      (albumData as any)?.result ||
      []
    ) as any[];
  }, [albumData]);

  return (
    <div className="flex flex-col gap-10 pb-32">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <SongsSection tracks={tracks} isLoading={isSearching} />
        <ArtistsSection artists={derivedArtists} isLoading={isSearching} />
      </div>

      <AlbumsSection albums={albums} isLoading={isAlbumSearching} />
    </div>
  );
}
