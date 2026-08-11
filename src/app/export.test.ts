import { describe, expect, it } from "vitest";
import { formatRecordsForExport, newRecordsSince } from "./export";
import { Book, BookRecord } from "./model";

function makeRecord(overrides: Partial<BookRecord>): BookRecord {
  return {
    id: "r1",
    status: "processed",
    photoUrl: "data:image/jpeg;base64,a",
    rawInput: "原始输入",
    timestamp: "今天 18:32",
    createdAt: "2026-08-10T18:32:00.000+08:00",
    ...overrides,
  };
}

function makeBook(records: BookRecord[], lastExportedAt?: string): Book {
  return {
    id: "b1",
    title: "把自己作为方法",
    records,
    lastActive: "今天 18:32",
    lastExportedAt,
  };
}

describe("export", () => {
  it("formats a processed record with date, page, quote and thought", () => {
    const book = makeBook([
      makeRecord({
        quote: "什么样的成功应该引以为荣",
        thought: "值得思考",
        page: 44,
      }),
    ]);

    const text = formatRecordsForExport(book, book.records);

    expect(text).toContain("《把自己作为方法》读书笔记 · 1 条");
    expect(text).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2} · 第 44 页/);
    expect(text).toContain("「什么样的成功应该引以为荣」");
    expect(text).toContain("💭 值得思考");
  });

  it("falls back to raw input for unprocessed records and skips empty fields", () => {
    const book = makeBook([
      makeRecord({ status: "failed", quote: undefined, thought: undefined }),
    ]);

    const text = formatRecordsForExport(book, book.records);

    expect(text).toContain("💭 原始输入");
    expect(text).not.toContain("「");
    expect(text).not.toContain("第 ");
  });

  it("exports records oldest-first", () => {
    const newer = makeRecord({
      id: "r2",
      thought: "新想法",
      createdAt: "2026-08-11T09:00:00.000+08:00",
    });
    const older = makeRecord({
      id: "r1",
      thought: "旧想法",
      createdAt: "2026-08-10T09:00:00.000+08:00",
    });
    const book = makeBook([newer, older]);

    const text = formatRecordsForExport(book, book.records);

    expect(text.indexOf("旧想法")).toBeLessThan(text.indexOf("新想法"));
  });

  it("selects only records touched after the last export", () => {
    const exported = makeRecord({ id: "r1", createdAt: "2026-08-10T10:00:00.000Z" });
    const created = makeRecord({ id: "r2", createdAt: "2026-08-10T14:00:00.000Z" });
    const edited = makeRecord({
      id: "r3",
      createdAt: "2026-08-10T09:00:00.000Z",
      updatedAt: "2026-08-10T15:00:00.000Z",
    });
    const book = makeBook([edited, created, exported], "2026-08-10T12:00:00.000Z");

    const fresh = newRecordsSince(book, book.lastExportedAt);

    expect(fresh.map((record) => record.id)).toEqual(["r3", "r2"]);
  });

  it("treats a book without export history as all-new", () => {
    const book = makeBook([makeRecord({})]);
    expect(newRecordsSince(book, book.lastExportedAt)).toHaveLength(1);
  });
});
