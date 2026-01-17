import type { GlitchDefinition, GlitchParams } from '../types';

export const bitDepth: GlitchDefinition = {
  id: 'bit-depth',
  name: 'Bit Depth Mismatch',
  category: 'pixel-format',
  description: 'Treating 16-bit color values as 8-bit or vice versa, causing banding or blown-out colors.',
  technicalDetails: `Color values can be stored at different bit depths (8-bit: 0-255, 16-bit: 0-65535, floating point, etc.).
Reading high-bit-depth data as low-bit-depth truncates values; reading low as high causes banding as values cluster in a narrow range.
This bug is common when importing assets from different sources or when HDR content is processed incorrectly.`,
  bugCode: `// Bug: Reading 16-bit values as 8-bit
uint16_t* data16 = (uint16_t*)buffer;
for (int i = 0; i < numPixels; i++) {
    // This only reads low byte, losing precision
    uint8_t value = (uint8_t)data16[i];
    // Values > 255 get truncated incorrectly
}`,
  fixCode: `// Fix: Properly converting 16-bit to 8-bit
uint16_t* data16 = (uint16_t*)buffer;
for (int i = 0; i < numPixels; i++) {
    // Scale down from 16-bit to 8-bit range
    uint8_t value = (uint8_t)(data16[i] >> 8);
    // Or for more precision:
    // uint8_t value = (uint8_t)((data16[i] * 255) / 65535);
}`,
  params: [
    {
      name: 'mode',
      type: 'select',
      options: ['Posterize (reduce bits)', 'Simulate 16-bit as 8-bit', 'Bit truncation'],
      default: 'Posterize (reduce bits)',
      description: 'Type of bit depth error to simulate'
    },
    {
      name: 'bits',
      type: 'range',
      min: 1,
      max: 7,
      step: 1,
      default: 3,
      description: 'Effective bit depth per channel'
    }
  ],
  apply: (imageData: ImageData, params: GlitchParams): ImageData => {
    const { width, height, data } = imageData;
    const mode = (params.mode as string) || 'Posterize (reduce bits)';
    const bits = (params.bits as number) || 3;
    const output = new ImageData(width, height);
    const outData = output.data;

    const levels = Math.pow(2, bits);
    const factor = 255 / (levels - 1);

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      switch (mode) {
        case 'Posterize (reduce bits)':
          // Reduce to fewer bits then scale back up
          r = Math.round(Math.round(r / factor) * factor);
          g = Math.round(Math.round(g / factor) * factor);
          b = Math.round(Math.round(b / factor) * factor);
          break;

        case 'Simulate 16-bit as 8-bit':
          // Simulate reading high byte of 16-bit value
          // This causes bright values to wrap around
          r = (r * 256) % 256;
          g = (g * 256) % 256;
          b = (b * 256) % 256;
          break;

        case 'Bit truncation':
          // Mask out lower bits
          const mask = (0xFF << (8 - bits)) & 0xFF;
          r = r & mask;
          g = g & mask;
          b = b & mask;
          break;
      }

      outData[i] = r;
      outData[i + 1] = g;
      outData[i + 2] = b;
      outData[i + 3] = data[i + 3];
    }

    return output;
  }
};
