import { osClient } from "./client";
import { logger } from "@audiwav/logger";
import type { OpenSearchTrackResult, OpenSearchArtistResult, OpenSearchAlbumResult, TrackAlbumInfo } from "./types";

export class OpenSearchClient {
  async searchTracks(keyword: string, limit: number = 20): Promise<OpenSearchTrackResult[]> {
    logger.debug({ keyword }, "Searching tracks in OpenSearch");
    const query = {
      index: "audiwav_recordings",
      body: {
        size: limit,
        query: {
          function_score: {
            query: {
              bool: {
                should: [
                  // 1. Cross fields exact/full match (kombinasi artist + title + album)
                  {
                    multi_match: {
                      query: keyword,
                      type: "cross_fields",
                      fields: [
                        "title^6",
                        "album.name^4",
                        "aliases.name^3",
                        "artist_credit.display^5",
                        "artist_credit.artists.name^5",
                      ],
                      operator: "and",
                      boost: 10,
                    },
                  },
                  // 2. Combined fields dengan minimum_should_match 75%
                  // Mengakomodasi query panjang yang memiliki kata typo/terpotong (seperti 'ta' vs 'takes')
                  // namun tetap memastikan kata kunci unik (seperti nama artis/judul) wajib cocok mayoritas
                  {
                    combined_fields: {
                      query: keyword,
                      fields: [
                        "title^6",
                        "artist_credit.display^5",
                        "artist_credit.artists.name^5",
                        "album.name^4",
                      ],
                      operator: "or",
                      minimum_should_match: "75%",
                      boost: 8,
                    },
                  },
                  // 3. Phrase match
                  {
                    multi_match: {
                      query: keyword,
                      type: "phrase",
                      fields: ["title^8", "album.name^5", "artist_credit.display^6"],
                      boost: 6,
                    },
                  },
                  // 4. Prefix search (search-as-you-type)
                  {
                    multi_match: {
                      query: keyword,
                      type: "bool_prefix",
                      fields: ["title", "album.name", "artist_credit.display"],
                      boost: 4,
                    },
                  },
                  // 5. Typo-tolerant fuzzy match
                  {
                    multi_match: {
                      query: keyword,
                      fields: ["title^3", "album.name^2", "artist_credit.display^2"],
                      fuzziness: "AUTO",
                      prefix_length: 2,
                      operator: "and",
                      boost: 2,
                    },
                  },
                ],
                minimum_should_match: 1,
              },
            },
            functions: [
              {
                field_value_factor: {
                  field: "rating_count",
                  modifier: "log2p",
                  factor: 1,
                  missing: 0,
                },
              },
            ],
            boost_mode: "multiply",
          },
        },
      },
    } as any;

    try {
      const response = await osClient.search(query);
      const hits = (response.body as any).hits.hits as any[];
      return hits.map((hit) => {
        const source = hit._source;
        const albumInfo: TrackAlbumInfo | undefined = source.album
          ? {
              name: source.album.name || "",
              release_group_mbid: source.album.release_group_mbid,
              artwork_url:
                source.album.artwork_url ||
                (source.album.release_group_mbid
                  ? `https://coverartarchive.org/release-group/${source.album.release_group_mbid}/front-250`
                  : undefined),
            }
          : undefined;

        const artworkUrl =
          albumInfo?.artwork_url ||
          (albumInfo?.release_group_mbid
            ? `https://coverartarchive.org/release-group/${albumInfo.release_group_mbid}/front-250`
            : "");

        return {
          mbid: source.mbid,
          title: source.title,
          durationMs: source.duration_ms || 0,
          duration_ms: source.duration_ms ?? null,
          artistName: source.artist_credit?.display || "Unknown",
          artist_credit: source.artist_credit || { display: "", artists: [] },
          album: albumInfo,
          albumName: albumInfo?.name || "",
          aliases: source.aliases || [],
          isrc: source.isrc || [],
          tags: source.tags || [],
          rating: source.rating || 0,
          ratingCount: source.rating_count || 0,
          rating_count: source.rating_count || 0,
          score: hit._score || 0,
          artworkUrl,
        };
      });
    } catch (error) {
      logger.error({ err: error, keyword }, "OpenSearch track search failed");
      return [];
    }
  }

