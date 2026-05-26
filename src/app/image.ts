export const MAX_IMAGE_DIMENSION = 1600;
export const JPEG_QUALITY = 0.75;

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
