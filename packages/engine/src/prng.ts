import type { PrngState } from "@football/protocol";
import { sha256 } from "./hash";

function rotateLeft(value: number, shift: number): number {
  return ((value << shift) | (value >>> (32 - shift))) >>> 0;
}

export function seedPrng(seed: string): PrngState {
  const digest = sha256(seed);
  const words = [0, 1, 2, 3].map((index) => Number.parseInt(digest.slice(index * 8, index * 8 + 8), 16) >>> 0);
  if (words.every((word) => word === 0)) return { a: 0x9e3779b9, b: 0, c: 0, d: 0 };
  return { a: words[0]!, b: words[1]!, c: words[2]!, d: words[3]! };
}

export function nextUint32(state: PrngState): { state: PrngState; value: number } {
  const a = state.a >>> 0;
  const b = state.b >>> 0;
  const c = state.c >>> 0;
  const d = state.d >>> 0;
  const value = Math.imul(rotateLeft(Math.imul(b, 5) >>> 0, 7), 9) >>> 0;
  const t = (b << 9) >>> 0;
  const next: PrngState = {
    a: (a ^ d) >>> 0,
    b: (b ^ c) >>> 0,
    c: (c ^ a) >>> 0,
    d: (d ^ b) >>> 0,
  };
  next.c = (next.c ^ t) >>> 0;
  next.d = rotateLeft(next.d, 11);
  return { state: next, value };
}

export function nextFloat(state: PrngState): { state: PrngState; value: number } {
  const result = nextUint32(state);
  return { state: result.state, value: result.value / 0x100000000 };
}

export function nextInt(state: PrngState, min: number, max: number): { state: PrngState; value: number } {
  if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) throw new Error("Invalid PRNG integer range");
  const result = nextFloat(state);
  return { state: result.state, value: min + Math.floor(result.value * (max - min + 1)) };
}
