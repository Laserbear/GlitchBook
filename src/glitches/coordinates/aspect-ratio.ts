import type { GlitchDefinition, GlitchParams } from '../types';

export const aspectRatio: GlitchDefinition = {
  id: 'aspect-ratio',
  name: 'Aspect Ratio',
  category: 'coordinates',
  description: 'Width/height confusion causing stretched or squashed images.',
  technicalDetails: `Aspect ratio bugs occur when width and height are swapped, or when the aspect ratio isn't preserved during scaling.
This is common when: converting between coordinate systems, loading images with transposed dimensions, or displaying content
designed for one aspect ratio on a different display.`,
  bugCode: `// Bug: Swapped width and height
void loadTexture(const char* filename) {
    Image img = loadImage(filename);
    // Oops, swapped width and height!
    glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA,
        img.height, img.width,  // Wrong order!
        0, GL_RGBA, GL_UNSIGNED_BYTE, img.data);
}`,
  fixCode: `// Fix: Correct dimension order
void loadTexture(const char* filename) {
    Image img = loadImage(filename);
    glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA,
        img.width, img.height,  // Correct order
        0, GL_RGBA, GL_UNSIGNED_BYTE, img.data);
}`,
  params: [
    {
      name: 'mode',
      type: 'select',
      options: ['Swap Width/Height', 'Force Square', 'Wrong Aspect Scale'],
      default: 'Swap Width/Height',
      description: 'Type of aspect ratio error'
    },
    {
      name: 'scaleX',
      type: 'range',
      min: 0.25,
      max: 2,
      step: 0.1,
      default: 1,
      description: 'Horizontal scale factor'
    },
    {
      name: 'scaleY',
      type: 'range',
      min: 0.25,
      max: 2,
      step: 0.1,
      default: 1,
      description: 'Vertical scale factor'
    }
  ],
  apply: (imageData: ImageData, params: GlitchParams): ImageData => {
    const { width, height, data } = imageData;
    const mode = (params.mode as string) || 'Swap Width/Height';
    const scaleX = (params.scaleX as number) || 1;
    const scaleY = (params.scaleY as number) || 1;
    const output = new ImageData(width, height);
    const outData = output.data;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const outIdx = (y * width + x) * 4;

        let srcX: number, srcY: number;

        switch (mode) {
          case 'Swap Width/Height':
            // Sample as if width and height were swapped
            // This causes the image to be read diagonally
            const normalizedX = x / width;
            const normalizedY = y / height;
            srcX = Math.floor(normalizedY * (width - 1));
            srcY = Math.floor(normalizedX * (height - 1));
            break;

          case 'Force Square':
            // Force square aspect ratio on non-square image
            const maxDim = Math.max(width, height);
            srcX = Math.floor((x / width) * maxDim) % width;
            srcY = Math.floor((y / height) * maxDim) % height;
            break;

          case 'Wrong Aspect Scale':
            // Apply incorrect scaling
            const centerX = width / 2;
            const centerY = height / 2;
            srcX = Math.floor(centerX + (x - centerX) / scaleX);
            srcY = Math.floor(centerY + (y - centerY) / scaleY);
            srcX = Math.max(0, Math.min(width - 1, srcX));
            srcY = Math.max(0, Math.min(height - 1, srcY));
            break;

          default:
            srcX = x;
            srcY = y;
        }

        // Clamp to valid range
        srcX = Math.max(0, Math.min(width - 1, srcX));
        srcY = Math.max(0, Math.min(height - 1, srcY));

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
