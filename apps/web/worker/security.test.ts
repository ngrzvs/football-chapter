import { describe, expect, it } from "vitest";
import { ApiError, readJsonLimited, sanitizePseudonym, sha256, stableStringify } from "./security";

describe("Worker security helpers", () => {
  it("canonicalise les objets avant signature", () => {
    expect(stableStringify({ z: 2, a: { y: 1, x: 0 } })).toBe('{"a":{"x":0,"y":1},"z":2}');
  });

  it("produit un SHA-256 stable", async () => {
    await expect(sha256("football")).resolves.toBe("6382deaf1f5dc6e792b76db4a4a7bf2ba468884e000b25e7928e621e27fb23cb");
  });

  it("normalise un pseudonyme sans supprimer les accents", () => {
    expect(sanitizePseudonym("  Étoile   10  ")).toBe("Étoile 10");
  });

  it("rejette les noms réservés", () => {
    expect(() => sanitizePseudonym("Cloudflare Admin")).toThrow(ApiError);
  });

  it("refuse un payload plus grand que la limite annoncée", async () => {
    const request = new Request("https://example.test", {
      method: "POST",
      headers: { "content-length": "1000" },
      body: "{}",
    });
    await expect(readJsonLimited(request, 12)).rejects.toMatchObject({ status: 413 });
  });
});
