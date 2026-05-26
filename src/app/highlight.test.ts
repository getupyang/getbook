import { describe, expect, it } from "vitest";
import { clampHighlightPoint, hasHighlightStrokes } from "./highlight";

describe("highlight", () => {
  it("detects meaningful strokes", () => {
    expect(hasHighlightStrokes()).toBe(false);
    expect(hasHighlightStrokes([{ points: [{ x: 0.2, y: 0.3 }] }])).toBe(false);
    expect(
      hasHighlightStrokes([
        {
          points: [
            { x: 0.2, y: 0.3 },
            { x: 0.8, y: 0.3 },
          ],
        },
      ])
    ).toBe(true);
  });

  it("keeps saved stroke coordinates normalized", () => {
    expect(clampHighlightPoint({ x: -0.2, y: 1.4 })).toEqual({ x: 0, y: 1 });
    expect(clampHighlightPoint({ x: 0.35, y: 0.6 })).toEqual({ x: 0.35, y: 0.6 });
  });
});
