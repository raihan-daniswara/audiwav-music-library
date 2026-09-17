const MUSICBRAINZ_API = "https://musicbrainz.org/ws/2";

const USER_AGENT =
  "Audiwav/0.1.0 (https://github.com/audiwav/audiwav-music-library)";

const MAX_RETRIES = 3;
const MIN_REQUEST_INTERVAL = 1100;

let lastRequestAt = 0;

async function waitForRateLimit() {
  const elapsed = Date.now() - lastRequestAt;

  if (elapsed < MIN_REQUEST_INTERVAL) {
    await Bun.sleep(MIN_REQUEST_INTERVAL - elapsed);
  }
}

export async function musicBrainzFetch<T>(
  path: string,
  params: Record<string, string>,
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    await waitForRateLimit();

    const url = new URL(`${MUSICBRAINZ_API}/${path}`);

    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    lastRequestAt = Date.now();

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/json",
        },
      });

      if (response.ok) {
        return response.json() as Promise<T>;
      }

      if (
        response.status === 429 ||
        response.status === 500 ||
        response.status === 502 ||
        response.status === 503 ||
        response.status === 504
      ) {
        lastError = new Error(
          `MusicBrainz request failed: ${response.status} ${response.statusText}`,
        );

        if (attempt < MAX_RETRIES) {
          const delay = 1000 * 2 ** attempt;

          console.warn(
            `MusicBrainz ${response.status}, retrying in ${delay}ms...`,
          );

          await Bun.sleep(delay);
          continue;
        }
      }

      throw new Error(
        `MusicBrainz request failed: ${response.status} ${response.statusText}`,
      );
    } catch (error) {
      if (error instanceof Error) {
        lastError = error;
      } else {
        lastError = new Error(String(error));
      }

      if (attempt < MAX_RETRIES) {
        const delay = 1000 * 2 ** attempt;

        console.warn(
          `MusicBrainz request error, retrying in ${delay}ms...`,
        );

        await Bun.sleep(delay);
        continue;
      }
    }
  }

  throw lastError ?? new Error("MusicBrainz request failed");
}