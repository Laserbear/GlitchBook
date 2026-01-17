import type { GlitchDefinition, GlitchParams } from '../types';

export const rowPadding: GlitchDefinition = {
  id: 'row-padding',
  name: 'Row Padding',
  category: 'memory-layout',
  description: 'Missing or incorrect alignment padding at the end of each row, causing progressive row misalignment.',
  technicalDetails: `Many image formats and graphics APIs require rows to be aligned to specific byte boundaries (often 4 bytes).
BMP files, OpenGL textures, and Direct3D surfaces often have padding bytes at the end of each row.
Ignoring this padding causes each subsequent row to be offset by an increasing amount, creating a cascading diagonal pattern.`,
  bugCode: `// Bug: Ignoring row padding in BMP file
int rowSize = width * 3;  // Wrong for BMP!
// BMP rows are padded to 4-byte boundaries
for (int y = 0; y < height; y++) {
    for (int x = 0; x < width; x++) {
        int idx = y * rowSize + x * 3;
        // Reads wrong pixels after first row
    }
}`,
  fixCode: `// Fix: Account for row padding
int rowSizeUnpadded = width * 3;
int padding = (4 - (rowSizeUnpadded % 4)) % 4;
int rowSizePadded = rowSizeUnpadded + padding;
for (int y = 0; y < height; y++) {
    for (int x = 0; x < width; x++) {
        int idx = y * rowSizePadded + x * 3;
        // Now correctly aligned
    }
}`,
  params: [
    {
      name: 'paddingBytes',
      type: 'range',
      min: 0,
      max: 16,
      step: 1,
      default: 4,
      description: 'Simulated missing padding bytes per row'
    },
    {
      name: 'simulateBMP',
      type: 'boolean',
      default: false,
      description: 'Simulate BMP 3-byte RGB with 4-byte alignment'
    }
  ],
  apply: (imageData: ImageData, params: GlitchParams): ImageData => {
    const { width, height, data } = imageData;
    const paddingBytes = (params.paddingBytes as number) || 4;
    const simulateBMP = (params.simulateBMP as boolean) || false;
    const output = new ImageData(width, height);
    const outData = output.data;

    if (simulateBMP) {
      // Simulate reading 3-byte RGB data that's 4-byte aligned
      // as if it had no padding
      const rowSizeUnpadded = width * 3;
      const padding = (4 - (rowSizeUnpadded % 4)) % 4;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const outIdx = (y * width + x) * 4;

          // Calculate offset as if there was no padding
          const unpaddedOffset = y * rowSizeUnpadded + x * 3;
          // But we're reading from data that IS padded
          // Each row we get further off by 'padding' bytes
          const effectiveOffset = unpaddedOffset + (y * padding);
          const srcPixel = Math.floor(effectiveOffset / 4);
          const srcIdx = srcPixel * 4;

          if (srcIdx + 3 < data.length) {
            outData[outIdx] = data[srcIdx];
            outData[outIdx + 1] = data[srcIdx + 1];
            outData[outIdx + 2] = data[srcIdx + 2];
            outData[outIdx + 3] = 255;
          }
        }
      }
    } else {
      // Simple padding simulation
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const outIdx = (y * width + x) * 4;

          // Simulate accumulated offset from missing padding
          const offset = y * paddingBytes;
          const srcIdx = (outIdx + offset) % data.length;

          outData[outIdx] = data[srcIdx];
          outData[outIdx + 1] = data[Math.min(srcIdx + 1, data.length - 1)];
          outData[outIdx + 2] = data[Math.min(srcIdx + 2, data.length - 1)];
          outData[outIdx + 3] = 255;
        }
      }
    }

    return output;
  }
};
