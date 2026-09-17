import {
  findByArtistAndTitle,
  findByTitle,
  findByTitleAndRelease,
} from "./canonical/search";
import { lookupRecording } from "./musicbrainz/lookup";
import { searchRecording } from "./musicbrainz/search";
import { createCombinedLookup } from "./normalizer";

console.log("=== NORMALIZER ===");

console.log(
  createCombinedLookup("ABBA", "Dancing Queen"),
);

console.log("\n=== CANONICAL: ARTIST + TITLE ===");

const exactMatch = await findByArtistAndTitle(
  "ABBA",
  "Dancing Queen",
);

console.log(exactMatch);

console.log("\n=== MUSICBRAINZ: RECORDING LOOKUP ===");

if (exactMatch) {
  const recording = await lookupRecording(
    exactMatch.recording_mbid,
  );

  console.log(recording);
}

console.log("\n=== CANONICAL: TITLE ONLY ===");

const titleResults = await findByTitle(
  "Dancing Queen",
);

for (const [index, result] of titleResults.entries()) {
  console.log(
    `${index + 1}. ${result.artist_credit_name} — ${result.recording_name}`,
  );
  console.log(`   Release: ${result.release_name}`);
  console.log(`   Score: ${result.score}`);
}

console.log("\n=== CANONICAL: TITLE + RELEASE ===");

const releaseResults = await findByTitleAndRelease(
  "Dancing Queen",
  "Arrival",
);

console.log(releaseResults);

console.log("\n=== MUSICBRAINZ API ===");

const musicBrainzResults = await searchRecording(
  "Dancing Queen",
  "ABBA",
);

console.log(`Results: ${musicBrainzResults.recordings.length}`);

for (const recording of musicBrainzResults.recordings.slice(0, 5)) {
  console.log(
    `${recording.title} — ${recording.id} — score ${recording.score}`,
  );
}