import type { GlitchDefinition, GlitchParams } from '../types';

export const signedUnsigned: GlitchDefinition = {
  id: 'signed-unsigned',
  name: 'Signed/Unsigned Mismatch',
  category: 'pixel-format',
  description: 'Interpreting unsigned pixel values as signed or vice versa, causing value wrapping and inverted ranges.',
  technicalDetails: `Pixel values are typically unsigned (0-255 for 8-bit). When interpreted as signed (-128 to 127):
- Values 128-255 become negative (-128 to -1)
- This causes bright pixels to wrap to dark, or vice versa
Common in: normal maps (which use signed data), cross-language bindings,
or when using char instead of unsigned char in C/C++.`,
  bugCode: `// Bug: Using signed char for pixel data
char* pixels = (char*)imageData;  // Should be unsigned char!
for (int i = 0; i < size; i++) {
    int value = pixels[i];  // Values > 127 become negative!
    // A pixel value of 200 becomes -56
}

// Bug: Reading signed normal map as unsigned
vec3 normal = texture(normalMap, uv).xyz;  // 0 to 1
// Should be: normal = texture(...).xyz * 2.0 - 1.0; // -1 to 1`,
  fixCode: `// Fix: Use correct signed/unsigned type
unsigned char* pixels = (unsigned char*)imageData;
for (int i = 0; i < size; i++) {
    int value = pixels[i];  // Correct: 0-255 range
}

// Fix: Properly decode signed normal map
vec3 encodedNormal = texture(normalMap, uv).xyz;
vec3 normal = encodedNormal * 2.0 - 1.0;  // Convert 0..1 to -1..1`,
  params: [
    {
      name: 'mode',
      type: 'select',
      options: ['Unsigned as Signed (bright becomes dark)', 'Signed range visualization', 'Normalize to signed (-1 to 1)', 'Absolute value (fold negatives)'],
      default: 'Unsigned as Signed (bright becomes dark)',
      description: 'Type of signed/unsigned error'
    }
  ],
  apply: (imageData: ImageData, params: GlitchParams): ImageData => {
    const { width, height, data } = imageData;
    const mode = (params.mode as string) || 'Unsigned as Signed (bright becomes dark)';
    const output = new ImageData(width, height);
    const outData = output.data;

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      switch (mode) {
        case 'Unsigned as Signed (bright becomes dark)':
          // Interpret as signed byte: 128-255 becomes -128 to -1
          // Then we have to display it somehow, so map back oddly
          r = r > 127 ? r - 256 : r;
          g = g > 127 ? g - 256 : g;
          b = b > 127 ? b - 256 : b;
          // Map signed back to displayable range (wrapping)
          r = r < 0 ? 256 + r : r;
          g = g < 0 ? 256 + g : g;
          b = b < 0 ? 256 + b : b;
          // This effectively swaps 0-127 with 128-255
          r = (r + 128) % 256;
          g = (g + 128) % 256;
          b = (b + 128) % 256;
          break;

        case 'Signed range visualization':
          // Show what the signed interpretation would look like
          // Values > 127 shown as "negative" (darker, shifted)
          if (r > 127 || g > 127 || b > 127) {
            r = r > 127 ? 255 - r : r;
            g = g > 127 ? 255 - g : g;
            b = b > 127 ? 255 - b : b;
          }
          break;

        case 'Normalize to signed (-1 to 1)':
          // Show effect of interpreting 0-255 as -1 to 1 (like normal maps)
          // Without proper conversion, this causes wrong values
          r = Math.round(((r / 255) * 2 - 1) * 127 + 128);
          g = Math.round(((g / 255) * 2 - 1) * 127 + 128);
          b = Math.round(((b / 255) * 2 - 1) * 127 + 128);
          break;

        case 'Absolute value (fold negatives)':
          // What happens if you abs() signed data incorrectly
          // Values 128-255 get "folded" back
          r = r > 127 ? 255 - r : r;
          g = g > 127 ? 255 - g : g;
          b = b > 127 ? 255 - b : b;
          // Double the range since we're folding
          r = Math.min(255, r * 2);
          g = Math.min(255, g * 2);
          b = Math.min(255, b * 2);
          break;
      }

      outData[i] = Math.max(0, Math.min(255, r));
      outData[i + 1] = Math.max(0, Math.min(255, g));
      outData[i + 2] = Math.max(0, Math.min(255, b));
      outData[i + 3] = data[i + 3];
    }

    return output;
  }
};
