import type { GlitchDefinition, GlitchParams } from '../types';

export const argbOrder: GlitchDefinition = {
  id: 'argb-order',
  name: 'ARGB/ABGR Order',
  category: 'pixel-format',
  description: 'Alpha channel in wrong position - reading ARGB as RGBA or vice versa.',
  technicalDetails: `Different APIs place the alpha channel differently. Most modern APIs use RGBA (alpha last),
but some systems like Cairo, Cocoa, and certain Windows APIs use ARGB (alpha first) or ABGR.
When the alpha position is wrong, colors shift by one channel and alpha gets interpreted as a color.`,
  bugCode: `// Bug: Reading ARGB data as RGBA
for (int i = 0; i < numPixels; i++) {
    uint8_t* pixel = &data[i * 4];
    // Assumes RGBA but data is ARGB
    color.r = pixel[0];  // Actually Alpha!
    color.g = pixel[1];  // Actually Red
    color.b = pixel[2];  // Actually Green
    color.a = pixel[3];  // Actually Blue
}`,
  fixCode: `// Fix: Handle ARGB format correctly
for (int i = 0; i < numPixels; i++) {
    uint8_t* pixel = &data[i * 4];
    if (format == ARGB) {
        color.a = pixel[0];
        color.r = pixel[1];
        color.g = pixel[2];
        color.b = pixel[3];
    } else {  // RGBA
        color.r = pixel[0];
        color.g = pixel[1];
        color.b = pixel[2];
        color.a = pixel[3];
    }
}`,
  params: [
    {
      name: 'format',
      type: 'select',
      options: ['RGBA as ARGB', 'RGBA as ABGR', 'RGBA as BGRA', 'Rotate channels left', 'Rotate channels right'],
      default: 'RGBA as ARGB',
      description: 'Which byte order mismatch to simulate'
    }
  ],
  apply: (imageData: ImageData, params: GlitchParams): ImageData => {
    const { width, height, data } = imageData;
    const format = (params.format as string) || 'RGBA as ARGB';
    const output = new ImageData(width, height);
    const outData = output.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      switch (format) {
        case 'RGBA as ARGB':
          // Reading ARGB data as if it were RGBA (alpha appears as red)
          outData[i] = a;      // A -> R
          outData[i + 1] = r;  // R -> G
          outData[i + 2] = g;  // G -> B
          outData[i + 3] = b;  // B -> A (makes things transparent!)
          break;

        case 'RGBA as ABGR':
          // Reading ABGR data as RGBA
          outData[i] = a;      // A -> R
          outData[i + 1] = b;  // B -> G
          outData[i + 2] = g;  // G -> B
          outData[i + 3] = r;  // R -> A
          break;

        case 'RGBA as BGRA':
          // Reading BGRA data as RGBA (common Windows/DirectX issue)
          outData[i] = b;      // B -> R
          outData[i + 1] = g;  // G -> G (stays same)
          outData[i + 2] = r;  // R -> B
          outData[i + 3] = a;  // A -> A (stays same)
          break;

        case 'Rotate channels left':
          // Channels shifted one position left
          outData[i] = g;
          outData[i + 1] = b;
          outData[i + 2] = a;
          outData[i + 3] = r;
          break;

        case 'Rotate channels right':
          // Channels shifted one position right
          outData[i] = a;
          outData[i + 1] = r;
          outData[i + 2] = g;
          outData[i + 3] = b;
          break;

        default:
          outData[i] = r;
          outData[i + 1] = g;
          outData[i + 2] = b;
          outData[i + 3] = a;
      }
    }

    return output;
  }
};
