import { normalizeAnalysisResult } from "../src/app/analysis";

interface AnalyzeRequestBody {
  imageDataUrl?: unknown;
  rawInput?: unknown;
  bookTitle?: unknown;
}

const ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    quote: {
      type: "string",
      description: "The exact original sentence from the book photo, or an empty string if uncertain.",
    },
    thought: {
      type: "string",
      description: "The reader's own thought, cleaned up but not expanded with new ideas.",
    },
    page: {
      anyOf: [{ type: "number" }, { type: "null" }],
      description: "The page number only when explicitly visible or mentioned; otherwise null.",
    },
  },
  required: ["quote", "thought", "page"],
};

function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, {
    ...init,
    headers: {
      "Cache-Control": "no-store",
      ...(init?.headers ?? {}),
    },
  });
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function readRequestBody(request: Request): Promise<AnalyzeRequestBody> {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? (body as AnalyzeRequestBody) : {};
  } catch {
    return {};
  }
}

function buildPrompt(bookTitle: string, rawInput: string) {
  return [
    "你要把一条纸质书随手记录整理成结构化读书笔记。",
    `书名：${bookTitle || "未提供"}`,
    `读者输入：${rawInput}`,
    "",
    "请先根据照片做 OCR，再结合读者输入判断：",
    "1. quote: 最可能被划线、圈出、或被读者提到的书中原文。必须来自照片或读者输入，不要改写，不确定就返回空字符串。",
    "2. thought: 读者自己的想法。可以去掉口语停顿，但不要添加新观点。",
    "3. page: 只有当照片或读者输入明确出现页码时才填写数字，否则返回 null。",
    "",
    "不要编造页码、章节或原文。只返回符合 schema 的 JSON。",
  ].join("\n");
}

function extractMessageContent(value: unknown) {
  if (!value || typeof value !== "object") return "";

  const choices = (value as { choices?: unknown }).choices;
  if (!Array.isArray(choices)) return "";

  const first = choices[0] as { message?: { content?: unknown } } | undefined;
  const content = first?.message?.content;
  if (typeof content === "string") return content;

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (part && typeof part === "object" && "text" in part) {
          return readString((part as { text: unknown }).text);
        }
        return "";
      })
      .join("");
  }

  return "";
}

function parseModelJson(content: string) {
  const trimmed = content.trim();
  if (!trimmed) throw new Error("模型没有返回内容");

  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("模型没有返回 JSON");
    return JSON.parse(match[0]);
  }
}

export default {
  async fetch(request: Request) {
    if (request.method !== "POST") {
      return json({ error: "只支持 POST" }, { status: 405 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_MODEL;
    if (!apiKey || !model) {
      return json(
        { error: "缺少 OPENROUTER_API_KEY 或 OPENROUTER_MODEL" },
        { status: 500 }
      );
    }

    const body = await readRequestBody(request);
    const imageDataUrl = readString(body.imageDataUrl);
    const rawInput = readString(body.rawInput);
    const bookTitle = readString(body.bookTitle);

    if (!imageDataUrl.startsWith("data:image/")) {
      return json({ error: "缺少有效照片" }, { status: 400 });
    }
    if (!rawInput) {
      return json({ error: "缺少读者输入" }, { status: 400 });
    }

    const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.OPENROUTER_SITE_URL ?? "https://getbook.local",
        "X-Title": process.env.OPENROUTER_APP_TITLE ?? "Getbook",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "你是一个谨慎的中文读书笔记整理助手。你只基于照片和读者输入整理，不补充外部知识。",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: buildPrompt(bookTitle, rawInput),
              },
              {
                type: "image_url",
                image_url: {
                  url: imageDataUrl,
                },
              },
            ],
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "reading_capture_analysis",
            strict: true,
            schema: ANALYSIS_SCHEMA,
          },
        },
        temperature: 0.1,
        max_tokens: 800,
        stream: false,
      }),
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      return json(
        { error: detail || `OpenRouter 请求失败：${upstream.status}` },
        { status: 502 }
      );
    }

    const data = (await upstream.json()) as unknown;

    let analysis;
    try {
      const parsed = parseModelJson(extractMessageContent(data));
      analysis = normalizeAnalysisResult(parsed, rawInput);
    } catch (error) {
      return json(
        { error: error instanceof Error ? error.message : "模型结果解析失败" },
        { status: 502 }
      );
    }

    return json({ analysis });
  },
};
