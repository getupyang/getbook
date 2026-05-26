export interface CaptureAnalysis {
  quote?: string;
  thought: string;
  page?: number;
}

export interface AnalyzeCaptureInput {
  imageDataUrl: string;
  rawInput: string;
  bookTitle: string;
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readPage(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.round(value);
  }

  if (typeof value === "string") {
    const number = Number(value.match(/\d+/)?.[0]);
    if (Number.isFinite(number) && number > 0) return Math.round(number);
  }

  return undefined;
}

export function normalizeAnalysisResult(
  value: unknown,
  fallbackThought = ""
): CaptureAnalysis {
  if (!value || typeof value !== "object") {
    throw new Error("整理结果格式错误");
  }

  const source = value as Record<string, unknown>;
  const quote = readString(source.quote) || undefined;
  const thought = readString(source.thought) || fallbackThought.trim();
  const page = readPage(source.page);

  if (!thought) {
    throw new Error("整理结果缺少想法");
  }

  return {
    quote,
    thought,
    page,
  };
}

function readErrorMessage(value: unknown) {
  if (value && typeof value === "object" && "error" in value) {
    const message = readString((value as { error: unknown }).error);
    if (message) return message;
  }
  return "整理失败，请稍后重试";
}

export async function analyzeCapture(input: AnalyzeCaptureInput) {
  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const body = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    throw new Error(readErrorMessage(body));
  }

  const payload =
    body && typeof body === "object" && "analysis" in body
      ? (body as { analysis: unknown }).analysis
      : body;

  return normalizeAnalysisResult(payload, input.rawInput);
}
