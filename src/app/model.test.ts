import { describe, expect, it } from "vitest";
import {
  AppState,
  createBook,
  createCapture,
  formatTimestamp,
  recoverStaleRecords,
} from "./model";

describe("model", () => {
  it("creates a book with trimmed fields", () => {
    const book = createBook("  置身事内  ", "  兰小欢  ", new Date("2026-05-26T10:12:00+08:00"));

    expect(book.title).toBe("置身事内");
    expect(book.author).toBe("兰小欢");
    expect(book.records).toEqual([]);
  });

  it("rejects an empty book title", () => {
    expect(() => createBook("   ")).toThrow("书名不能为空");
  });

  it("creates a saved capture from compressed photo and raw input", () => {
    const record = createCapture({
      photoUrl: "data:image/jpeg;base64,abc",
      markedPhotoUrl: "data:image/jpeg;base64,marked",
      highlightStrokes: [
        {
          points: [
            { x: 0.2, y: 0.3 },
            { x: 0.7, y: 0.3 },
          ],
        },
      ],
      rawInput: "  这句话让我想到记录和行动的区别  ",
      now: new Date("2026-05-26T10:12:00+08:00"),
    });

    expect(record.status).toBe("saved");
    expect(record.rawInput).toBe("这句话让我想到记录和行动的区别");
    expect(record.photoUrl).toBe("data:image/jpeg;base64,abc");
    expect(record.markedPhotoUrl).toBe("data:image/jpeg;base64,marked");
    expect(record.highlightStrokes?.[0].points).toHaveLength(2);
  });

  it("formats recent timestamps for reading cards", () => {
    const text = formatTimestamp(new Date());
    expect(text.startsWith("今天 ")).toBe(true);
  });

  it("recovers stale processing records to failed on startup", () => {
    const book = createBook("把自己作为方法");
    const processing = {
      ...createCapture({ photoUrl: "data:image/jpeg;base64,a", rawInput: "想法一" }),
      status: "processing" as const,
    };
    const processed = {
      ...createCapture({ photoUrl: "data:image/jpeg;base64,b", rawInput: "想法二" }),
      status: "processed" as const,
    };
    const state: AppState = {
      books: [{ ...book, records: [processing, processed] }],
      activeBookId: book.id,
    };

    const result = recoverStaleRecords(state);

    expect(result.changed).toBe(true);
    expect(result.state.books[0].records[0].status).toBe("failed");
    expect(result.state.books[0].records[1].status).toBe("processed");
  });

  it("leaves state untouched when no records are processing", () => {
    const book = createBook("置身事内");
    const state: AppState = { books: [book], activeBookId: null };

    const result = recoverStaleRecords(state);

    expect(result.changed).toBe(false);
    expect(result.state).toBe(state);
  });
});
