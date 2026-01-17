export function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export function getContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2D context');
  }
  return ctx;
}

export function imageToImageData(img: HTMLImageElement): ImageData {
  const canvas = createCanvas(img.naturalWidth, img.naturalHeight);
  const ctx = getContext(canvas);
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

export function imageDataToCanvas(imageData: ImageData): HTMLCanvasElement {
  const canvas = createCanvas(imageData.width, imageData.height);
  const ctx = getContext(canvas);
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

export function imageDataToDataURL(imageData: ImageData): string {
  const canvas = imageDataToCanvas(imageData);
  return canvas.toDataURL('image/png');
}

export function downloadCanvas(canvas: HTMLCanvasElement, filename: string): void {
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export function downloadImageData(imageData: ImageData, filename: string): void {
  const canvas = imageDataToCanvas(imageData);
  downloadCanvas(canvas, filename);
}

export function resizeImageData(
  imageData: ImageData,
  maxWidth: number,
  maxHeight: number
): ImageData {
  const { width, height } = imageData;

  if (width <= maxWidth && height <= maxHeight) {
    return imageData;
  }

  const scale = Math.min(maxWidth / width, maxHeight / height);
  const newWidth = Math.floor(width * scale);
  const newHeight = Math.floor(height * scale);

  const srcCanvas = imageDataToCanvas(imageData);
  const dstCanvas = createCanvas(newWidth, newHeight);
  const ctx = getContext(dstCanvas);

  ctx.drawImage(srcCanvas, 0, 0, newWidth, newHeight);
  return ctx.getImageData(0, 0, newWidth, newHeight);
}
