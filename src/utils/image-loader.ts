import { imageToImageData } from './canvas';

export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('File is not an image'));
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = reader.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export async function loadImageDataFromFile(file: File): Promise<ImageData> {
  const img = await loadImageFromFile(file);
  return imageToImageData(img);
}

export function loadImageFromURL(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image from URL'));
    img.src = url;
  });
}

export async function loadImageDataFromURL(url: string): Promise<ImageData> {
  const img = await loadImageFromURL(url);
  return imageToImageData(img);
}

export function setupDropZone(
  element: HTMLElement,
  onFile: (file: File) => void
): () => void {
  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    element.classList.add('drag-over');
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    element.classList.remove('drag-over');
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    element.classList.remove('drag-over');

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        onFile(file);
      }
    }
  };

  element.addEventListener('dragover', handleDragOver);
  element.addEventListener('dragleave', handleDragLeave);
  element.addEventListener('drop', handleDrop);

  // Return cleanup function
  return () => {
    element.removeEventListener('dragover', handleDragOver);
    element.removeEventListener('dragleave', handleDragLeave);
    element.removeEventListener('drop', handleDrop);
  };
}

export function createFileInput(onFile: (file: File) => void): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.style.display = 'none';

  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (file) {
      onFile(file);
      input.value = ''; // Reset for re-selection
    }
  });

  return input;
}
