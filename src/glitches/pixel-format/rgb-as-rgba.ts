import type { GlitchDefinition, GlitchParams } from '../types';

export const rgbAsRgba: GlitchDefinition = {
  id: 'rgb-as-rgba',
  name: 'RGB as RGBA',
  category: 'pixel-format',
  description: 'Reading 3-byte RGB pixels as if they were 4-byte RGBA, causing compressed/overlapping image data.',
  technicalDetails: `The inverse of the RGBA-as-RGB bug. When code assumes 4 bytes per pixel but data is actually 3 bytes,
each pixel reads into the next, causing the image to appear compressed horizontally and showing repeated/overlapping data.
This is common when loading 24-bit BMP or older image formats without checking the actual bit depth.`,
  bugCode: `// Bug: Assuming RGBA (4 bytes) when data is RGB (3 bytes)
for (int i = 0; i < width * height; i++) {
    int offset = i * 4;  // Wrong! Data is only 3 bytes per pixel
    uint8_t r = data[offset];
    uint8_t g = data[offset + 1];
    uint8_t b = data[offset + 2];
    uint8_t a = data[offset + 3];  // Reading next pixel's red!
}`,
  fixCode: `// Fix: Check format and use correct stride
int bytesPerPixel = image->hasAlpha ? 4 : 3;
for (int i = 0; i < width * height; i++) {
    int offset = i * bytesPerPixel;
    uint8_t r = data[offset];
    uint8_t g = data[offset + 1];
    uint8_t b = data[offset + 2];
    uint8_t a = bytesPerPixel == 4 ? data[offset + 3] : 255;
}`,
  params: [
    {
      name: 'intensity',
      type: 'range',
      min: 0.1,
      max: 1,
      step: 0.1,
      default: 1,
      description: 'How strongly to apply the effect'
    }
  ],
  apply: (imageData: ImageData, params: GlitchParams): ImageData => {
    const { width, height, data } = imageData;
    const intensity = (params.intensity as number) || 1;
    const output = new ImageData(width, height);
    const outData = output.data;

    // Simulate reading RGB (3 byte) data as if it were RGBA (4 byte)
    // This compresses the image as we skip ahead too far
    const bytesPerPixelWrong = 4;
    const bytesPerPixelCorrect = 3;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const outIdx = (y * width + x) * 4;

        // Calculate where we'd read from if we mistakenly used 4 bytes per pixel on 3-byte data
        const wrongPixelIndex = y * width + x;
        const wrongByteOffset = wrongPixelIndex * bytesPerPixelWrong;

        // Map back to actual pixel (which is at 3-byte intervals)
        const actualPixelIndex = Math.floor(wrongByteOffset / bytesPerPixelCorrect);
        const srcIdx = (actualPixelIndex % (width * height)) * 4;

        if (srcIdx + 3 < data.length) {
          outData[outIdx] = Math.round(
            data[outIdx] * (1 - intensity) + data[srcIdx] * intensity
          );
          outData[outIdx + 1] = Math.round(
            data[outIdx + 1] * (1 - intensity) + data[srcIdx + 1] * intensity
          );
          outData[outIdx + 2] = Math.round(
            data[outIdx + 2] * (1 - intensity) + data[srcIdx + 2] * intensity
          );
          outData[outIdx + 3] = 255;
        } else {
          outData[outIdx] = data[outIdx];
          outData[outIdx + 1] = data[outIdx + 1];
          outData[outIdx + 2] = data[outIdx + 2];
          outData[outIdx + 3] = 255;
        }
      }
    }

    return output;
  }
};
