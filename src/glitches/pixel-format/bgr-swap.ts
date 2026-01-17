import type { GlitchDefinition, GlitchParams } from '../types';

export const bgrSwap: GlitchDefinition = {
  id: 'bgr-swap',
  name: 'BGR Swap',
  category: 'pixel-format',
  description: 'Wrong byte order when reading pixels, swapping red and blue channels.',
  technicalDetails: `Different graphics APIs use different pixel orderings. OpenGL typically uses RGBA, while Windows GDI and some image formats use BGRA.
Reading BGR data as RGB (or vice versa) swaps the red and blue channels, giving images a distinctive color-shifted appearance.`,
  bugCode: `// Bug: Reading BGR data as RGB
for (int i = 0; i < numPixels; i++) {
    pixels[i].r = data[i * 4 + 0];  // Actually B
    pixels[i].g = data[i * 4 + 1];  // G is correct
    pixels[i].b = data[i * 4 + 2];  // Actually R
}`,
  fixCode: `// Fix: Correctly handling BGR byte order
for (int i = 0; i < numPixels; i++) {
    pixels[i].r = data[i * 4 + 2];  // R is at offset 2 in BGR
    pixels[i].g = data[i * 4 + 1];  // G stays in the middle
    pixels[i].b = data[i * 4 + 0];  // B is at offset 0 in BGR
}`,
  params: [
    {
      name: 'swapMode',
      type: 'select',
      options: ['RGB to BGR', 'Swap R and G', 'Swap G and B'],
      default: 'RGB to BGR',
      description: 'Which channels to swap'
    }
  ],
  apply: (imageData: ImageData, params: GlitchParams): ImageData => {
    const { width, height, data } = imageData;
    const swapMode = (params.swapMode as string) || 'RGB to BGR';
    const output = new ImageData(width, height);
    const outData = output.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      switch (swapMode) {
        case 'RGB to BGR':
          outData[i] = b;
          outData[i + 1] = g;
          outData[i + 2] = r;
          break;
        case 'Swap R and G':
          outData[i] = g;
          outData[i + 1] = r;
          outData[i + 2] = b;
          break;
        case 'Swap G and B':
          outData[i] = r;
          outData[i + 1] = b;
          outData[i + 2] = g;
          break;
        default:
          outData[i] = b;
          outData[i + 1] = g;
          outData[i + 2] = r;
      }
      outData[i + 3] = a;
    }

    return output;
  }
};
