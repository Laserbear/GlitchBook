import type { GlitchDefinition, GlitchParams } from '../types';

export const floatPrecision: GlitchDefinition = {
  id: 'float-precision',
  name: 'Float Precision Errors',
  category: 'pixel-format',
  description: 'NaN propagation, denormal stalls, or precision loss in HDR/float textures.',
  technicalDetails: `Floating-point texture formats (FP16, FP32) can have special values that cause rendering bugs:
- NaN (Not a Number): propagates through all operations, shows as black or corrupted
- Infinity: from overflow, causes unexpected clamping or black pixels
- Denormals: very small numbers that cause massive GPU slowdowns
- Precision loss: visible banding in gradients, especially in dark areas
These often appear after many render passes or in HDR pipelines.`,
  bugCode: `// Bug: Division by zero creates Infinity/NaN
float lighting = lightIntensity / distance;  // NaN if distance is 0!

// Bug: Unchecked sqrt of negative
float len = sqrt(dot(normal, normal));  // NaN if normal is zero vector

// Bug: Accumulating small errors
for (int i = 0; i < 1000; i++) {
    hdrColor += tinyContribution;  // Denormals slow everything down
}`,
  fixCode: `// Fix: Guard against division by zero
float lighting = lightIntensity / max(distance, 0.0001);

// Fix: Check before sqrt
float lenSq = dot(normal, normal);
float len = lenSq > 0.0 ? sqrt(lenSq) : 0.0;

// Fix: Flush denormals to zero
hdrColor = max(hdrColor, vec3(0.0));  // Clamp small values
// Or enable FTZ (Flush To Zero) mode on GPU`,
  params: [
    {
      name: 'mode',
      type: 'select',
      options: ['NaN holes (black spots)', 'Infinity clipping', 'Precision banding', 'Denormal visualization', 'Random corruption'],
      default: 'NaN holes (black spots)',
      description: 'Type of float precision error'
    },
    {
      name: 'intensity',
      type: 'range',
      min: 1,
      max: 10,
      step: 1,
      default: 5,
      description: 'Effect intensity'
    }
  ],
  apply: (imageData: ImageData, params: GlitchParams): ImageData => {
    const { width, height, data } = imageData;
    const mode = (params.mode as string) || 'NaN holes (black spots)';
    const intensity = (params.intensity as number) || 5;
    const output = new ImageData(width, height);
    const outData = output.data;

    // Simple hash for deterministic randomness
    const hash = (x: number, y: number): number => {
      let h = x * 374761393 + y * 668265263;
      h = (h ^ (h >> 13)) * 1274126177;
      return (h ^ (h >> 16)) / 4294967296 + 0.5;
    };

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        let r = data[idx];
        let g = data[idx + 1];
        let b = data[idx + 2];

        switch (mode) {
          case 'NaN holes (black spots)':
            // Simulate NaN appearing in certain areas (based on values)
            const threshold = intensity * 10;
            if ((r + g + b) / 3 < threshold || (r + g + b) / 3 > 255 - threshold) {
              // Near black or white - simulate NaN from bad calculations
              if (hash(x, y) < intensity / 20) {
                r = g = b = 0;  // NaN renders as black
              }
            }
            break;

          case 'Infinity clipping':
            // Simulate HDR values that overflow and clip
            const brightness = (r + g + b) / 3;
            if (brightness > 255 - intensity * 10) {
              // Overflow to infinity, then clip
              const overflowFactor = 1 + (brightness - (255 - intensity * 10)) / 50;
              r = Math.min(255, r * overflowFactor);
              g = Math.min(255, g * overflowFactor);
              b = Math.min(255, b * overflowFactor);
              // Some channels clip at different points
              if (r > 255) r = 255;
              if (g > 250) g = 250;
              if (b > 245) b = 245;
            }
            break;

          case 'Precision banding':
            // Simulate reduced precision in dark areas
            const precision = Math.max(1, Math.floor(intensity * 3));
            // More quantization in darker values
            const quantR = Math.max(1, precision - Math.floor(r / 32));
            const quantG = Math.max(1, precision - Math.floor(g / 32));
            const quantB = Math.max(1, precision - Math.floor(b / 32));
            r = Math.round(r / quantR) * quantR;
            g = Math.round(g / quantG) * quantG;
            b = Math.round(b / quantB) * quantB;
            break;

          case 'Denormal visualization':
            // Show where denormals would occur (very dark values)
            const denormalThreshold = intensity;
            if (r < denormalThreshold) r = (r > 0 ? 128 : 0);  // Highlight near-zero
            if (g < denormalThreshold) g = (g > 0 ? 128 : 0);
            if (b < denormalThreshold) b = (b > 0 ? 128 : 0);
            break;

          case 'Random corruption':
            // Simulate random float corruption from uninitialized memory or GPU bugs
            if (hash(x, y) < intensity / 100) {
              const corruptType = Math.floor(hash(x + 100, y) * 4);
              switch (corruptType) {
                case 0: r = 0; g = 0; b = 0; break;  // NaN -> black
                case 1: r = 255; g = 255; b = 255; break;  // Inf -> white
                case 2: r = 255; g = 0; b = 255; break;  // Debug magenta
                case 3:
                  r = Math.floor(hash(x, y + 1) * 256);  // Random garbage
                  g = Math.floor(hash(x + 1, y) * 256);
                  b = Math.floor(hash(x + 1, y + 1) * 256);
                  break;
              }
            }
            break;
        }

        outData[idx] = Math.max(0, Math.min(255, Math.round(r)));
        outData[idx + 1] = Math.max(0, Math.min(255, Math.round(g)));
        outData[idx + 2] = Math.max(0, Math.min(255, Math.round(b)));
        outData[idx + 3] = data[idx + 3];
      }
    }

    return output;
  }
};
