import { afterEach, describe, expect, it, vi } from "vitest";
import { analyzeCapture, normalizeAnalysisResult } from "./analysis";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("analysis", () => {
  it("normalizes model output and parses page strings", () => {
    const result = normalizeAnalysisResult(
      {
        quote: "  人总是在行动中认识自己  ",
        thought: "  我想到记录不是目的，行动才是目的  ",
        page: "第 42 页",
      },
      "fallback"
    );

    expect(result).toEqual({
      quote: "人总是在行动中认识自己",
      thought: "我想到记录不是目的，行动才是目的",
      page: 42,
    });
  });

  it("falls back to raw input when the model omits thought", () => {
    const result = normalizeAnalysisResult({ quote: "", page: null }, "原始想法");

    expect(result).toEqual({
      quote: undefined,
      thought: "原始想法",
      page: undefined,
    });
  });

  it("posts compressed image and text to the analyze endpoint", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          analysis: {
            quote: "纸上得来终觉浅",
            thought: "这句提醒我要把笔记变成行动",
            page: 12,
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    );
    globalThis.fetch = fetchMock;

    const result = await analyzeCapture({
      imageDataUrl: "data:image/jpeg;base64,abc",
      rawInput: "我说第12页这句话让我想到行动",
      bookTitle: "测试书",
      hasHighlights: true,
    });

    expect(result.quote).toBe("纸上得来终觉浅");
    expect(result.page).toBe(12);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/analyze",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          imageDataUrl: "data:image/jpeg;base64,abc",
          rawInput: "我说第12页这句话让我想到行动",
          bookTitle: "测试书",
          hasHighlights: true,
        }),
      })
    );
  });

  it("surfaces endpoint errors", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ error: "缺少 OpenRouter 配置" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    );

    await expect(
      analyzeCapture({
        imageDataUrl: "data:image/jpeg;base64,abc",
        rawInput: "想法",
        bookTitle: "测试书",
      })
    ).rejects.toThrow("缺少 OpenRouter 配置");
  });
});
