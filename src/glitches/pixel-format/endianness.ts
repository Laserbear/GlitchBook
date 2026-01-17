import type { GlitchDefinition, GlitchParams } from '../types';

export const endianness: GlitchDefinition = {
  id: 'endianness',
  name: 'Endianness Swap',
  category: 'pixel-format',
  description: 'Reading pixel data with wrong byte order (big-endian vs little-endian).',
  technicalDetails: `When reading 16-bit or 32-bit pixel values, byte order matters. Little-endian systems (x86, ARM)
store the least significant byte first, while big-endian systems (older PowerPC, network byte order) store most significant first.
Reading data with the wrong endianness causes dramatic color shifts as bytes get reversed within each pixel.`,
  bugCode: `// Bug: Reading big-endian data on little-endian system
uint32_t pixel = *(uint32_t*)&data[i];
// On little-endian, 0xRRGGBBAA becomes 0xAABBGGRR
uint8_t r = (pixel >> 24) & 0xFF;  // Gets A instead!
uint8_t g = (pixel >> 16) & 0xFF;  // Gets B instead!
uint8_t b = (pixel >> 8) & 0xFF;   // Gets G instead!
uint8_t a = pixel & 0xFF;          // Gets R instead!`,
  fixCode: `// Fix: Use byte swap when needed
uint32_t pixel = *(uint32_t*)&data[i];
if (needsByteSwap) {
    pixel = __builtin_bswap32(pixel);  // or ntohl()
}
// Or read bytes individually to avoid endianness issues:
uint8_t r = data[i];
uint8_t g = data[i + 1];
uint8_t b = data[i + 2];
uint8_t a = data[i + 3];`,
  params: [
    {
      name: 'swapMode',
      type: 'select',
      options: ['Swap 32-bit (full reverse)', 'Swap 16-bit pairs', 'Swap within 16-bit'],
      default: 'Swap 32-bit (full reverse)',
      description: 'Type of byte swap to apply'
    }
  ],
  apply: (imageData: ImageData, params: GlitchParams): ImageData => {
    const { width, height, data } = imageData;
    const swapMode = (params.swapMode as string) || 'Swap 32-bit (full reverse)';
    const output = new ImageData(width, height);
    const outData = output.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      switch (swapMode) {
        case 'Swap 32-bit (full reverse)':
          // Complete byte reversal: RGBA -> ABGR
          outData[i] = a;
          outData[i + 1] = b;
          outData[i + 2] = g;
          outData[i + 3] = r;
          break;

        case 'Swap 16-bit pairs':
          // Swap as two 16-bit values: RGBA -> GBAR
          outData[i] = g;
          outData[i + 1] = r;
          outData[i + 2] = a;
          outData[i + 3] = b;
          break;

        case 'Swap within 16-bit':
          // Swap bytes within each 16-bit pair: RGBA -> GRBA
          outData[i] = g;
          outData[i + 1] = r;
          outData[i + 2] = b;
          outData[i + 3] = a;
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
