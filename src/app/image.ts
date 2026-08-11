// 1100px/q0.6 实测：整理 30-44s → 9-15s，页码识别反而更稳（更小上传体积）
export const MAX_IMAGE_DIMENSION = 1100;
export const JPEG_QUALITY = 0.6;

export interface CompressedImage {
  dataUrl: string;
  width: number;
  height: number;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("照片读取失败"));
    };
    image.src = url;
  });
}

function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("照片读取失败"));
    image.src = url;
  });
}

// 列表缩略图：64px 的框加载 1100px 大图，几十条同屏会撑爆 iOS Safari
// 的解码内存（滚动出现空白的主要嫌疑），生成小图给列表用
export async function createThumbnail(dataUrl: string, maxDim = 192): Promise<string> {
  const image = await loadImageFromUrl(dataUrl);
  const ratio = Math.min(
    1,
    maxDim / Math.max(image.naturalWidth, image.naturalHeight)
  );
  const width = Math.max(1, Math.round(image.naturalWidth * ratio));
  const height = Math.max(1, Math.round(image.naturalHeight * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("当前浏览器无法生成缩略图");
  }
  ctx.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.7);
}

export async function compressImage(file: File): Promise<CompressedImage> {
  if (!file.type.startsWith("image/")) {
    throw new Error("请选择照片文件");
  }

  const image = await loadImage(file);
  const ratio = Math.min(
    1,
    MAX_IMAGE_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight)
  );
  const width = Math.max(1, Math.round(image.naturalWidth * ratio));
  const height = Math.max(1, Math.round(image.naturalHeight * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("当前浏览器无法压缩照片");
  }

  ctx.drawImage(image, 0, 0, width, height);

  return {
    dataUrl: canvas.toDataURL("image/jpeg", JPEG_QUALITY),
    width,
    height,
  };
}
