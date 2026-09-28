import { logger } from "@audiwav/logger";

const imageCache = new Map<string, string>(); // Cegah spam request berulang

export async function getArtistImageFromWiki(mbid: string): Promise<string | null> {
  // Jika MBID kosong/tidak valid
  if (!mbid) return null;

  // Cek cache memory
  if (imageCache.has(mbid)) {
    return imageCache.get(mbid)!;
  }

  const sparqlQuery = `SELECT ?image WHERE { ?item wdt:P434 "${mbid}" . ?item wdt:P18 ?image . } LIMIT 1`;
  const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparqlQuery)}&format=json`;

  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "AudiwavMusicLibrary/1.0 (Integration Testing; mailto:contact@audiwav.local)",
      },
      signal: AbortSignal.timeout(2000), // Timeout 2 detik agar tidak menggantung backend
    });

    if (!res.ok) {
      logger.warn({ mbid, status: res.status }, "Wikidata SPARQL returned non-OK status");
      return null;
    }

    const data: any = await res.json();
    const imageUrl = data?.results?.bindings?.[0]?.image?.value || null;

    if (imageUrl) {
      // Encode URI khusus jika link wikimedia memiliki spasi agar CSS background-image / img tag tidak error
      const cleanUrl = imageUrl.replace(/ /g, "%20");
      imageCache.set(mbid, cleanUrl);
      return cleanUrl;
    }

    return null;
  } catch (err) {
    logger.warn({ err, mbid }, "Skipping artist image from Wikidata (timeout/failed)");
    return null;
  }
}
