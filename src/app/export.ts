import { Book, BookRecord } from "./model";

function recordExportTime(record: BookRecord) {
  return record.updatedAt ?? record.createdAt;
}

export function newRecordsSince(book: Book, lastExportedAt?: string) {
  if (!lastExportedAt) return book.records;
  return book.records.filter(
    (record) => recordExportTime(record) > lastExportedAt
  );
}

function formatExportDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatRecord(record: BookRecord) {
  const header = [
    formatExportDate(record.createdAt),
    record.page ? `第 ${record.page} 页` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const quote = record.status === "processed" ? record.quote?.trim() : "";
  const thought =
    (record.status === "processed" ? record.thought?.trim() : "") ||
    record.rawInput.trim();

  const lines = [header];
  if (quote) lines.push(`「${quote}」`);
  if (thought) lines.push(`💭 ${thought}`);
  return lines.filter(Boolean).join("\n");
}

export function formatRecordsForExport(book: Book, records: BookRecord[]) {
  // 记录在 state 里是新的在前，导出按阅读顺序（旧的在前）
  const ordered = [...records].reverse();
  const title = `《${book.title}》读书笔记 · ${ordered.length} 条`;
  return [title, ...ordered.map(formatRecord)].join("\n\n");
}
