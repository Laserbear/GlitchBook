import type { GlitchDefinition, GlitchParams } from '../types';

export const premultipliedAlpha: GlitchDefinition = {
  id: 'premultiplied-alpha',
  name: 'Premultiplied Alpha',
  category: 'pixel-format',
  description: 'Mixing up premultiplied and straight alpha, causing dark fringes or washed-out transparency.',
  technicalDetails: `In straight alpha, RGB values are independent of alpha. In premultiplied alpha, RGB is pre-multiplied by alpha (R' = R * A).
Premultiplied is better for blending and filtering, but mixing formats causes artifacts:
- Treating straight as premultiplied: dark halos/fringes around transparent edges
- Treating premultiplied as straight: bright/washed out semi-transparent areas
This is especially visible in UI elements, particles, and anti-aliased edges.`,
  bugCode: `// Bug: Blending straight alpha as if premultiplied
// Standard blend: out = src + dst * (1 - srcA)
// But if src isn't premultiplied, we get dark fringes
out.rgb = src.rgb + dst.rgb * (1.0 - src.a);

// Bug: Loading premultiplied PNG as straight alpha
// Then re-multiplying during blend causes double multiply
out.rgb = src.rgb * src.a + dst.rgb * (1.0 - src.a);`,
  fixCode: `// Fix: Convert straight to premultiplied before blending
vec4 srcPremult = vec4(src.rgb * src.a, src.a);
out = srcPremult + dst * (1.0 - srcPremult.a);

// Or convert premultiplied to straight for display:
if (premult.a > 0.0) {
    straight.rgb = premult.rgb / premult.a;
    straight.a = premult.a;
}`,
  params: [
    {
      name: 'mode',
      type: 'select',
      options: ['Straight as Premultiplied (dark fringes)', 'Premultiplied as Straight (too bright)', 'Double premultiply', 'Show alpha errors'],
      default: 'Straight as Premultiplied (dark fringes)',
      description: 'Type of alpha handling error'
    },
    {
      name: 'backgroundR',
      type: 'range',
      min: 0,
      max: 255,
      step: 1,
      default: 128,
      description: 'Background red (to show blending errors)'
    },
    {
      name: 'backgroundG',
      type: 'range',
      min: 0,
      max: 255,
      step: 1,
      default: 128,
      description: 'Background green'
    },
    {
      name: 'backgroundB',
      type: 'range',
      min: 0,
      max: 255,
      step: 1,
      default: 128,
      description: 'Background blue'
    }
  ],
  apply: (imageData: ImageData, params: GlitchParams): ImageData => {
    const { width, height, data } = imageData;
    const mode = (params.mode as string) || 'Straight as Premultiplied (dark fringes)';
    const bgR = ((params.backgroundR as number) || 128) / 255;
    const bgG = ((params.backgroundG as number) || 128) / 255;
    const bgB = ((params.backgroundB as number) || 128) / 255;
    const output = new ImageData(width, height);
    const outData = output.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;
      const a = data[i + 3] / 255;

      let outR: number, outG: number, outB: number;

      switch (mode) {
        case 'Straight as Premultiplied (dark fringes)':
          // Treat straight alpha as premultiplied (don't multiply by alpha)
          // This makes semi-transparent areas too dark
          outR = r + bgR * (1 - a);
          outG = g + bgG * (1 - a);
          outB = b + bgB * (1 - a);
          // Result is darkened because RGB wasn't premultiplied
          break;

        case 'Premultiplied as Straight (too bright)':
          // Treating already-premultiplied as straight (multiply again)
          // Simulated by showing what double-multiply looks like
          const pm_r = r * a;
          const pm_g = g * a;
          const pm_b = b * a;
          // Then incorrectly multiply again during blend
          outR = pm_r * a + bgR * (1 - a);
          outG = pm_g * a + bgG * (1 - a);
          outB = pm_b * a + bgB * (1 - a);
          break;

        case 'Double premultiply':
          // Alpha applied twice - very dark transparent areas
          const a2 = a * a;
          outR = r * a2 + bgR * (1 - a);
          outG = g * a2 + bgG * (1 - a);
          outB = b * a2 + bgB * (1 - a);
          break;

        case 'Show alpha errors':
          // Highlight pixels where premultiply would cause issues
          // Areas where RGB > Alpha indicate wrong premultiply
          const maxRGB = Math.max(r, g, b);
          if (a < 1 && maxRGB > a + 0.01) {
            // This would be invalid in premultiplied (RGB can't exceed A)
            outR = 1;
            outG = 0;
            outB = 1;
          } else {
            outR = r * a + bgR * (1 - a);
            outG = g * a + bgG * (1 - a);
            outB = b * a + bgB * (1 - a);
          }
          break;

        default:
          outR = r * a + bgR * (1 - a);
          outG = g * a + bgG * (1 - a);
          outB = b * a + bgB * (1 - a);
      }

      outData[i] = Math.round(Math.max(0, Math.min(1, outR)) * 255);
      outData[i + 1] = Math.round(Math.max(0, Math.min(1, outG)) * 255);
      outData[i + 2] = Math.round(Math.max(0, Math.min(1, outB)) * 255);
      outData[i + 3] = 255; // Composite onto background
    }

    return output;
  }
};
