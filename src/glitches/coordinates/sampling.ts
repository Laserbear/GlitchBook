import type { GlitchDefinition, GlitchParams } from '../types';

export const sampling: GlitchDefinition = {
  id: 'sampling',
  name: 'Wrong Texture Sampling',
  category: 'coordinates',
  description: 'Using nearest-neighbor when bilinear was expected, or vice versa, causing blocky or blurry artifacts.',
  technicalDetails: `Texture sampling mode determines how pixels are interpolated:
- Nearest (point) sampling: picks closest texel, fast but blocky when scaled
- Bilinear: interpolates 4 nearest texels, smooth but can be blurry
- Using nearest when bilinear expected: hard blocky edges, visible pixels
- Using bilinear when nearest expected: unwanted blurring, bleeding between sprites
This is especially visible in pixel art games or when zooming UI elements.`,
  bugCode: `// Bug: Using nearest sampling for photographic textures
glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_NEAREST);
glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_NEAREST);
// Result: blocky magnification artifacts

// Bug: Using bilinear for pixel art sprite sheet
glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
// Result: colors bleed between adjacent sprites`,
  fixCode: `// Fix: Match sampling mode to content type
if (isPixelArt) {
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_NEAREST);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_NEAREST);
} else {
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR_MIPMAP_LINEAR);
}`,
  params: [
    {
      name: 'mode',
      type: 'select',
      options: ['Nearest (blocky)', 'Exaggerated nearest (pixelate)', 'Bad bilinear (blurry)'],
      default: 'Nearest (blocky)',
      description: 'Sampling mode to simulate'
    },
    {
      name: 'scale',
      type: 'range',
      min: 2,
      max: 16,
      step: 1,
      default: 4,
      description: 'Scale factor for pixelation/blur'
    }
  ],
  apply: (imageData: ImageData, params: GlitchParams): ImageData => {
    const { width, height, data } = imageData;
    const mode = (params.mode as string) || 'Nearest (blocky)';
    const scale = (params.scale as number) || 4;
    const output = new ImageData(width, height);
    const outData = output.data;

    // Helper to get pixel with bounds checking
    const getPixel = (x: number, y: number): [number, number, number, number] => {
      x = Math.max(0, Math.min(width - 1, Math.floor(x)));
      y = Math.max(0, Math.min(height - 1, Math.floor(y)));
      const idx = (y * width + x) * 4;
      return [data[idx], data[idx + 1], data[idx + 2], data[idx + 3]];
    };

    // Bilinear interpolation helper
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
        let pixel: [number, number, number, number];

        switch (mode) {
          case 'Nearest (blocky)':
            // Simulate scaling down then up with nearest neighbor
            const nx = Math.floor(x / scale) * scale + scale / 2;
            const ny = Math.floor(y / scale) * scale + scale / 2;
            pixel = getPixel(nx, ny);
            break;

          case 'Exaggerated nearest (pixelate)':
            // Heavy pixelation
            const px = Math.floor(x / scale) * scale;
            const py = Math.floor(y / scale) * scale;
            pixel = getPixel(px, py);
            break;

          case 'Bad bilinear (blurry)':
            // Simulate heavy blur from repeated bilinear sampling
            let r = 0, g = 0, b = 0, a = 0;
            const samples = scale;
            for (let sy = 0; sy < samples; sy++) {
              for (let sx = 0; sx < samples; sx++) {
                const sampleX = x + (sx - samples / 2) * 0.5;
                const sampleY = y + (sy - samples / 2) * 0.5;
                const p = bilinear(sampleX, sampleY);
                r += p[0];
                g += p[1];
                b += p[2];
                a += p[3];
              }
            }
            const count = samples * samples;
            pixel = [
              Math.round(r / count),
              Math.round(g / count),
              Math.round(b / count),
              Math.round(a / count)
            ];
            break;

          default:
            pixel = getPixel(x, y);
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
