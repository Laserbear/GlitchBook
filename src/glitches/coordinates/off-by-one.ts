import type { GlitchDefinition, GlitchParams } from '../types';

export const offByOne: GlitchDefinition = {
  id: 'off-by-one',
  name: 'Off-by-One',
  category: 'coordinates',
  description: 'Classic fencepost error in pixel loops, causing edge artifacts or one-pixel shifts.',
  technicalDetails: `Off-by-one errors are among the most common bugs in graphics programming. They occur when loop bounds are incorrect
(e.g., using <= instead of <, or starting at 1 instead of 0). This can cause the last row/column to be skipped, read beyond array bounds,
or create a one-pixel offset in the entire image.`,
  bugCode: `// Bug: Off-by-one in loop bounds
for (int y = 0; y <= height; y++) {  // <= should be <
    for (int x = 0; x <= width; x++) {  // <= should be <
        int idx = (y * width + x) * 4;
        // Reading past end of array on last iteration!
        pixel = data[idx];
    }
}`,
  fixCode: `// Fix: Correct loop bounds
for (int y = 0; y < height; y++) {  // < not <=
    for (int x = 0; x < width; x++) {  // < not <=
        int idx = (y * width + x) * 4;
        pixel = data[idx];
    }
}`,
  params: [
    {
      name: 'xOffset',
      type: 'range',
      min: -5,
      max: 5,
      step: 1,
      default: 1,
      description: 'Horizontal pixel offset'
    },
    {
      name: 'yOffset',
      type: 'range',
      min: -5,
      max: 5,
      step: 1,
      default: 1,
      description: 'Vertical pixel offset'
    },
    {
      name: 'wrapEdges',
      type: 'boolean',
      default: true,
      description: 'Wrap around at edges instead of clamping'
    }
  ],
  apply: (imageData: ImageData, params: GlitchParams): ImageData => {
    const { width, height, data } = imageData;
    const xOffset = (params.xOffset as number) || 1;
    const yOffset = (params.yOffset as number) || 1;
    const wrapEdges = params.wrapEdges !== false;
    const output = new ImageData(width, height);
    const outData = output.data;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const outIdx = (y * width + x) * 4;

        let srcX = x + xOffset;
        let srcY = y + yOffset;

        if (wrapEdges) {
          srcX = ((srcX % width) + width) % width;
          srcY = ((srcY % height) + height) % height;
        } else {
          srcX = Math.max(0, Math.min(width - 1, srcX));
          srcY = Math.max(0, Math.min(height - 1, srcY));
        }

        const srcIdx = (srcY * width + srcX) * 4;

        outData[outIdx] = data[srcIdx];
        outData[outIdx + 1] = data[srcIdx + 1];
        outData[outIdx + 2] = data[srcIdx + 2];
        outData[outIdx + 3] = data[srcIdx + 3];
      }
    }

    return output;
  }
};
