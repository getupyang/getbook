import { HighlightStroke } from "./model";

export const HIGHLIGHT_STROKE_COLOR = "rgba(255, 214, 10, 0.42)";

export function hasHighlightStrokes(strokes?: HighlightStroke[]) {
  return Boolean(strokes?.some((stroke) => stroke.points.length > 1));
}

export function clampHighlightPoint(point: { x: number; y: number }) {
  return {
    x: Math.min(1, Math.max(0, point.x)),
    y: Math.min(1, Math.max(0, point.y)),
  };
}

function loadDataUrlImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("照片标记生成失败"));
    image.src = dataUrl;
  });
}

export function drawHighlightStrokes(
  ctx: CanvasRenderingContext2D,
  strokes: HighlightStroke[],
  width: number,
  height: number,
  lineWidth: number
) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = HIGHLIGHT_STROKE_COLOR;
  ctx.lineWidth = lineWidth;

  for (const stroke of strokes) {
    if (stroke.points.length < 2) continue;

    ctx.beginPath();
    stroke.points.forEach((point, index) => {
      const x = point.x * width;
      const y = point.y * height;
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
  }

  ctx.restore();
}

export async function createMarkedPhotoUrl(photoUrl: string, strokes: HighlightStroke[]) {
  if (!hasHighlightStrokes(strokes)) return undefined;

  const image = await loadDataUrlImage(photoUrl);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("当前浏览器无法保存划线");
  }

  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  drawHighlightStrokes(
    ctx,
    strokes,
    canvas.width,
    canvas.height,
    Math.max(22, Math.min(canvas.width, canvas.height) * 0.035)
  );

  return canvas.toDataURL("image/jpeg", 0.82);
}
