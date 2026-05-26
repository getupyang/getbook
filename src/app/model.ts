export type RecordStatus = "saved" | "processing" | "processed" | "failed";

export interface BookRecord {
  id: string;
  status: RecordStatus;
  photoUrl: string;
  rawInput: string;
  timestamp: string;
  createdAt: string;
  quote?: string;
  thought?: string;
  page?: number;
}

export interface Book {
  id: string;
  title: string;
  author?: string;
  records: BookRecord[];
  lastActive: string;
}

export interface AppState {
  books: Book[];
  activeBookId: string | null;
}

export const EMPTY_STATE: AppState = {
  books: [],
  activeBookId: null,
};

function makeId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function formatTimestamp(date = new Date()) {
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const sameAsYesterday = date.toDateString() === yesterday.toDateString();

  const time = date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  if (sameDay) return `今天 ${time}`;
  if (sameAsYesterday) return `昨天 ${time}`;
  return `${date.getMonth() + 1}月${date.getDate()}日 ${time}`;
}

export function createBook(title: string, author?: string, now = new Date()): Book {
  const cleanTitle = title.trim();
  if (!cleanTitle) {
    throw new Error("书名不能为空");
  }

  return {
    id: makeId("book"),
    title: cleanTitle,
    author: author?.trim() || undefined,
    records: [],
    lastActive: formatTimestamp(now),
  };
}

export function createCapture(params: {
  photoUrl: string;
  rawInput: string;
  now?: Date;
}): BookRecord {
  const rawInput = params.rawInput.trim();
  if (!params.photoUrl) {
    throw new Error("请先拍照");
  }
  if (!rawInput) {
    throw new Error("请写下你的想法");
  }

  const now = params.now ?? new Date();
  return {
    id: makeId("record"),
    status: "saved",
    photoUrl: params.photoUrl,
    rawInput,
    timestamp: formatTimestamp(now),
    createdAt: now.toISOString(),
  };
}
