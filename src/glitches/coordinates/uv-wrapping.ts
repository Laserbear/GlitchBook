import type { GlitchDefinition, GlitchParams } from '../types';

export const uvWrapping: GlitchDefinition = {
  id: 'uv-wrapping',
  name: 'UV Wrapping',
  category: 'coordinates',
  description: 'Incorrect texture wrapping mode causing tiling artifacts or stretched edges.',
  technicalDetails: `UV coordinates map 2D textures onto 3D surfaces. When UVs go outside the 0-1 range, the wrapping mode determines what happens:
REPEAT tiles the texture, CLAMP stretches the edge pixels, MIRROR reflects the texture. Using the wrong mode or not handling edge cases
causes visible seams, unexpected tiling, or stretched artifacts.`,
  bugCode: `// Bug: Not handling UV coordinates outside 0-1 range
vec4 sampleTexture(vec2 uv) {
    // If uv.x > 1.0 or < 0.0, we get garbage or crash
    int x = (int)(uv.x * width);
    int y = (int)(uv.y * height);
    return texture[y * width + x];  // No bounds check!
}`,
  fixCode: `// Fix: Properly handle wrapping modes
vec4 sampleTexture(vec2 uv, WrapMode mode) {
    if (mode == REPEAT) {
        uv = fract(uv);  // Keep only fractional part
    } else if (mode == MIRROR) {
        uv = abs(fract(uv * 0.5) * 2.0 - 1.0);
    } else {  // CLAMP
        uv = clamp(uv, 0.0, 1.0);
    }
    int x = (int)(uv.x * (width - 1));
    int y = (int)(uv.y * (height - 1));
    return texture[y * width + x];
}`,
  params: [
    {
      name: 'wrapMode',
      type: 'select',
      options: ['Repeat', 'Mirror', 'Clamp', 'None (shows bug)'],
      default: 'Repeat',
      description: 'UV wrapping mode to demonstrate'
    },
    {
      name: 'uvScale',
      type: 'range',
      min: 0.5,
      max: 4,
      step: 0.25,
      default: 2,
      description: 'UV coordinate scale (>1 causes tiling)'
    },
    {
      name: 'uvOffsetX',
      type: 'range',
      min: -1,
      max: 1,
      step: 0.1,
      default: 0,
      description: 'UV X offset'
    },
    {
      name: 'uvOffsetY',
      type: 'range',
      min: -1,
      max: 1,
      step: 0.1,
      default: 0,
      description: 'UV Y offset'
    }
  ],
  apply: (imageData: ImageData, params: GlitchParams): ImageData => {
    const { width, height, data } = imageData;
    const wrapMode = (params.wrapMode as string) || 'Repeat';
    const uvScale = (params.uvScale as number) || 2;
    const uvOffsetX = (params.uvOffsetX as number) || 0;
    const uvOffsetY = (params.uvOffsetY as number) || 0;
    const output = new ImageData(width, height);
    const outData = output.data;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const outIdx = (y * width + x) * 4;

        // Calculate UV coordinates
        let u = (x / width) * uvScale + uvOffsetX;
        let v = (y / height) * uvScale + uvOffsetY;

        // Apply wrapping mode
        switch (wrapMode) {
          case 'Repeat':
            u = ((u % 1) + 1) % 1;
            v = ((v % 1) + 1) % 1;
            break;
          case 'Mirror':
            u = Math.abs(((u % 2) + 2) % 2 - 1);
            v = Math.abs(((v % 2) + 2) % 2 - 1);
            // Invert when in the "return" phase
            if (Math.floor(Math.abs(u * uvScale)) % 2 === 1) u = 1 - u;
            if (Math.floor(Math.abs(v * uvScale)) % 2 === 1) v = 1 - v;
            u = ((u % 1) + 1) % 1;
            v = ((v % 1) + 1) % 1;
            break;
          case 'Clamp':
            u = Math.max(0, Math.min(1, u));
            v = Math.max(0, Math.min(1, v));
            break;
          case 'None (shows bug)':
            // Don't handle wrapping - will show artifacts
            if (u < 0 || u > 1 || v < 0 || v > 1) {
              // Outside bounds - show magenta error color
              outData[outIdx] = 255;
              outData[outIdx + 1] = 0;
              outData[outIdx + 2] = 255;
              outData[outIdx + 3] = 255;
              continue;
            }
            break;
        }

        // Sample the texture
        const srcX = Math.floor(u * (width - 1));
        const srcY = Math.floor(v * (height - 1));
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
