import type { GlitchDefinition, GlitchParams } from '../types';

export const swizzle: GlitchDefinition = {
  id: 'swizzle',
  name: 'Swizzle/Tiled Layout',
  category: 'memory-layout',
  description: 'Reading tiled or Morton-order (Z-order) texture data as linear, causing scrambled blocks.',
  technicalDetails: `GPUs often store textures in swizzled/tiled layouts for better cache efficiency:
- Morton order (Z-order): interleaves X and Y bits for 2D locality
- Tiled: stores small tiles (e.g., 8x8) contiguously
- Platform-specific swizzles: PS4, Xbox, Switch all have unique layouts
Reading swizzled data as linear (or vice versa) causes characteristic scrambling patterns.`,
  bugCode: `// Bug: Reading GPU texture memory as linear
void* linearPtr = mapTexture(texture);
for (int y = 0; y < height; y++) {
    for (int x = 0; x < width; x++) {
        // Bug: assuming linear layout!
        pixel = linearPtr[y * width + x];  // Wrong if swizzled!
    }
}`,
  fixCode: `// Fix: Use proper deswizzle function
void* gpuPtr = mapTexture(texture);
for (int y = 0; y < height; y++) {
    for (int x = 0; x < width; x++) {
        // Convert linear coords to swizzled offset
        int offset = getMortonOffset(x, y);
        // Or use platform API:
        int offset = XGAddress2DTiledOffset(x, y, width, ...);
        pixel = gpuPtr[offset];
    }
}`,
  params: [
    {
      name: 'pattern',
      type: 'select',
      options: ['Morton (Z-order)', 'Tiled 8x8', 'Tiled 4x4', 'Interleaved rows'],
      default: 'Morton (Z-order)',
      description: 'Swizzle pattern to simulate'
    },
    {
      name: 'inverse',
      type: 'boolean',
      default: false,
      description: 'Apply inverse (reading linear as swizzled)'
    }
  ],
  apply: (imageData: ImageData, params: GlitchParams): ImageData => {
    const { width, height, data } = imageData;
    const pattern = (params.pattern as string) || 'Morton (Z-order)';
    const inverse = (params.inverse as boolean) || false;
    const output = new ImageData(width, height);
    const outData = output.data;

    // Morton code helpers
    const splitBits = (x: number): number => {
      x = (x | (x << 8)) & 0x00FF00FF;
      x = (x | (x << 4)) & 0x0F0F0F0F;
      x = (x | (x << 2)) & 0x33333333;
      x = (x | (x << 1)) & 0x55555555;
      return x;
    };

    const mortonEncode = (x: number, y: number): number => {
      return splitBits(x) | (splitBits(y) << 1);
    };

    const compactBits = (x: number): number => {
      x = x & 0x55555555;
      x = (x | (x >> 1)) & 0x33333333;
      x = (x | (x >> 2)) & 0x0F0F0F0F;
      x = (x | (x >> 4)) & 0x00FF00FF;
      x = (x | (x >> 8)) & 0x0000FFFF;
      return x;
    };

    const mortonDecode = (code: number): [number, number] => {
      return [compactBits(code), compactBits(code >> 1)];
    };

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const outIdx = (y * width + x) * 4;
        let srcX: number, srcY: number;

        if (inverse) {
          // Reading linear data as if it were swizzled
          let linearIdx: number;

          switch (pattern) {
            case 'Morton (Z-order)':
              const morton = mortonEncode(x, y);
              linearIdx = morton % (width * height);
              srcX = linearIdx % width;
              srcY = Math.floor(linearIdx / width);
              break;

            case 'Tiled 8x8':
              const tileX8 = Math.floor(x / 8);
              const tileY8 = Math.floor(y / 8);
              const inTileX8 = x % 8;
              const inTileY8 = y % 8;
              const tilesPerRow8 = Math.ceil(width / 8);
              linearIdx = (tileY8 * tilesPerRow8 + tileX8) * 64 + inTileY8 * 8 + inTileX8;
              linearIdx = linearIdx % (width * height);
              srcX = linearIdx % width;
              srcY = Math.floor(linearIdx / width);
              break;

            case 'Tiled 4x4':
              const tileX4 = Math.floor(x / 4);
              const tileY4 = Math.floor(y / 4);
              const inTileX4 = x % 4;
              const inTileY4 = y % 4;
              const tilesPerRow4 = Math.ceil(width / 4);
              linearIdx = (tileY4 * tilesPerRow4 + tileX4) * 16 + inTileY4 * 4 + inTileX4;
              linearIdx = linearIdx % (width * height);
              srcX = linearIdx % width;
              srcY = Math.floor(linearIdx / width);
              break;

            case 'Interleaved rows':
              srcX = x;
              srcY = (y % 2 === 0) ? Math.floor(y / 2) : Math.floor(y / 2) + Math.floor(height / 2);
              break;

            default:
              srcX = x;
              srcY = y;
          }
        } else {
          // Reading swizzled data as linear
          const linearIdx = y * width + x;

          switch (pattern) {
            case 'Morton (Z-order)':
              [srcX, srcY] = mortonDecode(linearIdx);
              srcX = srcX % width;
              srcY = srcY % height;
              break;

            case 'Tiled 8x8':
              const tile8 = Math.floor(linearIdx / 64);
              const inTile8 = linearIdx % 64;
              const tilesPerRow8 = Math.ceil(width / 8);
              const tileX8 = tile8 % tilesPerRow8;
              const tileY8 = Math.floor(tile8 / tilesPerRow8);
              srcX = tileX8 * 8 + (inTile8 % 8);
              srcY = tileY8 * 8 + Math.floor(inTile8 / 8);
              break;

            case 'Tiled 4x4':
              const tile4 = Math.floor(linearIdx / 16);
              const inTile4 = linearIdx % 16;
              const tilesPerRow4 = Math.ceil(width / 4);
              const tileX4 = tile4 % tilesPerRow4;
              const tileY4 = Math.floor(tile4 / tilesPerRow4);
              srcX = tileX4 * 4 + (inTile4 % 4);
              srcY = tileY4 * 4 + Math.floor(inTile4 / 4);
              break;

            case 'Interleaved rows':
              srcX = x;
              srcY = (y < height / 2) ? y * 2 : (y - Math.floor(height / 2)) * 2 + 1;
              break;

            default:
              srcX = x;
              srcY = y;
          }
        }

        srcX = Math.max(0, Math.min(width - 1, srcX));
        srcY = Math.max(0, Math.min(height - 1, srcY));
        const srcIdx = (srcY * width + srcX) * 4;

        outData[outIdx] = data[srcIdx];
        outData[outIdx + 1] = data[srcIdx + 1];
        outData[outIdx + 2] = data[srcIdx + 2];
        outData[outIdx + 3] = data[srcIdx + 3];
      }
    }

    return output;
  }
};
