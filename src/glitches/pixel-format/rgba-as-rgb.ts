import type { GlitchDefinition, GlitchParams } from '../types';

export const rgbaAsRgb: GlitchDefinition = {
  id: 'rgba-as-rgb',
  name: 'RGBA as RGB',
  category: 'pixel-format',
  description: 'Reading 4-byte RGBA pixels as if they were 3-byte RGB, causing a diagonal shear effect.',
  technicalDetails: `This bug occurs when code assumes pixels are stored as RGB (3 bytes) when they're actually RGBA (4 bytes).
Each row shifts by one byte, creating a characteristic diagonal pattern. The alpha channel gets interpreted as the next pixel's red channel.`,
  bugCode: `// Bug: Assuming RGB (3 bytes per pixel)
for (int i = 0; i < width * height; i++) {
    int offset = i * 3;  // Wrong! Should be * 4
    uint8_t r = data[offset];
    uint8_t g = data[offset + 1];
    uint8_t b = data[offset + 2];
}`,
  fixCode: `// Fix: Correctly using RGBA (4 bytes per pixel)
for (int i = 0; i < width * height; i++) {
    int offset = i * 4;  // Correct stride
    uint8_t r = data[offset];
    uint8_t g = data[offset + 1];
    uint8_t b = data[offset + 2];
    uint8_t a = data[offset + 3];
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

    // Simulate reading RGBA data as if it were RGB
    // This causes a 1-byte shift per pixel, creating diagonal shear
    const bytesPerPixelWrong = 3;
    const bytesPerPixelCorrect = 4;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const correctIdx = (y * width + x) * bytesPerPixelCorrect;

        // Calculate where we'd read from if we mistakenly used 3 bytes per pixel
        const wrongPixelIndex = y * width + x;
        const wrongByteOffset = wrongPixelIndex * bytesPerPixelWrong;

        // Convert back to actual array indices
        const wrongIdx = wrongByteOffset % (width * height * bytesPerPixelCorrect);

        // Blend between correct and wrong based on intensity
        if (wrongIdx + 2 < data.length) {
          outData[correctIdx] = Math.round(
            data[correctIdx] * (1 - intensity) + data[wrongIdx] * intensity
          );
          outData[correctIdx + 1] = Math.round(
            data[correctIdx + 1] * (1 - intensity) + data[wrongIdx + 1] * intensity
          );
          outData[correctIdx + 2] = Math.round(
            data[correctIdx + 2] * (1 - intensity) + data[wrongIdx + 2] * intensity
          );
          outData[correctIdx + 3] = 255;
        } else {
          outData[correctIdx] = data[correctIdx];
          outData[correctIdx + 1] = data[correctIdx + 1];
          outData[correctIdx + 2] = data[correctIdx + 2];
          outData[correctIdx + 3] = 255;
        }
      }
    }

    return output;
  }
};
