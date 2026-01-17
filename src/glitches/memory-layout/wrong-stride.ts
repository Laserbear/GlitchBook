import type { GlitchDefinition, GlitchParams } from '../types';

export const wrongStride: GlitchDefinition = {
  id: 'wrong-stride',
  name: 'Wrong Stride',
  category: 'memory-layout',
  description: 'Incorrect bytes-per-row calculation, causing diagonal shearing and visual corruption.',
  technicalDetails: `Stride (or pitch) is the number of bytes between the start of one row and the next. It's often different from width * bytesPerPixel due to alignment padding.
Using the wrong stride causes each row to start at the wrong offset, creating a characteristic diagonal pattern where the image appears to "slide" horizontally.`,
  bugCode: `// Bug: Assuming stride equals width * bytesPerPixel
int stride = width * 4;  // Wrong if there's padding!
for (int y = 0; y < height; y++) {
    for (int x = 0; x < width; x++) {
        int idx = y * stride + x * 4;
        // This works only if stride == width * 4
    }
}`,
  fixCode: `// Fix: Use the actual stride from the image metadata
int stride = image->stride;  // Get actual stride
// Or calculate with proper alignment:
int stride = (width * 4 + alignment - 1) & ~(alignment - 1);
for (int y = 0; y < height; y++) {
    for (int x = 0; x < width; x++) {
        int idx = y * stride + x * 4;
    }
}`,
  params: [
    {
      name: 'strideError',
      type: 'range',
      min: -20,
      max: 20,
      step: 1,
      default: 4,
      description: 'Bytes to add/subtract from correct stride'
    }
  ],
  apply: (imageData: ImageData, params: GlitchParams): ImageData => {
    const { width, height, data } = imageData;
    const strideError = (params.strideError as number) || 4;
    const output = new ImageData(width, height);
    const outData = output.data;

    const correctStride = width * 4;
    const wrongStride = correctStride + strideError;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const outIdx = (y * width + x) * 4;

        // Calculate where we would read from with wrong stride
        const wrongOffset = y * wrongStride + x * 4;
        const wrongIdx = wrongOffset % data.length;

        // Ensure we don't read past bounds
        if (wrongIdx + 3 < data.length) {
          outData[outIdx] = data[wrongIdx];
          outData[outIdx + 1] = data[wrongIdx + 1];
          outData[outIdx + 2] = data[wrongIdx + 2];
          outData[outIdx + 3] = 255;
        } else {
          outData[outIdx] = 0;
          outData[outIdx + 1] = 0;
          outData[outIdx + 2] = 0;
          outData[outIdx + 3] = 255;
        }
      }
    }

    return output;
  }
};
