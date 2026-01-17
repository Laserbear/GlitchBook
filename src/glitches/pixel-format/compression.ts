import type { GlitchDefinition, GlitchParams } from '../types';

export const compression: GlitchDefinition = {
  id: 'compression',
  name: 'Compression Artifacts',
  category: 'pixel-format',
  description: 'Block-based compression artifacts from JPEG, DXT/BCn, or wrong quality settings.',
  technicalDetails: `Block compression divides images into small blocks (8x8 for JPEG, 4x4 for DXT/BCn) and compresses each independently.
Artifacts appear as:
- Visible block boundaries (especially in gradients)
- Color bleeding between blocks
- Loss of detail in high-frequency areas
- "Ringing" artifacts near sharp edges
These get worse with lower quality settings or repeated recompression.`,
  bugCode: `// Bug: Using low quality JPEG for textures
stbi_write_jpg("texture.jpg", w, h, 4, data, 20);  // quality=20 is too low!
// Result: visible 8x8 block artifacts

// Bug: Using DXT1 for textures with alpha gradients
glCompressedTexImage2D(GL_TEXTURE_2D, 0, GL_COMPRESSED_RGBA_S3TC_DXT1_EXT, ...);
// DXT1 only has 1-bit alpha - smooth alpha gets destroyed`,
  fixCode: `// Fix: Use appropriate quality/format
stbi_write_jpg("texture.jpg", w, h, 4, data, 90);  // Higher quality

// Fix: Use DXT5/BC3 for alpha gradients
glCompressedTexImage2D(GL_TEXTURE_2D, 0, GL_COMPRESSED_RGBA_S3TC_DXT5_EXT, ...);
// Or BC7 for best quality:
glCompressedTexImage2D(GL_TEXTURE_2D, 0, GL_COMPRESSED_RGBA_BPTC_UNORM, ...);`,
  params: [
    {
      name: 'blockSize',
      type: 'select',
      options: ['4x4 (DXT/BCn)', '8x8 (JPEG)', '16x16 (heavy)'],
      default: '8x8 (JPEG)',
      description: 'Compression block size'
    },
    {
      name: 'quality',
      type: 'range',
      min: 1,
      max: 10,
      step: 1,
      default: 3,
      description: 'Quality level (lower = more artifacts)'
    }
  ],
  apply: (imageData: ImageData, params: GlitchParams): ImageData => {
    const { width, height, data } = imageData;
    const blockSizeStr = (params.blockSize as string) || '8x8 (JPEG)';
    const quality = (params.quality as number) || 3;
    const output = new ImageData(width, height);
    const outData = output.data;

    const blockSize = blockSizeStr.startsWith('4') ? 4 : blockSizeStr.startsWith('8') ? 8 : 16;

    // Quantization factor (lower quality = higher quantization)
    const quantFactor = Math.floor(32 / quality);

    // Process in blocks
    for (let by = 0; by < height; by += blockSize) {
      for (let bx = 0; bx < width; bx += blockSize) {
        // Calculate average color for the block (simulates DCT low frequency)
        let sumR = 0, sumG = 0, sumB = 0;
        let count = 0;

        for (let y = by; y < Math.min(by + blockSize, height); y++) {
          for (let x = bx; x < Math.min(bx + blockSize, width); x++) {
            const idx = (y * width + x) * 4;
            sumR += data[idx];
            sumG += data[idx + 1];
            sumB += data[idx + 2];
            count++;
          }
        }

        const avgR = sumR / count;
        const avgG = sumG / count;
        const avgB = sumB / count;

        // Apply block compression simulation
        for (let y = by; y < Math.min(by + blockSize, height); y++) {
          for (let x = bx; x < Math.min(bx + blockSize, width); x++) {
            const idx = (y * width + x) * 4;

            // Blend toward block average and quantize
            let r = data[idx];
            let g = data[idx + 1];
            let b = data[idx + 2];

            // Quantize (simulate DCT coefficient quantization)
            r = Math.round(r / quantFactor) * quantFactor;
            g = Math.round(g / quantFactor) * quantFactor;
            b = Math.round(b / quantFactor) * quantFactor;

            // Blend with block average (simulates loss of high frequencies)
            const blendFactor = (11 - quality) / 20;
            r = Math.round(r * (1 - blendFactor) + avgR * blendFactor);
            g = Math.round(g * (1 - blendFactor) + avgG * blendFactor);
            b = Math.round(b * (1 - blendFactor) + avgB * blendFactor);

            outData[idx] = Math.max(0, Math.min(255, r));
            outData[idx + 1] = Math.max(0, Math.min(255, g));
            outData[idx + 2] = Math.max(0, Math.min(255, b));
            outData[idx + 3] = data[idx + 3];
          }
        }
      }
    }

    return output;
  }
};