  async searchArtists(keyword: string, limit: number = 20): Promise<OpenSearchArtistResult[]> {
    logger.debug({ keyword }, "Searching artists in OpenSearch");
    const query = {
      index: "audiwav_artists",
      body: {
        size: limit,
        query: {
          function_score: {
            query: {
              bool: {
                should: [
                  // 1. Phrase match (nama persis)
                  {
                    multi_match: {
                      query: keyword,
                      type: "phrase",
                      fields: ["name^10", "sort_name^8"],
                      boost: 10,
                    },
                  },
                  // 2. Prefix search (search-as-you-type)
                  {
                    multi_match: {
                      query: keyword,
                      type: "bool_prefix",
                      fields: ["name^6", "aliases.name^3"],
                      boost: 5,
                    },
                  },
                  // 3. Typo-tolerant fuzzy match
                  {
                    multi_match: {
                      query: keyword,
                      type: "best_fields",
                      fields: ["name^5", "aliases.name^2"],
                      fuzziness: "AUTO",
                      prefix_length: 2,
                      boost: 2,
                    },
                  },
                ],
                minimum_should_match: 1,
              },
            },
            functions: [
              {
                field_value_factor: {
                  field: "rating_count",
                  modifier: "log2p",
                  factor: 1,
                  missing: 0,
                },
              },
            ],
            boost_mode: "multiply",
          },
        },
      },
    } as any;

    try {
      const response = await osClient.search(query);
      const hits = (response.body as any).hits.hits as any[];
      return hits.map((hit) => {
        const source = hit._source;
        return {
          mbid: source.mbid,
          name: source.name,
          sort_name: source.sort_name || "",
          aliases: source.aliases || [],
          tags: source.tags || [],
          rating: source.rating || 0,
          ratingCount: source.rating_count || 0,
          rating_count: source.rating_count || 0,
          score: hit._score || 0,
        };
      });
    } catch (error) {
      logger.error({ err: error, keyword }, "OpenSearch artist search failed");
      return [];
    }
  }

  async searchAlbums(keyword: string, limit: number = 20): Promise<OpenSearchAlbumResult[]> {
    const query = {
      index: "audiwav_release_groups",
      body: {
        size: limit,
        query: {
          function_score: {
            query: {
              bool: {
                should: [
                  // 1. Cross fields exact/full match
                  {
                    multi_match: {
                      query: keyword,
                      type: "cross_fields",
                      fields: [
                        "name^6",
                        "aliases.name^3",
                        "artist_credit.display^5",
                        "artist_credit.artists.name^5",
                      ],
                      operator: "and",
                      boost: 10,
                    },
                  },
                  // 2. Phrase match
                  {
                    multi_match: {
                      query: keyword,
                      type: "phrase",
                      fields: ["name^8", "artist_credit.display^6"],
                      boost: 8,
                    },
                  },
                  // 3. Prefix search (search-as-you-type)
                  {
                    multi_match: {
                      query: keyword,
                      type: "bool_prefix",
                      fields: ["name", "artist_credit.display"],
                      boost: 4,
                    },
                  },
                  // 4. Fuzzy match (toleransi typo)
                  {
                    multi_match: {
                      query: keyword,
                      fields: ["name^3", "artist_credit.display^2"],
                      fuzziness: "AUTO",
                      prefix_length: 2,
                      operator: "and",
                      boost: 2,
                    },
                  },
                ],
                minimum_should_match: 1,
              },
            },
            functions: [
              {
                field_value_factor: {
                  field: "rating_count",
                  modifier: "log2p",
                  factor: 1,
                  missing: 0,
                },
              },
            ],
            boost_mode: "multiply",
          },
        },
      },
    } as any;
    try {
      const response = await osClient.search(query);
      const hits = (response.body as any).hits.hits as any[];
      return hits.map((hit) => {
        const source = hit._source;
        return {
          mbid: source.mbid,
          title: source.name,
          name: source.name,
          type: source.type || "Album",
          artistName: source.artist_credit?.display || "Unknown",
          artist_credit: source.artist_credit || { display: "", artists: [] },
          aliases: source.aliases || [],
          tags: source.tags || [],
          rating: source.rating || 0,
          ratingCount: source.rating_count || 0,
          rating_count: source.rating_count || 0,
          score: hit._score || 0,
          artworkUrl: `https://coverartarchive.org/release-group/${source.mbid}/front-500`,
        };
      });
    } catch (error) {
      return [];
    }
  }
}

const clientInstance = new OpenSearchClient();
export async function searchTracks(keyword: string, limit?: number) {
  return await clientInstance.searchTracks(keyword, limit);
}
export async function searchArtists(keyword: string, limit?: number) {
  return await clientInstance.searchArtists(keyword, limit);
}
export async function searchAlbums(keyword: string, limit?: number) {
  return await clientInstance.searchAlbums(keyword, limit);
}
