import type { GlitchDefinition, GlitchParams } from '../types';

export const gamma: GlitchDefinition = {
  id: 'gamma',
  name: 'Gamma / sRGB Mismatch',
  category: 'pixel-format',
  description: 'Treating sRGB data as linear or vice versa, causing washed out or overly dark images.',
  technicalDetails: `sRGB is a non-linear color space that matches human perception - it dedicates more bits to dark values.
Linear color space has uniform brightness distribution. Mixing these up is extremely common:
- Doing math on sRGB values without converting to linear first makes blending too dark
- Treating linear as sRGB makes images look washed out
- This affects blending, filtering, lighting calculations, and any color math.`,
  bugCode: `// Bug: Blending sRGB values directly (wrong!)
vec3 blend = texture1.rgb * 0.5 + texture2.rgb * 0.5;
// This is too dark because sRGB is non-linear

// Bug: Loading linear data as sRGB
glTexImage2D(..., GL_SRGB8_ALPHA8, ..., linearData);
// Result: image looks washed out/too bright`,
  fixCode: `// Fix: Convert to linear, blend, convert back
vec3 linear1 = srgbToLinear(texture1.rgb);
vec3 linear2 = srgbToLinear(texture2.rgb);
vec3 blendLinear = linear1 * 0.5 + linear2 * 0.5;
vec3 result = linearToSrgb(blendLinear);

// sRGB <-> Linear conversion:
float srgbToLinear(float c) {
    return c <= 0.04045 ? c / 12.92
         : pow((c + 0.055) / 1.055, 2.4);
}`,
  params: [
    {
      name: 'mode',
      type: 'select',
      options: ['sRGB treated as Linear (washed out)', 'Linear treated as sRGB (too dark)', 'Double gamma', 'Inverse gamma'],
      default: 'sRGB treated as Linear (washed out)',
      description: 'Type of gamma mismatch'
    },
    {
      name: 'gamma',
      type: 'range',
      min: 1.0,
      max: 3.0,
      step: 0.1,
      default: 2.2,
      description: 'Gamma value (sRGB is ~2.2)'
    }
  ],
  apply: (imageData: ImageData, params: GlitchParams): ImageData => {
    const { width, height, data } = imageData;
    const mode = (params.mode as string) || 'sRGB treated as Linear (washed out)';
    const gamma = (params.gamma as number) || 2.2;
    const output = new ImageData(width, height);
    const outData = output.data;

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i] / 255;
      let g = data[i + 1] / 255;
      let b = data[i + 2] / 255;

      switch (mode) {
        case 'sRGB treated as Linear (washed out)':
          // Data is sRGB but we're treating it as linear and displaying as sRGB
          // This applies gamma twice, washing out the image
          r = Math.pow(r, 1 / gamma);
          g = Math.pow(g, 1 / gamma);
          b = Math.pow(b, 1 / gamma);
          break;

        case 'Linear treated as sRGB (too dark)':
          // Data is linear but we're treating it as sRGB
          // Missing the gamma expansion makes it too dark
          r = Math.pow(r, gamma);
          g = Math.pow(g, gamma);
          b = Math.pow(b, gamma);
          break;

        case 'Double gamma':
          // Gamma applied twice
          r = Math.pow(r, gamma / 2.2 * 2);
          g = Math.pow(g, gamma / 2.2 * 2);
          b = Math.pow(b, gamma / 2.2 * 2);
          break;

        case 'Inverse gamma':
          // Completely wrong gamma direction
          r = Math.pow(r, 1 / (gamma * gamma / 2.2));
          g = Math.pow(g, 1 / (gamma * gamma / 2.2));
          b = Math.pow(b, 1 / (gamma * gamma / 2.2));
          break;
      }

      outData[i] = Math.round(Math.max(0, Math.min(1, r)) * 255);
      outData[i + 1] = Math.round(Math.max(0, Math.min(1, g)) * 255);
      outData[i + 2] = Math.round(Math.max(0, Math.min(1, b)) * 255);
      outData[i + 3] = data[i + 3];
    }

    return output;
  }
};
