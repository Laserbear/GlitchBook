import type { GlitchDefinition, GlitchParams } from '../types';

export const mipmap: GlitchDefinition = {
  id: 'mipmap',
  name: 'Mipmap LOD Errors',
  category: 'coordinates',
  description: 'Wrong mipmap level selection causing blurry or aliased textures.',
  technicalDetails: `Mipmaps are pre-filtered smaller versions of textures used to prevent aliasing at distance.
LOD (Level of Detail) selection bugs cause:
- Too high LOD (blurry): texture is too filtered for the screen size
- Too low LOD (aliased): texture shimmers/sparkles with aliasing
- Missing mipmaps: severe aliasing at distance
- LOD bias errors: consistently wrong sharpness across all distances`,
  bugCode: `// Bug: Not generating mipmaps
glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA, w, h, 0, GL_RGBA, GL_UNSIGNED_BYTE, data);
// Only level 0, no mipmaps generated!
glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR_MIPMAP_LINEAR);
// Sampling from missing mip levels = undefined behavior

// Bug: Wrong LOD bias
glTexParameterf(GL_TEXTURE_2D, GL_TEXTURE_LOD_BIAS, 4.0);  // Way too blurry!`,
  fixCode: `// Fix: Generate mipmaps
glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA, w, h, 0, GL_RGBA, GL_UNSIGNED_BYTE, data);
glGenerateMipmap(GL_TEXTURE_2D);  // Generate all mip levels

// Fix: Use appropriate LOD bias (usually 0 or small negative)
glTexParameterf(GL_TEXTURE_2D, GL_TEXTURE_LOD_BIAS, 0.0);
// Or use anisotropic filtering for better quality at angles:
glTexParameterf(GL_TEXTURE_2D, GL_TEXTURE_MAX_ANISOTROPY, 16.0);`,
  params: [
    {
      name: 'mode',
      type: 'select',
      options: ['Too blurry (high LOD)', 'Aliased (low LOD)', 'Wrong mip level', 'Visualize mip levels'],
      default: 'Too blurry (high LOD)',
      description: 'Type of mipmap error'
    },
    {
      name: 'lodBias',
      type: 'range',
      min: 0,
      max: 4,
      step: 0.5,
      default: 2,
      description: 'LOD bias (mipmap level offset)'
    }
  ],
  apply: (imageData: ImageData, params: GlitchParams): ImageData => {
    const { width, height, data } = imageData;
    const mode = (params.mode as string) || 'Too blurry (high LOD)';
    const lodBias = (params.lodBias as number) || 2;
    const output = new ImageData(width, height);
    const outData = output.data;

    // Pre-compute mip levels
    const mipLevels: ImageData[] = [imageData];
    let mipW = width;
    let mipH = height;

    while (mipW > 1 || mipH > 1) {
      const prevMip = mipLevels[mipLevels.length - 1];
      const newW = Math.max(1, Math.floor(mipW / 2));
      const newH = Math.max(1, Math.floor(mipH / 2));
      const newMip = new ImageData(newW, newH);

      // Box filter downsample
      for (let y = 0; y < newH; y++) {
        for (let x = 0; x < newW; x++) {
          const srcX = x * 2;
          const srcY = y * 2;
          let r = 0, g = 0, b = 0, a = 0, count = 0;

          for (let dy = 0; dy < 2 && srcY + dy < mipH; dy++) {
            for (let dx = 0; dx < 2 && srcX + dx < mipW; dx++) {
              const idx = ((srcY + dy) * mipW + (srcX + dx)) * 4;
              r += prevMip.data[idx];
              g += prevMip.data[idx + 1];
              b += prevMip.data[idx + 2];
              a += prevMip.data[idx + 3];
              count++;
            }
          }

          const outIdx = (y * newW + x) * 4;
          newMip.data[outIdx] = Math.round(r / count);
          newMip.data[outIdx + 1] = Math.round(g / count);
          newMip.data[outIdx + 2] = Math.round(b / count);
          newMip.data[outIdx + 3] = Math.round(a / count);
        }
      }

      mipLevels.push(newMip);
      mipW = newW;
      mipH = newH;
    }

    // Mip level colors for visualization
    const mipColors = [
      [255, 0, 0], [0, 255, 0], [0, 0, 255], [255, 255, 0],
      [255, 0, 255], [0, 255, 255], [255, 128, 0], [128, 0, 255]
    ];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const outIdx = (y * width + x) * 4;

        // Calculate which mip level to sample
        let mipLevel: number;

        switch (mode) {
          case 'Too blurry (high LOD)':
            mipLevel = Math.min(mipLevels.length - 1, Math.floor(lodBias));
            break;
          case 'Aliased (low LOD)':
            mipLevel = 0; // Always use highest detail (causes aliasing at distance)
            break;
          case 'Wrong mip level':
            // Randomly wrong mip level per region
            mipLevel = Math.floor((x + y) / 32) % mipLevels.length;
            break;
          case 'Visualize mip levels':
            mipLevel = Math.min(mipLevels.length - 1, Math.floor(lodBias));
            break;
          default:
            mipLevel = 0;
        }

        const mip = mipLevels[mipLevel];
        const scale = Math.pow(2, mipLevel);
        const srcX = Math.floor(x / scale) % mip.width;
        const srcY = Math.floor(y / scale) % mip.height;
        const srcIdx = (srcY * mip.width + srcX) * 4;

        if (mode === 'Visualize mip levels') {
          // Tint with mip level color
          const color = mipColors[mipLevel % mipColors.length];
          outData[outIdx] = Math.round((mip.data[srcIdx] + color[0]) / 2);
          outData[outIdx + 1] = Math.round((mip.data[srcIdx + 1] + color[1]) / 2);
          outData[outIdx + 2] = Math.round((mip.data[srcIdx + 2] + color[2]) / 2);
        } else {
          outData[outIdx] = mip.data[srcIdx];
          outData[outIdx + 1] = mip.data[srcIdx + 1];
          outData[outIdx + 2] = mip.data[srcIdx + 2];
        }
        outData[outIdx + 3] = 255;
      }
    }

    return output;
  }
};
