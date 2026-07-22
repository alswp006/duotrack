import { describe, it, expect } from "vitest";

// Scratch diagnostic file created during packet-0001 investigation.
// Confirmed: require() cannot resolve the "@" alias in this vitest/CJS setup
// (Node's createRequire has no knowledge of Vite's resolve.alias).
// Safe to delete this file.
describe("scratch probe (safe to delete)", () => {
  it("noop", () => {
    expect(true).toBe(true);
  });
});
