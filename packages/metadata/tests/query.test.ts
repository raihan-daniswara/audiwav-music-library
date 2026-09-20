import { describe, expect, test } from "bun:test";

import {
  normalizeQuery,
  parseMetadataQuery,
  tokenizeQuery,
} from "../../../apps/api/src/services/metadata/common/query";

describe("normalizeQuery", () => {
  test("normalizes whitespace and casing", () => {
    expect(normalizeQuery("  ABBA   Dancing Queen  ")).toBe(
      "abba dancing queen",
    );
  });

  test("removes punctuation", () => {
    expect(normalizeQuery("ABBA - Dancing Queen!")).toBe("abba dancing queen");
  });

  test("normalizes accented characters", () => {
    expect(normalizeQuery("Beyoncé")).toBe("beyonce");
  });

  test("returns empty string for whitespace-only input", () => {
    expect(normalizeQuery("   ")).toBe("");
  });
});

describe("tokenizeQuery", () => {
  test("splits query into tokens", () => {
    expect(tokenizeQuery("ABBA Dancing Queen")).toEqual([
      "abba",
      "dancing",
      "queen",
    ]);
  });

  test("removes duplicate tokens", () => {
    expect(tokenizeQuery("ABBA ABBA Dancing")).toEqual(["abba", "dancing"]);
  });

  test("returns empty array for empty query", () => {
    expect(tokenizeQuery("")).toEqual([]);
  });
});

describe("parseMetadataQuery", () => {
  test("returns raw, normalized and tokenized query", () => {
    expect(parseMetadataQuery("  ABBA - Dancing Queen!  ")).toEqual({
      raw: "ABBA - Dancing Queen!",
      normalized: "abba dancing queen",
      tokens: ["abba", "dancing", "queen"],
    });
  });

  test("trims the raw query", () => {
    expect(parseMetadataQuery("   ABBA   ")).toEqual({
      raw: "ABBA",
      normalized: "abba",
      tokens: ["abba"],
    });
  });
});
