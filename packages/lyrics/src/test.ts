import { LrcLibProvider } from "./providers/lrclib";

const provider = new LrcLibProvider();

const result = await provider.find({
  artist: "ABBA",
  title: "Dancing Queen",
  album: "Arrival",
});

console.log("=== LRCLIB TEST ===");

if (!result) {
  console.log("Lyrics not found.");
  process.exit(0);
}

console.log("Provider:", result.provider);
console.log("Sync type:", result.syncType);
console.log("Instrumental:", result.instrumental);
console.log("Line count:", result.lines.length);
console.log("Has plain lyrics:", result.plainLyrics !== undefined);

console.log("\nFirst 5 lines:");

for (const line of result.lines) {
  console.log(`[${line.startMs}ms] ${line.text}`);
}
