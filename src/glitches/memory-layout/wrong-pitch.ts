import type { GlitchDefinition, GlitchParams } from '../types';

export const wrongPitch: GlitchDefinition = {
  id: 'wrong-pitch',
  name: 'Wrong Pitch',
  category: 'memory-layout',
  description: 'Confusing image pitch with width, causing the image to appear stretched or compressed with artifacts.',
  technicalDetails: `Pitch (sometimes called stride) represents the actual memory layout width, which may differ from the logical image width.
When pitch is confused with width, the image is read with incorrect row spacing. A pitch larger than expected compresses the image vertically,
while a smaller pitch stretches it, both introducing visual noise from misaligned pixel data.`,
  bugCode: `// Bug: Using width directly instead of pitch
void copyImage(uint8_t* src, uint8_t* dst, int width, int height) {
    // Wrong: using width when we should use pitch
    memcpy(dst, src, width * height * 4);
    // If src has padding, we're copying wrong data!
}`,
  fixCode: `// Fix: Copy row by row using proper pitch
void copyImage(uint8_t* src, uint8_t* dst,
               int width, int height, int srcPitch, int dstPitch) {
    for (int y = 0; y < height; y++) {
        memcpy(dst + y * dstPitch,
               src + y * srcPitch,
               width * 4);  // Only copy actual pixel data
    }
}`,
  params: [
    {
      name: 'pitchMultiplier',
      type: 'range',
      min: 0.5,
      max: 2,
      step: 0.1,
      default: 1.25,
      description: 'Multiply the pitch by this factor'
    }
  ],
  apply: (imageData: ImageData, params: GlitchParams): ImageData => {
    const { width, height, data } = imageData;
    const pitchMultiplier = (params.pitchMultiplier as number) || 1.25;
    const output = new ImageData(width, height);
    const outData = output.data;

    const correctPitch = width * 4;
    const wrongPitch = Math.floor(correctPitch * pitchMultiplier);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const outIdx = (y * width + x) * 4;

        // Calculate where we would read from with wrong pitch
        const wrongOffset = y * wrongPitch + x * 4;
        const wrongIdx = wrongOffset % data.length;

        if (wrongIdx + 3 < data.length) {
          outData[outIdx] = data[wrongIdx];
          outData[outIdx + 1] = data[wrongIdx + 1];
          outData[outIdx + 2] = data[wrongIdx + 2];
          outData[outIdx + 3] = 255;
        } else {
          outData[outIdx] = 0;
          outData[outIdx + 1] = 0;
          outData[outIdx + 2] = 0;
          outData[outIdx + 3] = 255;
        }
      }
    }

    return output;
  }
};
