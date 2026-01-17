import type { GlitchDefinition, GlitchParams } from '../types';

export const alignment: GlitchDefinition = {
  id: 'alignment',
  name: 'Byte Alignment',
  category: 'memory-layout',
  description: 'Unaligned memory access artifacts from reading data at wrong byte boundaries.',
  technicalDetails: `Many CPUs require or optimize for data to be aligned to specific byte boundaries (2, 4, 8, or 16 bytes).
When image data is read at unaligned offsets, it can cause performance issues or, on some architectures, corruption.
This simulates reading pixel data starting from an unaligned offset, causing all values to be shifted.`,
  bugCode: `// Bug: Reading from unaligned offset
void processImage(uint8_t* buffer) {
    // Assuming buffer starts at aligned address
    uint32_t* pixels = (uint32_t*)(buffer + 1);  // +1 makes it unaligned!
    // On some CPUs this causes garbage data or crashes
    for (int i = 0; i < numPixels; i++) {
        doSomething(pixels[i]);
    }
}`,
  fixCode: `// Fix: Ensure aligned access
void processImage(uint8_t* buffer) {
    // Check alignment before casting
    if ((uintptr_t)buffer % 4 != 0) {
        // Either reallocate aligned or handle byte-by-byte
        alignedBuffer = alignedAlloc(4, size);
        memcpy(alignedBuffer, buffer, size);
        buffer = alignedBuffer;
    }
    uint32_t* pixels = (uint32_t*)buffer;
    // Now safe to access
}`,
  params: [
    {
      name: 'offsetBytes',
      type: 'range',
      min: 1,
      max: 7,
      step: 1,
      default: 1,
      description: 'Byte offset to simulate misalignment'
    },
    {
      name: 'blockSize',
      type: 'range',
      min: 4,
      max: 64,
      step: 4,
      default: 16,
      description: 'Block size for alignment boundary'
    }
  ],
  apply: (imageData: ImageData, params: GlitchParams): ImageData => {
    const { width, height, data } = imageData;
    const offsetBytes = (params.offsetBytes as number) || 1;
    const blockSize = (params.blockSize as number) || 16;
    const output = new ImageData(width, height);
    const outData = output.data;

    // Simulate reading from an offset position
    for (let i = 0; i < data.length; i += 4) {
      // Calculate which block this pixel belongs to
      const blockIndex = Math.floor(i / blockSize);

      // Apply offset only at block boundaries
      const offset = (blockIndex % 2 === 0) ? offsetBytes : 0;
      const srcIdx = (i + offset) % data.length;

      outData[i] = data[srcIdx];
      outData[i + 1] = data[Math.min(srcIdx + 1, data.length - 1)];
      outData[i + 2] = data[Math.min(srcIdx + 2, data.length - 1)];
      outData[i + 3] = data[i + 3];
    }

    return output;
  }
};
