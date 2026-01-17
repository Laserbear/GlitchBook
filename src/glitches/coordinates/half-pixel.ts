import type { GlitchDefinition, GlitchParams } from '../types';

export const halfPixel: GlitchDefinition = {
  id: 'half-pixel',
  name: 'Half-Pixel Offset',
  category: 'coordinates',
  description: 'DirectX 9 vs 10+ texel coordinate mismatch, causing blurry or offset rendering.',
  technicalDetails: `In Direct3D 9, pixel centers were at integer coordinates (0, 1, 2...).
In D3D10+, OpenGL, and modern APIs, pixel centers are at half-integers (0.5, 1.5, 2.5...).
When porting D3D9 code or using wrong assumptions:
- Textures appear shifted by half a pixel
- Bilinear filtering samples between intended pixels, causing blur
- UI elements and text look fuzzy or offset
The fix is usually adding/subtracting 0.5 to texture coordinates.`,
  bugCode: `// Bug: D3D9-style coordinates in D3D10+
// Assumes pixel center at (0,0) but it's at (0.5, 0.5)
float2 texCoord = screenPos / screenSize;
// Texture is sampled between pixels, causing blur

// Bug: Forgetting half-pixel offset for fullscreen quad
output.position = float4(input.pos.xy, 0, 1);
// In D3D9, this needs adjustment for pixel-perfect rendering`,
  fixCode: `// Fix: Apply half-pixel correction
// For D3D10+ / OpenGL (pixel center at 0.5):
float2 texCoord = (screenPos + 0.5) / screenSize;

// For D3D9 compatibility (pixel center at 0):
float2 halfPixel = 0.5 / screenSize;
float2 texCoord = screenPos / screenSize + halfPixel;

// Or use SV_Position which already has the offset applied`,
  params: [
    {
      name: 'offsetX',
      type: 'range',
      min: -1,
      max: 1,
      step: 0.1,
      default: 0.5,
      description: 'Horizontal pixel offset'
    },
    {
      name: 'offsetY',
      type: 'range',
      min: -1,
      max: 1,
      step: 0.1,
      default: 0.5,
      description: 'Vertical pixel offset'
    },
    {
      name: 'useFiltering',
      type: 'boolean',
      default: true,
      description: 'Apply bilinear filtering (shows blur from bad offset)'
    }
  ],
  apply: (imageData: ImageData, params: GlitchParams): ImageData => {
    const { width, height, data } = imageData;
    const offsetX = (params.offsetX as number) ?? 0.5;
    const offsetY = (params.offsetY as number) ?? 0.5;
    const useFiltering = params.useFiltering !== false;
    const output = new ImageData(width, height);
    const outData = output.data;

    const getPixel = (x: number, y: number): [number, number, number, number] => {
      x = Math.max(0, Math.min(width - 1, Math.floor(x)));
      y = Math.max(0, Math.min(height - 1, Math.floor(y)));
      const idx = (y * width + x) * 4;
      return [data[idx], data[idx + 1], data[idx + 2], data[idx + 3]];
    };

    const bilinear = (x: number, y: number): [number, number, number, number] => {
      const x0 = Math.floor(x);
      const y0 = Math.floor(y);
      const x1 = Math.min(x0 + 1, width - 1);
      const y1 = Math.min(y0 + 1, height - 1);
      const fx = x - x0;
      const fy = y - y0;

      const p00 = getPixel(x0, y0);
      const p10 = getPixel(x1, y0);
      const p01 = getPixel(x0, y1);
      const p11 = getPixel(x1, y1);

      const result: [number, number, number, number] = [0, 0, 0, 0];
      for (let c = 0; c < 4; c++) {
        const top = p00[c] * (1 - fx) + p10[c] * fx;
        const bottom = p01[c] * (1 - fx) + p11[c] * fx;
        result[c] = Math.round(top * (1 - fy) + bottom * fy);
      }
      return result;
    };

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const outIdx = (y * width + x) * 4;

        const sampleX = x + offsetX;
        const sampleY = y + offsetY;

        let pixel: [number, number, number, number];
        if (useFiltering) {
          pixel = bilinear(sampleX, sampleY);
        } else {
          pixel = getPixel(Math.floor(sampleX), Math.floor(sampleY));
        }

        outData[outIdx] = pixel[0];
        outData[outIdx + 1] = pixel[1];
        outData[outIdx + 2] = pixel[2];
        outData[outIdx + 3] = pixel[3];
      }
    }

    return output;
  }
};
