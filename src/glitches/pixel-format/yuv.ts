import type { GlitchDefinition, GlitchParams } from '../types';

export const yuv: GlitchDefinition = {
  id: 'yuv',
  name: 'YUV/Color Space Errors',
  category: 'pixel-format',
  description: 'Wrong YUV to RGB conversion, causing green/purple tints or washed-out video.',
  technicalDetails: `Video and cameras often use YUV/YCbCr color spaces which separate luminance (Y) from chrominance (U/V).
Common conversion errors:
- Wrong matrix (BT.601 vs BT.709 vs BT.2020)
- Wrong range (TV/limited 16-235 vs PC/full 0-255)
- Swapped U/V channels (causes green/purple swap)
- Missing conversion (interpreting YUV bytes as RGB directly)
These cause skin tones to look wrong, colors to shift, or contrast issues.`,
  bugCode: `// Bug: Using BT.601 matrix for HD content (should be BT.709)
R = Y + 1.402 * (Cr - 128)
G = Y - 0.344 * (Cb - 128) - 0.714 * (Cr - 128)  // BT.601 coefficients
B = Y + 1.772 * (Cb - 128)

// Bug: Not accounting for TV range
R = 1.164 * (Y - 16) + ...  // Needed for TV range, wrong for full range

// Bug: Interpreting YUV as RGB directly
glTexImage2D(..., GL_RGB, ..., yuvData);  // Garbage colors!`,
  fixCode: `// Fix: Use correct matrix for content type
// BT.709 for HD (720p, 1080p):
R = Y + 1.5748 * (Cr - 128)
G = Y - 0.1873 * (Cb - 128) - 0.4681 * (Cr - 128)
B = Y + 1.8556 * (Cb - 128)

// Fix: Handle range correctly
if (tvRange) {
    Y = (Y - 16) * 255 / 219;
    Cb = (Cb - 16) * 255 / 224;
    Cr = (Cr - 16) * 255 / 224;
}`,
  params: [
    {
      name: 'mode',
      type: 'select',
      options: ['YUV interpreted as RGB', 'Swapped U/V (green/purple)', 'Wrong range (washed out)', 'Wrong matrix (color shift)', 'Missing chroma (grayscale bleed)'],
      default: 'YUV interpreted as RGB',
      description: 'Type of YUV conversion error'
    }
  ],
  apply: (imageData: ImageData, params: GlitchParams): ImageData => {
    const { width, height, data } = imageData;
    const mode = (params.mode as string) || 'YUV interpreted as RGB';
    const output = new ImageData(width, height);
    const outData = output.data;

    // RGB to YUV (BT.709)
    const rgbToYuv = (r: number, g: number, b: number): [number, number, number] => {
      const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const u = -0.1146 * r - 0.3854 * g + 0.5 * b + 128;
      const v = 0.5 * r - 0.4542 * g - 0.0458 * b + 128;
      return [y, u, v];
    };

    // YUV to RGB (BT.709)
    const yuvToRgb = (y: number, u: number, v: number): [number, number, number] => {
      const r = y + 1.5748 * (v - 128);
      const g = y - 0.1873 * (u - 128) - 0.4681 * (v - 128);
      const b = y + 1.8556 * (u - 128);
      return [r, g, b];
    };

    // Wrong matrix (BT.601 instead of BT.709)
    const yuvToRgbWrong = (y: number, u: number, v: number): [number, number, number] => {
      const r = y + 1.402 * (v - 128);
      const g = y - 0.344 * (u - 128) - 0.714 * (v - 128);
      const b = y + 1.772 * (u - 128);
      return [r, g, b];
    };

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Convert to YUV first
      const [y, u, v] = rgbToYuv(r, g, b);

      let outR: number, outG: number, outB: number;

      switch (mode) {
        case 'YUV interpreted as RGB':
          // Just use YUV values directly as RGB (very wrong)
          outR = y;
          outG = u;
          outB = v;
          break;

        case 'Swapped U/V (green/purple)':
          // Swap U and V channels
          [outR, outG, outB] = yuvToRgb(y, v, u);  // v and u swapped
          break;

        case 'Wrong range (washed out)':
          // Treat full range as TV range (adds wrong offset/scale)
          const yLimited = (y - 16) * 255 / 219;
          const uLimited = (u - 16) * 255 / 224;
          const vLimited = (v - 16) * 255 / 224;
          [outR, outG, outB] = yuvToRgb(yLimited, uLimited, vLimited);
          break;

        case 'Wrong matrix (color shift)':
          // Use BT.601 matrix when BT.709 is correct
          [outR, outG, outB] = yuvToRgbWrong(y, u, v);
          break;

        case 'Missing chroma (grayscale bleed)':
          // Subsample chroma too aggressively / don't interpolate
          const blockX = Math.floor((i / 4) % width / 4);
          const blockY = Math.floor(Math.floor(i / 4 / width) / 4);
          // Use chroma from block corner only
          const cornerIdx = (blockY * 4 * width + blockX * 4) * 4;
          const cornerR = data[cornerIdx] ?? r;
          const cornerG = data[cornerIdx + 1] ?? g;
          const cornerB = data[cornerIdx + 2] ?? b;
          const [, cornerU, cornerV] = rgbToYuv(cornerR, cornerG, cornerB);
          [outR, outG, outB] = yuvToRgb(y, cornerU, cornerV);
          break;

        default:
          outR = r;
          outG = g;
          outB = b;
      }

      outData[i] = Math.max(0, Math.min(255, Math.round(outR)));
      outData[i + 1] = Math.max(0, Math.min(255, Math.round(outG)));
      outData[i + 2] = Math.max(0, Math.min(255, Math.round(outB)));
      outData[i + 3] = data[i + 3];
    }

    return output;
  }
};
