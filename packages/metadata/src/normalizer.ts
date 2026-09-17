export function normalizeLookupPart(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

export function createCombinedLookup(
  artist: string,
  title: string,
): string {
  return `${normalizeLookupPart(artist)}${normalizeLookupPart(title)}`;
}