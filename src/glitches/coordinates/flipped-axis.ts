import type { GlitchDefinition, GlitchParams } from '../types';

export const flippedAxis: GlitchDefinition = {
  id: 'flipped-axis',
  name: 'Flipped Axis',
  category: 'coordinates',
  description: 'Y-up vs Y-down coordinate system mismatch, causing vertically flipped or mirrored images.',
  technicalDetails: `Different graphics systems use different coordinate conventions. OpenGL uses Y-up (origin at bottom-left),
while most image formats and UI systems use Y-down (origin at top-left). DirectX historically used different conventions than OpenGL.
Mixing these systems causes images to appear upside-down or mirrored.`,
  bugCode: `// Bug: Assuming Y-up when data is Y-down
for (int y = 0; y < height; y++) {
    // OpenGL textures are Y-up, but we loaded Y-down data
    int srcY = y;  // Should flip: height - 1 - y
    memcpy(glTexture + y * stride,
           imageData + srcY * stride, stride);
}
// Result: texture appears upside-down`,
  fixCode: `// Fix: Flip Y coordinate when loading
for (int y = 0; y < height; y++) {
    int srcY = height - 1 - y;  // Flip Y
    memcpy(glTexture + y * stride,
           imageData + srcY * stride, stride);
}
// Or set GL_UNPACK_FLIP_Y in OpenGL`,
  params: [
    {
      name: 'flipMode',
      type: 'select',
      options: ['Flip Vertical', 'Flip Horizontal', 'Flip Both', 'Rotate 180'],
      default: 'Flip Vertical',
      description: 'Type of axis flip to apply'
    }
  ],
  apply: (imageData: ImageData, params: GlitchParams): ImageData => {
    const { width, height, data } = imageData;
    const flipMode = (params.flipMode as string) || 'Flip Vertical';
    const output = new ImageData(width, height);
    const outData = output.data;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const outIdx = (y * width + x) * 4;

        let srcX = x;
        let srcY = y;

        switch (flipMode) {
          case 'Flip Vertical':
            srcY = height - 1 - y;
            break;
          case 'Flip Horizontal':
            srcX = width - 1 - x;
            break;
          case 'Flip Both':
            srcX = width - 1 - x;
            srcY = height - 1 - y;
            break;
          case 'Rotate 180':
            srcX = width - 1 - x;
            srcY = height - 1 - y;
            break;
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
